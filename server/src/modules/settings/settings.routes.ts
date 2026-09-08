import { Router } from "express";
import { settingsController } from "./settings.controller";

const router = Router();

// Backup routes
router.post("/backup", settingsController.createBackup);
router.get("/backups", settingsController.listBackups);
router.delete("/backup", settingsController.deleteBackup);
router.post("/backup/restore", settingsController.restoreBackup);
router.get("/backup/directory", settingsController.getBackupDirectory);
router.put("/backup/directory", settingsController.setBackupDirectory);

// Auto backup routes
router.get("/auto-backup", settingsController.getAutoBackupConfig);
router.put("/auto-backup", settingsController.saveAutoBackupConfig);

// Google Drive routes
router.get("/gdrive", settingsController.getGdriveConfig);
router.put("/gdrive", settingsController.saveGdriveConfig);

export { router as settingsRoutes };
