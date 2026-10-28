import { promises as fs } from "fs";
import { avatarFile } from "../../../../lib/db";

// Foto de perfil (pública, como en cualquier red social)
export async function GET(req, { params }) {
  const f = await avatarFile(params.id);
  const buf = f && (await fs.readFile(f.path).catch(() => null));
  if (!buf) return new Response("No encontrada", { status: 404 });
  return new Response(buf, { headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=31536000, immutable" } });
}
