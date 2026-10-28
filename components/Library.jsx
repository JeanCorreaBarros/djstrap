"use client";
import { useEffect, useRef, useState } from "react";
import { imageToCover } from "../lib/api";

export const OCCASIONS = {
  fiesta: { icon: "🎉", label: "Fiesta", g: "#ff3d7f, #ff9a1f" },
  boda: { icon: "💍", label: "Boda", g: "#f5c6a5, #b06cff" },
  cumple: { icon: "🎂", label: "Cumpleaños", g: "#ffd23d, #ff3d3d" },
  gym: { icon: "🏋️", label: "Gym", g: "#2ee66b, #0f8bd6" },
  chill: { icon: "🌙", label: "Chill", g: "#4d7cff, #8a3dff" },
  lounge: { icon: "🍹", label: "Lounge", g: "#19d6ff, #2ee66b" },
  evento: { icon: "🎓", label: "Evento", g: "#7a8699, #2a8cff" },
  otra: { icon: "⭐", label: "Otra", g: "#ff7a3d, #a04dff" },
};
const occ = (k) => OCCASIONS[k] || OCCASIONS.otra;
const first = (g) => g.split(",")[0].trim();

const toSec = (s) => {
  if (!s) return 0;
  return String(s).split(":").reduce((a, x) => a * 60 + (+x || 0), 0);
};
const totalTime = (tracks) => {
  const s = tracks.reduce((a, t) => a + toSec(t.length), 0);
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

// Botón ♥ con menú para añadir una o varias pistas a una playlist
export function AddToPlaylist({ playlists, onPick, onNew, label = "♥", title = "Añadir a playlist" }) {
  const [pos, setPos] = useState(null);
  return (
    <>
      <button
        title={title}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 260), left: Math.max(8, r.right - 220) });
        }}
      >
        {label}
      </button>
      {pos && (
        <>
          <div className="backdrop clear" onClick={() => setPos(null)} />
          <div className="atp" style={pos}>
            <b>Añadir a playlist</b>
            <div className="atp-list">
              {playlists.length === 0 && <small>Aún no tienes playlists.</small>}
              {playlists.map((p) => (
                <button key={p.id} onClick={() => { onPick(p.id); setPos(null); }}>
                  <span className="atp-name"><Cover pl={p} size="xs" /> {p.name}</span> <small>{p.tracks.length}</small>
                </button>
              ))}
            </div>
            <button
              className="new"
              onClick={() => {
                const n = prompt("Nombre de la nueva playlist");
                if (n && n.trim()) onNew(n.trim());
                setPos(null);
              }}
            >
              ＋ Nueva playlist…
            </button>
          </div>
        </>
      )}
    </>
  );
}

// Menú contextual de una playlist (botón ••• o clic derecho), como en Spotify
export function PlaylistMenu({ menu, onClose }) {
  if (!menu) return null;
  const h = menu.items.length * 42 + 12;
  const style = {
    left: Math.max(8, Math.min(menu.x, window.innerWidth - 240)),
    top: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)),
  };
  return (
    <>
      <div className="backdrop clear" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="sp-menu fixed" style={style} role="menu">
        {menu.title && <small className="sp-menu-title">{menu.title}</small>}
        {menu.items.map((it) => (
          <button key={it.label} role="menuitem" className={it.danger ? "danger" : ""} disabled={it.disabled} onClick={() => { onClose(); it.onClick(); }}>
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

// Acciones de una playlist compartidas por la biblioteca y el menú lateral
export function playlistActions(pl, { onOpen, onEdit, onLoad, onDelete }) {
  return [
    onOpen && { label: "↗ Abrir", onClick: onOpen },
    { label: "✎ Editar detalles", onClick: onEdit },
    { label: "▶ Reproducir en Deck 1", onClick: () => onLoad(pl.id, 0, true), disabled: !pl.tracks.length },
    { label: "▶ Reproducir en Deck 2", onClick: () => onLoad(pl.id, 1, true), disabled: !pl.tracks.length },
    { label: "+ Añadir a la lista del Deck 1", onClick: () => onLoad(pl.id, 0, false), disabled: !pl.tracks.length },
    {
      label: "🗑 Eliminar playlist",
      danger: true,
      onClick: () => confirm(`¿Eliminar "${pl.name}"? No se puede deshacer.`) && onDelete(pl.id),
    },
  ].filter(Boolean);
}

// Nota musical plana (sustituye a los emojis 3D)
export function NoteIcon() {
  return (
    <svg className="note-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z" />
    </svg>
  );
}

// Punto de color de la ocasión (para filtros y botones)
export const OccDot = ({ k }) => <i className="occ-dot" style={{ background: `linear-gradient(135deg, ${occ(k).g})` }} />;

// Portada: foto del usuario > mosaico de las canciones > degradado con nota
export function Cover({ pl, occasion, size = "md", preview }) {
  const o = occ(pl ? pl.occasion : occasion);
  const img = preview !== undefined ? preview : pl?.cover;
  if (img) return <div className={`sp-cover ${size} img`}><img src={img} alt="" /></div>;
  const thumbs = (pl?.tracks || []).map((t) => t.thumb).filter(Boolean);
  if (thumbs.length >= 4)
    return (
      <div className={`sp-cover ${size} mosaic`}>
        {thumbs.slice(0, 4).map((s, i) => <img key={i} src={s} alt="" loading="lazy" />)}
      </div>
    );
  if (thumbs.length) return <div className={`sp-cover ${size} img`}><img src={thumbs[0]} alt="" loading="lazy" /></div>;
  return (
    <div className={`sp-cover ${size}`} style={{ background: `linear-gradient(135deg, ${o.g})` }}>
      <NoteIcon />
    </div>
  );
}

// Ventana para crear o editar los detalles de una playlist (como "Editar detalles" de Spotify)
function DetailsModal({ initial, queues, onSave, onClose, creating }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [occasion, setOccasion] = useState(initial?.occasion || "fiesta");
  const [from, setFrom] = useState("empty");
  const [busy, setBusy] = useState(false);
  // undefined = sin cambios, null = quitar foto, string = foto nueva
  const [image, setImage] = useState(undefined);
  const [imgErr, setImgErr] = useState("");
  const fileRef = useRef(null);
  const previewPl = { ...(initial || {}), occasion, tracks: initial?.tracks || [] };
  const hasPhoto = image !== undefined ? !!image : !!initial?.cover;
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <form
        className="sp-modal"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          const tracks = from === "q0" ? queues[0] : from === "q1" ? queues[1] : undefined;
          await onSave({ name: name.trim(), description, occasion, ...(creating ? { tracks: tracks || [] } : {}) }, image);
          setBusy(false);
        }}
      >
        <header>
          <h3>{creating ? "Crear playlist" : "Editar detalles"}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="sp-modal-body">
          <div className="sp-pick">
            <button type="button" className="sp-pick-btn" onClick={() => fileRef.current.click()} title="Elegir foto de portada">
              <Cover pl={previewPl} size="lg" preview={image} />
              <span className="sp-pick-hint">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h3l2-2h6l2 2h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                </svg>
                {hasPhoto ? "Cambiar foto" : "Elegir foto"}
              </span>
            </button>
            {hasPhoto && (
              <button type="button" className="link sp-pick-rm" onClick={() => setImage(null)}>Quitar foto</button>
            )}
            {imgErr && <small className="error">{imgErr}</small>}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={async (e) => {
                const f = e.target.files[0];
                e.target.value = "";
                if (!f) return;
                setImgErr("");
                try {
                  setImage(await imageToCover(f));
                } catch (x) {
                  setImgErr(x.message);
                }
              }}
            />
          </div>
          <div className="sp-modal-fields">
            <input autoFocus placeholder="Nombre de la playlist" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <textarea placeholder="Agrega una descripción opcional" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <b className="sp-lbl">Ocasión</b>
        <div className="sp-occ">
          {Object.entries(OCCASIONS).map(([k, v]) => (
            <button type="button" key={k} className={occasion === k ? "on" : ""} onClick={() => setOccasion(k)}>
<OccDot k={k} /> {v.label}
            </button>
          ))}
        </div>
        {creating && (
          <>
            <b className="sp-lbl">Empezar con</b>
            <div className="sp-occ">
              {[["empty", "Vacía"], ["q0", `Lista del Deck 1 (${queues[0].length})`], ["q1", `Lista del Deck 2 (${queues[1].length})`]].map(([k, l]) => (
                <button type="button" key={k} className={from === k ? "on" : ""} onClick={() => setFrom(k)} disabled={k !== "empty" && !queues[k === "q0" ? 0 : 1].length}>
                  {l}
                </button>
              ))}
            </div>
          </>
        )}
        <footer>
          <button className="sp-save" disabled={busy || !name.trim()}>{busy ? "Guardando…" : creating ? "Crear" : "Guardar"}</button>
        </footer>
      </form>
    </>
  );
}

function Detail({ pl, owner, onUpdate, onDelete, onLoad, onBack, onAddTrack, onCover }) {
  const [edit, setEdit] = useState(false);
  const [menu, setMenu] = useState(false);
  const o = occ(pl.occasion);
  const move = (i, d) => {
    const t = [...pl.tracks];
    const j = i + d;
    if (j < 0 || j >= t.length) return;
    [t[i], t[j]] = [t[j], t[i]];
    onUpdate(pl.id, { tracks: t });
  };
  const total = totalTime(pl.tracks);
  return (
    <div className="sp-detail">
      <div className="sp-hero" style={{ "--hc": first(o.g) }}>
        <button className="sp-back" onClick={onBack} aria-label="Volver">‹</button>
        <button className="sp-hero-cover" onClick={() => setEdit(true)} title="Editar detalles">
          <Cover pl={pl} size="xl" />
          <span className="sp-edit-hint">✎ Editar</span>
        </button>
        <div className="sp-hero-text">
          <small>Playlist · {o.label}</small>
          <h2 onClick={() => setEdit(true)} title="Editar detalles">{pl.name}</h2>
          {pl.description && <p>{pl.description}</p>}
          <span className="sp-meta">
            <i>{owner.slice(0, 1).toUpperCase()}</i> <b>{owner}</b> · {pl.tracks.length} {pl.tracks.length === 1 ? "canción" : "canciones"}
            {total && <>, <span className="dim">{total}</span></>}
          </span>
        </div>
      </div>

      <div className="sp-actions">
        <button className="sp-play" disabled={!pl.tracks.length} onClick={() => onLoad(pl.id, 0, true)} title="Reproducir en Deck 1">▶</button>
        <button className="sp-pill" disabled={!pl.tracks.length} onClick={() => onLoad(pl.id, 0, false)}>+ Lista Deck 1</button>
        <button className="sp-pill" disabled={!pl.tracks.length} onClick={() => onLoad(pl.id, 1, false)}>+ Lista Deck 2</button>
        <div className="sp-more">
          <button className="sp-dots" onClick={() => setMenu(!menu)} aria-label="Más opciones">•••</button>
          {menu && (
            <>
              <div className="backdrop clear" onClick={() => setMenu(false)} />
              <div className="sp-menu">
                <button onClick={() => { setMenu(false); setEdit(true); }}>✎ Editar detalles</button>
                <button onClick={() => { setMenu(false); onLoad(pl.id, 1, true); }}>▶ Reproducir en Deck 2</button>
                <button
                  className="danger"
                  onClick={() => {
                    setMenu(false);
                    if (confirm(`¿Eliminar "${pl.name}"? No se puede deshacer.`)) {
                      onDelete(pl.id);
                      onBack();
                    }
                  }}
                >
                  🗑 Eliminar playlist
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {pl.tracks.length === 0 ? (
        <div className="sp-empty">
          <b>Busquemos algo para tu playlist</b>
          <small>Usa ♥ en “Buscar música”, en los resultados de cada deck o en tu lista de mezcla.</small>
          <button className="sp-pill on" onClick={onAddTrack}>Buscar música</button>
        </div>
      ) : (
        <div className="sp-table" role="table">
          <div className="sp-row head" role="row">
            <span>#</span>
            <span>Título</span>
            <span className="hide-sm">Fuente</span>
            <span className="r">⏱</span>
            <span />
          </div>
          {pl.tracks.map((t, i) => (
            <div key={i} className="sp-row" role="row" onDoubleClick={() => onLoad(pl.id, 0, true, i)}>
              <span className="sp-n">
                <i>{i + 1}</i>
                <button onClick={() => onLoad(pl.id, 0, true, i)} title="Reproducir desde aquí en Deck 1">▶</button>
              </span>
              <span className="sp-title">
                {t.thumb ? <img src={t.thumb} alt="" loading="lazy" /> : <div className="sp-fi">♫</div>}
                <span>
                  <b>{t.title}</b>
                  <small>{t.kind === "yt" ? t.channel || "YouTube" : "Archivo local"}</small>
                </span>
              </span>
              <span className="hide-sm dim">{t.kind === "yt" ? "YouTube" : "Este dispositivo"}</span>
              <span className="r dim">{t.length || "—"}</span>
              <span className="sp-row-act">
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Subir">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === pl.tracks.length - 1} title="Bajar">▼</button>
                <button onClick={() => onUpdate(pl.id, { tracks: pl.tracks.filter((_, k) => k !== i) })} title="Quitar de la playlist">✕</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <DetailsModal
          initial={pl}
          queues={[[], []]}
          onClose={() => setEdit(false)}
          onSave={async (d, image) => {
            await onUpdate(pl.id, d);
            if (image !== undefined) await onCover(pl.id, image);
            setEdit(false);
          }}
        />
      )}
    </div>
  );
}

export default function Library({ sel, setSel, playlists, queues, owner = "Tú", onCreate, onUpdate, onDelete, onLoad, onSearch, onCover, editRequest, onEditHandled }) {
  const [filter, setFilter] = useState("");
  const [chip, setChip] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null);
  const current = playlists.find((p) => p.id === sel);
  const editingPl = playlists.find((p) => p.id === editing);

  // "Editar detalles" pedido desde el menú lateral
  useEffect(() => {
    if (!editRequest) return;
    setSel(null);
    setEditing(editRequest);
    onEditHandled && onEditHandled();
  }, [editRequest]);

  const openMenu = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const fromButton = e.type === "click";
    setMenu({
      x: fromButton ? r.right - 220 : e.clientX,
      y: fromButton ? r.bottom + 4 : e.clientY,
      title: p.name,
      items: playlistActions(p, {
        onOpen: () => setSel(p.id),
        onEdit: () => setEditing(p.id),
        onLoad,
        onDelete: (id) => {
          onDelete(id);
          if (sel === id) setSel(null);
        },
      }),
    });
  };
  const used = [...new Set(playlists.map((p) => p.occasion))];
  const shown = playlists.filter(
    (p) =>
      (chip === "all" || p.occasion === chip) &&
      (!filter || (p.name + " " + occ(p.occasion).label + " " + (p.description || "")).toLowerCase().includes(filter.toLowerCase()))
  );

  if (current)
    return (
      <section className="library page sp">
        <Detail key={current.id} pl={current} owner={owner} onUpdate={onUpdate} onDelete={onDelete} onLoad={onLoad} onBack={() => setSel(null)} onAddTrack={onSearch} onCover={onCover} />
      </section>
    );

  return (
    <section className="library page sp">
      <header className="sp-head">
        <div>
          <small>TU BIBLIOTECA</small>
          <h2>Mis playlists</h2>
        </div>
        <button className="sp-pill on" onClick={() => setCreating(true)}>＋ Crear playlist</button>
      </header>

      {playlists.length > 0 && (
        <div className="sp-toolbar">
          <div className="sp-chips">
            <button className={chip === "all" ? "on" : ""} onClick={() => setChip("all")}>Todas</button>
            {used.map((k) => (
              <button key={k} className={chip === k ? "on" : ""} onClick={() => setChip(chip === k ? "all" : k)}>
<OccDot k={k} /> {occ(k).label}
              </button>
            ))}
          </div>
          <label className="sp-find">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2" /></svg>
            <input placeholder="Buscar en tus playlists" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
        </div>
      )}

      <div className="sp-grid">
        <button className="sp-card sp-new" onClick={() => setCreating(true)}>
          <div className="sp-cover md new"><span>＋</span></div>
          <b>Crear playlist</b>
          <small>Para una fiesta, boda, gym…</small>
        </button>
        {shown.map((p) => (
          <div
            key={p.id}
            className="sp-card"
            role="button"
            tabIndex={0}
            onClick={() => setSel(p.id)}
            onKeyDown={(e) => e.key === "Enter" && setSel(p.id)}
            onContextMenu={(e) => openMenu(e, p)}
          >
            <div className="sp-cover-wrap">
              <Cover pl={p} />
              <button className="sp-card-more" title="Más opciones: editar, eliminar…" aria-label={`Opciones de ${p.name}`} onClick={(e) => openMenu(e, p)}>
                •••
              </button>
              <button
                className="sp-fab"
                title="Reproducir en Deck 1"
                disabled={!p.tracks.length}
                onClick={(e) => {
                  e.stopPropagation();
                  onLoad(p.id, 0, true);
                }}
              >
                ▶
              </button>
            </div>
            <b title={p.name}>{p.name}</b>
            <small>{occ(p.occasion).label} · {p.tracks.length} {p.tracks.length === 1 ? "canción" : "canciones"}</small>
          </div>
        ))}
      </div>

      {playlists.length === 0 && (
        <div className="sp-empty">
          <b>Crea tu primera playlist</b>
          <small>Es fácil: ponle un nombre, elige la ocasión y añade canciones con ♥ desde “Buscar música”.</small>
        </div>
      )}
      {playlists.length > 0 && shown.length === 0 && <p className="hint">No hay playlists que coincidan.</p>}

      <PlaylistMenu menu={menu} onClose={() => setMenu(null)} />
      {editingPl && (
        <DetailsModal
          initial={editingPl}
          queues={[[], []]}
          onClose={() => setEditing(null)}
          onSave={async (d, image) => {
            await onUpdate(editingPl.id, d);
            if (image !== undefined) await onCover(editingPl.id, image);
            setEditing(null);
          }}
        />
      )}
      {creating && (
        <DetailsModal
          creating
          queues={queues}
          onClose={() => setCreating(false)}
          onSave={async (d, image) => {
            const p = await onCreate(d);
            if (p && image) await onCover(p.id, image);
            setCreating(false);
            if (p) setSel(p.id);
          }}
        />
      )}
    </section>
  );
}
