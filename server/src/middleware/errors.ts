import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../services/prisma";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => {
      const path = e.path.join(".");
      return path ? `${path}: ${e.message}` : e.message;
    });
    res.status(400).json({ error: messages.join(" | ") });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[]) || (err.meta?.driverAdapterError as any)?.cause?.constraint?.fields;
      const modelName = (err.meta?.modelName as string) || "Record";
      const field = target ? target.join(", ") : "field";
      res.status(400).json({ error: `${modelName} ${field} already exists.` });
      return;
    }
    
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found." });
      return;
    }

    if (err.code === "P2003") {
      res.status(400).json({ error: "Cannot modify this record because it is currently linked to other data." });
      return;
    }
  }

  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
