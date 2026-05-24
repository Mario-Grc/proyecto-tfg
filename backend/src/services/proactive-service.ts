import { config } from "../config";
import { HttpError } from "../middleware/error-handler";
import { MessageRepository } from "../repositories/message-repository";
import { ProblemRepository } from "../repositories/problem-repository";
import { SessionRepository } from "../repositories/session-repository";

// Tipos duplicados localmente: el backend no puede importar de shared/types por su rootDir:src
// (mismo patron que chat-service.ts y check-service.ts).
type ProactiveTrigger = "test_failure" | "idle";

interface ProactiveFailingTest {
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  error?: string;
}

interface ProactiveTestSummary {
  total: number;
  passed: number;
  failing: ProactiveFailingTest[];
}

interface ProactiveRequestInput {
  sessionId: string;
  trigger: ProactiveTrigger;
  language?: "javascript" | "python";
  responseLanguage?: "es" | "en";
  editorCode?: string;
  testSummary?: ProactiveTestSummary;
}

interface ProactiveResult {
  intervene: boolean;
  message: string | null;
  trigger: ProactiveTrigger;
}

type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface LMStudioNonStreamResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

// max numero de mensajes de historial que se envian al llm
const MAX_HISTORY_MESSAGES = 10;
// Max de tokens de la intervencion para que sea corta
const PROACTIVE_MAX_TOKENS = 256;
// número maximo de tests que fallan que se describen al LLM
const MAX_FAILING_TESTS_IN_PROMPT = 3;
// palabra que el LLM responde cuando decide no decir nada
const SILENCE_SENTINEL = "SILENCIO";

const BASE_PROACTIVE_PROMPT = [
  "Eres un pato tutor que ayuda a aprender programacion, ahora estás acompañando a alguien mientras programa.",
  "Ahora intervienes de forma PROACTIVA: el usuario NO te ha preguntado nada, así que sé prudente.",
  "Se MUY breve (1 o 2 frases), cercano y socrático.",
  "Da una pista o una pregunta que le haga pensar; NUNCA escribas la solución completa ni el código final.",
  "No repitas algo que ya hayas dicho antes en la conversación.",
].join(" ");

function normalizeErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  return { message: String(error) };
}

function cleanAssistantText(rawText: string): string {
  return rawText.replace(/<think>.*?<\/think>/gs, "").trim();
}

function buildLanguageInstruction(responseLanguage: "es" | "en" | undefined): string {
  if (responseLanguage === "en") {
    return "Respond to the user in English.";
  }

  return "";
}

function buildProactiveSystemPrompt(
  trigger: ProactiveTrigger,
  problemTitle: string,
  problemStatement: string,
  responseLanguage?: "es" | "en",
): string {
  const triggerGuidance = trigger === "idle"
    ? [
        "El usuario lleva un rato sin avanzar en su código.",
        `Mira su código: si va por buen camino o no hay nada útil que añadir, responde EXACTAMENTE ${SILENCE_SENTINEL} y nada más.`,
        "Solo si está claramente atascado o se ha equivocado, dale una pista muy breve.",
      ].join(" ")
    : [
        "El usuario acaba de ejecutar los tests y han fallado.",
        "Comenta la causa probable del fallo a partir de los casos que fallan, sin dar la solución.",
      ].join(" ");

  return [
    BASE_PROACTIVE_PROMPT,
    triggerGuidance,
    "Contexto del problema activo:",
    `Título: ${problemTitle}`,
    `Enunciado:\n${problemStatement}`,
    "No inventes requisitos que no estén en el enunciado.",
    buildLanguageInstruction(responseLanguage),
  ].filter((part) => part.length > 0).join("\n\n");
}

function formatJsonValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildFailingTestsText(summary: ProactiveTestSummary): string {
  return summary.failing
    .slice(0, MAX_FAILING_TESTS_IN_PROMPT)
    .map((test, index) => {
      const parts = [
        `Test ${index + 1}:`,
        `entrada=${formatJsonValue(test.input)}`,
        `esperado=${formatJsonValue(test.expected)}`,
      ];

      if (test.error) {
        parts.push(`error=${test.error}`);
      } else {
        parts.push(`obtenido=${formatJsonValue(test.actual)}`);
      }

      return parts.join(" ");
    })
    .join("\n");
}

function buildTriggerInstruction(input: ProactiveRequestInput): string {
  const language = input.language ?? "javascript";
  const editorCode = input.editorCode?.trim() ?? "";
  const sections: string[] = [];

  if (input.trigger === "test_failure" && input.testSummary) {
    sections.push(
      `El usuario ha pasado ${input.testSummary.passed} de ${input.testSummary.total} tests. Estos fallan:`,
      buildFailingTestsText(input.testSummary),
    );
  } else {
    sections.push("El usuario lleva un rato sin tocar el código.");
  }

  if (editorCode) {
    sections.push("Código actual del editor:", `\`\`\`${language}`, editorCode, "```");
  } else {
    sections.push("El editor está prácticamente vacío.");
  }

  sections.push(
    input.trigger === "idle"
      ? `Decide si conviene intervenir. Si no, responde ${SILENCE_SENTINEL}.`
      : "Dale una pista breve para que descubra el fallo por sí mismo.",
  );

  return sections.join("\n");
}

function isSilence(text: string): boolean {
  // quitamos comillas, puntuación y espacios para detectar el silencio aunque venga adornado
  const normalized = text.trim().toUpperCase().replace(/[^A-ZÑ]/g, "");

  if (!normalized) {
    return true;
  }

  return normalized.startsWith(SILENCE_SENTINEL);
}

async function callLLMNonStreaming(conversation: ConversationMessage[]): Promise<string> {
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
        temperature: 0.4,
        max_tokens: PROACTIVE_MAX_TOKENS,
        stream: false,
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

  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

export class ProactiveService {
  private readonly problemRepository = new ProblemRepository();
  private readonly sessionRepository = new SessionRepository();
  private readonly messageRepository = new MessageRepository();

  async generateIntervention(input: ProactiveRequestInput): Promise<ProactiveResult> {
    const session = this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new HttpError(404, `Sesion no encontrada: ${input.sessionId}`);
    }

    const problem = this.problemRepository.findById(session.problemId);

    if (!problem) {
      throw new HttpError(500, `Sesion ${session.id} referencia un problema inexistente`);
    }

    const conversation: ConversationMessage[] = [
      {
        role: "system",
        content: buildProactiveSystemPrompt(
          input.trigger,
          problem.title,
          problem.statement,
          input.responseLanguage,
        ),
      },
      ...this.buildHistory(session.id),
      {
        role: "user",
        content: buildTriggerInstruction(input),
      },
    ];

    const message = cleanAssistantText(await callLLMNonStreaming(conversation));

    // si se falla el test interviene siempre, si es por idle solo si el llm quiere
    if (!message || (input.trigger === "idle" && isSilence(message))) {
      return { intervene: false, message: null, trigger: input.trigger };
    }


    this.messageRepository.create({
      sessionId: session.id,
      role: "assistant",
      content: message,
    });

    return { intervene: true, message, trigger: input.trigger };
  }

  // le paso el historial sin mensajes de herramienta ni system para que tenga context
  private buildHistory(sessionId: string): ConversationMessage[] {
    const persisted = this.messageRepository.listBySessionId(sessionId);
    const mapped = persisted.flatMap((message): ConversationMessage[] => {
      if (message.role === "tool" || message.role === "system") {
        return [];
      }

      return [{ role: message.role, content: message.content }];
    });

    return mapped.slice(-MAX_HISTORY_MESSAGES);
  }
}
