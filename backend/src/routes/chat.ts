import { Router } from "express";
import { parseRequest } from "../middleware/validation";
import { chatRequestSchema, chatResponseSchema } from "../schemas/chat";
import { ChatService } from "../services/chat-service";

export const chatRouter = Router();

const chatService = new ChatService();

chatRouter.post("/", async (req, res) => {
  const body = parseRequest(chatRequestSchema, req.body, "Body de chat invalido");
  const result = await chatService.reply(body);
  const responseBody = chatResponseSchema.parse(result);

  res.json(responseBody);
});
