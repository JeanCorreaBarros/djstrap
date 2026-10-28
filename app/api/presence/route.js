import { NextResponse } from "next/server";
import { touchUser } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

// La app avisa cada minuto que el usuario sigue conectado (para "usando ahora" en el panel de admin)
export async function POST() {
  const [u, err] = await requireUser();
  if (err) return err;
  await touchUser(u.id);
  return NextResponse.json({ ok: true });
}
