import { Router } from "express";
import { reportsController } from "./reports.controller";

const router = Router();

router.get("/stats", reportsController.stats);
router.get("/product", reportsController.productReport);

export { router as reportsRoutes };
