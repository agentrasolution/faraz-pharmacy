import type { Request, Response, NextFunction } from "express";
import { companiesService } from "./companies.service";
import { createCompanySchema } from "./companies.schema";

export const companiesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const companies = await companiesService.list();
      res.json(companies);
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
