"use client";
import { useRef, useState } from "react";
import { AddToPlaylist } from "./Library";

const GENRES = ["Reggaetón", "Salsa", "Bachata", "Electrónica", "Merengue", "Rock en español", "Cumbia", "Pop latino", "House", "Vallenato"];

const fileTracks = (files) =>
  [...files]
    .filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(f.name))
    .map((f) => ({ kind: "file", file: f, fileId: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ""), channel: "Archivo local" }));

// Página de búsqueda: encuentra canciones y mándalas a un deck, a una lista de mezcla o a una playlist
export default function SearchPage({ engineOn, queues, onAdd, playlists, onToPlaylist, onNewPlaylist }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  const [flash, setFlash] = useState("");
  const fileRef = useRef(null);

  async function search(text) {
    const s = (text ?? q).trim();
    if (!s) return;
    setQ(s);
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(s)}`);
      const j = await r.json();
      setResults((j.items || []).map((x) => ({ ...x, kind: "yt" })));
      setLast(s);
      if (j.error) setError(j.error);
    } catch {
      setError("No se pudo buscar.");
    }
    setBusy(false);
  }

  const notify = (m) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 1800);
  };
  const send = (t, side, now) => {
    onAdd(side, [t], now);
    notify(now ? `▶ Cargada en Deck ${side + 1}` : `+ Añadida a la lista del Deck ${side + 1}`);
  };

  return (
    <section className="page searchpage">
      <header className="phead">
        <small>DESCUBRE</small>
        <h2>Buscar música</h2>
        <p>Encuentra cualquier canción y mándala a un deck, a tu lista de mezcla o a una playlist.</p>
      </header>

      <form className="bigsearch" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2" />
        </svg>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Canción, artista o pega un enlace de YouTube…" />
        <button className="primary" disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button>
      </form>

      <div className="chips">
        {GENRES.map((g) => (
          <button key={g} onClick={() => search(g)}>{g}</button>
        ))}
        <button className="chip-file" onClick={() => fileRef.current.click()}>⬆ Subir mis archivos</button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => {
            const t = fileTracks(e.target.files);
            if (t.length) {
              onAdd(0, t, false);
              notify(`+ ${t.length} archivo(s) en la lista del Deck 1`);
            }
            e.target.value = "";
          }}
        />
      </div>

      {!engineOn && <p className="hint">El controlador está apagado: lo que mandes a un deck queda en su lista y suena al encenderlo en la Cabina.</p>}
      {error && <p className="error">{error}</p>}
      {last && !busy && <h3 className="sub">Resultados para “{last}” <small>({results.length})</small></h3>}

      <div className="rgrid">
        {results.map((r) => (
          <article key={r.id} className="rcard">
            <div className="rthumb">
              <img src={r.thumb} alt="" loading="lazy" />
              {r.length && <span>{r.length}</span>}
              <button className="rplay" title="Cargar en Deck 1 y reproducir" onClick={() => send(r, 0, true)}>▶</button>
            </div>
            <b title={r.title}>{r.title}</b>
            <small>{r.channel}</small>
            <div className="ractions">
              <button className="d0" onClick={() => send(r, 0, true)} title="Cargar en Deck 1">▶ D1</button>
              <button className="d1" onClick={() => send(r, 1, true)} title="Cargar en Deck 2">▶ D2</button>
              <button onClick={() => send(r, 0, false)} title="Añadir a la lista del Deck 1">+L1</button>
              <button onClick={() => send(r, 1, false)} title="Añadir a la lista del Deck 2">+L2</button>
              <AddToPlaylist playlists={playlists} onPick={(pid) => { onToPlaylist(pid, [r]); notify("♥ Añadida a la playlist"); }} onNew={(name) => onNewPlaylist(name, [r])} />
            </div>
          </article>
        ))}
      </div>

      {!last && (
        <div className="card center">
          <b>Tus listas de mezcla</b>
          <small>Deck 1: {queues[0].length} canciones · Deck 2: {queues[1].length} canciones</small>
        </div>
      )}
      {flash && <div className="toast">{flash}</div>}
    </section>
  );
}
