import { PrismaClient } from "@prisma/client";

// Single shared instance, imported everywhere the app needs the DB — avoids
// exhausting Postgres connections by creating a new client per request.
export const prisma = new PrismaClient();
