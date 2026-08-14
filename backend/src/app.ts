import cors from "cors";
import express, { Request, Response } from "express";

export const app = express();

app.use(cors());
app.use(express.json());

// Throwaway route to prove the server + TS build pipeline work before real
// endpoints are added. Not part of the project.txt spec.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});
