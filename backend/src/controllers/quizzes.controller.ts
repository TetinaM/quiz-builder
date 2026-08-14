import { Request, Response } from "express";
import * as quizzesService from "../services/quizzes.service";
import { CreateQuizBody } from "../validation/quizzes.schema";

// `req.params.id` is typed `string | string[]` by Express 5 (path-to-regexp
// v8 allows repeated params); our routes only ever use a single named `:id`
// segment, so it's always a plain string at runtime.
function paramId(req: Request): string {
  return req.params.id as string;
}

export async function createQuiz(req: Request, res: Response) {
  // Safe to trust the shape here: validateBody(createQuizSchema) already
  // parsed and replaced req.body before this handler runs.
  const body = req.body as CreateQuizBody;
  const quiz = await quizzesService.createQuiz(body);
  res.status(201).json(quiz);
}

export async function listQuizzes(_req: Request, res: Response) {
  const quizzes = await quizzesService.listQuizzes();
  res.status(200).json(quizzes);
}

export async function getQuiz(req: Request, res: Response) {
  const quiz = await quizzesService.getQuizById(paramId(req));
  if (!quiz) {
    res.status(404).json({ message: "Quiz not found" });
    return;
  }
  res.status(200).json(quiz);
}

export async function deleteQuiz(req: Request, res: Response) {
  const deleted = await quizzesService.deleteQuiz(paramId(req));
  if (!deleted) {
    res.status(404).json({ message: "Quiz not found" });
    return;
  }
  res.status(204).send();
}
