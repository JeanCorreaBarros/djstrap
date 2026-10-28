"use client";
import { useEffect, useRef, useState } from "react";
import { api, imageToCover } from "../lib/api";

const since = (t) => (t ? new Date(t).toLocaleDateString("es", { month: "long", year: "numeric" }) : "");

function strength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}
const LEVELS = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];

export function Avatar({ user, size = 36 }) {
  const name = user.displayName || user.username;
  return user.avatar ? (
    <img className="avatar" src={user.avatar} alt="" style={{ width: size, height: size }} />
  ) : (
    <i className="avatar ph" style={{ width: size, height: size, fontSize: size * 0.42 }}>{name.slice(0, 1).toUpperCase()}</i>
  );
}

export default function ProfilePage({ user, onUser, onLogout }) {
  const [stats, setStats] = useState(null);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [msg, setMsg] = useState({});
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [del, setDel] = useState("");
  const [busy, setBusy] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    api.profile().then((d) => setStats(d.stats)).catch(() => {});
  }, []);

  const flash = (k, text, ok = true) => {
    setMsg((m) => ({ ...m, [k]: { text, ok } }));
    setTimeout(() => setMsg((m) => ({ ...m, [k]: null })), 3500);
  };

  async function saveInfo(e) {
    e.preventDefault();
    setBusy("info");
    try {
      const { user: u } = await api.updateProfile({ displayName, bio });
      onUser(u);
      flash("info", "Perfil actualizado");
    } catch (x) {
      flash("info", x.message, false);
    }
    setBusy("");
  }

  async function changeAvatar(file) {
    try {
      const img = file ? await imageToCover(file, 400) : null;
      const { user: u } = await api.setAvatar(img);
      onUser(u);
      flash("info", file ? "Foto actualizada" : "Foto eliminada");
    } catch (x) {
      flash("info", x.message, false);
    }
  }

  async function savePw(e) {
    e.preventDefault();
    if (pw.next !== pw.confirm) return flash("pw", "Las contraseñas nuevas no coinciden", false);
    setBusy("pw");
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      flash("pw", "Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.");
    } catch (x) {
      flash("pw", x.message, false);
    }
    setBusy("");
  }

  async function deleteAccount(e) {
    e.preventDefault();
    if (!confirm("¿Seguro? Se borrarán tu cuenta, playlists, mezclas publicadas e historial. No se puede deshacer.")) return;
    setBusy("del");
    try {
      await api.deleteAccount(del);
      location.href = "/";
    } catch (x) {
      flash("del", x.message, false);
      setBusy("");
    }
  }

  const name = user.displayName || user.username;
  const lvl = strength(pw.next);
  const dirty = displayName !== (user.displayName || "") || bio !== (user.bio || "");

  return (
    <section className="page profile">
      <div className="pf-hero">
        <button className="pf-avatar" onClick={() => fileRef.current.click()} title="Cambiar foto de perfil">
          <Avatar user={user} size={168} />
          <span>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h3l2-2h6l2 2h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            </svg>
            Elegir foto
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; f && changeAvatar(f); }} />
        <div className="pf-text">
          <small>Perfil</small>
          <h2>{name}</h2>
          {user.bio && <p>{user.bio}</p>}
          <span className="dim">@{user.username} · Miembro desde {since(user.created)}</span>
          {user.avatar && <button className="link pf-rm" onClick={() => changeAvatar(null)}>Quitar foto</button>}
        </div>
      </div>

      <div className="pf-stats">
        {[
          ["playlists", "Playlists"],
          ["mixes", "Mezclas publicadas"],
          ["likes", "Me gusta recibidos"],
          ["plays", "Reproducciones"],
          ["played", "Canciones mezcladas"],
        ].map(([k, l]) => (
          <div key={k}>
            <b>{stats ? stats[k].toLocaleString("es") : "—"}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>

      <div className="pf-grid">
        <form className="card pf-card" onSubmit={saveInfo}>
          <h3>Datos del perfil</h3>
          <label>
            <span>Usuario</span>
            <input value={user.username} disabled />
            <small className="dim">Con este usuario inicias sesión. No se puede cambiar.</small>
          </label>
          <label>
            <span>Nombre visible</span>
            <input value={displayName} maxLength={40} placeholder={user.username} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label>
            <span>Bio</span>
            <textarea value={bio} maxLength={200} placeholder="Cuéntale a la comunidad qué tipo de música mezclas…" onChange={(e) => setBio(e.target.value)} />
            <small className="dim">{bio.length}/200</small>
          </label>
          <div className="pf-foot">
            {msg.info && <span className={msg.info.ok ? "ok" : "error"}>{msg.info.text}</span>}
            <button className="sp-pill on" disabled={!dirty || busy === "info"}>{busy === "info" ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </form>

        <form className="card pf-card" onSubmit={savePw}>
          <h3>Cambiar contraseña</h3>
          <label>
            <span>Contraseña actual</span>
            <input type={show ? "text" : "password"} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </label>
          <label>
            <span>Nueva contraseña</span>
            <input type={show ? "text" : "password"} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            {pw.next && (
              <span className={`pf-meter l${lvl}`}>
                <i /><i /><i /><i />
                <small>{pw.next.length < 6 ? "Mínimo 6 caracteres" : LEVELS[lvl]}</small>
              </span>
            )}
          </label>
          <label>
            <span>Repite la nueva contraseña</span>
            <input type={show ? "text" : "password"} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            {pw.confirm && pw.confirm !== pw.next && <small className="error">No coinciden</small>}
          </label>
          <label className="pf-check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar contraseñas
          </label>
          <div className="pf-foot">
            {msg.pw && <span className={msg.pw.ok ? "ok" : "error"}>{msg.pw.text}</span>}
            <button className="sp-pill on" disabled={busy === "pw" || !pw.current || pw.next.length < 6 || pw.next !== pw.confirm}>
              {busy === "pw" ? "Cambiando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>

        <div className="card pf-card">
          <h3>Sesión</h3>
          <p className="dim">Cierra la sesión en este dispositivo. Tus playlists y listas quedan guardadas en tu cuenta.</p>
          <div className="pf-foot">
            <button className="sp-pill" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </div>

        <form className="card pf-card danger-zone" onSubmit={deleteAccount}>
          <h3>Eliminar cuenta</h3>
          <p className="dim">Borra para siempre tu cuenta, playlists, portadas, mezclas publicadas, comentarios e historial.</p>
          <label>
            <span>Escribe tu contraseña para confirmar</span>
            <input type="password" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} />
          </label>
          <div className="pf-foot">
            {msg.del && <span className="error">{msg.del.text}</span>}
            <button className="pf-danger" disabled={!del || busy === "del"}>{busy === "del" ? "Eliminando…" : "Eliminar mi cuenta"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
