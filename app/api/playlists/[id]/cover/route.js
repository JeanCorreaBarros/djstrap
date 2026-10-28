import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { setPlaylistCover, playlistCoverFile } from "../../../../../lib/db";
import { readJson, requireUser } from "../../../../../lib/auth";

// Sirve la portada (solo al dueño de la playlist)
export async function GET(req, { params }) {
  const [u, err] = await requireUser();
  if (err) return err;
  const f = await playlistCoverFile(u.id, params.id);
  const buf = f && (await fs.readFile(f.path).catch(() => null));
  if (!buf) return new Response("No encontrada", { status: 404 });
  return new Response(buf, { headers: { "Content-Type": f.mime, "Cache-Control": "private, max-age=31536000, immutable" } });
}

// { image: "data:image/jpeg;base64,..." } para subir, { image: null } para quitarla
export async function POST(req, { params }) {
  const [u, err] = await requireUser();
  if (err) return err;
  const { image } = await readJson(req);
  let buffer = null;
  let type = null;
  if (image) {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(image));
    if (!m) return NextResponse.json({ error: "Imagen no válida" }, { status: 400 });
    type = m[1];
    buffer = Buffer.from(m[2], "base64");
  }
  const r = await setPlaylistCover(u.id, params.id, buffer, type);
  if (r.notFound) return NextResponse.json({ error: "Playlist no encontrada" }, { status: 404 });
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ playlist: r.playlist });
}
