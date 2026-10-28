// Motor de audio: 2 canales, EQ, Color FX, Beat FX, sampler, micrófono, auriculares y master
export const BEAT_DIVS = [0.25, 0.5, 0.75, 1, 2, 4];
export const BEAT_LABELS = ["1/4", "1/2", "3/4", "1", "2", "4"];
export const FX_TYPES = [
  ["echo", "ECHO"],
  ["reverb", "REVERB"],
  ["flanger", "FLANGER"],
  ["trans", "TRANS"],
];

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const dB = (d) => Math.pow(10, d / 20);

function noiseBuffer(ctx, sec) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function impulse(ctx, sec) {
  const len = Math.floor(ctx.sampleRate * sec);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  return b;
}

function peakOf(an, arr) {
  an.getFloatTimeDomainData(arr);
  let m = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i] < 0 ? -arr[i] : arr[i];
    if (v > m) m = v;
  }
  return m;
}

class Channel {
  constructor(e, idx) {
    const ctx = e.ctx;
    this.e = e;
    this.idx = idx;
    this.source = "file";
    this.buffer = null;
    this.peaks = null;
    this.bpm = 0;
    this.firstBeat = 0;
    this.rate = 1;
    this.dir = 1;
    this.playing = false;
    this.cueSec = 0;
    this.hot = Array(8).fill(null);
    this.loop = null;
    this.loopBeats = 0;
    this.lastLoop = null;
    this.loopInSec = null;
    this._cmdT = 0;
    this.faderV = 1;
    this.xfG = 1;
    this.colorType = "filter";
    this.colorV = 0;
    this._p = { pos: 0, time: 0, rate: 0 };

    this.node = new AudioWorkletNode(ctx, "player", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.node.port.onmessage = (ev) => {
      const m = ev.data;
      if (m.t === "pos") {
        this._p = m;
        if (!m.playing && this.playing && !this.previewing && m.time - this._cmdT > 0.3) this.playing = false;
      } else if (m.t === "ended") {
        this.playing = false;
        this.onEnded && this.onEnded();
      }
    };

    this.trim = ctx.createGain();
    this.low = ctx.createBiquadFilter();
    this.low.type = "lowshelf";
    this.low.frequency.value = 250;
    this.mid = ctx.createBiquadFilter();
    this.mid.type = "peaking";
    this.mid.frequency.value = 1200;
    this.mid.Q.value = 0.8;
    this.high = ctx.createBiquadFilter();
    this.high.type = "highshelf";
    this.high.frequency.value = 4000;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.frequency.value = 22000;
    this.hp = ctx.createBiquadFilter();
    this.hp.type = "highpass";
    this.hp.frequency.value = 10;
    this.fxSend = ctx.createGain();
    this.fxSend.gain.value = 0;
    this.fader = ctx.createGain();
    this.xf = ctx.createGain();
    this.cueSend = ctx.createGain();
    this.cueSend.gain.value = 0;
    this.an = ctx.createAnalyser();
    this.an.fftSize = 512;
    this.anBuf = new Float32Array(512);

    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = e.noiseBuf;
    this.noiseSrc.loop = true;
    this.noiseG = ctx.createGain();
    this.noiseG.gain.value = 0;
    this.noiseF = ctx.createBiquadFilter();
    this.noiseF.type = "bandpass";
    this.noiseF.Q.value = 1.2;
    this.noiseSrc.connect(this.noiseF).connect(this.noiseG).connect(this.fader);
    this.noiseSrc.start();

    this.node.connect(this.trim);
    this.trim.connect(this.low).connect(this.mid).connect(this.high).connect(this.lp).connect(this.hp);
    this.hp.connect(this.fxSend).connect(e.fx.input);
    this.hp.connect(this.cueSend).connect(e.cueBus);
    this.hp.connect(this.fader).connect(this.xf).connect(this.an);
    this.xf.connect(e.mix);
  }

  get len() { return this.buffer ? this.buffer.length : 0; }
  get dur() { return this.buffer ? this.buffer.duration : 0; }
  get sr() { return this.buffer ? this.buffer.sampleRate : this.e.ctx.sampleRate; }
  get beatSec() { return 60 / (this.bpm || 120); }
  get effBpm() { return this.bpm * this.rate; }
  get posSec() {
    if (!this.buffer) return 0;
    const p = this._p;
    const dt = Math.max(0, this.e.ctx.currentTime - p.time);
    return clamp(p.pos + p.rate * dt * this.sr, 0, this.len) / this.sr;
  }
  post(m, tr) { this.node.port.postMessage(m, tr); }
  level() { return peakOf(this.an, this.anBuf); }

  load(buf, info) {
    this.buffer = buf;
    const L = buf.getChannelData(0).slice();
    const R = buf.numberOfChannels > 1 ? buf.getChannelData(1).slice() : null;
    this.post({ t: "load", L, R }, R ? [L.buffer, R.buffer] : [L.buffer]);
    this.peaks = info.peaks;
    this.bpm = info.bpm;
    this.firstBeat = info.firstBeat;
    this.cueSec = 0;
    this.hot = Array(8).fill(null);
    this.loop = null;
    this.lastLoop = null;
    this.loopInSec = null;
    this.playing = false;
    this.setReverse(false);
    this._p = { pos: 0, time: this.e.ctx.currentTime, rate: 0 };
  }
  unload() {
    this.post({ t: "unload" });
    this.buffer = null;
    this.peaks = null;
    this.bpm = 0;
    this.playing = false;
    this.loop = null;
  }

  play() {
    if (!this.buffer) return;
    this.playing = true;
    this._cmdT = this.e.ctx.currentTime;
    this.post({ t: "play", v: true });
  }
  pause() { this.playing = false; this.post({ t: "play", v: false }); }
  toggle() { this.playing ? this.pause() : this.play(); }
  seek(sec) {
    if (!this.buffer) return;
    const s = clamp(sec, 0, this.dur - 0.01) * this.sr;
    this.post({ t: "seek", v: s });
    this._p = { pos: s, time: this.e.ctx.currentTime, rate: this._p.rate };
  }
  setTempo(r) { this.rate = r; this.post({ t: "rate", v: r }); }
  setReverse(on) { this.dir = on ? -1 : 1; this.post({ t: "dir", v: this.dir }); }
  setBend(v) { this.post({ t: "bend", v }); }
  scratch(on) { this.post({ t: "scratch", v: on }); }
  scratchRate(v) { this.post({ t: "scratchRate", v }); }

  quant(sec) {
    if (!this.bpm) return sec;
    const bs = this.beatSec;
    return Math.max(0, this.firstBeat + Math.round((sec - this.firstBeat) / bs) * bs);
  }

  // CUE estilo Pioneer
  cueDown() {
    if (!this.buffer) return;
    if (this.playing) {
      this.pause();
      this.seek(this.cueSec);
    } else if (Math.abs(this.posSec - this.cueSec) < 0.05) {
      this.previewing = true;
      this.play();
    } else {
      this.cueSec = this.posSec;
    }
  }
  cueUp() {
    if (!this.previewing) return;
    this.previewing = false;
    this.pause();
    this.seek(this.cueSec);
  }

  hotcue(i) {
    if (!this.buffer) return;
    if (this.hot[i] == null) this.hot[i] = this.posSec;
    else {
      this.seek(this.hot[i]);
      if (!this.playing) this.play();
    }
  }
  delHot(i) { this.hot[i] = null; }

  setLoop(s, e) {
    this.loop = { s, e };
    this.lastLoop = this.loop;
    this.post({ t: "loop", v: { s: s * this.sr, e: e * this.sr } });
  }
  exitLoop() { this.loop = null; this.loopBeats = 0; this.post({ t: "loop", v: null }); }
  loopIn() { if (this.buffer) this.loopInSec = this.quant(this.posSec); }
  loopOut() {
    if (this.loopInSec == null) return;
    const e = this.quant(this.posSec);
    if (e > this.loopInSec + 0.02) { this.loopBeats = 0; this.setLoop(this.loopInSec, e); }
  }
  reloop() {
    if (this.loop) this.exitLoop();
    else if (this.lastLoop) { this.setLoop(this.lastLoop.s, this.lastLoop.e); this.seek(this.lastLoop.s); }
  }
  beatLoop(n) {
    if (!this.buffer) return;
    if (this.loop && this.loopBeats === n) return this.exitLoop();
    const s = this.loop && this.loopBeats ? this.loop.s : this.quant(this.posSec);
    this.loopBeats = n;
    this.setLoop(s, s + n * this.beatSec);
  }
  resizeLoop(f) {
    if (!this.loop) return;
    const len = (this.loop.e - this.loop.s) * f;
    if (len < 0.02) return;
    if (this.loopBeats) this.loopBeats *= f;
    this.setLoop(this.loop.s, this.loop.s + len);
  }
  jump(beats) { this.seek(this.posSec + beats * this.beatSec); }

  phaseAlign(o) {
    if (!this.bpm || !o.bpm) return;
    const ph = (c) => ((((c.posSec - c.firstBeat) / c.beatSec) % 1) + 1) % 1;
    let d = ph(o) - ph(this);
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    this.seek(this.posSec + d * this.beatSec);
  }

  setTrim(v) { this.trim.gain.value = dB(v * 12); }
  setEq(band, v) { this[band].gain.value = v < 0 ? v * 26 : v * 6; }
  setColorType(t) { this.colorType = t; this.setColor(this.colorV); }
  setColor(v) {
    this.colorV = v;
    const t = this.e.ctx.currentTime;
    if (this.colorType === "filter") {
      this.noiseG.gain.setTargetAtTime(0, t, 0.02);
      if (v < 0) {
        this.lp.frequency.setTargetAtTime(20000 * Math.pow(120 / 20000, -v), t, 0.01);
        this.lp.Q.value = 0.7 + 4 * -v;
        this.hp.frequency.setTargetAtTime(10, t, 0.01);
      } else {
        this.hp.frequency.setTargetAtTime(20 * Math.pow(8000 / 20, v), t, 0.01);
        this.hp.Q.value = 0.7 + 4 * v;
        this.lp.frequency.setTargetAtTime(22000, t, 0.01);
      }
    } else {
      this.lp.frequency.setTargetAtTime(22000, t, 0.01);
      this.hp.frequency.setTargetAtTime(10, t, 0.01);
      this.noiseF.frequency.setTargetAtTime(v < 0 ? 400 + 600 * (1 + v) : 1000 + 7000 * v, t, 0.01);
      this.noiseG.gain.setTargetAtTime(Math.abs(v) * 0.25, t, 0.02);
    }
  }
  setFader(v) { this.faderV = v; this.fader.gain.value = v * v; this.e.updateGain(this.idx); }
  setXf(g) { this.xfG = g; this.xf.gain.value = g; }
  setCue(on) { this.cueSend.gain.value = on ? 1 : 0; }
}

class FX {
  constructor(e) {
    const ctx = e.ctx;
    this.e = e;
    this.type = "echo";
    this.on = false;
    this.level = 0.5;
    this.divIdx = 3;
    this.assign = [true, true, false];
    this.input = ctx.createGain();
    this.out = ctx.createGain();
    this.wet = {};
    for (const [k] of FX_TYPES) {
      this.wet[k] = ctx.createGain();
      this.wet[k].gain.value = 0;
      this.wet[k].connect(this.out);
    }
    // Echo
    this.delay = ctx.createDelay(4);
    this.fb = ctx.createGain();
    this.fbLp = ctx.createBiquadFilter();
    this.fbLp.type = "lowpass";
    this.fbLp.frequency.value = 3500;
    this.input.connect(this.delay);
    this.delay.connect(this.wet.echo);
    this.delay.connect(this.fbLp).connect(this.fb).connect(this.delay);
    // Reverb
    this.conv = ctx.createConvolver();
    this.conv.buffer = impulse(ctx, 2.6);
    this.input.connect(this.conv).connect(this.wet.reverb);
    // Flanger
    this.fd = ctx.createDelay(0.05);
    this.fd.delayTime.value = 0.004;
    this.ffb = ctx.createGain();
    this.ffb.gain.value = 0.6;
    this.fSum = ctx.createGain();
    this.input.connect(this.fSum);
    this.input.connect(this.fd);
    this.fd.connect(this.fSum);
    this.fd.connect(this.ffb).connect(this.fd);
    this.fSum.connect(this.wet.flanger);
    this.lfo = ctx.createOscillator();
    this.lfoG = ctx.createGain();
    this.lfoG.gain.value = 0.003;
    this.lfo.connect(this.lfoG).connect(this.fd.delayTime);
    this.lfo.start();
    // Trans (gate)
    this.gate = ctx.createGain();
    this.gate.gain.value = 0.5;
    this.sq = ctx.createOscillator();
    this.sq.type = "square";
    this.sqG = ctx.createGain();
    this.sqG.gain.value = 0.5;
    this.sq.connect(this.sqG).connect(this.gate.gain);
    this.sq.start();
    this.input.connect(this.gate).connect(this.wet.trans);
  }

  apply() {
    const e = this.e;
    const t = e.ctx.currentTime;
    const beat = 60 / e.fxBpm();
    const div = BEAT_DIVS[this.divIdx];
    for (const k in this.wet) {
      const on = this.on && this.type === k;
      this.wet[k].gain.setTargetAtTime(on ? this.level * (k === "reverb" ? 1.6 : k === "trans" ? 1.2 : 1) : 0, t, 0.03);
    }
    this.delay.delayTime.setTargetAtTime(Math.min(3.9, beat * div), t, 0.05);
    this.fb.gain.setTargetAtTime(0.25 + this.level * 0.5, t, 0.05);
    this.lfo.frequency.setTargetAtTime(1 / (beat * div * 4), t, 0.05);
    this.sq.frequency.setTargetAtTime(1 / (beat * div), t, 0.05);
    e.channels.forEach((c, i) =>
      c.fxSend.gain.setTargetAtTime(this.on && this.assign[i] ? 1 : 0, t, 0.02)
    );
    e.masterSend.gain.setTargetAtTime(this.on && this.assign[2] ? 1 : 0, t, 0.02);
    // Trans corta el sonido original del canal asignado
    e.channels.forEach((c, i) => {
      const duck = this.on && this.type === "trans" && (this.assign[i] || this.assign[2]);
      c.fader.gain.setTargetAtTime(duck ? c.faderV * c.faderV * (1 - this.level) : c.faderV * c.faderV, t, 0.02);
    });
  }
}

export class DJEngine {
  async init() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }));
    await ctx.audioWorklet.addModule("/player-worklet.js");
    this.noiseBuf = noiseBuffer(ctx, 2);

    this.mix = ctx.createGain();
    this.master = ctx.createGain();
    this.masterV = 0.8;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.1;
    this.mix.connect(this.master);
    this.master.connect(this.limiter).connect(ctx.destination);

    const split = ctx.createChannelSplitter(2);
    this.limiter.connect(split);
    this.recDest = ctx.createMediaStreamDestination();
    this.limiter.connect(this.recDest);
    this.anM = [ctx.createAnalyser(), ctx.createAnalyser()];
    this.anM.forEach((a, i) => { a.fftSize = 512; split.connect(a, i); });
    this.anBuf = new Float32Array(512);

    this.fx = new FX(this);
    this.fx.out.connect(this.master);
    this.masterSend = ctx.createGain();
    this.masterSend.gain.value = 0;
    this.mix.connect(this.masterSend).connect(this.fx.input);

    this.sampGain = ctx.createGain();
    this.sampGain.gain.value = 0.6;
    this.sampGain.connect(this.master);

    // Auriculares: cue + master hacia otra salida de audio
    this.cueBus = ctx.createGain();
    this.hpMasterG = ctx.createGain();
    this.hpLevel = ctx.createGain();
    this.hpDest = ctx.createMediaStreamDestination();
    this.cueBus.connect(this.hpLevel);
    this.master.connect(this.hpMasterG).connect(this.hpLevel);
    this.hpLevel.connect(this.hpDest);
    this.setHpMix(0.3);

    this.micLevel = 0.5;
    this.micOn = false;

    this.channels = [new Channel(this, 0), new Channel(this, 1)];
    this.xfPos = 0.5;
    this.xfCurve = "smooth";
    this.xfAssign = ["A", "B"];
    this.ytCb = [null, null];
    this.setMaster(0.8);
    this.applyXf();
    this.fx.apply();
    this.timer = setInterval(() => this.fx.apply(), 400);
  }

  fxBpm() {
    const c = this.channels.find((c) => c.playing && c.bpm) || this.channels.find((c) => c.bpm);
    return c ? c.effBpm : 120;
  }
  masterLevel(i) { return peakOf(this.anM[i], this.anBuf); }

  setMaster(v) {
    this.masterV = v;
    this.master.gain.value = v * v * 1.25;
    this.updateGain(0);
    this.updateGain(1);
  }
  xfGainFor(i) {
    const a = this.xfAssign[i];
    if (a === "THRU") return 1;
    const p = this.xfPos;
    const sharp = this.xfCurve === "sharp";
    if (a === "A") return sharp ? Math.min(1, (1 - p) * 5) : Math.cos((p * Math.PI) / 2);
    return sharp ? Math.min(1, p * 5) : Math.sin((p * Math.PI) / 2);
  }
  applyXf() {
    this.channels.forEach((c, i) => { c.setXf(this.xfGainFor(i)); this.updateGain(i); });
  }
  setCrossfader(p) { this.xfPos = p; this.applyXf(); }
  setXfCurve(c) { this.xfCurve = c; this.applyXf(); }
  setXfAssign(i, a) { this.xfAssign[i] = a; this.applyXf(); }

  // Volumen para pistas de YouTube (no pasan por el motor)
  updateGain(i) {
    const c = this.channels && this.channels[i];
    if (!c) return;
    const g = c.faderV * c.faderV * c.xfG * Math.min(1, this.masterV * this.masterV * 1.25);
    this.ytCb[i] && this.ytCb[i](clamp(g, 0, 1));
  }

  setHpMix(v) { this.cueBus.gain.value = 1 - v; this.hpMasterG.gain.value = v; }
  setHpLevel(v) { this.hpLevel.gain.value = v * v * 1.5; }
  async setHeadphones(id) {
    if (!this.hpAudio) {
      this.hpAudio = new Audio();
      this.hpAudio.srcObject = this.hpDest.stream;
    }
    if (!id) return this.hpAudio.pause();
    if (this.hpAudio.setSinkId) await this.hpAudio.setSinkId(id);
    await this.hpAudio.play();
  }
  async listOutputs() {
    const list = await navigator.mediaDevices.enumerateDevices();
    return list.filter((d) => d.kind === "audiooutput" && d.deviceId !== "default");
  }

  async setMic(on) {
    const ctx = this.ctx;
    if (on && !this.micGain) {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const src = ctx.createMediaStreamSource(this.micStream);
      this.micLow = ctx.createBiquadFilter();
      this.micLow.type = "lowshelf";
      this.micLow.frequency.value = 250;
      this.micHigh = ctx.createBiquadFilter();
      this.micHigh.type = "highshelf";
      this.micHigh.frequency.value = 4000;
      this.micGain = ctx.createGain();
      src.connect(this.micLow).connect(this.micHigh).connect(this.micGain).connect(this.master);
    }
    this.micOn = on;
    if (this.micGain) this.micGain.gain.value = on ? this.micLevel * this.micLevel * 1.5 : 0;
  }
  setMicLevel(v) { this.micLevel = v; if (this.micGain && this.micOn) this.micGain.gain.value = v * v * 1.5; }
  setMicEq(band, v) {
    const f = band === "high" ? this.micHigh : this.micLow;
    if (f) f.gain.value = v * 12;
  }
  setSamplerLevel(v) { this.sampGain.gain.value = v * v; }

  // Grabación de la salida master (decks locales, sampler y micrófono)
  startRecording() {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
    const chunks = [];
    this.rec = new MediaRecorder(this.recDest.stream, mimeType ? { mimeType, audioBitsPerSecond: 192000 } : undefined);
    this.rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    this.rec.start(1000);
    return new Promise((resolve) => {
      this.rec.onstop = () => resolve(new Blob(chunks, { type: this.rec.mimeType || "audio/webm" }));
    });
  }
  stopRecording() { if (this.rec && this.rec.state !== "inactive") this.rec.stop(); }

  // Sampler con sonidos sintetizados
  sample(i) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.sampGain;
    const env = (g, a, d, peak = 1) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    };
    const noise = (dur) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      s.start(t);
      s.stop(t + dur);
      return s;
    };
    const osc = (type, f, dur) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.start(t);
      o.stop(t + dur);
      return o;
    };
    const filt = (type, f, q = 1) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const g = ctx.createGain();
    g.connect(out);
    switch (i) {
      case 0: { // Kick
        const o = osc("sine", 160, 0.5);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
        env(g, 0.002, 0.35, 1.3);
        o.connect(g);
        break;
      }
      case 1: { // Snare
        env(g, 0.001, 0.18, 0.8);
        noise(0.25).connect(filt("highpass", 1500)).connect(g);
        const g2 = ctx.createGain();
        env(g2, 0.001, 0.1, 0.6);
        osc("triangle", 190, 0.2).connect(g2).connect(out);
        break;
      }
      case 2: { // Clap
        g.gain.setValueAtTime(0.0001, t);
        for (const j of [0, 0.012, 0.024]) {
          g.gain.linearRampToValueAtTime(1, t + j + 0.002);
          g.gain.exponentialRampToValueAtTime(0.2, t + j + 0.011);
        }
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        noise(0.3).connect(filt("bandpass", 1500, 1)).connect(g);
        break;
      }
      case 3: // Hi-hat
        env(g, 0.001, 0.07, 0.6);
        noise(0.1).connect(filt("highpass", 7000)).connect(g);
        break;
      case 4: { // Air horn
        const lp = filt("lowpass", 3000);
        lp.connect(g);
        for (const f of [440, 554.37, 659.25]) osc("sawtooth", f, 1.6).connect(lp);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.35, t + 0.03);
        g.gain.setValueAtTime(0.35, t + 1.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        break;
      }
      case 5: { // Sirena
        const o = osc("sine", 600, 1.7);
        o.frequency.linearRampToValueAtTime(1400, t + 0.5);
        o.frequency.linearRampToValueAtTime(600, t + 1.0);
        o.frequency.linearRampToValueAtTime(1400, t + 1.5);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.4, t + 0.05);
        g.gain.setValueAtTime(0.4, t + 1.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.65);
        o.connect(g);
        break;
      }
      case 6: { // Laser
        const o = osc("square", 3000, 0.45);
        o.frequency.exponentialRampToValueAtTime(120, t + 0.3);
        env(g, 0.001, 0.4, 0.3);
        o.connect(g);
        break;
      }
      case 7: { // Riser
        const bp = filt("bandpass", 200, 2);
        bp.frequency.exponentialRampToValueAtTime(9000, t + 1.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.9, t + 1.8);
        g.gain.linearRampToValueAtTime(0.0001, t + 1.95);
        noise(2).connect(bp).connect(g);
        break;
      }
    }
  }
}
