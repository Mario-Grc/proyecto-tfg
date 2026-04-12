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

interface LMStudioResponse {
  choices?: Array<{
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
    const details: Record<string, unknown> = {
      message: error.message,
      name: error.name,
    };

    const withCode = error as Error & { code?: unknown; cause?: unknown };

    if (typeof withCode.code === "string") {
      details.code = withCode.code;
    }

    if (withCode.cause instanceof Error) {
      details.cause = withCode.cause.message;
    }

    return details;
  }

  return {
    message: String(error),
  };
}

async function callLocalLLM(conversation: ConversationMessage[]): Promise<{ rawText: string; usage?: ChatUsage }> {
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
      }),
    });
  } catch (error) {
    throw new HttpError(502, "No se pudo conectar con el LLM local", normalizeErrorDetails(error));
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(502, `LLM local devolvio HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as LMStudioResponse;
  const rawText = data.choices?.[0]?.message?.content?.trim();

  if (!rawText) {
    throw new HttpError(502, "El LLM no devolvio contenido");
  }

  return {
    rawText,
    usage: data.usage,
  };
}

function cleanAssistantText(rawText: string): string {
  return rawText.replace(/<think>.*?<\/think>/gs, "").trim();
}

export class ChatService {
  private readonly problemRepository = new ProblemRepository();
  private readonly sessionRepository = new SessionRepository();
  private readonly messageRepository = new MessageRepository();

  // V2: este punto sera el candidato natural para migrar a streaming.
  async reply(input: ChatRequestInput): Promise<ChatResult> {
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

    const conversation: ConversationMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(problem.title, problem.statement),
      },
      ...persistedMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const llmResponse = await callLocalLLM(conversation);
    const assistantText = cleanAssistantText(llmResponse.rawText);

    this.messageRepository.create({
      sessionId: session.id,
      role: "assistant",
      content: assistantText,
      usagePromptTokens: llmResponse.usage?.prompt_tokens ?? null,
      usageCompletionTokens: llmResponse.usage?.completion_tokens ?? null,
      usageTotalTokens: llmResponse.usage?.total_tokens ?? null,
    });

    return {
      sessionId: session.id,
      assistantText,
      usage: llmResponse.usage,
    };
  }
}
