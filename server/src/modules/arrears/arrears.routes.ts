import { Router } from "express";
import { arrearsController } from "./arrears.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createArrearSchema, payArrearSchema, settleArrearSchema } from "./arrears.schema";

const router = Router();

router.use(authenticate);

router.get("/", arrearsController.list);
router.get("/by-customer", arrearsController.listByCustomer);
router.get("/customer/:id/ledger", arrearsController.getCustomerLedger);
router.post("/customer/:id/pay", arrearsController.recordCustomerPayment);
router.post("/", validate(createArrearSchema), arrearsController.create);
router.post("/:id/pay", validate(payArrearSchema), arrearsController.recordPayment);
router.post("/:id/settle", validate(settleArrearSchema), arrearsController.settle);
router.delete("/:id", arrearsController.delete);

export { router as arrearsRoutes };

