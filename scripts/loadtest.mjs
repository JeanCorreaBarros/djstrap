// Prueba de carga: N usuarios a la vez se registran, crean playlists, guardan su estado y buscan.
// Uso: node scripts/loadtest.mjs http://localhost:3100 100
const BASE = process.argv[2] || "http://localhost:3100";
const N = +(process.argv[3] || 100);
const tag = Date.now().toString(36);
const QUERIES = ["bad bunny", "karol g", "daft punk", "salsa clasica", "beele quevedo yo y tu"];
const OCC = ["fiesta", "boda", "cumple", "gym", "chill"];
const times = [];

async function req(path, { method = "GET", body, cookie } = {}) {
  const t0 = performance.now();
  const r = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  times.push(performance.now() - t0);
  return { status: r.status, d, cookie: r.headers.get("set-cookie")?.split(";")[0] };
}
function check(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function user(i) {
  const name = `u${tag}_${i}`;
  const reg = await req("/api/auth/register", { method: "POST", body: { username: name, password: "clave123" } });
  check(reg.status === 200 && reg.cookie, `registro ${reg.status} ${JSON.stringify(reg.d)}`);
  const c = reg.cookie;
  const me = await req("/api/auth/me", { cookie: c });
  check(me.d.user?.username === name, "sesión incorrecta");

  const p1 = await req("/api/playlists", {
    method: "POST",
    cookie: c,
    body: { name: `Fiesta de ${name}`, occasion: OCC[i % 5], tracks: [{ kind: "yt", id: "qy6PB3LQizY", title: "Yo y Tú" }] },
  });
  check(p1.status === 200, "crear playlist 1");
  const p2 = await req("/api/playlists", { method: "POST", cookie: c, body: { name: `Boda ${i}`, occasion: "boda" } });
  check(p2.status === 200, "crear playlist 2");
  const ren = await req(`/api/playlists/${p1.d.playlist.id}`, {
    method: "PATCH",
    cookie: c,
    body: { name: `Fiesta ${i} renombrada`, tracks: [...p1.d.playlist.tracks, { kind: "yt", id: "WN46hLQkFq0", title: "otra" }] },
  });
  check(ren.status === 200 && ren.d.playlist.tracks.length === 2, "editar playlist");
  const st = await req("/api/state", { method: "PUT", cookie: c, body: { queues: [[{ kind: "yt", id: "LPnNeR2UKFo", title: `cola de ${name}` }], []] } });
  check(st.status === 200, "guardar estado");
  const s = await req(`/api/search?q=${encodeURIComponent(QUERIES[i % QUERIES.length])}`, { cookie: c });
  check(s.status === 200 && s.d.items?.length > 0, `búsqueda sin resultados: ${JSON.stringify(s.d).slice(0, 120)}`);

  const list = await req("/api/playlists", { cookie: c });
  const names = list.d.playlists.map((p) => p.name).sort();
  check(names.length === 2 && names.includes(`Fiesta ${i} renombrada`) && names.includes(`Boda ${i}`), `ve playlists ajenas o faltan: ${names}`);
  const back = await req("/api/state", { cookie: c });
  check(back.d.queues[0][0].title === `cola de ${name}`, "estado de otro usuario");
  return { name, cookie: c, pid: p1.d.playlist.id };
}

const t0 = performance.now();
const results = await Promise.allSettled(Array.from({ length: N }, (_, i) => user(i)));
const total = performance.now() - t0;
const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
const fails = results.filter((r) => r.status === "rejected").map((r) => r.reason.message);

// Aislamiento: un usuario no puede tocar la playlist de otro
let isolation = "no probado";
if (ok.length >= 2) {
  const a = ok[0], b = ok[1];
  const steal = await req(`/api/playlists/${b.pid}`, { method: "PATCH", cookie: a.cookie, body: { name: "hackeada" } });
  const del = await req(`/api/playlists/${b.pid}`, { method: "DELETE", cookie: a.cookie });
  const anon = await req("/api/playlists");
  const forged = await req("/api/playlists", { cookie: b.cookie.replace(/.$/, (ch) => (ch === "A" ? "B" : "A")) });
  const wrongPw = await req("/api/auth/login", { method: "POST", body: { username: a.name, password: "mala" } });
  const login = await req("/api/auth/login", { method: "POST", body: { username: a.name, password: "clave123" } });
  isolation = {
    editarAjena: steal.status,
    borrarAjena: del.status,
    sinSesion: anon.status,
    cookieFalsa: forged.status,
    claveMala: wrongPw.status,
    loginOk: login.status,
  };
}

times.sort((x, y) => x - y);
const pct = (p) => Math.round(times[Math.floor(times.length * p)]);
console.log(JSON.stringify({
  usuarios: N,
  correctos: ok.length,
  fallidos: fails.length,
  errores: [...new Set(fails)].slice(0, 5),
  peticiones: times.length,
  tiempoTotalSeg: +(total / 1000).toFixed(1),
  latenciaMs: { p50: pct(0.5), p95: pct(0.95), max: Math.round(times[times.length - 1]) },
  aislamiento: isolation,
}, null, 2));
