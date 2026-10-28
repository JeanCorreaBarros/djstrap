"use client";
import { useEffect, useState } from "react";
import { PublishForm } from "./Community";

const hhmm = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Head({ kicker, title, children }) {
  return (
    <header className="phead">
      <small>{kicker}</small>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

const FADES = [4, 8, 12, 16, 24];

function AmDeck({ i, st, queue, cur, live }) {
  const next = queue.slice(cur + 1, cur + 4);
  const pct = st.dur ? (st.pos / st.dur) * 100 : 0;
  return (
    <div className={`am-deck d${i} ${live ? "live" : ""}`}>
      <header>
        <b>DECK {i + 1}</b>
        <em>{live ? "AL AIRE" : st.playing ? "SONANDO" : st.title ? "EN ESPERA" : "VACÍO"}</em>
      </header>
      <div className="am-now">{st.title || "Sin pista cargada"}</div>
      <div className="am-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="am-time">
        <span>{st.dur ? mmss(st.pos) : "--:--"}</span>
        <span>{st.dur ? `-${mmss(st.dur - st.pos)}` : "--:--"}</span>
      </div>
      <ul className="am-next">
        <li className="lbl">A CONTINUACIÓN</li>
        {next.length === 0 && <li><span className="dim">Nada en la lista de este deck</span></li>}
        {next.map((t, k) => (
          <li key={k}>
            {t.thumb ? <img src={t.thumb} alt="" loading="lazy" /> : <div className="ph">♫</div>}
            <span>{t.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AutoMixPage({ auto, setAuto, queues, cur = [-1, -1], status = [{}, {}], xf = 0.5, engineOn, onCabina }) {
  const live = xf < 0.5 ? 0 : 1;
  const st = status[live] || {};
  const left = st.dur ? st.dur - st.pos : 0;
  const total = queues[0].length + queues[1].length;
  let line;
  if (!engineOn) line = "Enciende el controlador en la Cabina para usarlo.";
  else if (!auto.on) line = "Desactivado: tú controlas las transiciones.";
  else if (!st.playing) line = "Listo: dale PLAY a un deck y Auto-Mix se encarga del resto.";
  else if (left <= auto.fade) line = `Mezclando hacia el Deck ${2 - live}…`;
  else line = `Próxima transición en ${mmss(left - auto.fade)}`;

  return (
    <section className="page">
      <div className={`am-hero ${auto.on ? "on" : ""}`}>
        <div>
          <small>MEZCLA AUTOMÁTICA</small>
          <h2>Auto-Mix</h2>
          <p>Cuando la canción que suena está por terminar, Auto-Mix carga la siguiente en el otro deck, la inicia y mueve el crossfader suavemente. Tú solo disfrutas.</p>
          <span className="am-status"><i />{line}</span>
        </div>
        <button className="am-toggle" onClick={() => setAuto({ ...auto, on: !auto.on })} aria-pressed={auto.on}>
          {auto.on ? "ON" : "OFF"}
        </button>
      </div>

      <div className="am-flow">
        <AmDeck i={0} st={status[0] || {}} queue={queues[0]} cur={cur[0]} live={engineOn && auto.on && live === 0 && status[0]?.playing} />
        <div className="am-mid">
          <span className="am-arrows">⇄</span>
          <div className="am-xf"><i style={{ left: `${xf * 100}%` }} /></div>
          <small>CROSSFADER</small>
        </div>
        <AmDeck i={1} st={status[1] || {}} queue={queues[1]} cur={cur[1]} live={engineOn && auto.on && live === 1 && status[1]?.playing} />
      </div>

      <div className="card am-fade">
        <header>
          <b>Duración de la transición</b>
          <span>{auto.fade} s</span>
        </header>
        <div className="sp-chips">
          {FADES.map((f) => (
            <button key={f} className={auto.fade === f ? "on" : ""} onClick={() => setAuto({ ...auto, fade: f })}>{f} s</button>
          ))}
        </div>
        <label className="range">
          <input type="range" min="3" max="30" value={auto.fade} onChange={(e) => setAuto({ ...auto, fade: +e.target.value })} aria-label="Duración de la transición" />
        </label>
        <small className="dim">Corta (4-8 s) para géneros rápidos como reggaetón; larga (16-24 s) para house o lounge.</small>
      </div>

      <div className="am-steps">
        <div><b>1</b><p><strong>Arma tus listas</strong>Envía una playlist a un deck o añade canciones desde “Buscar música”. Hay {total} en cola.</p></div>
        <div><b>2</b><p><strong>Activa Auto-Mix</strong>Elige cuánto dura cada transición.</p></div>
        <div><b>3</b><p><strong>Dale PLAY</strong>Inicia un deck en la Cabina y la app mezcla sola.</p></div>
      </div>
      {engineOn ? null : <button className="sp-pill on" style={{ alignSelf: "flex-start" }} onClick={onCabina}>Ir a la Cabina</button>}
    </section>
  );
}

export function RecordPage({ rec, recordings, onStart, onStop, engineOn, onPublished }) {
  const [now, setNow] = useState(Date.now());
  const [pub, setPub] = useState(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="page">
      <Head kicker="ESTUDIO" title="Grabar mezcla">
        Graba tu sesión en vivo, descárgala o publícala con un título para que la comunidad la escuche, comente y le dé me gusta.
      </Head>
      <div className="card lg center">
        <button className={`recbtn ${rec ? "on" : ""}`} disabled={!engineOn} onClick={rec ? onStop : onStart}>
          <i />
        </button>
        <b className="rectime">{rec ? mmss((now - rec) / 1000) : "00:00"}</b>
        <small>{!engineOn ? "Enciende el controlador en la Cabina primero." : rec ? "Grabando… toca para detener" : "Toca para empezar a grabar"}</small>
      </div>
      <p className="hint">Se graba todo lo que pasa por el master: archivos locales, efectos, sampler y micrófono. El audio de YouTube no se puede grabar porque el navegador no lo permite.</p>
      <ul className="list rec-list">
        {recordings.length === 0 && <li className="empty">Tus grabaciones de esta sesión aparecerán aquí.</li>}
        {recordings.map((r) => (
          <li key={r.url}>
            <div className="meta">
              <b>{r.name}</b>
              <small>{mmss(r.dur)} · {(r.size / 1048576).toFixed(1)} MB</small>
            </div>
            <audio src={r.url} controls preload="none" />
            <a className="btnlink" href={r.url} download={r.name}>Descargar</a>
            {r.published ? (
              <a className="btnlink ghost" href={`/mix/${r.published}`}>✓ Publicada · ver</a>
            ) : (
              <button className="primary" onClick={() => setPub(pub === r.url ? null : r.url)}>Publicar</button>
            )}
            {pub === r.url && (
              <PublishForm
                rec={r}
                onDone={(mix) => {
                  setPub(null);
                  onPublished(r.url, mix);
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HistoryPage({ history, onClear, onSave, onLoad }) {
  const [copied, setCopied] = useState(false);
  const list = [...history].reverse();
  const text = history.map((h) => `${hhmm(h.at)}  [Deck ${h.deck + 1}]  ${h.title}`).join("\n");
  return (
    <section className="page">
      <Head kicker="TU SESIÓN" title="Historial">
        Todo lo que sonó, en orden. Cópialo como tracklist o guárdalo como playlist.
      </Head>
      <div className="row wrap">
        <button className="primary" disabled={!history.length} onClick={() => onSave(history)}>♥ Guardar como playlist</button>
        <button
          disabled={!history.length}
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "¡Copiado!" : "Copiar tracklist"}
        </button>
        <button className="danger" disabled={!history.length} onClick={() => confirm("¿Borrar el historial?") && onClear()}>Borrar</button>
      </div>
      <ul className="list hist">
        {list.length === 0 && <li className="empty">Aún no ha sonado nada.</li>}
        {list.map((h, i) => (
          <li key={i}>
            <span className="time">{hhmm(h.at)}</span>
            <span className={`dk d${h.deck}`}>D{h.deck + 1}</span>
            {h.thumb ? <img src={h.thumb} alt="" /> : <div className="ficon">♫</div>}
            <div className="meta">
              <b>{h.title}</b>
              <small>{new Date(h.at).toLocaleDateString()} · {h.kind === "yt" ? "YouTube" : "Archivo local"}</small>
            </div>
            <button onClick={() => onLoad(h, 0)}>+D1</button>
            <button onClick={() => onLoad(h, 1)}>+D2</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const KEYS = [
  ["Q", "Play / pausa Deck 1"],
  ["W", "CUE Deck 1 (mantener)"],
  ["E", "SYNC Deck 1"],
  ["R", "Loop de 4 beats Deck 1"],
  ["1 2 3 4", "Hot cues 1-4 Deck 1"],
  ["P", "Play / pausa Deck 2"],
  ["O", "CUE Deck 2 (mantener)"],
  ["I", "SYNC Deck 2"],
  ["U", "Loop de 4 beats Deck 2"],
  ["7 8 9 0", "Hot cues 1-4 Deck 2"],
  ["← →", "Mover crossfader"],
  ["↓", "Centrar crossfader"],
  ["G", "Empezar / parar grabación"],
  ["F", "Pantalla completa"],
];

export function SettingsPage({ wake, setWake, onFullscreen, isFs }) {
  return (
    <section className="page">
      <Head kicker="PREFERENCIAS" title="Atajos y ajustes" />
      <div className="card">
        <div className="row between">
          <div>
            <b>Mantener la pantalla encendida</b>
            <small>Ideal en tablet o celular mientras mezclas.</small>
          </div>
          <button className={`switch ${wake ? "on" : ""}`} onClick={() => setWake(!wake)} aria-pressed={wake}><i /></button>
        </div>
      </div>
      <div className="card">
        <div className="row between">
          <div>
            <b>Pantalla completa</b>
            <small>Esconde el navegador para usarlo como un controlador real.</small>
          </div>
          <button onClick={onFullscreen}>{isFs ? "Salir" : "Activar"}</button>
        </div>
      </div>
      <h3 className="sub">Atajos de teclado</h3>
      <div className="keys">
        {KEYS.map(([k, d]) => (
          <div key={k}>
            <span>{k.split(" ").map((x) => <kbd key={x}>{x}</kbd>)}</span>
            <small>{d}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DesktopPage() {
  const [info, setInfo] = useState(null);
  const isDesktop = typeof window !== "undefined" && !!window.djDesktop;
  useEffect(() => {
    if (!isDesktop) fetch("/api/desktop?check=1").then((r) => r.json()).then(setInfo).catch(() => setInfo({}));
  }, []);
  return (
    <section className="page">
      <Head kicker="WINDOWS" title="App de escritorio">
        Instala DJ Strap en tu PC: abre como una aplicación normal, con su propio ícono, sin el navegador.
      </Head>
      {isDesktop ? (
        <div className="card lg center">
          <b>✓ Estás usando la app de escritorio</b>
          <small>Tus datos se guardan en esta computadora.</small>
        </div>
      ) : (
        <div className="card lg center">
          {info?.available ? (
            <>
              <a className="primary dl" href="/api/desktop">⬇ Descargar para Windows</a>
              <small>{info.name} · {(info.size / 1048576).toFixed(0)} MB</small>
            </>
          ) : (
            <>
              <b>El instalador aún no se ha generado</b>
              <small>En la carpeta del proyecto ejecuta <code>npm run dist:win</code> y vuelve a esta página.</small>
            </>
          )}
        </div>
      )}
      <ol className="steps">
        <li>Descarga el instalador <code>DJStrap-Setup.exe</code>.</li>
        <li>Ábrelo. Si Windows muestra “Windows protegió su PC”, toca <b>Más información → Ejecutar de todas formas</b> (pasa con apps sin firma digital).</li>
        <li>Elige la carpeta y termina. Aparecerá el ícono <b>DJ Strap</b> en tu escritorio.</li>
      </ol>
    </section>
  );
}
