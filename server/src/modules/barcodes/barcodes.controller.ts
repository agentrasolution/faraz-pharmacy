import type { Request, Response, NextFunction } from "express";
import { barcodesService } from "./barcodes.service";

export const barcodesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const barcodes = await barcodesService.list(includeArchived);
      res.json(barcodes);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const barcode = await barcodesService.create(req.body.code);
      res.json(barcode);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await barcodesService.archive(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await barcodesService.restore(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await barcodesService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
