"use client";
import { useCallback, useEffect, useState } from "react";
import { Knob, LedMeter, Fader } from "./Controls";
import { BEAT_LABELS, FX_TYPES } from "../lib/engine";

function Strip({ engine, i, source }) {
  const c = engine.channels[i];
  const [cue, setCue] = useState(false);
  const [ctype, setCtype] = useState("filter");
  const [assign, setAssign] = useState(i === 0 ? "A" : "B");
  const level = useCallback(() => c.level(), [c]);
  const yt = source === "yt";
  return (
    <div className={`strip ${yt ? "yt" : ""}`}>
      <div className="chname">CH {i + 1}</div>
      {yt && <div className="ytbadge" title="El audio de YouTube no se puede procesar">YouTube: sin EQ/FX</div>}
      <Knob label="TRIM" onChange={(v) => c.setTrim(v)} />
      <Knob label="HI" onChange={(v) => c.setEq("high", v)} />
      <Knob label="MID" onChange={(v) => c.setEq("mid", v)} />
      <Knob label="LOW" onChange={(v) => c.setEq("low", v)} />
      <Knob label={ctype === "filter" ? "FILTER" : "NOISE"} size={46} onChange={(v) => c.setColor(v)} />
      <button
        className="mini"
        onClick={() => {
          const n = ctype === "filter" ? "noise" : "filter";
          setCtype(n);
          c.setColorType(n);
        }}
      >
        COLOR: {ctype === "filter" ? "FILTER" : "NOISE"}
      </button>
      <button className={`cuebtn ${cue ? "on" : ""}`} onClick={() => { c.setCue(!cue); setCue(!cue); }}>CUE</button>
      <div className="faderrow">
        <LedMeter get={level} height={130} />
        <Fader def={1} onChange={(v) => c.setFader(v)} height={130} />
      </div>
      <div className="seg">
        {["A", "THRU", "B"].map((a) => (
          <button key={a} className={assign === a ? "on" : ""} onClick={() => { setAssign(a); engine.setXfAssign(i, a); }}>{a}</button>
        ))}
      </div>
    </div>
  );
}

export default function Mixer({ engine, sources, xf, onXf }) {
  const fx = engine.fx;
  const [fxType, setFxType] = useState(fx.type);
  const [fxOn, setFxOn] = useState(false);
  const [div, setDiv] = useState(fx.divIdx);
  const [assign, setAssign] = useState([...fx.assign]);
  const [mic, setMic] = useState(false);
  const [curve, setCurve] = useState("smooth");
  const [outs, setOuts] = useState([]);
  const [hp, setHp] = useState("");
  const [bpm, setBpm] = useState(120);
  const mL = useCallback(() => engine.masterLevel(0), [engine]);
  const mR = useCallback(() => engine.masterLevel(1), [engine]);

  const refreshOuts = () => engine.listOutputs().then(setOuts).catch(() => {});
  useEffect(() => {
    refreshOuts();
    const t = setInterval(() => setBpm(engine.fxBpm()), 500);
    return () => clearInterval(t);
  }, []);

  const applyFx = (patch) => { Object.assign(fx, patch); fx.apply(); };

  return (
    <aside className="mixer">
      <div className="brand">DJ STRAP <small>PERFORMANCE CONTROLLER</small></div>

      <section className="msec mic">
        <div className="mtitle">MIC</div>
        <button
          className={`mini ${mic ? "on red" : ""}`}
          onClick={async () => {
            try {
              await engine.setMic(!mic);
              setMic(!mic);
              refreshOuts();
            } catch {
              alert("No se pudo acceder al micrófono.");
            }
          }}
        >
          {mic ? "ON" : "OFF"}
        </button>
        <Knob small size={32} label="LEVEL" min={0} max={1} def={0.5} onChange={(v) => engine.setMicLevel(v)} />
        <Knob small size={32} label="HI" onChange={(v) => engine.setMicEq("high", v)} />
        <Knob small size={32} label="LOW" onChange={(v) => engine.setMicEq("low", v)} />
      </section>

      <section className="strips">
        <Strip engine={engine} i={0} source={sources[0]} />
        <div className="center">
          <div className="mtitle">MASTER</div>
          <Knob label="LEVEL" min={0} max={1} def={0.8} onChange={(v) => engine.setMaster(v)} />
          <div className="mmeters">
            <LedMeter get={mL} height={150} />
            <LedMeter get={mR} height={150} />
          </div>
          <Knob small size={32} label="SAMPLER" min={0} max={1} def={0.77} onChange={(v) => engine.setSamplerLevel(v)} />
          <div className="mtitle">PHONES</div>
          <Knob small size={32} label="CUE/MST" min={0} max={1} def={0.3} onChange={(v) => engine.setHpMix(v)} />
          <Knob small size={32} label="LEVEL" min={0} max={1} def={0.8} onChange={(v) => engine.setHpLevel(v)} />
        </div>
        <Strip engine={engine} i={1} source={sources[1]} />
      </section>

      <section className="msec hpout">
        <span>Salida auriculares (CUE):</span>
        <select
          value={hp}
          onFocus={refreshOuts}
          onChange={async (e) => {
            setHp(e.target.value);
            try { await engine.setHeadphones(e.target.value); } catch { alert("No se pudo usar esa salida."); }
          }}
        >
          <option value="">Desactivada</option>
          {outs.map((d, k) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Salida ${k + 1}`}</option>
          ))}
        </select>
      </section>

      <section className="msec beatfx">
        <div className="mtitle">BEAT FX <small>{bpm.toFixed(1)} BPM</small></div>
        <div className="fxrow">
          <div className="fxsel">
            {FX_TYPES.map(([k, l]) => (
              <button key={k} className={fxType === k ? "on" : ""} onClick={() => { setFxType(k); applyFx({ type: k }); }}>{l}</button>
            ))}
          </div>
          <div className="fxbeat">
            <button onClick={() => { const d = Math.max(0, div - 1); setDiv(d); applyFx({ divIdx: d }); }}>◀</button>
            <b>{BEAT_LABELS[div]}</b>
            <button onClick={() => { const d = Math.min(BEAT_LABELS.length - 1, div + 1); setDiv(d); applyFx({ divIdx: d }); }}>▶</button>
            <small>BEAT</small>
          </div>
          <Knob label="LEVEL/DEPTH" min={0} max={1} def={0.5} onChange={(v) => applyFx({ level: v })} />
          <button className={`fxon ${fxOn ? "on" : ""}`} onClick={() => { setFxOn(!fxOn); applyFx({ on: !fxOn }); }}>
            {fxOn ? "ON" : "OFF"}
          </button>
        </div>
        <div className="seg">
          {["CH1", "CH2", "MST"].map((l, k) => (
            <button
              key={l}
              className={assign[k] ? "on" : ""}
              onClick={() => {
                const n = [...assign];
                n[k] = !n[k];
                setAssign(n);
                applyFx({ assign: n });
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="msec xfsec">
        <div className="xflab"><b className="a">A</b><span>CROSSFADER</span><b className="b">B</b></div>
        <Fader horizontal className="xfader" min={0} max={1} def={0.5} value={xf} onChange={onXf} />
        <div className="seg">
          {[["smooth", "SUAVE"], ["sharp", "CORTE"]].map(([k, l]) => (
            <button key={k} className={curve === k ? "on" : ""} onClick={() => { setCurve(k); engine.setXfCurve(k); }}>{l}</button>
          ))}
        </div>
      </section>
    </aside>
  );
}
