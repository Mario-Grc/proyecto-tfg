import { Router } from "express";
import { HttpError } from "../middleware/error-handler";
import { parseRequest } from "../middleware/validation";
import { ProblemRepository } from "../repositories/problem-repository";
import {
  createProblemBodySchema,
  problemIdParamsSchema,
  problemListResponseSchema,
  problemRecordSchema,
  updateProblemBodySchema,
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
  const saved = problemRepository.createUser(body);
  const responseBody = problemRecordSchema.parse(saved);

  res.status(201).json(responseBody);
});

problemsRouter.patch("/:problemId", (req, res) => {
  const { problemId } = parseRequest(problemIdParamsSchema, req.params, "Parametro problemId invalido");
  const problem = problemRepository.findById(problemId);

  if (!problem) {
    throw new HttpError(404, `Problema no encontrado: ${problemId}`);
  }

  if (problem.source !== "user") {
    throw new HttpError(403, "Solo se pueden editar problemas creados por el usuario");
  }

  const body = parseRequest(updateProblemBodySchema, req.body, "Body de problema invalido");
  const updated = problemRepository.updateById(problemId, body);
  const responseBody = problemRecordSchema.parse(updated);

  res.json(responseBody);
});

problemsRouter.delete("/:problemId", (req, res) => {
  const { problemId } = parseRequest(problemIdParamsSchema, req.params, "Parametro problemId invalido");
  const problem = problemRepository.findById(problemId);

  if (!problem) {
    throw new HttpError(404, `Problema no encontrado: ${problemId}`);
  }

  if (problem.source !== "user") {
    throw new HttpError(403, "Solo se pueden eliminar problemas creados por el usuario");
  }

  problemRepository.deleteById(problemId);
  res.status(204).end();
});
