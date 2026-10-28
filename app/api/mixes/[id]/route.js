import { NextResponse } from "next/server";
import { getMix, mixAction, deleteMix } from "../../../../lib/db";
import { currentUser, requireUser, readJson } from "../../../../lib/auth";

const fail = (error, status) => NextResponse.json({ error }, { status });

export async function GET(req, { params }) {
  const u = await currentUser();
  const m = await getMix(params.id, u?.id);
  return m ? NextResponse.json({ mix: m }) : fail("Mezcla no encontrada", 404);
}

// { action: "like" | "save" | "comment" | "uncomment" | "play", text?, cid? }
export async function POST(req, { params }) {
  const u = await currentUser();
  const body = await readJson(req);
  const r = await mixAction(u, params.id, body.action, body);
  if (r.notFound) return fail("No encontrado", 404);
  if (r.auth) return fail("Inicia sesión para hacer esto", 401);
  if (r.forbidden) return fail("No tienes permiso", 403);
  if (r.error) return fail(r.error, 400);
  return NextResponse.json({ mix: r.mix });
}

export async function DELETE(req, { params }) {
  const [u, err] = await requireUser();
  if (err) return err;
  const r = await deleteMix(u.id, params.id);
  if (r.notFound) return fail("No encontrado", 404);
  if (r.forbidden) return fail("Solo el autor puede borrar la mezcla", 403);
  return NextResponse.json({ ok: true });
}
