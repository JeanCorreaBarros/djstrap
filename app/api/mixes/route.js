import { NextResponse } from "next/server";
import { listMixes, createMix } from "../../../lib/db";
import { currentUser, requireUser } from "../../../lib/auth";

export async function GET(req) {
  const u = await currentUser();
  const p = new URL(req.url).searchParams;
  const filter = p.get("filter");
  if ((filter === "mine" || filter === "saved") && !u) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  const mixes = await listMixes({ viewer: u?.id, sort: p.get("sort") || "recent", filter, q: p.get("q") || "" });
  return NextResponse.json({ mixes });
}

// Publicar una mezcla: multipart con "file", "title", "description", "occasion", "dur"
export async function POST(req) {
  const [u, err] = await requireUser();
  if (err) return err;
  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Falta el archivo de audio" }, { status: 400 });
  const r = await createMix(
    u,
    { title: form.get("title"), description: form.get("description"), occasion: form.get("occasion"), dur: form.get("dur") },
    Buffer.from(await file.arrayBuffer()),
    file.type
  );
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ mix: r.mix });
}
