import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { ApiError } from "../lib/api-error";

/** Validates `req.body` against `schema`; replaces it with the parsed
 * (typed, defaulted) value on success, or forwards a 400 ApiError on
 * failure — one issue per line, so the client gets a specific reason. */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join("; ");
      next(new ApiError(400, message));
      return;
    }
    req.body = result.data;
    next();
  };
}
