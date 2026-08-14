import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient instance — see ../../../rules/04-backend-rules.md.
export const prisma = new PrismaClient();
