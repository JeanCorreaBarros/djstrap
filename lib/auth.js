// Sesión firmada en cookie httpOnly: "<userId>.<versión>.<expira>.<firma>"
// La versión sube al cambiar la contraseña, y eso cierra las sesiones de otros dispositivos.
import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSecret, getUser, isAdmin } from "./db";

const NAME = "dj_session";
const MAX_AGE = 60 * 60 * 24 * 30;

const hmac = async (body) => crypto.createHmac("sha256", await getSecret()).update(body).digest("base64url");

export async function setSession(req, res, uid) {
  const sv = (await getUser(uid))?.sv || 0;
  const body = `${uid}.${sv}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  const https = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
  res.cookies.set(NAME, `${body}.${await hmac(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: https,
  });
}

export function clearSession(res) {
  res.cookies.set(NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function currentUser() {
  const c = cookies().get(NAME)?.value;
  if (!c) return null;
  const parts = c.split(".");
  // formato anterior sin versión (uid.exp.firma) = versión 0
  const [uid, sv, exp, sig] = parts.length === 3 ? [parts[0], null, parts[1], parts[2]] : parts;
  if (!uid || !exp || !sig) return null;
  const body = sv === null ? `${uid}.${exp}` : `${uid}.${sv}.${exp}`;
  const good = Buffer.from(await hmac(body));
  const got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  if (+exp < Date.now() / 1000) return null;
  const u = await getUser(uid);
  if (!u || (u.sv || 0) !== (+sv || 0)) return null;
  return u;
}

// Devuelve [usuario, null] o [null, respuesta 401]
export async function requireUser() {
  const u = await currentUser();
  if (!u) return [null, NextResponse.json({ error: "Inicia sesión" }, { status: 401 })];
  return [u, null];
}

// Solo administradores: [usuario, null] o [null, 401/403]
export async function requireAdmin() {
  const [u, err] = await requireUser();
  if (err) return [null, err];
  if (!(await isAdmin(u))) return [null, NextResponse.json({ error: "Solo para administradores" }, { status: 403 })];
  return [u, null];
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
