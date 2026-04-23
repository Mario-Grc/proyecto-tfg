import { Router } from "express";
import { HttpError } from "../middleware/error-handler";
import { parseRequest } from "../middleware/validation";
import { MessageRepository } from "../repositories/message-repository";
import { ProblemRepository } from "../repositories/problem-repository";
import { SessionRepository } from "../repositories/session-repository";
import {
  createMessageBodySchema,
  messageListResponseSchema,
  messageRecordSchema,
} from "../schemas/messages";
import {
  createSessionBodySchema,
  latestSessionByProblemParamsSchema,
  latestSessionResponseSchema,
  sessionIdParamsSchema,
  sessionRecordSchema,
} from "../schemas/sessions";

export const sessionsRouter = Router();

const problemRepository = new ProblemRepository();
const sessionRepository = new SessionRepository();
const messageRepository = new MessageRepository();

sessionsRouter.post("/", (req, res) => {
  const body = parseRequest(createSessionBodySchema, req.body, "Body de sesion invalido");
  const problem = problemRepository.findById(body.problemId);

  if (!problem) {
    throw new HttpError(404, `Problema no encontrado: ${body.problemId}`);
  }

  const session = sessionRepository.create(body.problemId);
  const responseBody = sessionRecordSchema.parse(session);
  res.status(201).json(responseBody);
});

sessionsRouter.get("/latest/problem/:problemId", (req, res) => {
  const { problemId } = parseRequest(
    latestSessionByProblemParamsSchema,
    req.params,
    "Parametro problemId invalido",
  );

  const latestSession = sessionRepository.findLatestByProblemId(problemId);
  const responseBody = latestSessionResponseSchema.parse(latestSession);
  res.json(responseBody);
});

sessionsRouter.get("/:sessionId", (req, res) => {
  const { sessionId } = parseRequest(sessionIdParamsSchema, req.params, "Parametro sessionId invalido");
  const session = sessionRepository.findById(sessionId);

  if (!session) {
    throw new HttpError(404, `Sesion no encontrada: ${sessionId}`);
  }

  const responseBody = sessionRecordSchema.parse(session);
  res.json(responseBody);
});

sessionsRouter.post("/:sessionId/messages", (req, res) => {
  const { sessionId } = parseRequest(sessionIdParamsSchema, req.params, "Parametro sessionId invalido");
  const body = parseRequest(createMessageBodySchema, req.body, "Body de mensaje invalido");

  const session = sessionRepository.findById(sessionId);
  if (!session) {
    throw new HttpError(404, `Sesion no encontrada: ${sessionId}`);
  }

  const message = messageRepository.create({
    sessionId,
    role: body.role,
    content: body.content,
    usagePromptTokens: body.usagePromptTokens,
    usageCompletionTokens: body.usageCompletionTokens,
    usageTotalTokens: body.usageTotalTokens,
  });

  const responseBody = messageRecordSchema.parse(message);
  res.status(201).json(responseBody);
});

sessionsRouter.get("/:sessionId/messages", (req, res) => {
  const { sessionId } = parseRequest(sessionIdParamsSchema, req.params, "Parametro sessionId invalido");

  const session = sessionRepository.findById(sessionId);
  if (!session) {
    throw new HttpError(404, `Sesion no encontrada: ${sessionId}`);
  }

  const messages = messageRepository.listBySessionId(sessionId);
  const responseBody = messageListResponseSchema.parse(messages);

  res.json(responseBody);
});
