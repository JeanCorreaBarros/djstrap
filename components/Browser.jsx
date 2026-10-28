"use client";
import { useRef, useState } from "react";
import { AddToPlaylist } from "./Library";

const fileTracks = (files) =>
  [...files]
    .filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(f.name))
    .map((f) => ({
      kind: "file",
      file: f,
      fileId: crypto.randomUUID(),
      title: f.name.replace(/\.[^.]+$/, ""),
      channel: "Archivo local",
    }));

export default function Browser({ side, queue, cur, onAdd, onLoad, onRemove, onSend, playlists, onToPlaylist, onNewPlaylist }) {
  const atp = (tracks, props = {}) => (
    <AddToPlaylist
      playlists={playlists}
      onPick={(pid) => onToPlaylist(pid, tracks)}
      onNew={(name) => onNewPlaylist(name, tracks)}
      {...props}
    />
  );
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const name = side === 0 ? "1" : "2";

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setResults((j.items || []).map((x) => ({ ...x, kind: "yt" })));
      if (j.error) setError(j.error);
    } catch {
      setError("No se pudo buscar.");
    }
    setBusy(false);
  }

  return (
    <section
      className={`browser b${side} ${drag ? "drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const t = fileTracks(e.dataTransfer.files);
        if (t.length) onAdd(t);
      }}
    >
      <div className="bhead">
        <span className="dtag">DECK {name}</span>
        <form className="search" onSubmit={search}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar canción en YouTube…" />
          <button type="submit" disabled={busy}>{busy ? "…" : "Buscar"}</button>
        </form>
        <button className="filebtn" onClick={() => fileRef.current.click()} title="Archivos locales: EQ, FX, loops y scratch">
          + Archivos
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => {
            const t = fileTracks(e.target.files);
            if (t.length) onAdd(t);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <div className="bcols">
        <div className="bcol">
          <h4>Resultados {results.length > 0 && <button className="link" onClick={() => setResults([])}>limpiar</button>}</h4>
          <ul className="list">
            {results.length === 0 && <li className="empty">Busca una canción o arrastra archivos de audio aquí.</li>}
            {results.map((r) => (
              <li key={r.id}>
                <img src={r.thumb} alt="" />
                <div className="meta">
                  <b>{r.title}</b>
                  <small>{r.channel} {r.length && `· ${r.length}`}</small>
                </div>
                {atp([r])}
                <button onClick={() => onAdd([r])} title="Añadir a la lista">+ Lista</button>
                <button className="hot" onClick={() => onAdd([r], true)} title="Cargar en el deck ya">▶</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="bcol">
          <h4>
            Lista de mezcla · Deck {name} ({queue.length})
            {queue.length > 0 && atp(queue, { label: "♥ Guardar lista", title: "Guardar toda la lista en una playlist" })}
          </h4>
          <ul className="list queue">
            {queue.length === 0 && <li className="empty">Añade canciones: se reproducen en orden.</li>}
            {queue.map((t, i) => (
              <li key={i} className={i === cur ? "now" : ""}>
                <span className="n">{i === cur ? "▶" : i + 1}</span>
                {t.thumb ? <img src={t.thumb} alt="" /> : <div className="ficon">♫</div>}
                <div className="meta" onDoubleClick={() => onLoad(i)}>
                  <b>{t.title}</b>
                  <small>{t.kind === "yt" ? "YouTube" : "Archivo local · FX completos"}</small>
                </div>
                {atp([t])}
                <button onClick={() => onLoad(i)}>Cargar</button>
                <button onClick={() => onSend(i)} title="Mover al otro deck">{side === 0 ? "→2" : "1←"}</button>
                <button onClick={() => onRemove(i)}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
