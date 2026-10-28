// Crea una cuenta de administrador con contraseña aleatoria y la marca como admin.
// Uso: npm run admin:create -- [usuario] [url]   (el servidor debe estar encendido)
// Las credenciales se guardan en ADMIN-CREDENCIALES.txt (no se sube a git ni va en la app de escritorio).
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";

const username = process.argv[2] || "admin_strap";
const base = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const dir = process.env.DJ_DATA_DIR || path.join(process.cwd(), "data");
const password = randomBytes(12).toString("base64url");

const r = await fetch(`${base}/api/auth/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password }),
}).catch(() => null);
if (!r) {
  console.error(`No se pudo conectar con ${base}. Enciende el servidor (npm run dev) y vuelve a intentarlo.`);
  process.exit(1);
}
const d = await r.json().catch(() => ({}));
if (!r.ok) {
  console.error(`No se pudo crear "${username}": ${d.error || r.status}. Prueba con otro nombre: npm run admin:create -- otro_nombre`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
const file = path.join(dir, "admins.json");
let admins = [];
try {
  admins = JSON.parse(readFileSync(file, "utf8"));
} catch {}
if (!admins.map((x) => x.toLowerCase()).includes(username.toLowerCase())) admins.push(username);
writeFileSync(file, JSON.stringify(admins, null, 2));

writeFileSync(
  "ADMIN-CREDENCIALES.txt",
  `Cuenta de administrador de DJ Strap\n\nUsuario:    ${username}\nContraseña: ${password}\nEntrar en:  ${base}\n\nCámbiala desde "Mi perfil" después de entrar y borra este archivo.\n`
);
console.log(`Administrador "${username}" creado. Credenciales guardadas en ADMIN-CREDENCIALES.txt`);
