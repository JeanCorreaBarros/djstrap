import { NextResponse } from "next/server";

const decode = (s = "") =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function extractId(q) {
  const m = q.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(q)) return q;
  return null;
}

// Caché compartida: la misma búsqueda de muchos usuarios va una sola vez a YouTube
const TTL = 15 * 60 * 1000;
const MAX = 1000;
const cache = (globalThis.__searchCache ||= new Map());

async function byId(id) {
  const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
  const j = r.ok ? await r.json() : {};
  return {
    items: [
      { id, title: j.title || id, channel: j.author_name || "", thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` },
    ],
  };
}

// Sin API key: se lee la página de resultados de YouTube como lo haría el navegador
async function search(q) {
  const r = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
        Cookie: "CONSENT=YES+1; SOCS=CAI",
      },
      cache: "no-store",
    }
  );
  const html = await r.text();
  const m = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if (!m) return { items: [], error: "YouTube no devolvió resultados.", noCache: true };
  const items = [];
  const walk = (o) => {
    if (!o || typeof o !== "object" || items.length >= 15) return;
    if (o.videoRenderer?.videoId) {
      const v = o.videoRenderer;
      items.push({
        id: v.videoId,
        title: decode(v.title?.runs?.map((x) => x.text).join("") || ""),
        channel: decode(v.ownerText?.runs?.[0]?.text || ""),
        length: v.lengthText?.simpleText || "",
        thumb: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      });
      return;
    }
    for (const k in o) walk(o[k]);
  };
  walk(JSON.parse(m[1]));
  return { items };
}

export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 150);
  if (!q) return NextResponse.json({ items: [] });
  const key = q.toLowerCase().replace(/\s+/g, " ");

  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return NextResponse.json(await hit.p);

  const id = extractId(q);
  const p = (id ? byId(id) : search(q)).catch(() => ({ items: [], error: "No se pudo buscar en YouTube.", noCache: true }));
  cache.set(key, { t: Date.now(), p });
  if (cache.size > MAX) cache.delete(cache.keys().next().value);

  const body = await p;
  if (body.noCache) cache.delete(key);
  const { noCache, ...out } = body;
  return NextResponse.json(out);
}
