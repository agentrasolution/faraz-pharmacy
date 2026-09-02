import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { registerHandlers } from "./ipc-handlers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev =
  process.env.NODE_ENV === "development" || process.argv.includes("--dev") || !app.isPackaged;

Menu.setApplicationMenu(null);

let windowSeq = 0;

function createWindow({ posOnly = false } = {}) {
  windowSeq += 1;
  const isPrimary = windowSeq === 1;
  const posHash = posOnly ? "/pos?pos=1" : "/pos";

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Faraz Pharmacy",
    icon: path.join(__dirname, "..", "src", "asset", "image", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
    titleBarStyle: "hiddenInset",
  });

  if (isDev) {
    const DEV_URL = "http://localhost:5173";
    const loadDev = (attempt = 0) => {
      win
        .loadURL(`${DEV_URL}/#${posHash}`)
        .catch(() => {
          if (attempt < 60) {
            setTimeout(() => loadDev(attempt + 1), 500);
          }
        });
    };
    loadDev();
    if (isPrimary) {
      win.webContents.once("did-finish-load", () => win.webContents.openDevTools({ mode: "detach" }));
    }
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"), { hash: posHash });
  }

  win.once("ready-to-show", () => win.show());
  return win;
}

ipcMain.handle("pos:open-window", () => {
  try {
    const win = createWindow({ posOnly: true });
    if (win) return { success: true };
    return { success: false, error: "Could not create window" };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  registerHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
