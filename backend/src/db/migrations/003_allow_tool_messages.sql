PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS messages_new (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  usage_prompt_tokens INTEGER,
  usage_completion_tokens INTEGER,
  usage_total_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO messages_new (
  id,
  session_id,
  role,
  content,
  usage_prompt_tokens,
  usage_completion_tokens,
  usage_total_tokens,
  created_at
)
SELECT
  id,
  session_id,
  role,
  content,
  usage_prompt_tokens,
  usage_completion_tokens,
  usage_total_tokens,
  created_at
FROM messages;

DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;

CREATE INDEX IF NOT EXISTS idx_messages_session_created_at ON messages(session_id, created_at);

PRAGMA foreign_keys = ON;
