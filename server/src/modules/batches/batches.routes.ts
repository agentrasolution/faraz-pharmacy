import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { batchesController } from "./batches.controller";

export const batchesRoutes = Router();

batchesRoutes.use(authenticate);

batchesRoutes.get("/expiring", batchesController.listExpiring);
batchesRoutes.get("/trace", batchesController.trace);
batchesRoutes.get("/product/:productId", batchesController.listByProduct);
batchesRoutes.get("/", batchesController.listAll);
