import { NextResponse } from "next/server";
import { changePassword } from "../../../../lib/db";
import { readJson, requireUser, setSession } from "../../../../lib/auth";

// { current, next } — cierra las demás sesiones y renueva la de este dispositivo
export async function POST(req) {
  const [u, err] = await requireUser();
  if (err) return err;
  const { current, next } = await readJson(req);
  const r = await changePassword(u.id, current, next);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  await setSession(req, res, u.id);
  return res;
}
