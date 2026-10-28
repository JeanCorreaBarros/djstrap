// Compila la web como servidor autónomo para Electron (.next-desktop/standalone)
import { execSync } from "child_process";
import { cpSync, rmSync, existsSync } from "fs";
import path from "path";

const root = process.cwd();
const out = path.join(root, ".next-desktop");
const sa = path.join(out, "standalone");

// OneDrive o el antivirus pueden bloquear archivos un momento: reintentar
rmSync(out, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
execSync("npx next build", { stdio: "inherit", env: { ...process.env, DJ_DESKTOP: "1" } });

if (!existsSync(path.join(sa, "server.js"))) throw new Error("No se generó el servidor autónomo");
cpSync(path.join(out, "static"), path.join(sa, ".next-desktop", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(sa, "public"), { recursive: true });
// nunca empaquetar datos de usuarios ni instaladores
for (const d of ["data", "dist", "electron", "build", "scripts", ".next", ".claude", "ADMIN-CREDENCIALES.txt"]) rmSync(path.join(sa, d), { recursive: true, force: true });
console.log("Servidor de escritorio listo en", sa);
