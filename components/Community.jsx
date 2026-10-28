"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { OCCASIONS, NoteIcon } from "./Library";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return new Date(t).toLocaleDateString();
};

export function MixCard({ mix, onChange, onDelete, loggedIn = true }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const played = useRef(false);
  const o = OCCASIONS[mix.occasion] || OCCASIONS.otra;

  async function act(action, extra) {
    if (!loggedIn) return (location.href = "/");
    try {
      const { mix: m } = await api.mixAction(mix.id, action, extra);
      onChange(m);
      return true;
    } catch (x) {
      alert(x.message);
    }
  }
  async function share() {
    const url = `${location.origin}/mix/${mix.id}`;
    if (navigator.share) return navigator.share({ title: mix.title, text: `Escucha "${mix.title}" en DJ Strap`, url }).catch(() => {});
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="mix">
      <div className="mix-cover" style={{ background: `linear-gradient(135deg, ${o.g})` }}>
        <NoteIcon />
      </div>
      <div className="mix-body">
        <small className="mix-k">{o.label.toUpperCase()} · {mmss(mix.dur)}</small>
        <a className="mix-title" href={`/mix/${mix.id}`}>{mix.title}</a>
        <small className="mix-by">por <b>{mix.author}</b> · {ago(mix.created)} · {mix.plays} reproducciones</small>
        {mix.description && <p className="mix-desc">{mix.description}</p>}
        <audio
          src={`/api/mixes/${mix.id}/audio`}
          controls
          preload="none"
          onPlay={() => {
            if (played.current) return;
            played.current = true;
            api.mixAction(mix.id, "play").then((d) => onChange(d.mix)).catch(() => {});
          }}
        />
        <div className="mix-actions">
          <button className={mix.liked ? "liked" : ""} onClick={() => act("like")} aria-pressed={mix.liked}>
            {mix.liked ? "♥" : "♡"} {mix.likes}
          </button>
          <button className={mix.saved ? "saved" : ""} onClick={() => act("save")} aria-pressed={mix.saved}>
            {mix.saved ? "★ Guardada" : "☆ Guardar"}
          </button>
          <button onClick={() => setOpen(!open)}>💬 {mix.commentCount}</button>
          <button onClick={share}>{copied ? "¡Enlace copiado!" : "↗ Compartir"}</button>
          {mix.mine && onDelete && (
            <button className="danger" onClick={() => confirm(`¿Borrar "${mix.title}"?`) && onDelete(mix.id)}>Borrar</button>
          )}
        </div>
        {open && (
          <div className="comments">
            {mix.comments.length === 0 && <small className="muted">Sé el primero en comentar.</small>}
            {mix.comments.map((c) => (
              <div key={c.id} className="comment">
                <i>{c.author.slice(0, 1).toUpperCase()}</i>
                <div>
                  <b>{c.author}</b> <small>{ago(c.at)}</small>
                  <p>{c.text}</p>
                </div>
                {(c.mine || mix.mine) && <button className="link" onClick={() => act("uncomment", { cid: c.id })}>borrar</button>}
              </div>
            ))}
            <form
              className="cform"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!text.trim()) return;
                setBusy(true);
                if (await act("comment", { text })) setText("");
                setBusy(false);
              }}
            >
              <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={loggedIn ? "Escribe un comentario…" : "Inicia sesión para comentar"} />
              <button disabled={busy || !text.trim()}>Enviar</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

const TABS = [
  ["recent", "Recientes"],
  ["top", "Populares"],
  ["saved", "Guardadas"],
  ["mine", "Mis mezclas"],
];

export function CommunityPage({ onRecord }) {
  const [tab, setTab] = useState("recent");
  const [q, setQ] = useState("");
  const [mixes, setMixes] = useState(null);

  useEffect(() => {
    let dead = false;
    setMixes(null);
    const t = setTimeout(() => {
      const params = tab === "saved" || tab === "mine" ? { filter: tab } : { sort: tab };
      if (q.trim()) params.q = q.trim();
      api.mixes(params).then((d) => !dead && setMixes(d.mixes)).catch(() => !dead && setMixes([]));
    }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [tab, q]);

  const update = (m) => setMixes((list) => list.map((x) => (x.id === m.id ? m : x)).filter((x) => tab !== "saved" || x.saved));

  return (
    <section className="page">
      <header className="phead">
        <small>COMUNIDAD</small>
        <h2>Mezclas de la comunidad</h2>
        <p>Escucha las sesiones de otros DJs, dales me gusta, comenta y guárdalas para escucharlas después.</p>
      </header>
      <div className="row wrap">
        <div className="tabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <input className="cm-search" placeholder="Buscar mezclas, DJs u ocasiones…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="primary" onClick={onRecord}>● Grabar y publicar</button>
      </div>
      {mixes === null ? (
        <p className="hint">Cargando…</p>
      ) : mixes.length === 0 ? (
        <div className="card center">
          <b>{tab === "saved" ? "Aún no guardaste mezclas" : tab === "mine" ? "Aún no publicaste mezclas" : "Todavía no hay mezclas"}</b>
          <small>Graba tu sesión en “Grabar mezcla” y publícala con un título.</small>
        </div>
      ) : (
        <div className="mixes">
          {mixes.map((m) => (
            <MixCard
              key={m.id}
              mix={m}
              onChange={update}
              onDelete={async (id) => {
                await api.deleteMix(id).catch((x) => alert(x.message));
                setMixes((l) => l.filter((x) => x.id !== id));
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Formulario para publicar una grabación
export function PublishForm({ rec, onDone }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occasion, setOccasion] = useState("fiesta");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="pubform"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const mix = await api.publishMix(rec.blob, { title, description, occasion, dur: rec.dur, name: rec.name });
          onDone(mix);
        } catch (x) {
          setError(x.message);
        }
        setBusy(false);
      }}
    >
      <input placeholder="Título de la mezcla (ej. Reggaetón viernes 2026)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} required />
      <textarea placeholder="Descripción: géneros, ocasión, canciones…" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
      <div className="row wrap">
        <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          {Object.entries(OCCASIONS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button className="primary" disabled={busy || !title.trim()}>{busy ? "Subiendo…" : "Publicar en la comunidad"}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
