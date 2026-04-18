import { Router } from "express";
import { parseRequest } from "../middleware/validation";
import { chatRequestSchema, chatStreamEventSchema } from "../schemas/chat";
import { ChatService } from "../services/chat-service";

export const chatRouter = Router();

const chatService = new ChatService();

chatRouter.post("/", async (req, res) => {
  const body = parseRequest(chatRequestSchema, req.body, "Body de chat invalido");

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const writeEvent = (event: unknown) => {
    if (res.writableEnded) {
      return;
    }

    const safeEvent = chatStreamEventSchema.parse(event);
    res.write(`data: ${JSON.stringify(safeEvent)}\n\n`);
  };

  try {
    const result = await chatService.reply(
      body,
      {
        onDelta: (deltaText) => {
          if (!deltaText) {
            return;
          }

          writeEvent({
            type: "delta",
            delta: deltaText,
          });
        },
        onToolStart: (toolName) => {
          if (!toolName) {
            return;
          }

          writeEvent({
            type: "tool_start",
            toolName,
          });
        },
        onToolResult: (toolName, resultPreview) => {
          if (!toolName) {
            return;
          }

          writeEvent({
            type: "tool_result",
            toolName,
            result: resultPreview,
          });
        },
      },
    );

    writeEvent({
      type: "done",
      sessionId: result.sessionId,
      assistantText: result.assistantText,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en stream";

    writeEvent({
      type: "error",
      error: message,
    });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});
