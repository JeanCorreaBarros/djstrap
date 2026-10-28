// App de escritorio: arranca el servidor de DJ Strap dentro de la app y lo abre en una ventana propia.
// Si existe DJSTRAP_URL (o "url" en settings.json de la carpeta de datos) se conecta a la web publicada.
const { app, BrowserWindow, session, shell, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const PORT = 37425; // puerto fijo: así la sesión y los archivos guardados se mantienen entre aperturas

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) app.quit();

let win;

function remoteUrl() {
  if (process.env.DJSTRAP_URL) return process.env.DJSTRAP_URL;
  try {
    const s = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "settings.json"), "utf8"));
    return s.url || null;
  } catch {
    return null;
  }
}

const ping = (url) =>
  new Promise((res) => {
    const r = http.get(url + "/api/auth/me", (x) => { x.resume(); res(x.statusCode === 200); });
    r.on("error", () => res(false));
    r.setTimeout(1000, () => { r.destroy(); res(false); });
  });

async function startServer() {
  const url = `http://127.0.0.1:${PORT}`;
  if (await ping(url)) return url;
  const dir = app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..", ".next-desktop", "standalone");
  if (!fs.existsSync(path.join(dir, "server.js"))) throw new Error(`No se encontró el servidor en ${dir}. Ejecuta "npm run desktop:build".`);
  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.NODE_ENV = "production";
  process.env.DJ_DATA_DIR = path.join(app.getPath("userData"), "data");
  process.env.SITE_URL = url;
  require(path.join(dir, "server.js"));
  for (let i = 0; i < 150; i++) {
    if (await ping(url)) return url;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("El servidor interno no arrancó.");
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0e0b0a",
    title: "DJ Strap",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true },
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  try {
    const url = remoteUrl() || (await startServer());
    await win.loadURL(url);
  } catch (e) {
    dialog.showErrorBox("DJ Strap", String(e.message || e));
    app.quit();
  }
}

app.whenReady().then(() => {
  // micrófono, salidas de audio y pantalla completa
  const allowed = ["media", "fullscreen", "speaker-selection", "clipboard-sanitized-write", "wake-lock", "audioCapture"];
  session.defaultSession.setPermissionRequestHandler((_, perm, cb) => cb(allowed.includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_, perm) => allowed.includes(perm));

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "DJ Strap",
        submenu: [
          { role: "reload", label: "Recargar" },
          { role: "togglefullscreen", label: "Pantalla completa" },
          { role: "zoomIn", label: "Acercar" },
          { role: "zoomOut", label: "Alejar" },
          { role: "resetZoom", label: "Tamaño normal" },
          { type: "separator" },
          { role: "toggleDevTools", label: "Herramientas de desarrollo" },
          { role: "quit", label: "Salir" },
        ],
      },
    ])
  );
  createWindow();
});

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.on("window-all-closed", () => app.quit());
