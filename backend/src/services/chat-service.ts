import { config } from "../config";
import { HttpError } from "../middleware/error-handler";
import { MessageRepository } from "../repositories/message-repository";
import { ProblemRepository } from "../repositories/problem-repository";
import { SessionRepository } from "../repositories/session-repository";
import { buildToolRegistry, ToolExecutor } from "../tools";

type ConversationRole = "system" | "user" | "assistant" | "tool";

interface NormalizedToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

type ConversationMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      tool_calls?: NormalizedToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      content: string;
    };

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
  onToolStart?: (toolName: string) => void;
  onToolResult?: (toolName: string, resultPreview: string) => void;
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

interface LMStudioNonStreamResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: LMStudioRawToolCall[];
    };
  }>;
  usage?: ChatUsage;
}

interface LMStudioRawToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface ToolDecisionResult {
  assistantText: string;
  toolCalls: NormalizedToolCall[];
  usage?: ChatUsage;
}

const BASE_SYSTEM_PROMPT = [
  "Eres un asistente tutor para aprender programacion.",
  "Tu objetivo principal es ayudar al usuario a entender, no solo dar la respuesta final.",
  "Explica el razonamiento paso a paso cuando sea util, resuelve dudas concretas y propone ejemplos pequenos.",
  "Adapta el nivel de detalle a las preguntas del usuario y verifica que los conceptos queden claros.",
  "Si no tienes suficiente contexto de codigo para responder con precision, pide al usuario un fragmento concreto del editor.",
].join(" ");

function buildToolInstructions(): string {
  if (!config.enableToolCalling) {
    return "";
  }

  const instructions = [
    "Herramientas disponibles:",
    "- ejecutar_codigo: usala cuando el usuario pida ejecutar, probar, depurar o validar codigo JavaScript.",
  ];

  if (config.enableMcpWebSearch) {
    instructions.push("- buscar_web: usala cuando necesites informacion actualizada o externa en internet.");
  }

  instructions.push(
    "Reglas de uso:",
    "- Si una herramienta puede verificar la respuesta, usala en lugar de inventar el resultado.",
    "- No describas una salida como si la hubieras ejecutado si no has llamado a la herramienta.",
    "- Cuando uses una herramienta, espera su resultado y responde con base en ese resultado.",
    "- Si no hace falta ninguna herramienta, responde normalmente.",
  );

  return instructions.join("\n");
}

function buildSystemPrompt(problemTitle: string, problemStatement: string): string {
  return [
    BASE_SYSTEM_PROMPT,
    buildToolInstructions(),
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

function buildToolCallId(index: number): string {
  return `tool_call_${Date.now()}_${index}`;
}

function normalizeToolCalls(rawToolCalls: LMStudioRawToolCall[] | undefined): NormalizedToolCall[] {
  if (!rawToolCalls || !Array.isArray(rawToolCalls)) {
    return [];
  }

  return rawToolCalls
    .map((toolCall, index): NormalizedToolCall | null => {
      if (!toolCall || toolCall.type !== "function") {
        return null;
      }

      const functionName = toolCall.function?.name?.trim() ?? "";
      if (!functionName) {
        return null;
      }

      const argumentsPayload = toolCall.function?.arguments;

      return {
        id: toolCall.id?.trim() || buildToolCallId(index),
        type: "function",
        function: {
          name: functionName,
          arguments: typeof argumentsPayload === "string" ? argumentsPayload : "{}",
        },
      };
    })
    .filter((toolCall): toolCall is NormalizedToolCall => toolCall !== null);
}

function parseToolArguments(rawArguments: string): unknown {
  const trimmedArguments = rawArguments.trim();

  if (!trimmedArguments) {
    return {};
  }

  try {
    return JSON.parse(trimmedArguments) as unknown;
  } catch {
    return null;
  }
}

function previewToolResult(rawOutput: string, maxChars = 240): string {
  const normalized = rawOutput.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}...`;
}

function buildToolMessageContent(toolName: string, ok: boolean, output: string): string {
  return JSON.stringify(
    {
      tool: toolName,
      ok,
      output,
    },
    null,
    2,
  );
}

async function callLLMForToolDecision(
  conversation: ConversationMessage[],
): Promise<ToolDecisionResult> {
  const tools = buildToolRegistry({
    enableMcpWebSearch: config.enableMcpWebSearch,
  });

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
        temperature: 0.2,
        stream: false,
        tools,
      }),
    });
  } catch (error) {
    throw new HttpError(502, "No se pudo conectar con el LLM local", normalizeErrorDetails(error));
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(502, `LLM local devolvio HTTP ${response.status}: ${errorText}`);
  }

  let payload: LMStudioNonStreamResponse;

  try {
    payload = (await response.json()) as LMStudioNonStreamResponse;
  } catch (error) {
    throw new HttpError(502, "El LLM devolvio una respuesta JSON invalida", normalizeErrorDetails(error));
  }

  const firstChoice = payload.choices?.[0];
  const assistantText = firstChoice?.message?.content?.trim() ?? "";
  const toolCalls = normalizeToolCalls(firstChoice?.message?.tool_calls);

  return {
    assistantText,
    toolCalls,
    usage: payload.usage,
  };
}

async function callLLMStreaming(
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
  private readonly toolExecutor = new ToolExecutor();

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

  private async resolveToolCalling(conversation: ConversationMessage[], callbacks: ChatStreamCallbacks): Promise<void> {
    if (!config.enableToolCalling) {
      return;
    }

    for (let round = 0; round < config.toolCallMaxRounds; round += 1) {
      const decision = await callLLMForToolDecision(conversation);

      if (decision.toolCalls.length === 0) {
        return;
      }

      conversation.push({
        role: "assistant",
        content: decision.assistantText,
        tool_calls: decision.toolCalls,
      });

      for (const toolCall of decision.toolCalls) {
        callbacks.onToolStart?.(toolCall.function.name);

        const parsedArguments = parseToolArguments(toolCall.function.arguments);
        let toolExecutionResult: { toolName: string; ok: boolean; output: string };

        try {
          toolExecutionResult = await this.toolExecutor.execute(toolCall.function.name, parsedArguments);
        } catch (error) {
          toolExecutionResult = {
            toolName: toolCall.function.name,
            ok: false,
            output: `Fallo interno al ejecutar la herramienta: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }

        callbacks.onToolResult?.(toolExecutionResult.toolName, previewToolResult(toolExecutionResult.output));

        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: buildToolMessageContent(
            toolExecutionResult.toolName,
            toolExecutionResult.ok,
            toolExecutionResult.output,
          ),
        });
      }
    }

    conversation.push({
      role: "system",
      content: `Has alcanzado el limite de ${config.toolCallMaxRounds} rondas de herramientas. Responde con la informacion disponible sin usar mas herramientas.`,
    });
  }

  async reply(input: ChatRequestInput, callbacks: ChatStreamCallbacks): Promise<ChatResult> {
    const { sessionId, conversation } = this.createConversation(input);

    await this.resolveToolCalling(conversation, callbacks);

    const llmResponse = await callLLMStreaming(conversation, callbacks);
    const assistantText = cleanAssistantText(llmResponse.rawText);

    this.persistAssistantMessage(sessionId, assistantText, llmResponse.usage);

    return {
      sessionId,
      assistantText,
      usage: llmResponse.usage,
    };
  }
}
