export type MessageRole = "system" | "user" | "assistant";

export interface SessionMessageRecord {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
