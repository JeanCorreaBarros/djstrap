export const PPS = 100; // barras de waveform por segundo

// Picos para la waveform y BPM + primer beat estimados
export function analyzeBuffer(buf) {
  const sr = buf.sampleRate;
  const len = buf.length;
  const a = buf.getChannelData(0);
  const b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;

  const blk = Math.max(1, Math.floor(sr / PPS));
  const n = Math.ceil(len / blk);
  const peaks = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let m = 0;
    const s = k * blk;
    const e = Math.min(len, s + blk);
    for (let i = s; i < e; i += 2) {
      const v = Math.abs(a[i]) + Math.abs(b[i]);
      if (v > m) m = v;
    }
    peaks[k] = m / 2;
  }

  // Envolvente de graves cada 5 ms sobre una ventana de hasta 90 s
  const fl = Math.floor(sr * 0.005);
  const winStart = len > sr * 100 ? Math.floor(sr * 20) : 0;
  const winEnd = Math.min(len, winStart + Math.floor(sr * 90));
  const frames = Math.floor((winEnd - winStart) / fl);
  if (frames < 600) return { peaks, bpm: 0, firstBeat: 0 };

  const env = new Float32Array(frames);
  const al = 1 - Math.exp((-2 * Math.PI * 150) / sr);
  let lp = 0;
  for (let f = 0; f < frames; f++) {
    let acc = 0;
    const s = winStart + f * fl;
    for (let i = 0; i < fl; i++) {
      lp += al * ((a[s + i] + b[s + i]) * 0.5 - lp);
      acc += lp < 0 ? -lp : lp;
    }
    env[f] = acc / fl;
  }
  const o = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    const d = env[f] - env[f - 1];
    o[f] = d > 0 ? d : 0;
  }
  const o2 = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    o2[f] = Math.max(o[f - 1] || 0, o[f], o[f + 1] || 0);
  }

  const fs = fl / sr;
  let best = { s: -1, bpm: 0, ph: 0 };
  for (let bpm = 80; bpm <= 180; bpm += 0.1) {
    const P = 60 / bpm / fs;
    for (let ph = 0; ph < P; ph += 1) {
      let s = 0;
      let c = 0;
      for (let t = ph; t < frames - 1; t += P) {
        s += o2[Math.round(t)];
        c++;
      }
      let score = s / c;
      if (bpm >= 90 && bpm <= 160) score *= 1.03;
      if (score > best.s) best = { s: score, bpm, ph };
    }
  }
  const beat = 60 / best.bpm;
  const firstBeat = ((winStart + best.ph * fl) / sr) % beat;
  return { peaks, bpm: Math.round(best.bpm * 10) / 10, firstBeat };
}
