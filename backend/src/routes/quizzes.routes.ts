import { Router } from "express";
import * as quizzesController from "../controllers/quizzes.controller";
import { validateBody } from "../middleware/validate";
import { createQuizSchema } from "../validation/quizzes.schema";

export const quizzesRouter = Router();

quizzesRouter.post(
  "/",
  validateBody(createQuizSchema),
  quizzesController.createQuiz,
);
quizzesRouter.get("/", quizzesController.listQuizzes);
quizzesRouter.get("/:id", quizzesController.getQuiz);
quizzesRouter.delete("/:id", quizzesController.deleteQuiz);
