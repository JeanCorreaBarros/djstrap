// Reproductor con posición/velocidad libres (permite scratch, reversa y loops exactos)
class Player extends AudioWorkletProcessor {
  constructor() {
    super();
    this.L = null;
    this.R = null;
    this.len = 0;
    this.pos = 0;
    this.playing = false;
    this.rate = 1;
    this.dir = 1;
    this.bend = 0;
    this.scratch = false;
    this.scratchRate = 0;
    this.cur = 0;
    this.loop = null;
    this.n = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      switch (m.t) {
        case "load":
          this.L = m.L;
          this.R = m.R || m.L;
          this.len = m.L.length;
          this.pos = 0;
          this.cur = 0;
          this.playing = false;
          this.loop = null;
          break;
        case "unload":
          this.L = this.R = null;
          this.len = 0;
          this.playing = false;
          break;
        case "play": this.playing = m.v; break;
        case "seek": this.pos = Math.max(0, Math.min(this.len - 2, m.v)); break;
        case "rate": this.rate = m.v; break;
        case "dir": this.dir = m.v; break;
        case "bend": this.bend = m.v; break;
        case "scratch": this.scratch = m.v; break;
        case "scratchRate": this.scratchRate = m.v; break;
        case "loop": this.loop = m.v; break;
      }
    };
  }

  process(_, outputs) {
    const out = outputs[0];
    const oL = out[0];
    const oR = out[1] || out[0];
    const n = oL.length;
    if (!this.L) {
      oL.fill(0);
      oR.fill(0);
      return true;
    }
    const L = this.L, R = this.R, len = this.len;
    const target = this.scratch
      ? this.scratchRate
      : this.playing
      ? this.rate * this.dir * (1 + this.bend)
      : 0;
    const k = this.scratch ? 0.003 : 0.002;
    let pos = this.pos, cur = this.cur;
    const loop = this.loop;
    let ended = false;

    for (let i = 0; i < n; i++) {
      cur += (target - cur) * k;
      if (target === 0 && cur > -1e-5 && cur < 1e-5) {
        cur = 0;
        oL[i] = 0;
        oR[i] = 0;
        continue;
      }
      pos += cur;
      if (loop) {
        if (cur > 0 && pos >= loop.e) pos = loop.s + (pos - loop.e);
        else if (cur < 0 && pos < loop.s) pos = loop.e - (loop.s - pos);
      }
      if (pos >= len - 2) {
        pos = len - 2;
        if (this.playing && !this.scratch) { this.playing = false; ended = true; }
        cur = 0;
      } else if (pos < 0) {
        pos = 0;
        if (!this.scratch) this.playing = false;
        cur = 0;
      }
      const j = pos | 0;
      const f = pos - j;
      oL[i] = L[j] * (1 - f) + L[j + 1] * f;
      oR[i] = R[j] * (1 - f) + R[j + 1] * f;
    }
    this.pos = pos;
    this.cur = cur;
    if (++this.n % 2 === 0) {
      this.port.postMessage({ t: "pos", pos, time: currentTime, rate: cur, playing: this.playing });
    }
    if (ended) this.port.postMessage({ t: "ended" });
    return true;
  }
}
registerProcessor("player", Player);
