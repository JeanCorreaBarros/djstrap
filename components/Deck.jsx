"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useYT } from "../hooks/useYT";
import { analyzeBuffer } from "../lib/analyze";
import Waveform, { HOT_COLORS } from "./Waveform";
import { Fader, capture } from "./Controls";

const RANGES = [6, 10, 16, 50];
const PAD_MODES = [
  ["hot", "HOT CUE"],
  ["loop", "BEAT LOOP"],
  ["jump", "BEAT JUMP"],
  ["sample", "SAMPLER"],
];
const LOOP_BEATS = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
const LOOP_LABELS = ["1/4", "1/2", "1", "2", "4", "8", "16", "32"];
const JUMPS = [-1, 1, -4, 4, -8, 8, -16, 16];
const SAMPLES = ["KICK", "SNARE", "CLAP", "HAT", "HORN", "SIREN", "LASER", "RISER"];
const SAMPLE_COLORS = ["#2ee66b", "#2ee66b", "#ffd23d", "#ffd23d", "#ff3d3d", "#ff3d3d", "#19d6ff", "#b44dff"];

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;
};

const Deck = forwardRef(function Deck({ engine, idx, onEnded, onSource, onPlayed }, ref) {
  const ch = engine.channels[idx];
  const color = idx === 0 ? "#ff7a3d" : "#ff2d8a";
  const holder = useRef(null);
  const jogRef = useRef(null);
  const platRef = useRef(null);
  const endRef = useRef(onEnded);
  endRef.current = onEnded;

  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [v, setV] = useState(0);
  const [ri, setRi] = useState(1);
  const [padMode, setPadMode] = useState("hot");
  const [rev, setRev] = useState(false);
  const [shift, setShift] = useState(false);
  const [, setTick] = useState(0);
  const logged = useRef(null);
  const isYT = track?.kind === "yt";
  const yt = useYT(holder, () => endRef.current && endRef.current());
  const ytRef = useRef(yt);
  ytRef.current = yt;
  const ytCue = useRef(0);
  const rate = 1 + (v * RANGES[ri]) / 100;

  useEffect(() => {
    ch.onEnded = () => endRef.current && endRef.current();
  }, [ch]);

  useEffect(() => {
    ch.setTempo(rate);
    if (isYT) yt.setRate(rate);
  }, [rate, isYT, yt.playing, yt.ready]);

  useEffect(() => {
    engine.ytCb[idx] = (g) => ytRef.current.setVolume(g * 100);
    engine.updateGain(idx);
    return () => { engine.ytCb[idx] = null; };
  }, [yt.ready, track]);

  // refresco de la interfaz (tiempos, botones encendidos)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 100);
    return () => clearInterval(t);
  }, []);

  // giro del plato
  const jog = useRef({ on: false });
  useEffect(() => {
    let raf;
    const f = () => {
      raf = requestAnimationFrame(f);
      const j = jog.current;
      if (j.on && !j.zero && performance.now() - j.lastMove > 60) {
        ch.scratchRate(0);
        j.zero = true;
      }
      const secs = ch.buffer ? ch.posSec : ytRef.current.time;
      if (platRef.current) platRef.current.style.transform = `rotate(${(secs * 0.5556 * 360) % 360}deg)`;
    };
    f();
    return () => cancelAnimationFrame(raf);
  }, [ch]);

  async function loadTrack(t, autoplay = true) {
    setTrack(t);
    setRev(false);
    if (t.kind === "yt") {
      ch.unload();
      onSource && onSource(idx, "yt");
      ch.source = "yt";
      ytCue.current = 0;
      yt.load(t.id, autoplay);
      return;
    }
    yt.stop();
    ch.source = "file";
    onSource && onSource(idx, "file");
    setLoading(true);
    try {
      const buf = await engine.ctx.decodeAudioData(await t.file.arrayBuffer());
      await new Promise((r) => setTimeout(r, 10));
      const info = analyzeBuffer(buf);
      ch.load(buf, info);
      ch.setTempo(rate);
      if (autoplay) ch.play();
    } catch (e) {
      alert("No se pudo leer el archivo de audio: " + t.title);
    }
    setLoading(false);
  }
  // ---- transporte
  const playing = isYT ? yt.playing : ch.playing;
  const pos = isYT ? yt.time : ch.posSec;
  const dur = isYT ? yt.duration : ch.dur;

  // historial: se registra la primera vez que suena cada pista cargada
  useEffect(() => {
    if (playing && track && logged.current !== track) {
      logged.current = track;
      onPlayed && onPlayed(track, idx);
    }
  }, [playing, track]);

  useImperativeHandle(ref, () => ({
    loadTrack,
    toggle: togglePlay,
    cueDown: () => cueDown(),
    cueUp,
    sync: doSync,
    hotcue: (i) => {
      if (isYT) {
        if (ytCuePads.current[i] == null) ytCuePads.current[i] = ytRef.current.time;
        else { yt.seek(ytCuePads.current[i]); yt.play(); }
      } else ch.hotcue(i);
    },
    loop4: () => !isYT && ch.beatLoop(4),
    status: () => {
      const y = ytRef.current;
      return isYT
        ? { title: track?.title, playing: y.playing, pos: y.time, dur: y.duration }
        : { title: track?.title, playing: ch.playing, pos: ch.posSec, dur: ch.dur };
    },
  }));

  function togglePlay() {
    if (isYT) return yt.playing ? yt.pause() : yt.play();
    ch.toggle();
  }
  function cueDown(e) {
    e && e.preventDefault();
    if (!isYT) return ch.cueDown();
    if (yt.playing) { yt.pause(); yt.seek(ytCue.current); }
    else if (Math.abs(yt.time - ytCue.current) > 0.3) ytCue.current = yt.time;
    else yt.play();
  }
  function cueUp() { if (!isYT) ch.cueUp(); }

  function searchDown(dir) {
    if (isYT) return yt.seek(yt.time + dir * 5);
    ch.scratch(true);
    ch.scratchRate(dir * 8);
  }
  function searchUp() { if (!isYT) ch.scratch(false); }

  function doSync() {
    const o = engine.channels[1 - idx];
    if (isYT || !ch.bpm || !o.bpm) return;
    const r = (o.bpm * o.rate) / ch.bpm;
    const need = Math.abs(r - 1) * 100;
    let k = RANGES.findIndex((x) => x >= need);
    if (k < 0) k = RANGES.length - 1;
    setRi(k);
    setV(clamp((r - 1) / (RANGES[k] / 100), -1, 1));
    if (ch.playing && o.playing) setTimeout(() => ch.phaseAlign(o), 80);
  }

  // ---- jog / scratch
  function jogDown(e) {
    if (isYT || !ch.buffer) return;
    const r = jogRef.current.getBoundingClientRect();
    const j = jog.current;
    j.cx = r.left + r.width / 2;
    j.cy = r.top + r.height / 2;
    j.last = Math.atan2(e.clientY - j.cy, e.clientX - j.cx);
    j.lastT = j.lastMove = performance.now();
    j.on = true;
    j.zero = false;
    capture(e);
    ch.scratch(true);
    ch.scratchRate(0);
  }
  function jogMove(e) {
    const j = jog.current;
    if (!j.on) return;
    const a = Math.atan2(e.clientY - j.cy, e.clientX - j.cx);
    let d = a - j.last;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    const now = performance.now();
    const dt = Math.max(4, now - j.lastT) / 1000;
    ch.scratchRate(clamp(d / dt / (2 * Math.PI) / 0.5556, -24, 24));
    j.last = a;
    j.lastT = j.lastMove = now;
    j.zero = false;
  }
  function jogUp() {
    const j = jog.current;
    if (!j.on) return;
    j.on = false;
    ch.scratch(false);
  }
  function jogWheel(e) {
    if (isYT) return yt.seek(yt.time + Math.sign(e.deltaY) * 0.5);
    ch.seek(ch.posSec + Math.sign(e.deltaY) * 0.03);
  }

  // ---- pads
  function pad(i) {
    if (padMode === "sample") return engine.sample(i);
    if (shift && padMode === "hot") {
      if (isYT) ytCuePads.current[i] = null;
      else ch.delHot(i);
      return;
    }
    if (isYT) {
      if (padMode === "hot") {
        if (!ytCuePads.current[i]) ytCuePads.current[i] = yt.time;
        else { yt.seek(ytCuePads.current[i]); yt.play(); }
      }
      return;
    }
    if (padMode === "hot") ch.hotcue(i);
    else if (padMode === "loop") ch.beatLoop(LOOP_BEATS[i]);
    else if (padMode === "jump") ch.jump(JUMPS[i]);
  }
  function padDel(e, i) {
    e.preventDefault();
    if (padMode !== "hot") return;
    if (isYT) ytCuePads.current[i] = null;
    else ch.delHot(i);
  }
  const ytCuePads = useRef(Array(8).fill(null));
  useEffect(() => { ytCuePads.current = Array(8).fill(null); }, [track]);

  function padView(i) {
    switch (padMode) {
      case "hot": {
        const t = isYT ? ytCuePads.current[i] : ch.hot[i];
        return { label: t != null ? `${i + 1} · ${fmt(t).slice(0, 5)}` : `${i + 1}`, c: HOT_COLORS[i], lit: t != null };
      }
      case "loop":
        return { label: LOOP_LABELS[i], c: "#19b5ff", lit: !!ch.loop && ch.loopBeats === LOOP_BEATS[i] };
      case "jump":
        return { label: (JUMPS[i] > 0 ? "+" : "") + JUMPS[i], c: "#b44dff", lit: false };
      default:
        return { label: SAMPLES[i], c: SAMPLE_COLORS[i], lit: true };
    }
  }

  const pct = dur ? (pos / dur) * 100 : 0;
  const bpm = !isYT && ch.bpm ? (ch.bpm * rate).toFixed(1) : "---.-";
  const pitch = ((rate - 1) * 100).toFixed(1);
  const loopOn = !!ch.loop;
  const fileOnly = isYT ? "off" : "";

  return (
    <section className={`deck d${idx}`} style={{ "--c": color }}>
      <header className="dhead">
        <span className="dtag">DECK {idx + 1}</span>
        <div className="dtitle">
          <b>{track ? track.title : "Sin pista — busca abajo o abre un archivo"}</b>
          <small>
            {loading ? "Analizando audio y BPM…" : track ? (isYT ? "YouTube · solo volumen, tempo y cues" : "Archivo local · EQ, FX, loops y scratch") : "—"}
          </small>
        </div>
        <div className="readout">
          <div><small>RESTANTE</small><b>-{fmt(dur - pos)}</b></div>
          <div>
            <small>BPM</small>
            <b>{bpm}</b>
            {!isYT && ch.bpm > 0 && (
              <span className="bpmfix">
                <button onClick={() => (ch.bpm /= 2)}>½</button>
                <button onClick={() => (ch.bpm *= 2)}>×2</button>
              </span>
            )}
          </div>
          <div><small>PITCH</small><b>{pitch > 0 ? "+" : ""}{pitch}%</b></div>
        </div>
      </header>

      <div className="waves">
        <Waveform ch={ch} color={color} mode="zoom" />
        <Waveform ch={ch} color={color} mode="full" />
        {isYT && <div className="ytwave" style={{ "--p": pct + "%" }}><span>YouTube · sin forma de onda</span></div>}
        {!track && <div className="ytwave"><span>Carga una pista</span></div>}
      </div>

      <div className="dmain">
        <div className="dleft">
          <div className="loopbtns">
            <button className={`round y ${ch.loopInSec != null && !loopOn ? "on" : ""} ${fileOnly}`} onClick={() => ch.loopIn()} title="Loop IN">IN<small>4 BEAT</small></button>
            <button className={`round y ${loopOn ? "on" : ""} ${fileOnly}`} onClick={() => (loopOn ? ch.exitLoop() : ch.loopInSec != null ? ch.loopOut() : ch.beatLoop(4))} title="Loop OUT">OUT</button>
            <button className={`rect r ${loopOn ? "on" : ""} ${fileOnly}`} onClick={() => ch.reloop()}>RELOOP<br />EXIT</button>
          </div>
          <div className="loopbtns">
            <button className={`rect r ${fileOnly}`} onClick={() => ch.beatLoop(4)}>4 BEAT</button>
            <button className={`rect r ${fileOnly}`} onClick={() => ch.resizeLoop(0.5)}>½X</button>
            <button className={`rect r ${fileOnly}`} onClick={() => ch.resizeLoop(2)}>2X</button>
          </div>
          <div className="modes">
            {PAD_MODES.map(([k, l]) => (
              <button key={k} className={padMode === k ? "on" : ""} onClick={() => setPadMode(k)}>{l}</button>
            ))}
          </div>
          <div className="pads">
            {Array.from({ length: 8 }, (_, i) => {
              const p = padView(i);
              return (
                <button
                  key={i}
                  className={`pad ${p.lit ? "lit" : ""}`}
                  style={{ "--pc": p.c }}
                  onPointerDown={() => pad(i)}
                  onContextMenu={(e) => padDel(e, i)}
                  title={padMode === "hot" ? "Toca: fijar/saltar · SHIFT + toque (o clic derecho): borrar" : ""}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="transport">
            <button className={`shift ${shift ? "on" : ""}`} onClick={() => setShift(!shift)} title="SHIFT + pad borra el hot cue">SHIFT</button>
            <button className="big cue" onPointerDown={cueDown} onPointerUp={cueUp} onPointerLeave={cueUp}>CUE</button>
            <button className={`big play ${playing ? "on" : ""}`} onClick={togglePlay}>{playing ? "❚❚" : "▶"}</button>
          </div>
        </div>

        <div className="jogcol">
          <div
            className={`jog ${playing ? "spin" : ""}`}
            ref={jogRef}
            onPointerDown={jogDown}
            onPointerMove={jogMove}
            onPointerUp={jogUp}
            onPointerCancel={jogUp}
            onWheel={jogWheel}
          >
            <div className="ring" style={{ "--p": pct + "%" }} />
            <div className="platter" ref={platRef}><span className="mark" /></div>
            <div className={`screen ${isYT ? "yt" : ""}`}>
              <div className="ytbox" ref={holder} />
              {!isYT && (
                <div className="scr">
                  <small>DECK {idx + 1}</small>
                  <b>{bpm}</b>
                  <span>-{fmt(dur - pos).slice(0, 5)}</span>
                  {loopOn && <em>LOOP</em>}
                </div>
              )}
            </div>
          </div>
          <div className="jogbtns">
            <button onPointerDown={() => searchDown(-1)} onPointerUp={searchUp} onPointerLeave={searchUp}>◀◀</button>
            <button onPointerDown={() => searchDown(1)} onPointerUp={searchUp} onPointerLeave={searchUp}>▶▶</button>
            <button className={`${rev ? "on" : ""} ${fileOnly}`} onClick={() => { ch.setReverse(!rev); setRev(!rev); }}>REV</button>
            <button className={`sync ${fileOnly}`} onClick={doSync}>SYNC</button>
          </div>
        </div>

        <div className="dright">
          <button className="rect" onClick={() => setRi((ri + 1) % RANGES.length)}>±{RANGES[ri] === 50 ? "WIDE" : RANGES[ri] + "%"}</button>
          <div className="tempo">
            <Fader min={-1} max={1} def={0} value={v} onChange={setV} onDoubleClick={() => setV(0)} height={230} />
            <span>TEMPO</span>
          </div>
          <div className="bend">
            <button onPointerDown={() => ch.setBend(-0.04)} onPointerUp={() => ch.setBend(0)} onPointerLeave={() => ch.setBend(0)}>−</button>
            <button onPointerDown={() => ch.setBend(0.04)} onPointerUp={() => ch.setBend(0)} onPointerLeave={() => ch.setBend(0)}>+</button>
          </div>
        </div>
      </div>
    </section>
  );
});

export default Deck;
