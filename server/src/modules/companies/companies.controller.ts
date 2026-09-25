import type { Request, Response, NextFunction } from "express";
import { companiesService } from "./companies.service";
import { createCompanySchema } from "./companies.schema";

export const companiesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const isPaginated = req.query.paginated === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || (isPaginated ? 50 : 100000));
      const search = req.query.search as string | undefined;

      const result = await companiesService.list({ page, limit, search });
      if (isPaginated) {
        res.json(result);
      } else {
        res.json(result.data);
      }
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companiesService.getById(req.params.id);
      res.json(company);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCompanySchema.parse(req.body);
      const company = await companiesService.create(data);
      res.status(201).json(company);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = createCompanySchema.parse(req.body);
      const company = await companiesService.update(id, data);
      res.json(company);
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await companiesService.remove(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
