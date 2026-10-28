"use client";
import { useEffect, useRef, useState } from "react";

// Mantiene el arrastre aunque el dedo salga del control
export function capture(e) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
}

// Perilla giratoria: arrastrar arriba/abajo, rueda del ratón, doble clic = valor por defecto
export function Knob({ label, min = -1, max = 1, def = 0, onChange, size = 40, center, small }) {
  const [v, setV] = useState(def);
  const drag = useRef(null);
  const set = (x) => {
    const n = Math.min(max, Math.max(min, x));
    setV(n);
    onChange && onChange(n);
  };
  const t = (v - min) / (max - min);
  const ang = -135 + t * 270;
  const bipolar = center ?? min < 0;
  const r = size / 2 - 3;
  const arc = (a0, a1) => {
    const p = (a) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return [size / 2 + r * Math.cos(rad), size / 2 + r * Math.sin(rad)];
    };
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0} ${y0} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1} ${y1}`;
  };
  const from = bipolar ? 0 : -135;
  return (
    <div className={`knob ${small ? "sm" : ""}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerDown={(e) => {
          capture(e);
          drag.current = { y: e.clientY, v };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          set(drag.current.v + ((drag.current.y - e.clientY) / 150) * (max - min));
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => set(def)}
        onWheel={(e) => set(v - Math.sign(e.deltaY) * (max - min) * 0.03)}
      >
        <path d={arc(-135, 135)} className="k-track" />
        {Math.abs(ang - from) > 1 && <path d={ang > from ? arc(from, ang) : arc(ang, from)} className="k-val" />}
        <circle cx={size / 2} cy={size / 2} r={r - 5} className="k-body" />
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + (r - 7) * Math.sin((ang * Math.PI) / 180)}
          y2={size / 2 - (r - 7) * Math.cos((ang * Math.PI) / 180)}
          className="k-ind"
        />
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}

// Medidor LED que se actualiza por animación (sin re-render)
export function LedMeter({ get, height = 120 }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    let s = 0;
    const f = () => {
      raf = requestAnimationFrame(f);
      const v = get ? get() : 0;
      s = Math.max(v, s * 0.92);
      if (ref.current) ref.current.style.clipPath = `inset(${100 - Math.min(100, Math.sqrt(s) * 100)}% 0 0 0)`;
    };
    f();
    return () => cancelAnimationFrame(raf);
  }, [get]);
  return (
    <div className="led" style={{ height }}>
      <i ref={ref} />
    </div>
  );
}

// Fader táctil (vertical u horizontal): se arrastra de forma relativa, doble toque = valor por defecto
export function Fader({ def = 1, min = 0, max = 1, onChange, height = 120, value, onDoubleClick, horizontal, className = "" }) {
  const [inner, setInner] = useState(def);
  const ref = useRef(null);
  const drag = useRef(null);
  const lastTap = useRef(0);
  const v = value !== undefined ? value : inner;
  const t = (v - min) / (max - min);
  const set = (x) => {
    const n = Math.min(max, Math.max(min, x));
    if (value === undefined) setInner(n);
    onChange && onChange(n);
  };
  const reset = () => (onDoubleClick ? onDoubleClick() : set(def));
  return (
    <div
      ref={ref}
      className={`fader ${horizontal ? "h" : "v"} ${className}`}
      style={horizontal ? undefined : { height }}
      onPointerDown={(e) => {
        const now = performance.now();
        if (now - lastTap.current < 300) { reset(); lastTap.current = 0; return; }
        lastTap.current = now;
        capture(e);
        const r = ref.current.getBoundingClientRect();
        const len = horizontal ? r.width - 22 : r.height - 18;
        // tocar fuera del botón lo lleva a esa posición; tocar el botón lo arrastra
        const pos = horizontal ? (e.clientX - r.left - 11) / len : 1 - (e.clientY - r.top - 9) / len;
        const start = Math.abs(pos - t) > 0.08 ? min + Math.min(1, Math.max(0, pos)) * (max - min) : v;
        if (start !== v) set(start);
        drag.current = { x: e.clientX, y: e.clientY, v: start, len };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const delta = horizontal ? (e.clientX - d.x) / d.len : (d.y - e.clientY) / d.len;
        set(d.v + delta * (max - min));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onWheel={(e) => set(v - Math.sign(e.deltaY) * (max - min) * 0.02)}
    >
      <div className="f-track" />
      <div
        className="f-thumb"
        style={horizontal ? { left: `calc(${t} * (100% - 22px))` } : { bottom: `calc(${t} * (100% - 18px))` }}
      />
    </div>
  );
}
