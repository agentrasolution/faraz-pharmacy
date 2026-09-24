import type { Request, Response, NextFunction } from "express";
import { categoriesService } from "./categories.service";

export const categoriesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
      const search = req.query.search as string | undefined;

      const result = await categoriesService.list({ page, limit, search });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoriesService.create(req.body);
      res.json(category);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoriesService.update(req.params.id, req.body);
      res.json(category);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoriesService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
