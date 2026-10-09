import type { Request, Response, NextFunction } from "express";
import { reportsService } from "./reports.service";

export const reportsController = {
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await reportsService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async productReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, dateFrom, dateTo, tzOffset } = req.query;
      if (!productId || typeof productId !== "string") {
        res.status(400).json({ error: "productId query parameter is required" });
        return;
      }
      const report = await reportsService.getProductReport({
        productId,
        dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
        dateTo: typeof dateTo === "string" ? dateTo : undefined,
        tzOffsetMinutes: tzOffset ? parseInt(String(tzOffset), 10) : undefined,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
};
