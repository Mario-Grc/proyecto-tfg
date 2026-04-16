import type { MessageRole } from "./message";

export interface LLMConversationMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  sessionId: string;
  text: string;
  selectedCode?: string;
}

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  sessionId: string;
  assistantText: string;
  usage?: ChatUsage;
}

export interface ChatStreamDeltaEvent {
  type: "delta";
  delta: string;
}

export interface ChatStreamDoneEvent {
  type: "done";
  sessionId: string;
  assistantText: string;
  usage?: ChatUsage;
}

export interface ChatStreamErrorEvent {
  type: "error";
  error: string;
}

export type ChatStreamEvent =
  | ChatStreamDeltaEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent;
