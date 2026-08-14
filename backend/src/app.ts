import cors from "cors";
import express, { Request, Response } from "express";
import { errorHandler } from "./middleware/error-handler";
import { quizzesRouter } from "./routes/quizzes.routes";

export const app = express();

app.use(cors());
app.use(express.json());

// Throwaway route to prove the server + TS build pipeline work before real
// endpoints are added. Not part of the project.txt spec.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/quizzes", quizzesRouter);

// Must be last: Express only treats a 4-argument function as an error
// handler, and only errors from routes registered above it are caught.
app.use(errorHandler);
