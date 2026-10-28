import { NextResponse } from "next/server";
import { getProfile, updateProfile, deleteUser } from "../../../lib/db";
import { readJson, requireUser, clearSession } from "../../../lib/auth";

export async function GET() {
  const [u, err] = await requireUser();
  if (err) return err;
  return NextResponse.json(await getProfile(u.id));
}

// { displayName?, bio? }
export async function PATCH(req) {
  const [u, err] = await requireUser();
  if (err) return err;
  const r = await updateProfile(u.id, await readJson(req));
  return NextResponse.json({ user: r.user });
}

// Eliminar la cuenta: { password }
export async function DELETE(req) {
  const [u, err] = await requireUser();
  if (err) return err;
  const r = await deleteUser(u.id, (await readJson(req)).password);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  clearSession(res);
  return res;
}
