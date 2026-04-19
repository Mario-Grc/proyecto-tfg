export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface SessionMessageRecord {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  usagePromptTokens?: number | null;
  usageCompletionTokens?: number | null;
  usageTotalTokens?: number | null;
  createdAt: string;
}
