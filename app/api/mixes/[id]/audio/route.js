import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import { mixFile } from "../../../../../lib/db";

// Audio con soporte de rangos para poder adelantar/atrasar en el reproductor
export async function GET(req, { params }) {
  const f = await mixFile(params.id);
  if (!f) return new Response("No encontrado", { status: 404 });
  const size = (await fs.stat(f.path).catch(() => null))?.size;
  if (size == null) return new Response("No encontrado", { status: 404 });
  const headers = { "Content-Type": f.mime, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400" };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  if (m && (m[1] || m[2])) {
    let start = m[1] ? +m[1] : size - +m[2];
    let end = m[1] && m[2] ? +m[2] : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(f.path, { start, end })), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(createReadStream(f.path)), { headers: { ...headers, "Content-Length": String(size) } });
}
