import { settingsService } from "./settings.service";
import { logger } from "../../utils/logger";

let timer: NodeJS.Timeout | null = null;

function parseSchedule(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || "").trim());
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function msUntilNext(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runBackup() {
  try {
    const result = await settingsService.createBackup();
    logger.info(`Auto backup created: ${result.name}`);
  } catch (err) {
    logger.error("Auto backup failed:", err);
  }
}

function schedule() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const cfg = settingsService.getAutoBackupConfig();
  const parsed = parseSchedule(String(cfg.time || "02:00"));

  if (!cfg.enabled || !parsed) {
    logger.info("Auto backup disabled or invalid schedule — stopped");
    return;
  }

  const delay = msUntilNext(parsed.hour, parsed.minute);
  timer = setTimeout(async () => {
    await runBackup();
    schedule();
  }, delay);

  logger.info(
    `Auto backup scheduled — next run at ${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")} (in ~${Math.round(delay / 60000)} min)`
  );
}

function startAutoBackupScheduler() {
  schedule();
}

function stopAutoBackupScheduler() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export {
  startAutoBackupScheduler,
  stopAutoBackupScheduler,
  schedule as rescheduleAutoBackupScheduler,
};
