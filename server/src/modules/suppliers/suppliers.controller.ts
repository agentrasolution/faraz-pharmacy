import type { Request, Response, NextFunction } from "express";
import { suppliersService } from "./suppliers.service";
import { normalizeDistributor, normalizeDistributorList } from "../../utils/normalize";

export const suppliersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
      const search = req.query.search as string | undefined;

      const result = await suppliersService.list({ page, limit, search });
      res.json({
        data: normalizeDistributorList(result.data),
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const distributor = await suppliersService.create(req.body);
      res.json(normalizeDistributor(distributor));
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const distributor = await suppliersService.update(req.params.id, req.body);
      res.json(normalizeDistributor(distributor));
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await suppliersService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
