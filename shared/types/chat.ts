import type { MessageRole } from "./message";

export interface LLMConversationMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  sessionId: string;
  problemId?: string;
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
