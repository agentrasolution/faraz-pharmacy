import type { Request, Response, NextFunction } from "express";
import { suppliersService } from "./suppliers.service";
import { normalizeDistributor, normalizeDistributorList } from "../../utils/normalize";

export const suppliersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const isPaginated = req.query.paginated === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || (isPaginated ? 50 : 100000));
      const search = req.query.search as string | undefined;

      const result = await suppliersService.list({ page, limit, search });
      const normalized = normalizeDistributorList(result.data);

      if (isPaginated) {
        res.json({
          data: normalized,
          meta: result.meta,
        });
      } else {
        res.json(normalized);
      }
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
