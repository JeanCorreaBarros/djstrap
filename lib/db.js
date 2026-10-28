// Base de datos en un archivo JSON (un solo proceso Node). Escrituras agrupadas y atómicas.
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);
const DIR = process.env.DJ_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DIR, "db.json");
const S = (globalThis.__djdb ||= { data: null, loading: null, saving: null, dirty: false });

const LIMITS = { playlists: 200, tracks: 500 };
export const OCCASIONS = ["fiesta", "boda", "cumple", "gym", "chill", "lounge", "evento", "otra"];
const USER_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const newId = () => crypto.randomBytes(9).toString("base64url");

async function persist() {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(S.data));
  // En Windows/OneDrive el archivo puede estar bloqueado un instante
  for (let k = 0; ; k++) {
    try {
      await fs.rename(tmp, FILE);
      return;
    } catch (e) {
      if (k >= 8 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) throw e;
      await new Promise((r) => setTimeout(r, 50 * (k + 1)));
    }
  }
}

function save() {
  S.dirty = true;
  if (S.saving) return S.saving;
  S.saving = (async () => {
    try {
      while (S.dirty) {
        S.dirty = false;
        await new Promise((r) => setTimeout(r, 40));
        await persist();
      }
    } catch (e) {
      console.error("No se pudo guardar la base de datos", e);
    } finally {
      S.saving = null;
    }
  })();
  return S.saving;
}

async function db() {
  if (S.data) return S.data;
  S.loading ||= (async () => {
    try {
      S.data = JSON.parse(await fs.readFile(FILE, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      S.data = { users: {}, names: {}, playlists: {}, state: {}, secret: crypto.randomBytes(32).toString("hex") };
      await persist();
    }
    return S.data;
  })();
  return S.loading;
}

export async function getSecret() {
  return process.env.SESSION_SECRET || (await db()).secret;
}

// ---------- usuarios
export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName || "",
  bio: u.bio || "",
  avatar: u.avatarFile ? `/api/avatars/${u.id}?v=${u.avatarV || 0}` : null,
  created: u.created,
});

// ---------- administración: rol, presencia, visitas y descargas
// Los administradores se listan en data/admins.json (lo crea "npm run admin:create")
let adminCache = { t: 0, list: [] };
async function adminList() {
  if (Date.now() - adminCache.t < 5000) return adminCache.list;
  let list = [];
  try {
    list = JSON.parse(await fs.readFile(path.join(DIR, "admins.json"), "utf8")).map((x) => String(x).toLowerCase());
  } catch {}
  adminCache = { t: Date.now(), list };
  return list;
}
export async function isAdmin(u) {
  return !!u && (await adminList()).includes(u.username.toLowerCase());
}
// Datos del usuario para el cliente, con la marca de administrador
export async function userPayload(u) {
  return { ...publicUser(u), admin: await isAdmin(u) };
}

const presence = (globalThis.__djPresence ||= new Map()); // uid -> última actividad (memoria)
const today = () => new Date().toISOString().slice(0, 10);

export async function touchUser(uid) {
  const d = await db();
  const u = d.users[uid];
  if (!u) return;
  presence.set(uid, Date.now());
  if (!u.lastSeen || Date.now() - u.lastSeen > 5 * 60 * 1000) {
    u.lastSeen = Date.now();
    await save();
  }
}

export async function recordVisit() {
  const d = await db();
  d.stats ||= { visits: {}, downloads: [] };
  d.stats.visits[today()] = (d.stats.visits[today()] || 0) + 1;
  save();
}

export async function recordDownload(name) {
  const d = await db();
  d.stats ||= { visits: {}, downloads: [] };
  d.stats.downloads.push({ at: Date.now(), file: name });
  if (d.stats.downloads.length > 5000) d.stats.downloads.splice(0, d.stats.downloads.length - 5000);
  await save();
}

export async function adminStats() {
  const d = await db();
  const now = Date.now();
  const DAY = 86400000;
  const st = d.stats || { visits: {}, downloads: [] };
  const users = Object.values(d.users);
  const mixes = Object.values(d.mixes || {});
  const last = (u) => Math.max(presence.get(u.id) || 0, u.lastSeen || 0);
  const days = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * DAY).toISOString().slice(0, 10));
  const byDay = (times) => {
    const c = Object.fromEntries(days.map((k) => [k, 0]));
    for (const t of times) {
      const k = new Date(t).toISOString().slice(0, 10);
      if (k in c) c[k]++;
    }
    return days.map((k) => ({ day: k, n: c[k] }));
  };
  return {
    totals: {
      users: users.length,
      onlineNow: [...presence.values()].filter((t) => now - t < 2 * 60 * 1000).length,
      active24h: users.filter((u) => now - last(u) < DAY).length,
      active7d: users.filter((u) => now - last(u) < 7 * DAY).length,
      newToday: users.filter((u) => new Date(u.created).toISOString().slice(0, 10) === today()).length,
      downloads: st.downloads.length,
      downloadsToday: st.downloads.filter((x) => new Date(x.at).toISOString().slice(0, 10) === today()).length,
      visitsToday: st.visits[today()] || 0,
      visits30d: days.reduce((a, k) => a + (st.visits[k] || 0), 0),
      playlists: Object.values(d.playlists).reduce((a, p) => a + Object.keys(p).length, 0),
      mixes: mixes.length,
      plays: mixes.reduce((a, m) => a + m.plays, 0),
    },
    signups: byDay(users.map((u) => u.created)),
    downloads: byDay(st.downloads.map((x) => x.at)),
    visits: days.map((k) => ({ day: k, n: st.visits[k] || 0 })),
    recentDownloads: st.downloads.slice(-20).reverse(),
    users: users
      .map((u) => ({
        username: u.username,
        displayName: u.displayName || "",
        created: u.created,
        lastSeen: last(u) || null,
        online: now - (presence.get(u.id) || 0) < 2 * 60 * 1000,
        playlists: Object.keys(d.playlists[u.id] || {}).length,
        mixes: mixes.filter((m) => m.userId === u.id).length,
      }))
      .sort((a, b) => b.created - a.created),
  };
}

// ---------- perfil
const AVATAR_DIR = path.join(DIR, "avatars");

export async function getProfile(uid) {
  const d = await db();
  const u = d.users[uid];
  if (!u) return null;
  const mixes = Object.values(d.mixes || {}).filter((m) => m.userId === uid);
  return {
    user: publicUser(u),
    stats: {
      playlists: Object.keys(d.playlists[uid] || {}).length,
      mixes: mixes.length,
      likes: mixes.reduce((a, m) => a + Object.keys(m.likes).length, 0),
      plays: mixes.reduce((a, m) => a + m.plays, 0),
      comments: mixes.reduce((a, m) => a + m.comments.length, 0),
      played: (d.state[uid]?.history || []).length,
    },
  };
}

export async function updateProfile(uid, input = {}) {
  const d = await db();
  const u = d.users[uid];
  if (!u) return { notFound: true };
  if (input.displayName !== undefined) u.displayName = str(input.displayName, 40);
  if (input.bio !== undefined) u.bio = str(input.bio, 200);
  await save();
  return { user: publicUser(u) };
}

export async function setAvatar(uid, buffer, type) {
  const d = await db();
  const u = d.users[uid];
  if (!u) return { notFound: true };
  const old = u.avatarFile;
  if (buffer) {
    if (!COVER_EXT[type]) return { error: "Formato no soportado (usa JPG, PNG o WebP)" };
    if (buffer.length > COVER_MAX) return { error: "La imagen es demasiado grande" };
    const file = `${uid}_${Date.now()}.${COVER_EXT[type]}`;
    await fs.mkdir(AVATAR_DIR, { recursive: true });
    await fs.writeFile(path.join(AVATAR_DIR, file), buffer);
    u.avatarFile = file;
    u.avatarV = Date.now();
  } else {
    delete u.avatarFile;
  }
  await save();
  if (old && old !== u.avatarFile) await fs.unlink(path.join(AVATAR_DIR, old)).catch(() => {});
  return { user: publicUser(u) };
}

export async function avatarFile(uid) {
  const d = await db();
  const f = has(d.users, uid) && d.users[uid].avatarFile;
  if (!f) return null;
  return { path: path.join(AVATAR_DIR, f), mime: f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" };
}

export async function changePassword(uid, current, next) {
  const d = await db();
  const u = d.users[uid];
  if (!u) return { notFound: true };
  if (typeof next !== "string" || next.length < 6 || next.length > 100) return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
  const ok = await verifyUser(u.username, current);
  if (!ok) return { error: "La contraseña actual no es correcta" };
  if (current === next) return { error: "La nueva contraseña debe ser distinta" };
  u.salt = crypto.randomBytes(16).toString("hex");
  u.hash = (await scrypt(next, u.salt, 64)).toString("hex");
  u.sv = (u.sv || 0) + 1;
  await save();
  return { ok: true };
}

// Elimina la cuenta y todo lo suyo: playlists, portadas, mezclas, historial y comentarios
export async function deleteUser(uid, password) {
  const d = await db();
  const u = d.users[uid];
  if (!u) return { notFound: true };
  if (!(await verifyUser(u.username, password))) return { error: "La contraseña no es correcta" };
  const files = [];
  for (const p of Object.values(d.playlists[uid] || {})) if (p.coverFile) files.push(path.join(COVER_DIR, p.coverFile));
  if (u.avatarFile) files.push(path.join(AVATAR_DIR, u.avatarFile));
  for (const [id, m] of Object.entries(d.mixes || {})) {
    if (m.userId === uid) {
      files.push(path.join(MIX_DIR, m.file));
      delete d.mixes[id];
    } else {
      delete m.likes[uid];
      delete m.saves[uid];
      m.comments = m.comments.filter((c) => c.userId !== uid);
    }
  }
  delete d.playlists[uid];
  delete d.state[uid];
  delete d.names[u.username.toLowerCase()];
  delete d.users[uid];
  await save();
  await Promise.all(files.map((f) => fs.unlink(f).catch(() => {})));
  return { ok: true };
}

export async function createUser(username, password) {
  const d = await db();
  username = str(username, 24);
  if (!USER_RE.test(username)) return { error: "Usuario: 3 a 24 caracteres (letras, números, . _ -)" };
  if (typeof password !== "string" || password.length < 6 || password.length > 100)
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  const key = username.toLowerCase();
  if (has(d.names, key)) return { error: "Ese usuario ya existe" };
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)).toString("hex");
  if (has(d.names, key)) return { error: "Ese usuario ya existe" };
  const user = { id: newId(), username, salt, hash, created: Date.now() };
  d.users[user.id] = user;
  d.names[key] = user.id;
  d.playlists[user.id] = {};
  await save();
  return { user };
}

export async function verifyUser(username, password) {
  const d = await db();
  const key = str(username, 24).toLowerCase();
  const u = has(d.names, key) ? d.users[d.names[key]] : null;
  const h = await scrypt(String(password ?? ""), u ? u.salt : "0000", 64);
  if (!u) return null;
  return crypto.timingSafeEqual(h, Buffer.from(u.hash, "hex")) ? u : null;
}

export async function getUser(id) {
  const d = await db();
  return has(d.users, id) ? d.users[id] : null;
}

// ---------- playlists (cada usuario tiene su propio espacio)
export function cleanTracks(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, LIMITS.tracks)
    .map((t) => {
      if (t?.kind === "yt" && /^[\w-]{11}$/.test(t.id))
        return {
          kind: "yt",
          id: t.id,
          title: str(t.title, 200),
          channel: str(t.channel, 100),
          length: str(t.length, 12),
          thumb: `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`,
        };
      if (t?.kind === "file" && /^[\w-]{1,64}$/.test(t.fileId))
        return { kind: "file", fileId: t.fileId, title: str(t.title, 200), channel: "Archivo local" };
      return null;
    })
    .filter(Boolean);
}

function cleanPlaylist(input, base) {
  const p = { ...base };
  if (input.name !== undefined) {
    const n = str(input.name, 60);
    if (!n) return { error: "La playlist necesita un nombre" };
    p.name = n;
  }
  if (input.occasion !== undefined) p.occasion = OCCASIONS.includes(input.occasion) ? input.occasion : "otra";
  if (input.description !== undefined) p.description = str(input.description, 300);
  if (input.tracks !== undefined) p.tracks = cleanTracks(input.tracks);
  return { p };
}

export async function listPlaylists(uid) {
  const d = await db();
  return Object.values(d.playlists[uid] || {}).sort((a, b) => b.updated - a.updated);
}

export async function createPlaylist(uid, input = {}) {
  const d = await db();
  const mine = (d.playlists[uid] ||= {});
  if (Object.keys(mine).length >= LIMITS.playlists) return { error: "Llegaste al límite de playlists" };
  const { p, error } = cleanPlaylist(
    { name: "", occasion: "otra", description: "", tracks: [], ...input },
    {}
  );
  if (error) return { error };
  p.id = newId();
  p.created = p.updated = Date.now();
  mine[p.id] = p;
  await save();
  return { playlist: p };
}

export async function updatePlaylist(uid, id, input = {}) {
  const d = await db();
  const mine = d.playlists[uid];
  if (!has(mine, id)) return { notFound: true };
  const { p, error } = cleanPlaylist(input, mine[id]);
  if (error) return { error };
  p.updated = Date.now();
  mine[id] = p;
  await save();
  return { playlist: p };
}

export async function deletePlaylist(uid, id) {
  const d = await db();
  const mine = d.playlists[uid];
  if (!has(mine, id)) return { notFound: true };
  const cover = mine[id].coverFile;
  delete mine[id];
  await save();
  if (cover) await fs.unlink(path.join(COVER_DIR, cover)).catch(() => {});
  return { ok: true };
}

// ---------- portadas de playlist subidas por el usuario
const COVER_DIR = path.join(DIR, "covers");
export const COVER_MAX = 600 * 1024;
const COVER_EXT = { jpeg: "jpg", png: "png", webp: "webp" };

export async function setPlaylistCover(uid, id, buffer, type) {
  const d = await db();
  const mine = d.playlists[uid];
  if (!has(mine, id)) return { notFound: true };
  const p = mine[id];
  const old = p.coverFile;
  if (buffer) {
    if (!COVER_EXT[type]) return { error: "Formato no soportado (usa JPG, PNG o WebP)" };
    if (buffer.length > COVER_MAX) return { error: "La imagen es demasiado grande" };
    const file = `${uid}_${id}_${Date.now()}.${COVER_EXT[type]}`;
    await fs.mkdir(COVER_DIR, { recursive: true });
    await fs.writeFile(path.join(COVER_DIR, file), buffer);
    p.coverFile = file;
    p.cover = `/api/playlists/${id}/cover?v=${Date.now()}`;
  } else {
    delete p.coverFile;
    delete p.cover;
  }
  p.updated = Date.now();
  await save();
  if (old && old !== p.coverFile) await fs.unlink(path.join(COVER_DIR, old)).catch(() => {});
  return { playlist: p };
}

export async function playlistCoverFile(uid, id) {
  const d = await db();
  const mine = d.playlists[uid];
  if (!has(mine, id) || !mine[id].coverFile) return null;
  const f = mine[id].coverFile;
  return { path: path.join(COVER_DIR, f), mime: f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" };
}

// ---------- comunidad: mezclas publicadas, me gusta, guardados y comentarios
export const MIX_DIR = path.join(DIR, "mixes");
export const MIX_LIMITS = { bytes: 150 * 1024 * 1024, perUser: 50, comment: 500, comments: 500 };
const MIME_EXT = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav" };

function publicMix(m, viewer, withComments = true) {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    occasion: m.occasion,
    author: m.username,
    created: m.created,
    dur: m.dur,
    size: m.size,
    mime: m.mime,
    plays: m.plays,
    likes: Object.keys(m.likes).length,
    liked: !!viewer && has(m.likes, viewer),
    saved: !!viewer && has(m.saves, viewer),
    mine: viewer === m.userId,
    commentCount: m.comments.length,
    comments: withComments
      ? m.comments.map((c) => ({ id: c.id, author: c.username, text: c.text, at: c.at, mine: c.userId === viewer }))
      : undefined,
  };
}

export async function createMix(user, input, buffer, mime) {
  const d = await db();
  d.mixes ||= {};
  const base = String(mime || "").split(";")[0];
  if (!MIME_EXT[base]) return { error: "Formato de audio no soportado" };
  if (!buffer.length || buffer.length > MIX_LIMITS.bytes) return { error: "El archivo es demasiado grande (máx. 150 MB)" };
  if (Object.values(d.mixes).filter((m) => m.userId === user.id).length >= MIX_LIMITS.perUser)
    return { error: "Llegaste al límite de mezclas publicadas" };
  const title = str(input.title, 80);
  if (!title) return { error: "La mezcla necesita un título" };
  const id = newId();
  const file = `${id}.${MIME_EXT[base]}`;
  await fs.mkdir(MIX_DIR, { recursive: true });
  await fs.writeFile(path.join(MIX_DIR, file), buffer);
  const m = {
    id,
    userId: user.id,
    username: user.username,
    title,
    description: str(input.description, 500),
    occasion: OCCASIONS.includes(input.occasion) ? input.occasion : "otra",
    dur: Math.max(0, Math.min(86400, +input.dur || 0)),
    size: buffer.length,
    mime: base,
    file,
    created: Date.now(),
    plays: 0,
    likes: {},
    saves: {},
    comments: [],
  };
  d.mixes[id] = m;
  await save();
  return { mix: publicMix(m, user.id) };
}

export async function listMixes({ viewer, sort = "recent", filter, q, limit = 60 } = {}) {
  const d = await db();
  let list = Object.values(d.mixes || {});
  if (filter === "mine") list = list.filter((m) => m.userId === viewer);
  if (filter === "saved") list = list.filter((m) => has(m.saves, viewer));
  if (q) {
    const s = String(q).toLowerCase().slice(0, 80);
    list = list.filter((m) => `${m.title} ${m.description} ${m.username} ${m.occasion}`.toLowerCase().includes(s));
  }
  const score = (m) => Object.keys(m.likes).length * 3 + m.comments.length * 2 + m.plays;
  list.sort(sort === "top" ? (a, b) => score(b) - score(a) || b.created - a.created : (a, b) => b.created - a.created);
  return list.slice(0, Math.min(1000, limit)).map((m) => publicMix(m, viewer));
}

export async function getMix(id, viewer) {
  const d = await db();
  return has(d.mixes, id) ? publicMix(d.mixes[id], viewer) : null;
}

export async function mixFile(id) {
  const d = await db();
  if (!has(d.mixes, id)) return null;
  const m = d.mixes[id];
  return { path: path.join(MIX_DIR, m.file), mime: m.mime, size: m.size };
}

export async function mixAction(user, id, action, input = {}) {
  const d = await db();
  if (!has(d.mixes, id)) return { notFound: true };
  const m = d.mixes[id];
  const uid = user?.id;
  if (action === "play") {
    m.plays++;
  } else {
    if (!uid) return { auth: true };
    if (action === "like") has(m.likes, uid) ? delete m.likes[uid] : (m.likes[uid] = Date.now());
    else if (action === "save") has(m.saves, uid) ? delete m.saves[uid] : (m.saves[uid] = Date.now());
    else if (action === "comment") {
      const text = str(input.text, MIX_LIMITS.comment);
      if (!text) return { error: "Escribe un comentario" };
      if (m.comments.length >= MIX_LIMITS.comments) return { error: "Esta mezcla ya no admite más comentarios" };
      m.comments.push({ id: newId(), userId: uid, username: user.username, text, at: Date.now() });
    } else if (action === "uncomment") {
      const c = m.comments.find((c) => c.id === input.cid);
      if (!c) return { notFound: true };
      if (c.userId !== uid && m.userId !== uid) return { forbidden: true };
      m.comments = m.comments.filter((x) => x !== c);
    } else return { error: "Acción no válida" };
  }
  await save();
  return { mix: publicMix(m, uid) };
}

export async function deleteMix(uid, id) {
  const d = await db();
  if (!has(d.mixes, id)) return { notFound: true };
  if (d.mixes[id].userId !== uid) return { forbidden: true };
  const file = path.join(MIX_DIR, d.mixes[id].file);
  delete d.mixes[id];
  await save();
  await fs.unlink(file).catch(() => {});
  return { ok: true };
}

// Cifras reales para la página pública
export async function stats() {
  const d = await db();
  return {
    users: Object.keys(d.users).length,
    mixes: Object.keys(d.mixes || {}).length,
    playlists: Object.values(d.playlists).reduce((a, p) => a + Object.keys(p).length, 0),
  };
}

// ---------- estado de la sesión (colas de cada deck)
export async function getState(uid) {
  const d = await db();
  return d.state[uid] || { queues: [[], []], history: [], prefs: { autoFade: 10 } };
}

export async function setState(uid, input = {}) {
  const d = await db();
  const q = Array.isArray(input.queues) ? input.queues : [];
  const history = (Array.isArray(input.history) ? input.history : [])
    .slice(-300)
    .map((h) => {
      const [t] = cleanTracks([h]);
      return t && { ...t, deck: h.deck ? 1 : 0, at: Math.max(0, +h.at || 0) };
    })
    .filter(Boolean);
  const prefs = {
    autoFade: Math.min(30, Math.max(3, +input.prefs?.autoFade || 10)),
  };
  d.state[uid] = { queues: [cleanTracks(q[0]), cleanTracks(q[1])], history, prefs, updated: Date.now() };
  await save();
  return d.state[uid];
}
