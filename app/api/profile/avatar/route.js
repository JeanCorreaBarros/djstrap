import { NextResponse } from "next/server";
import { setAvatar } from "../../../../lib/db";
import { readJson, requireUser } from "../../../../lib/auth";

// { image: "data:image/jpeg;base64,..." } para subir, { image: null } para quitarla
export async function POST(req) {
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
  const r = await setAvatar(u.id, buffer, type);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ user: r.user });
}
