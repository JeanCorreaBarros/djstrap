import { NextResponse } from "next/server";
import { verifyUser, userPayload } from "../../../../lib/db";
import { readJson, setSession } from "../../../../lib/auth";

export async function POST(req) {
  const { username, password } = await readJson(req);
  const u = await verifyUser(username, password);
  if (!u) return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  const res = NextResponse.json({ user: await userPayload(u) });
  await setSession(req, res, u.id);
  return res;
}
