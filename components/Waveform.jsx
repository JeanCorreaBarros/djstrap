"use client";
import { useEffect, useRef } from "react";
import { PPS } from "../lib/analyze";

export const HOT_COLORS = ["#ff3d3d", "#ff9f1a", "#ffd23d", "#2ee66b", "#19d6ff", "#4d7cff", "#b44dff", "#ff4dc4"];

// mode "zoom": ventana de 6 s centrada con rejilla de beats; mode "full": pista completa (clic = saltar)
export default function Waveform({ ch, color, mode }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const g = cv.getContext("2d");
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(cv.clientWidth * dpr);
      const h = Math.floor(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      g.clearRect(0, 0, w, h);
      const pk = ch.peaks;
      if (!ch.buffer || !pk) return;
      const n = pk.length;
      const pos = ch.posSec;
      const dur = ch.dur;
      const zoom = mode === "zoom";
      const win = 6;
      const t0 = zoom ? pos - win / 2 : 0;
      const span = zoom ? win : dur;
      const X = (t) => ((t - t0) / span) * w;
      const mid = h / 2;

      // loop
      if (ch.loop) {
        g.fillStyle = "rgba(46,230,107,0.22)";
        g.fillRect(X(ch.loop.s), 0, X(ch.loop.e) - X(ch.loop.s), h);
      }

      // barras
      for (let x = 0; x < w; x++) {
        const ta = t0 + (x / w) * span;
        const tb = t0 + ((x + 1) / w) * span;
        let i0 = Math.floor(ta * PPS);
        let i1 = Math.max(i0 + 1, Math.floor(tb * PPS));
        if (i1 <= 0 || i0 >= n) continue;
        i0 = Math.max(0, i0);
        i1 = Math.min(n, i1);
        const step = Math.max(1, ((i1 - i0) / 6) | 0);
        let m = 0;
        for (let i = i0; i < i1; i += step) if (pk[i] > m) m = pk[i];
        const a = Math.min(1, m * 1.3) * mid * 0.95;
        g.fillStyle = ta < pos ? (zoom ? color : "#ffffff") : color;
        g.globalAlpha = ta < pos && !zoom ? 0.55 : zoom ? (ta < pos ? 0.55 : 1) : 0.9;
        g.fillRect(x, mid - a, 1, a * 2);
      }
      g.globalAlpha = 1;

      // rejilla de beats
      if (zoom && ch.bpm) {
        const bs = ch.beatSec;
        let k = Math.ceil((t0 - ch.firstBeat) / bs);
        for (let t = ch.firstBeat + k * bs; t < t0 + span; t += bs, k++) {
          g.fillStyle = k % 4 === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)";
          g.fillRect(Math.round(X(t)), 0, k % 4 === 0 ? 2 * dpr : dpr, k % 4 === 0 ? h : h * 0.18);
        }
      }

      // cue y hot cues
      const mark = (t, c, label) => {
        const x = Math.round(X(t));
        if (x < -10 || x > w + 10) return;
        g.fillStyle = c;
        g.fillRect(x, 0, 2 * dpr, h);
        if (label) {
          g.fillRect(x, 0, 12 * dpr, 11 * dpr);
          g.fillStyle = "#000";
          g.font = `bold ${9 * dpr}px system-ui`;
          g.fillText(label, x + 3 * dpr, 9 * dpr);
        }
      };
      mark(ch.cueSec, "#ffa63d", zoom ? "C" : "");
      ch.hot.forEach((t, i) => t != null && mark(t, HOT_COLORS[i], String(i + 1)));

      // cabezal
      g.fillStyle = zoom ? "#ff2a3c" : "#fff";
      g.fillRect(Math.round(X(pos)) - dpr, 0, 2 * dpr, h);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [ch, color, mode]);

  return (
    <canvas
      ref={ref}
      className={`wave ${mode}`}
      onPointerDown={(e) => {
        if (mode !== "full" || !ch.buffer) return;
        const r = e.currentTarget.getBoundingClientRect();
        ch.seek(((e.clientX - r.left) / r.width) * ch.dur);
      }}
    />
  );
}
