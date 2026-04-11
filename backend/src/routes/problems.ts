import { Router } from "express";
import { HttpError } from "../middleware/error-handler";
import { parseRequest } from "../middleware/validation";
import { ProblemRepository } from "../repositories/problem-repository";
import {
  createProblemBodySchema,
  problemIdParamsSchema,
  problemListResponseSchema,
  problemRecordSchema,
} from "../schemas/problems";

export const problemsRouter = Router();

const problemRepository = new ProblemRepository();

problemsRouter.get("/", (_req, res) => {
  const problems = problemRepository.listAll();
  const responseBody = problemListResponseSchema.parse(problems);
  res.json(responseBody);
});

problemsRouter.get("/:problemId", (req, res) => {
  const { problemId } = parseRequest(problemIdParamsSchema, req.params, "Parametro problemId invalido");
  const problem = problemRepository.findById(problemId);

  if (!problem) {
    throw new HttpError(404, `Problema no encontrado: ${problemId}`);
  }

  const responseBody = problemRecordSchema.parse(problem);
  res.json(responseBody);
});

problemsRouter.post("/", (req, res) => {
  const body = parseRequest(createProblemBodySchema, req.body, "Body de problema invalido");
  const existed = Boolean(problemRepository.findById(body.id));

  const saved = problemRepository.upsert(body);
  const responseBody = problemRecordSchema.parse(saved);

  res.status(existed ? 200 : 201).json(responseBody);
});
