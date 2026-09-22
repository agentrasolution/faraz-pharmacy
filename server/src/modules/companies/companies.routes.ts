import { Router } from "express";
import { companiesController } from "./companies.controller";

const router = Router();

router.get("/", companiesController.list);
router.post("/", companiesController.create);
router.put("/:id", companiesController.update);
router.delete("/:id", companiesController.remove);

export { router as companiesRoutes };
