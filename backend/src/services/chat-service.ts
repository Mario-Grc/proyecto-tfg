import { config } from "../config";
import { HttpError } from "../middleware/error-handler";
import { MessageRepository } from "../repositories/message-repository";
import { ProblemRepository } from "../repositories/problem-repository";
import { SessionRepository } from "../repositories/session-repository";

type ConversationRole = "system" | "user" | "assistant";

interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

interface ChatRequestInput {
  sessionId: string;
  text: string;
  selectedCode?: string;
}

interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ChatResult {
  sessionId: string;
  assistantText: string;
  usage?: ChatUsage;
}

interface ChatStreamCallbacks {
  onDelta: (deltaText: string) => void;
}

interface LMStudioStreamResponse {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content?: string;
    };
  }>;
  usage?: ChatUsage;
}

const BASE_SYSTEM_PROMPT = [
  "Eres un asistente tutor para aprender programacion.",
  "Tu objetivo principal es ayudar al usuario a entender, no solo dar la respuesta final.",
  "Explica el razonamiento paso a paso cuando sea util, resuelve dudas concretas y propone ejemplos pequenos.",
  "Adapta el nivel de detalle a las preguntas del usuario y verifica que los conceptos queden claros.",
  "Si no tienes suficiente contexto de codigo para responder con precision, pide al usuario un fragmento concreto del editor.",
].join(" ");

function buildSystemPrompt(problemTitle: string, problemStatement: string): string {
  return [
    BASE_SYSTEM_PROMPT,
    "Contexto del problema activo:",
    `Titulo: ${problemTitle}`,
    `Enunciado:\n${problemStatement}`,
    "No inventes requisitos que no esten en el enunciado.",
  ].join("\n\n");
}

function buildUserContentForModel(text: string, selectedCode?: string): string {
  const normalizedCode = selectedCode?.trim() ?? "";

  if (!normalizedCode) {
    return text;
  }

  return [
    text,
    "",
    "Contexto de codigo seleccionado automaticamente:",
    "```javascript",
    normalizedCode,
    "```",
  ].join("\n");
}

function normalizeErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: String(error),
  };
}

function parseStreamDataLine(line: string): string | null {
  if (!line.startsWith("data:")) {
    return null;
  }

  return line.slice(5).trim();
}

async function callLocalLLM(
  conversation: ConversationMessage[],
  callbacks: ChatStreamCallbacks,
): Promise<{ rawText: string; usage?: ChatUsage }> {
  let response: Response;

  try {
    response = await fetch(config.llmApiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.llmModelName,
        messages: conversation,
        temperature: 0.6,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }),
    });
  } catch (error) {
    throw new HttpError(502, "No se pudo conectar con el LLM local", normalizeErrorDetails(error));
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(502, `LLM local devolvio HTTP ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new HttpError(502, "El LLM no devolvio un stream utilizable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let rawText = "";
  let usage: ChatUsage | undefined;

  const processLine = (line: string) => {
    const payload = parseStreamDataLine(line);

    if (!payload || payload === "[DONE]") {
      return;
    }

    let chunk: LMStudioStreamResponse;

    try {
      chunk = JSON.parse(payload) as LMStudioStreamResponse;
    } catch {
      return;
    }

    const deltaText = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";

    if (deltaText) {
      rawText += deltaText;
      callbacks.onDelta(deltaText);
    }

    if (chunk.usage) {
      usage = chunk.usage;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let lineBreakIndex = buffer.indexOf("\n");
      while (lineBreakIndex !== -1) {
        const line = buffer.slice(0, lineBreakIndex).replace(/\r$/, "");
        buffer = buffer.slice(lineBreakIndex + 1);
        processLine(line);
        lineBreakIndex = buffer.indexOf("\n");
      }
    }
  } catch (error) {
    throw new HttpError(502, "Se interrumpio el stream del LLM local", normalizeErrorDetails(error));
  } finally {
    reader.releaseLock();
  }

  if (buffer.trim()) {
    processLine(buffer.replace(/\r$/, ""));
  }

  if (!rawText.trim()) {
    throw new HttpError(502, "El LLM no devolvio contenido");
  }

  return {
    rawText,
    usage,
  };
}

function cleanAssistantText(rawText: string): string {
  return rawText.replace(/<think>.*?<\/think>/gs, "").trim();
}

export class ChatService {
  private readonly problemRepository = new ProblemRepository();
  private readonly sessionRepository = new SessionRepository();
  private readonly messageRepository = new MessageRepository();

  private createConversation(input: ChatRequestInput): { sessionId: string; conversation: ConversationMessage[] } {
    const session = this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new HttpError(404, `Sesion no encontrada: ${input.sessionId}`);
    }

    const problem = this.problemRepository.findById(session.problemId);

    if (!problem) {
      throw new HttpError(500, `Sesion ${session.id} referencia un problema inexistente`);
    }

    const userContent = buildUserContentForModel(input.text, input.selectedCode);

    this.messageRepository.create({
      sessionId: session.id,
      role: "user",
      content: userContent,
    });

    const persistedMessages = this.messageRepository.listBySessionId(session.id);

    return {
      sessionId: session.id,
      conversation: [
        {
          role: "system",
          content: buildSystemPrompt(problem.title, problem.statement),
        },
        ...persistedMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    };
  }

  private persistAssistantMessage(sessionId: string, assistantText: string, usage?: ChatUsage): void {
    this.messageRepository.create({
      sessionId,
      role: "assistant",
      content: assistantText,
      usagePromptTokens: usage?.prompt_tokens ?? null,
      usageCompletionTokens: usage?.completion_tokens ?? null,
      usageTotalTokens: usage?.total_tokens ?? null,
    });
  }

  async reply(input: ChatRequestInput, callbacks: ChatStreamCallbacks): Promise<ChatResult> {
    const { sessionId, conversation } = this.createConversation(input);

    const llmResponse = await callLocalLLM(conversation, callbacks);
    const assistantText = cleanAssistantText(llmResponse.rawText);

    this.persistAssistantMessage(sessionId, assistantText, llmResponse.usage);

    return {
      sessionId,
      assistantText,
      usage: llmResponse.usage,
    };
  }
}
