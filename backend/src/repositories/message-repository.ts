import { getDatabase } from "../db/connection";
import { createId } from "../utils/id";

export type MessageRole = "system" | "user" | "assistant";

export interface MessageEntity {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  usagePromptTokens: number | null;
  usageCompletionTokens: number | null;
  usageTotalTokens: number | null;
  createdAt: string;
}

type MessageRow = {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  usage_prompt_tokens: number | null;
  usage_completion_tokens: number | null;
  usage_total_tokens: number | null;
  created_at: string;
};

interface CreateMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  usagePromptTokens?: number | null;
  usageCompletionTokens?: number | null;
  usageTotalTokens?: number | null;
}

function mapMessageRow(row: MessageRow): MessageEntity {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    usagePromptTokens: row.usage_prompt_tokens,
    usageCompletionTokens: row.usage_completion_tokens,
    usageTotalTokens: row.usage_total_tokens,
    createdAt: row.created_at,
  };
}

export class MessageRepository {
  private readonly db = getDatabase();

  private readonly insertStmt = this.db.prepare(`
    INSERT INTO messages (
      id,
      session_id,
      role,
      content,
      usage_prompt_tokens,
      usage_completion_tokens,
      usage_total_tokens,
      created_at
    ) VALUES (
      @id,
      @sessionId,
      @role,
      @content,
      @usagePromptTokens,
      @usageCompletionTokens,
      @usageTotalTokens,
      CURRENT_TIMESTAMP
    )
  `);

  private readonly selectByIdStmt = this.db.prepare(`
    SELECT
      id,
      session_id,
      role,
      content,
      usage_prompt_tokens,
      usage_completion_tokens,
      usage_total_tokens,
      created_at
    FROM messages
    WHERE id = ?
  `);

  private readonly selectBySessionStmt = this.db.prepare(`
    SELECT
      id,
      session_id,
      role,
      content,
      usage_prompt_tokens,
      usage_completion_tokens,
      usage_total_tokens,
      created_at
    FROM messages
    WHERE session_id = ?
    ORDER BY created_at ASC, id ASC
  `);

  private readonly touchSessionStmt = this.db.prepare(`
    UPDATE sessions
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  private readonly insertTransaction = this.db.transaction((input: CreateMessageInput & { id: string }) => {
    this.insertStmt.run({
      ...input,
      usagePromptTokens: input.usagePromptTokens ?? null,
      usageCompletionTokens: input.usageCompletionTokens ?? null,
      usageTotalTokens: input.usageTotalTokens ?? null,
    });

    this.touchSessionStmt.run(input.sessionId);
  });

  create(input: CreateMessageInput): MessageEntity {
    const id = createId();
    this.insertTransaction({ ...input, id });

    const created = this.findById(id);
    if (!created) {
      throw new Error(`No se pudo crear el mensaje ${id}`);
    }

    return created;
  }

  listBySessionId(sessionId: string): MessageEntity[] {
    const rows = this.selectBySessionStmt.all(sessionId) as MessageRow[];
    return rows.map(mapMessageRow);
  }

  findById(messageId: string): MessageEntity | null {
    const row = this.selectByIdStmt.get(messageId) as MessageRow | undefined;
    return row ? mapMessageRow(row) : null;
  }
}
