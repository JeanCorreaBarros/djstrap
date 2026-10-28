import { NextResponse } from "next/server";
import { promises as fs, createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { recordDownload } from "../../../lib/db";

// Sirve el instalador de Windows generado en dist/ (si existe)
async function findInstaller() {
  const dir = path.join(process.cwd(), process.env.DJ_DIST_DIR || "dist");
  try {
    const files = (await fs.readdir(dir)).filter((f) => /^DJStrap-Setup.*\.exe$/i.test(f)).sort();
    if (!files.length) return null;
    const name = files[files.length - 1];
    const stat = await fs.stat(path.join(dir, name));
    return { name, size: stat.size, file: path.join(dir, name) };
  } catch {
    return null;
  }
}

export async function GET(req) {
  const inst = await findInstaller();
  if (new URL(req.url).searchParams.has("check"))
    return NextResponse.json(inst ? { available: true, name: inst.name, size: inst.size } : { available: false });
  if (!inst) return NextResponse.json({ error: "Instalador no disponible" }, { status: 404 });
  await recordDownload(inst.name).catch(() => {});
  return new Response(Readable.toWeb(createReadStream(inst.file)), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${inst.name}"`,
      "Content-Length": String(inst.size),
    },
  });
}
