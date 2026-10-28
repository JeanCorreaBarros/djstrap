"use client";
import { useEffect, useRef, useState } from "react";
import { DJEngine } from "../lib/engine";
import { api, strip } from "../lib/api";
import { putFile, getFile } from "../lib/fileStore";
import Deck from "./Deck";
import Mixer from "./Mixer";
import Browser from "./Browser";
import Library, { Cover, PlaylistMenu, playlistActions } from "./Library";
import { AutoMixPage, RecordPage, HistoryPage, SettingsPage, DesktopPage } from "./Pages";
import { CommunityPage } from "./Community";
import SearchPage from "./SearchPage";
import ProfilePage, { Avatar } from "./Profile";
import AdminPage from "./Admin";
import { Fader } from "./Controls";
import Icon from "./Icon";

const NAV = [
  ["cabina", "Cabina", "deck"],
  ["musica", "Buscar música", "search"],
  ["playlists", "Mis playlists", "library"],
  ["comunidad", "Comunidad", "community"],
  ["automix", "Auto-Mix", "auto"],
  ["historial", "Historial", "clock"],
  ["ajustes", "Atajos y ajustes", "keys"],
  ["desktop", "App de escritorio", "desktop"],
];
const TITLES = { ...Object.fromEntries(NAV.map(([k, l]) => [k, l])), perfil: "Mi perfil", admin: "Panel de administrador" };

// Reloj de la grabación (se refresca solo, sin re-renderizar todo)
function RecClock({ t0 }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - t0) / 1000);
  return <span>{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>;
}

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export default function DJ({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [engine, setEngine] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState([[], []]);
  const [cur, setCur] = useState([-1, -1]);
  const [sources, setSources] = useState(["file", "file"]);
  const [playlists, setPlaylists] = useState([]);
  const [plSel, setPlSel] = useState(null);
  const [saved, setSaved] = useState("");
  const [view, setView] = useState("cabina");
  const [panel, setPanel] = useState("deck0");
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [xf, setXfState] = useState(0.5);
  const [auto, setAuto] = useState({ on: false, fade: 10 });
  const [history, setHistory] = useState([]);
  const [rec, setRec] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [wake, setWake] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [sbMenu, setSbMenu] = useState(null);
  const [plEdit, setPlEdit] = useState(null);
  // el panel de admin solo existe en la web, nunca en la app de escritorio
  const [showAdmin, setShowAdmin] = useState(false);
  // el menú contraído solo existe en pantallas grandes; en tablet/celular el menú se abre completo
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1280px)");
    const f = () => setWide(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  const mini = collapsed && wide;
  useEffect(() => setShowAdmin(!!user.admin && !window.djDesktop), [user.admin]);

  // presencia: avisa al servidor que este usuario está usando la app
  useEffect(() => {
    const ping = () => document.visibilityState === "visible" && fetch("/api/presence", { method: "POST" }).catch(() => {});
    ping();
    const t = setInterval(ping, 60000);
    document.addEventListener("visibilitychange", ping);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", ping); };
  }, []);
  const [, setTick] = useState(0);

  const qRef = useRef(q);
  const curRef = useRef(cur);
  const xfRef = useRef(0.5);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const fade = useRef(null);
  const restored = useRef(false);
  const engineRef = useRef(null);
  const deckA = useRef(null);
  const deckB = useRef(null);
  const decks = [deckA, deckB];

  // ---- datos del usuario
  useEffect(() => {
    api.playlists().then((d) => setPlaylists(d.playlists)).catch(() => {});
    api
      .state()
      .then((s) => {
        const n = [s.queues?.[0] || [], s.queues?.[1] || []];
        qRef.current = n;
        setQ(n);
        setHistory(s.history || []);
        if (s.prefs?.autoFade) setAuto((a) => ({ ...a, fade: s.prefs.autoFade }));
      })
      .catch(() => {})
      .finally(() => (restored.current = true));
    try {
      setCollapsed(localStorage.getItem("dj.nav") === "1");
    } catch {}
    setPanel(window.matchMedia("(min-width: 1000px)").matches ? "decks" : "deck0");
  }, []);

  // autoguardado (listas, historial y preferencias)
  useEffect(() => {
    if (!restored.current) return;
    setSaved("Guardando…");
    const t = setTimeout(() => {
      api
        .saveState({ queues: q.map((l) => l.map(strip)), history: history.map(strip), prefs: { autoFade: auto.fade } })
        .then(() => setSaved("Guardado"))
        .catch(() => setSaved("Sin conexión"));
    }, 800);
    return () => clearTimeout(t);
  }, [q, history, auto.fade]);

  async function start() {
    try {
      const e = new DJEngine();
      await e.init();
      await e.ctx.resume();
      if (process.env.NODE_ENV !== "production") window.dj = e;
      e.setCrossfader(xfRef.current);
      engineRef.current = e;
      setEngine(e);
      // carga (sin reproducir) la primera canción de cada lista que ya tenía canciones
      setTimeout(() => [0, 1].forEach((s) => curRef.current[s] === -1 && qRef.current[s].length && loadIndex(s, 0, false)), 400);
    } catch (x) {
      setErr("Tu navegador no soporta el motor de audio: " + x.message);
    }
  }

  // ---- crossfader compartido (mixer, barra inferior, Auto-Mix y teclado)
  function setXf(v, fromUser = true) {
    v = Math.min(1, Math.max(0, v));
    if (fromUser) fade.current = null;
    xfRef.current = v;
    setXfState(v);
    engineRef.current?.setCrossfader(v);
  }

  // ---- colas
  const setQueue = (n) => { qRef.current = n; setQ(n); };
  const setCurAt = (side, i) => {
    const n = [...curRef.current];
    n[side] = i;
    curRef.current = n;
    setCur(n);
  };
  async function resolve(t) {
    if (t.kind !== "file" || t.file) return t;
    const f = await getFile(user.id, t.fileId).catch(() => null);
    if (!f) {
      alert(`"${t.title}" es un archivo local que no está en este dispositivo. Vuelve a añadirlo con "+ Archivos".`);
      return null;
    }
    t.file = f;
    return t;
  }
  async function loadIndex(side, i, autoplay = true) {
    const t = qRef.current[side][i];
    if (!t || !engineRef.current || !(await resolve(t))) return;
    setCurAt(side, i);
    decks[side].current?.loadTrack(t, autoplay);
  }
  function add(side, tracks, loadNow) {
    tracks.forEach((t) => t.kind === "file" && t.file && putFile(user.id, t.fileId, t.file).catch(() => {}));
    const n = [...qRef.current];
    const start = n[side].length;
    n[side] = [...n[side], ...tracks];
    setQueue(n);
    if (loadNow) loadIndex(side, start, true);
    else if (curRef.current[side] === -1) loadIndex(side, start, false);
  }
  function remove(side, i) {
    const n = [...qRef.current];
    n[side] = n[side].filter((_, k) => k !== i);
    setQueue(n);
    const c = curRef.current[side];
    if (i < c) setCurAt(side, c - 1);
    else if (i === c) setCurAt(side, -1);
  }
  function send(side, i) {
    const t = qRef.current[side][i];
    remove(side, i);
    add(1 - side, [t], false);
  }
  function ended(side) {
    const nx = curRef.current[side] + 1;
    if (nx < qRef.current[side].length) loadIndex(side, nx, !autoRef.current.on);
  }
  function played(track, deck) {
    setHistory((h) => [...h.slice(-299), { ...strip(track), deck, at: Date.now() }]);
  }

  // ---- Auto-Mix: al final de la pista inicia la siguiente en el otro deck y hace el crossfade
  useEffect(() => {
    if (!engine) return;
    const t = setInterval(() => {
      const f = fade.current;
      if (f) {
        const p = Math.min(1, (performance.now() - f.t0) / f.ms);
        const e = p * p * (3 - 2 * p);
        setXf(f.from + (f.to - f.from) * e, false);
        if (p >= 1) fade.current = null;
        return;
      }
      const a = autoRef.current;
      if (!a.on) return;
      const active = xfRef.current < 0.5 ? 0 : 1;
      const other = 1 - active;
      const st = decks[active].current?.status();
      if (!st || !st.playing || !st.dur || st.dur - st.pos > a.fade) return;
      if (decks[other].current?.status().playing) return;
      let idx = curRef.current[other] + 1;
      if (idx >= qRef.current[other].length) {
        const ni = curRef.current[active] + 1;
        const tr = qRef.current[active][ni];
        if (!tr) return;
        const n = [...qRef.current];
        n[active] = n[active].filter((_, k) => k !== ni);
        n[other] = [...n[other], tr];
        setQueue(n);
        idx = n[other].length - 1;
      }
      fade.current = { from: xfRef.current, to: other, t0: performance.now(), ms: a.fade * 1000 };
      loadIndex(other, idx, true);
    }, 100);
    return () => clearInterval(t);
  }, [engine]);

  // ---- grabación
  async function startRec() {
    if (!engineRef.current || rec) return;
    const t0 = Date.now();
    setRec(t0);
    const blob = await engineRef.current.startRecording();
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    setRecordings((r) => [
      { blob, url: URL.createObjectURL(blob), name: `DJStrap-mezcla-${stamp()}.${ext}`, size: blob.size, dur: (Date.now() - t0) / 1000 },
      ...r,
    ]);
  }
  function stopRec() {
    engineRef.current?.stopRecording();
    setRec(null);
  }

  // ---- pantalla encendida y pantalla completa
  useEffect(() => {
    if (!wake || !navigator.wakeLock) return;
    let lock;
    const get = () => navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    get();
    const vis = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); lock && lock.release(); };
  }, [wake]);
  const [isFs, setIsFs] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const f = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", f);
    document.addEventListener("webkitfullscreenchange", f);
    return () => {
      document.removeEventListener("fullscreenchange", f);
      document.removeEventListener("webkitfullscreenchange", f);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function fullscreen() {
    const d = document;
    const el = d.documentElement;
    const active = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
    if (active()) return (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    const ios = /iPhone|iPod/.test(navigator.userAgent);
    const fail = () =>
      setNotice(
        ios
          ? "En iPhone no hay pantalla completa en el navegador: toca Compartir → «Agregar a inicio» y abre DJ Strap desde su ícono."
          : "Este navegador no permite la pantalla completa aquí. Ábrela en Brave o Chrome, o presiona F11."
      );
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || d.fullscreenEnabled === false) return fail();
    try {
      const p = req.call(el, { navigationUI: "hide" });
      // algunos navegadores embebidos nunca responden: si no entra en 1,5 s, avisamos
      const t = setTimeout(() => !active() && fail(), 1500);
      if (p && p.then) p.then(() => clearTimeout(t), () => { clearTimeout(t); fail(); });
    } catch {
      fail();
    }
  }

  // ---- atajos de teclado
  const keyRef = useRef(null);
  keyRef.current = (e, down) => {
    if (!engineRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    const D = [deckA.current, deckB.current];
    if (!down) {
      if (k === "w") D[0]?.cueUp();
      if (k === "o") D[1]?.cueUp();
      return;
    }
    if (e.repeat && !["arrowleft", "arrowright"].includes(k)) return;
    const map = {
      q: () => D[0]?.toggle(), w: () => D[0]?.cueDown(), e: () => D[0]?.sync(), r: () => D[0]?.loop4(),
      p: () => D[1]?.toggle(), o: () => D[1]?.cueDown(), i: () => D[1]?.sync(), u: () => D[1]?.loop4(),
      1: () => D[0]?.hotcue(0), 2: () => D[0]?.hotcue(1), 3: () => D[0]?.hotcue(2), 4: () => D[0]?.hotcue(3),
      7: () => D[1]?.hotcue(0), 8: () => D[1]?.hotcue(1), 9: () => D[1]?.hotcue(2), 0: () => D[1]?.hotcue(3),
      arrowleft: () => setXf(xfRef.current - 0.05), arrowright: () => setXf(xfRef.current + 0.05), arrowdown: () => setXf(0.5),
      g: () => (rec ? stopRec() : startRec()), f: fullscreen,
    };
    if (map[k]) { e.preventDefault(); map[k](); }
  };
  useEffect(() => {
    const d = (e) => keyRef.current(e, true);
    const u = (e) => keyRef.current(e, false);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  // la barra inferior lee el estado de los decks
  useEffect(() => {
    if (!engine) return;
    const t = setInterval(() => setTick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, [engine]);

  // ---- playlists
  async function createPlaylist(data) {
    try {
      const { playlist } = await api.createPlaylist({ ...data, tracks: (data.tracks || []).map(strip) });
      setPlaylists((p) => [playlist, ...p]);
      return playlist;
    } catch (x) {
      alert(x.message);
    }
  }
  async function updatePlaylist(id, patch) {
    setPlaylists((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      const { playlist } = await api.updatePlaylist(id, patch.tracks ? { ...patch, tracks: patch.tracks.map(strip) } : patch);
      setPlaylists((ps) => ps.map((p) => (p.id === id ? playlist : p)));
    } catch (x) {
      alert(x.message);
      api.playlists().then((d) => setPlaylists(d.playlists));
    }
  }
  async function setCover(id, image) {
    try {
      const { playlist } = await api.setCover(id, image);
      setPlaylists((ps) => ps.map((p) => (p.id === id ? playlist : p)));
    } catch (x) {
      alert(x.message);
    }
  }
  // menú ••• / clic derecho de las playlists del menú lateral
  function plMenu(e, p) {
    e.preventDefault();
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const btn = e.type === "click";
    setSbMenu({
      x: btn ? r.left : e.clientX,
      y: btn ? r.bottom + 4 : e.clientY,
      title: p.name,
      items: playlistActions(p, {
        onOpen: () => { go("playlists"); setPlSel(p.id); },
        onEdit: () => { go("playlists"); setPlEdit(p.id); },
        onLoad: loadPlaylist,
        onDelete: (id) => { deletePlaylist(id); if (plSel === id) setPlSel(null); },
      }),
    });
  }
  async function deletePlaylist(id) {
    setPlaylists((ps) => ps.filter((p) => p.id !== id));
    await api.deletePlaylist(id).catch((x) => alert(x.message));
  }
  function addToPlaylist(id, tracks) {
    tracks.forEach((t) => t.kind === "file" && t.file && putFile(user.id, t.fileId, t.file).catch(() => {}));
    const pl = playlists.find((p) => p.id === id);
    if (pl) updatePlaylist(id, { tracks: [...pl.tracks, ...tracks.map(strip)] });
  }
  // play = cargar y reproducir ya (desde la canción "from"); si no, solo se añade a la lista del deck
  function loadPlaylist(id, side, play = false, from = 0) {
    const pl = playlists.find((p) => p.id === id);
    if (!pl || !pl.tracks.length) return;
    add(side, pl.tracks.slice(from).map((t) => ({ ...t })), play && !!engineRef.current);
    if (play && !engineRef.current) setNotice("Enciende el controlador en la Cabina: la playlist ya está en la lista del deck.");
    go("cabina");
    setPanel((p) => (p === "decks" ? p : side ? "deck1" : "deck0"));
  }

  function go(v) {
    setNavOpen(false);
    if (v === "playlists") setPlSel(null);
    setView(v);
  }

  // ---- interfaz
  const statusOf = (i) => (engine ? decks[i].current?.status() : null) || {};
  const sidebar = (
    <>
      {navOpen && <div className="backdrop navbd" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar ${navOpen ? "open" : ""} ${mini ? "mini" : ""}`}>
        <div className="sb-logo">
          <span className="star">✦</span>
          <b>DJ STRAP</b>
          <button
            className="sb-collapse"
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            onClick={() => {
              setCollapsed(!collapsed);
              try { localStorage.setItem("dj.nav", collapsed ? "0" : "1"); } catch {}
            }}
          >
            <Icon name="collapse" size={16} />
          </button>
        </div>
        <nav>
          {NAV.map(([k, label, icon]) => (
            <button key={k} className={`sb-item ${view === k ? "active" : ""}`} onClick={() => go(k)} title={label}>
              <Icon name={icon} />
              <span>{label}</span>
              {k === "automix" && auto.on && <em className="badge">ON</em>}
              {k === "cabina" && rec && <em className="badge rec">REC</em>}
            </button>
          ))}
          {showAdmin && (
            <button className={`sb-item sb-admin ${view === "admin" ? "active" : ""}`} onClick={() => go("admin")} title="Panel de administrador">
              <Icon name="admin" />
              <span>Administrador</span>
            </button>
          )}
          <button className={`sb-item ${isFs ? "active" : ""}`} onClick={fullscreen} title={isFs ? "Salir de pantalla completa" : "Pantalla completa"}>
            <Icon name="full" />
            <span>{isFs ? "Salir de pantalla completa" : "Pantalla completa"}</span>
          </button>
        </nav>
        <div className="sb-section">
          <span>TUS PLAYLISTS</span>
          <button title="Nueva playlist" onClick={() => go("playlists")}>＋</button>
        </div>
        <div className="sb-pls">
          {playlists.slice(0, 8).map((p) => (
            <div
              key={p.id}
              className="sb-pl"
              role="button"
              tabIndex={0}
              title={p.name}
              onClick={() => { go("playlists"); setPlSel(p.id); }}
              onKeyDown={(e) => e.key === "Enter" && (go("playlists"), setPlSel(p.id))}
              onContextMenu={(e) => plMenu(e, p)}
            >
              <Cover pl={p} size="sm" />
              <span>{p.name}</span>
              <button className="sb-pl-more" aria-label={`Opciones de ${p.name}`} title="Editar, eliminar…" onClick={(e) => plMenu(e, p)}>•••</button>
            </div>
          ))}
          {playlists.length === 0 && <small className="sb-empty">Aún no tienes playlists</small>}
        </div>
        <div className={`sb-user ${view === "perfil" ? "active" : ""}`}>
          <button className="sb-me" onClick={() => go("perfil")} title="Ver mi perfil">
            <Avatar user={user} size={36} />
            <span><b>{user.displayName || user.username}</b><small>Ver perfil · {saved || "Conectado"}</small></span>
          </button>
          <button title="Cerrar sesión" onClick={onLogout}><Icon name="logout" size={18} /></button>
        </div>
      </aside>
    </>
  );

  const onSource = (i, s) => setSources((p) => { const n = [...p]; n[i] = s; return n; });
  const s0 = statusOf(0);
  const s1 = statusOf(1);

  return (
    <div className={`shell ${mini ? "navmini" : ""} v-${view} ${engine ? "on" : ""}`}>
      {sidebar}
      <div className="main">
        <header className="topbar">
          <button className="hamb" onClick={() => setNavOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
          <h1>{TITLES[view]}</h1>
          {rec && <span className="recdot" onClick={() => { go("cabina"); setRecOpen(true); }}>● REC</span>}
          <span className="saved">{saved}</span>
        </header>

        <div className={`cabina ${view === "cabina" ? "" : "hidden"}`}>
          {!engine ? (
            <div className="splash inner">
              <h1>DJ STRAP</h1>
              <p>Hola, <b>{user.username}</b>. Tienes {playlists.length} playlists y {q[0].length + q[1].length} canciones en tus listas de mezcla.</p>
              <button onClick={start}>ENCENDER CONTROLADOR</button>
              {err && <p className="error">{err}</p>}
              <small>Para EQ, efectos, loops, scratch y BPM usa archivos de audio locales (MP3, WAV…). Las pistas de YouTube solo permiten volumen, tempo, cues y crossfader.</small>
            </div>
          ) : (
            <>
              <div className="cab-bar">
                <button className="hamb hamb-cab" onClick={() => setNavOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
                <nav className="viewtabs">
                  {[["decks", "Decks", "wide"], ["deck0", "Deck 1", "narrow"], ["deck1", "Deck 2", "narrow"], ["mixer", "Mixer"], ["music", "Música"]].map(([k, l, only]) => (
                    <button key={k} className={`${panel === k ? "on" : ""} ${only || ""}`} onClick={() => setPanel(k)}>{l}</button>
                  ))}
                </nav>
                {/* vertical: barra fija abajo · horizontal: integrada en esta fila */}
                <div className="dock">
                  {[s0, s1].map((s, i) => (
                    <div key={i} className={`dk-deck d${i}`}>
                      <button className={`dk-play ${s.playing ? "on" : ""}`} onClick={() => decks[i].current?.toggle()} aria-label={`Play deck ${i + 1}`}>
                        {s.playing ? "❚❚" : "▶"}
                      </button>
                      <div className="dk-info" onClick={() => setPanel(panel === "decks" ? "decks" : i ? "deck1" : "deck0")}>
                        <small>DECK {i + 1}{s.dur ? ` · -${Math.floor((s.dur - s.pos) / 60)}:${String(Math.floor((s.dur - s.pos) % 60)).padStart(2, "0")}` : ""}</small>
                        <b>{s.title || "Sin pista"}</b>
                        <i style={{ width: s.dur ? `${(s.pos / s.dur) * 100}%` : 0 }} />
                      </div>
                    </div>
                  ))}
                  <div className="dk-xf">
                    <span className="a">A</span>
                    <Fader horizontal min={0} max={1} def={0.5} value={xf} onChange={(v) => setXf(v)} />
                    <span className="b">B</span>
                    {auto.on && <em>AUTO</em>}
                  </div>
                </div>
                <div className="rec-tools">
                  <button className={`rec-btn ${rec ? "on" : ""}`} onClick={rec ? stopRec : startRec} title={rec ? "Detener grabación (G)" : "Grabar mezcla (G)"}>
                    <i />
                    {rec ? <RecClock t0={rec} /> : "REC"}
                  </button>
                  <button className="rec-list-btn" onClick={() => setRecOpen(true)} title="Ver, descargar o publicar tus grabaciones">
                    Grabaciones{recordings.length ? ` (${recordings.length})` : ""}
                  </button>
                </div>
              </div>
              <main className="rig" data-panel={panel}>
                <Deck ref={deckA} engine={engine} idx={0} onEnded={() => ended(0)} onSource={onSource} onPlayed={played} />
                <Mixer engine={engine} sources={sources} xf={xf} onXf={(v) => setXf(v)} />
                <Deck ref={deckB} engine={engine} idx={1} onEnded={() => ended(1)} onSource={onSource} onPlayed={played} />
                {[0, 1].map((side) => (
                  <Browser
                    key={side}
                    side={side}
                    queue={q[side]}
                    cur={cur[side]}
                    onAdd={(t, now) => add(side, t, now)}
                    onLoad={(i) => loadIndex(side, i, true)}
                    onRemove={(i) => remove(side, i)}
                    onSend={(i) => send(side, i)}
                    playlists={playlists}
                    onToPlaylist={addToPlaylist}
                    onNewPlaylist={(name, tracks) => createPlaylist({ name, occasion: "otra", tracks })}
                  />
                ))}
              </main>
            </>
          )}
        </div>

        {view === "playlists" && (
          <Library
            sel={plSel}
            setSel={setPlSel}
            playlists={playlists}
            queues={q}
            owner={user.username}
            onCreate={createPlaylist}
            onUpdate={updatePlaylist}
            onDelete={deletePlaylist}
            onLoad={loadPlaylist}
            onSearch={() => go("musica")}
            onCover={setCover}
            editRequest={plEdit}
            onEditHandled={() => setPlEdit(null)}
          />
        )}
        {view === "automix" && (
          <AutoMixPage auto={auto} setAuto={setAuto} queues={q} cur={cur} status={[s0, s1]} xf={xf} engineOn={!!engine} onCabina={() => go("cabina")} />
        )}
        {recOpen && (
          <>
            <div className="backdrop" onClick={() => setRecOpen(false)} />
            <div className="rec-sheet" role="dialog" aria-label="Grabaciones">
              <button className="x" onClick={() => setRecOpen(false)} aria-label="Cerrar">✕</button>
              <RecordPage
                rec={rec}
                recordings={recordings}
                onStart={startRec}
                onStop={stopRec}
                engineOn={!!engine}
                onPublished={(url, mix) => setRecordings((rs) => rs.map((r) => (r.url === url ? { ...r, published: mix.id } : r)))}
              />
            </div>
          </>
        )}
        {view === "comunidad" && <CommunityPage onRecord={() => { go("cabina"); setRecOpen(true); }} />}
        <PlaylistMenu menu={sbMenu} onClose={() => setSbMenu(null)} />
        {view === "musica" && (
          <SearchPage
            engineOn={!!engine}
            queues={q}
            onAdd={(side, tracks, now) => {
              add(side, tracks, now);
              if (now && engine) {
                go("cabina");
                setPanel((p) => (p === "decks" ? p : side ? "deck1" : "deck0"));
              }
            }}
            playlists={playlists}
            onToPlaylist={addToPlaylist}
            onNewPlaylist={(name, tracks) => createPlaylist({ name, occasion: "otra", tracks })}
          />
        )}
        {view === "historial" && (
          <HistoryPage
            history={history}
            onClear={() => setHistory([])}
            onSave={(h) => createPlaylist({ name: `Sesión ${new Date().toLocaleDateString()}`, occasion: "otra", tracks: h }).then((p) => p && (go("playlists"), setPlSel(p.id)))}
            onLoad={(h, side) => add(side, [{ ...h }], false)}
          />
        )}
        {view === "ajustes" && <SettingsPage wake={wake} setWake={setWake} onFullscreen={fullscreen} isFs={isFs} />}
        {notice && <div className="toast warn" role="status" onClick={() => setNotice("")}>{notice}</div>}
        {view === "desktop" && <DesktopPage />}
        {view === "perfil" && <ProfilePage user={user} onUser={(u) => setUser((p) => ({ ...p, ...u }))} onLogout={onLogout} />}
        {view === "admin" && showAdmin && <AdminPage />}
      </div>
    </div>
  );
}
