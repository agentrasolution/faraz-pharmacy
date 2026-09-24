import type { Request, Response, NextFunction } from "express";
import { customersService } from "./customers.service";

export const customersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const isPaginated = req.query.paginated === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || (isPaginated ? 50 : 100000));
      const search = req.query.search as string | undefined;
      
      const result = await customersService.list({ page, limit, search });
      
      if (isPaginated) {
        res.json(result);
      } else {
        res.json(result.data);
      }
    } catch (err) {
      next(err);
    }
  },

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query.q as string;
      if (!q) return res.json([]);
      const result = await customersService.list({ search: q, limit: 20 });
      res.json(result.data); // maintain array return for /search
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customersService.getById(req.params.id);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customersService.create(req.body);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customersService.update(req.params.id, req.body);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === "true";
      const result = await customersService.delete(req.params.id, force);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
