import { NextResponse } from "next/server";
import { updatePlaylist, deletePlaylist } from "../../../../lib/db";
import { readJson, requireUser } from "../../../../lib/auth";

const notFound = () => NextResponse.json({ error: "Playlist no encontrada" }, { status: 404 });

export async function PATCH(req, { params }) {
  const [u, err] = await requireUser();
  if (err) return err;
  const r = await updatePlaylist(u.id, params.id, await readJson(req));
  if (r.notFound) return notFound();
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ playlist: r.playlist });
}

export async function DELETE(req, { params }) {
  const [u, err] = await requireUser();
  if (err) return err;
  const r = await deletePlaylist(u.id, params.id);
  if (r.notFound) return notFound();
  return NextResponse.json({ ok: true });
}
