import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/api-error";

// Centralized error handler — the only place that writes an error response.
// Must be registered last, after all routes (Express identifies it as an
// error handler by its 4-argument signature).
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Defense in depth: a "record not found" from Prisma that wasn't already
  // translated to a 404 by a service/controller (see quizzes.service.ts's
  // deleteQuiz for the normal path) still comes back as 404, not 500.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2025"
  ) {
    res.status(404).json({ message: "Resource not found" });
    return;
  }

  // express.json() throws a SyntaxError for malformed JSON bodies.
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
}
