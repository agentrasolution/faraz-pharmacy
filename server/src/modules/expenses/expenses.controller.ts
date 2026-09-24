import type { Request, Response, NextFunction } from "express";
import { expensesService } from "./expenses.service";

export const expensesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const isPaginated = req.query.paginated === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || (isPaginated ? 50 : 100000));
      const search = req.query.search as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      const result = await expensesService.list({ page, limit, search, dateFrom, dateTo });

      if (isPaginated) {
        res.json({
          data: result.data,
          meta: result.meta
        });
      } else {
        res.json(result.data);
      }
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expensesService.create(req.body);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expensesService.update(req.params.id, req.body);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await expensesService.delete(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
