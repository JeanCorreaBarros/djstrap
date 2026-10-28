import { NextResponse } from "next/server";
import { listPlaylists, createPlaylist } from "../../../lib/db";
import { readJson, requireUser } from "../../../lib/auth";

export async function GET() {
  const [u, err] = await requireUser();
  if (err) return err;
  return NextResponse.json({ playlists: await listPlaylists(u.id) });
}

export async function POST(req) {
  const [u, err] = await requireUser();
  if (err) return err;
  const r = await createPlaylist(u.id, await readJson(req));
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ playlist: r.playlist });
}
