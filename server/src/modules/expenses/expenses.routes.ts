import { Router } from "express";
import { expensesController } from "./expenses.controller";
import { validate } from "../../middleware/validate";
import { createExpenseSchema, updateExpenseSchema } from "./expenses.schema";

const router = Router();

router.get("/", expensesController.list);
router.post("/", validate(createExpenseSchema), expensesController.create);
router.put("/:id", validate(updateExpenseSchema), expensesController.update);
router.delete("/:id", expensesController.delete);
router.post("/:id/restore", expensesController.restore);
router.delete("/:id/hard", expensesController.hardDelete);

export { router as expensesRoutes };
