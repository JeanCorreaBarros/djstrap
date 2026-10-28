"use client";
import { useEffect, useState } from "react";

const ago = (t) => {
  if (!t) return "nunca";
  const s = (Date.now() - t) / 1000;
  if (s < 120) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};
const date = (t) => new Date(t).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dayLabel = (k) => new Date(k + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short" });

// Gráfica de barras de los últimos 30 días
function Bars({ data, color }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((a, d) => a + d.n, 0);
  return (
    <div className="ad-chart">
      <div className="ad-bars" role="img" aria-label={`${total} en 30 días`}>
        {data.map((d) => (
          <div key={d.day} className="ad-bar" title={`${dayLabel(d.day)}: ${d.n}`}>
            <i style={{ height: `${(d.n / max) * 100}%`, background: color }} />
          </div>
        ))}
      </div>
      <div className="ad-axis">
        <span>{dayLabel(data[0].day)}</span>
        <span>Total 30 días: <b>{total}</b></span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);

  useEffect(() => {
    let dead = false;
    const load = () =>
      fetch("/api/admin/stats")
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "Error");
          if (!dead) { setS(d); setAt(Date.now()); setErr(""); }
        })
        .catch((x) => !dead && setErr(x.message));
    load();
    const t = setInterval(load, 15000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  if (err && !s) return <section className="page"><div className="card center"><b>{err}</b></div></section>;
  if (!s) return <section className="page"><p className="hint">Cargando estadísticas…</p></section>;
  const t = s.totals;
  const users = s.users.filter((u) => !q || `${u.username} ${u.displayName}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <section className="page admin">
      <header className="sp-head">
        <div>
          <small>SOLO ADMINISTRADOR</small>
          <h2>Panel de control</h2>
        </div>
        <span className="ad-live"><i /> En vivo · actualizado {ago(at)}</span>
      </header>

      <div className="ad-kpis">
        <div className="hot"><small>Usando la app ahora</small><b>{t.onlineNow}</b><span>activos en los últimos 24 h: {t.active24h}</span></div>
        <div><small>Usuarios registrados</small><b>{t.users}</b><span>+{t.newToday} hoy · {t.active7d} activos en 7 días</span></div>
        <div><small>Descargas de la app</small><b>{t.downloads}</b><span>{t.downloadsToday} hoy</span></div>
        <div><small>Visitas a la página</small><b>{t.visitsToday}</b><span>hoy · {t.visits30d} en 30 días</span></div>
        <div><small>Playlists creadas</small><b>{t.playlists}</b><span>en todas las cuentas</span></div>
        <div><small>Mezclas publicadas</small><b>{t.mixes}</b><span>{t.plays} reproducciones</span></div>
      </div>

      <div className="ad-grid">
        <div className="card"><h3>Registros por día</h3><Bars data={s.signups} color="linear-gradient(180deg, #ff7a3d, #ff2d8a)" /></div>
        <div className="card"><h3>Descargas por día</h3><Bars data={s.downloads} color="linear-gradient(180deg, #b36bff, #6a2fa8)" /></div>
        <div className="card"><h3>Visitas por día</h3><Bars data={s.visits} color="linear-gradient(180deg, #19d6ff, #2a8cff)" /></div>
        <div className="card">
          <h3>Últimas descargas</h3>
          {s.recentDownloads.length === 0 ? (
            <p className="dim">Aún nadie ha descargado la app de escritorio.</p>
          ) : (
            <ul className="ad-list">
              {s.recentDownloads.map((d, i) => (
                <li key={i}><span>{d.file}</span><small>{date(d.at)}</small></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row between wrap">
          <h3>Usuarios ({s.users.length})</h3>
          <label className="sp-find">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2" /></svg>
            <input placeholder="Buscar usuario" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="ad-table">
          <div className="ad-row head"><span>Usuario</span><span>Registro</span><span>Última vez</span><span className="r">Playlists</span><span className="r">Mezclas</span></div>
          {users.slice(0, 200).map((u) => (
            <div key={u.username} className="ad-row">
              <span className="ad-user"><i className={u.online ? "on" : ""} /> <b>{u.displayName || u.username}</b> {u.displayName && <small>@{u.username}</small>}</span>
              <span className="dim">{date(u.created)}</span>
              <span className={u.online ? "ok" : "dim"}>{u.online ? "En línea" : ago(u.lastSeen)}</span>
              <span className="r">{u.playlists}</span>
              <span className="r">{u.mixes}</span>
            </div>
          ))}
          {users.length > 200 && <p className="dim">Mostrando 200 de {users.length}. Usa el buscador.</p>}
        </div>
      </div>
      <p className="hint">Este panel solo existe en la web: no aparece en la app de escritorio ni para usuarios normales.</p>
    </section>
  );
}
