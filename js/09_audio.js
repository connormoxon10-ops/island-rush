/* ================= AUDIO (all synthesised with WebAudio) ================= */
const Snd = { ctx: null, ok: false, intense: 0, step: 0 };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function distCurve(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
Snd.init = function () {
  if (Snd.ctx) { if (Snd.ctx.state === 'suspended') Snd.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ctx = Snd.ctx = new AC();
    Snd.master = ctx.createGain(); Snd.master.gain.value = save.set.vol;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; Snd.master.connect(comp); comp.connect(ctx.destination);
    Snd.sfx = ctx.createGain(); Snd.sfx.connect(Snd.master);
    Snd.mus = ctx.createGain(); Snd.mus.gain.value = save.set.music ? 0.3 : 0; Snd.mus.connect(Snd.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; Snd.nb = nb;
    const noise = (type, freq, q) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(Snd.sfx); s.start(); return { f, g }; };
    Snd.wind = noise('lowpass', 500, 0.7); Snd.skid = noise('bandpass', 1700, 1.2); Snd.rumble = noise('lowpass', 160, 0.8); Snd.intake = noise('bandpass', 900, 1.4);
    const eng = ctx.createGain(); eng.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 1.5;
    const ws = ctx.createWaveShaper(); ws.curve = distCurve(14); ws.oversample = '2x';
    const mkOsc = (type, g) => { const o = ctx.createOscillator(); o.type = type; const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(ws); o.start(); return o; };
    Snd.o1 = mkOsc('sawtooth', 0.5); Snd.o2 = mkOsc('square', 0.32); Snd.o3 = mkOsc('sawtooth', 0.3); Snd.o4 = mkOsc('triangle', 0.4);
    ws.connect(lp); lp.connect(eng); eng.connect(Snd.sfx); Snd.eng = eng; Snd.lp = lp;
    const tb = ctx.createOscillator(); tb.type = 'sine'; const tg = ctx.createGain(); tg.gain.value = 0; tb.connect(tg); tg.connect(Snd.sfx); tb.start(); Snd.tb = tb; Snd.tg = tg;
    Snd.ok = true; Snd.startMusic();
  } catch (e) { Snd.ok = false; }
};
Snd.update = function (c, dt, paused) {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime, spd = Math.abs(c.speed);
  if (paused || App.mode !== 'play') { Snd.eng.gain.setTargetAtTime(0, t, 0.05); Snd.wind.g.gain.setTargetAtTime(0, t, 0.05); Snd.skid.g.gain.setTargetAtTime(0, t, 0.05); Snd.rumble.g.gain.setTargetAtTime(0, t, 0.05); Snd.tg.gain.setTargetAtTime(0, t, 0.05); Snd.intake.g.gain.setTargetAtTime(0, t, 0.05); return; }
  const f0 = c.rpm / 60 * 2 * CUR.snd.f, thr = c.thr;
  Snd.o1.frequency.setTargetAtTime(f0, t, 0.03); Snd.o2.frequency.setTargetAtTime(f0 * 0.5, t, 0.03); Snd.o3.frequency.setTargetAtTime(f0 * 1.007, t, 0.03); Snd.o4.frequency.setTargetAtTime(f0 * 0.25, t, 0.03);
  Snd.lp.frequency.setTargetAtTime((380 + thr * 1500 + c.rpm * 0.28) * CUR.snd.lp, t, 0.05);
  Snd.eng.gain.setTargetAtTime((0.07 + 0.15 * thr) * (c.shift > 0 ? 0.4 : 1) * (Cam.view === 0 ? 0.85 : 1), t, 0.04);
  Snd.intake.g.gain.setTargetAtTime(thr * 0.05, t, 0.08); Snd.intake.f.frequency.setTargetAtTime(500 + c.rpm * 0.25, t, 0.1);
  Snd.tb.frequency.setTargetAtTime(1300 + c.rpm * 0.6, t, 0.1); Snd.tg.gain.setTargetAtTime(thr * clamp((c.rpm - 2500) / 3000, 0, 1) * 0.015 + (c.nitroUse ? 0.02 : 0), t, 0.1);
  Snd.wind.g.gain.setTargetAtTime(Math.pow(clamp(spd / 70, 0, 1), 1.6) * 0.5, t, 0.1); Snd.wind.f.frequency.setTargetAtTime(350 + spd * 18, t, 0.1);
  const skid = ((c.drifting || c.spin) && !c.air ? clamp(c.slip * 1.2, 0, 1) : 0) + (c.braking ? 0.35 : 0);
  Snd.skid.g.gain.setTargetAtTime(Math.min(skid, 1) * 0.28 * (c.surf.road ? 1 : 0.3), t, 0.05);
  Snd.rumble.g.gain.setTargetAtTime((c.surf.road ? 0.04 : 0.28) * clamp(spd / 30, 0, 1) * (c.air ? 0 : 1), t, 0.1);
  Snd.mus.gain.setTargetAtTime(save.set.music ? (Mi && Mi.phase === 'run' ? 0.38 : 0.26) : 0, t, 0.3);
  Snd.intense = Mi && Mi.phase === 'run' ? 1 : 0;
  if (Snd._lastGear !== c.gear) { if (Snd._lastGear && c.thr > 0.6 && c.gear > Snd._lastGear) Snd.pop(); Snd._lastGear = c.gear; }
};
Snd.tone = function (t, freq, dur, type, vol, lp, att, dest) {
  const ctx = Snd.ctx, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = lp || 4000;
  const a = att || 0.005; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(dest || Snd.mus); o.start(t); o.stop(t + dur + 0.05);
};
Snd.noiseHit = function (t, dur, vol, hp, lp, dest) {
  const ctx = Snd.ctx, s = ctx.createBufferSource(); s.buffer = Snd.nb; const f = ctx.createBiquadFilter(); f.type = lp ? 'lowpass' : 'highpass'; f.frequency.value = lp || hp; const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || Snd.mus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
};
Snd.foot = function (road, vol, jump) {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime, v = vol || 1;
  if (road) Snd.noiseHit(t, 0.05, 0.2 * v, 1700, 0, Snd.sfx); else Snd.noiseHit(t, 0.1, 0.22 * v, 0, 800 + Math.random() * 300, Snd.sfx);
  Snd.tone(t, 62 + Math.random() * 14, 0.08, 'sine', 0.13 * v, 300, 0.002, Snd.sfx);
  if (jump) Snd.tone(t, 300, 0.12, 'triangle', 0.05, 1500, 0.002, Snd.sfx);
};
Snd.door = function () {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime;
  Snd.noiseHit(t, 0.09, 0.5, 350, 0, Snd.sfx); Snd.tone(t, 92, 0.2, 'sine', 0.4, 600, 0.002, Snd.sfx); Snd.tone(t + 0.1, 1300, 0.03, 'square', 0.05, 3000, 0.001, Snd.sfx);
};
Snd.kick = function (t) { const ctx = Snd.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g); g.connect(Snd.mus); o.start(t); o.stop(t + 0.25); };
const BASS = [33, 29, 36, 31], CHORD = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], BEAT = 60 / 112 / 4;
Snd.playStep = function (step, t) {
  const bar = (step >> 4) & 3, s = step & 15;
  if (s % 4 === 0) Snd.kick(t);
  if (s === 4 || s === 12) { Snd.noiseHit(t, 0.14, 0.4, 1800); Snd.tone(t, 190, 0.1, 'triangle', 0.25, 2000); }
  if (s % 2 === 0) Snd.noiseHit(t, s % 4 === 2 ? 0.09 : 0.04, s % 4 === 2 ? 0.16 : 0.1, 7000);
  if (s % 2 === 0 || s === 15) Snd.tone(t, mtof(BASS[bar] + (s === 6 || s === 14 ? 12 : 0)), 0.22, 'sawtooth', 0.34, 420);
  const ch = CHORD[bar];
  if (s === 0) for (const n of ch) Snd.tone(t, mtof(n + 12), BEAT * 15, 'sawtooth', 0.045, 1100, 0.35);
  const arp = [0, 1, 2, 1][s & 3];
  if (Snd.intense) Snd.tone(t, mtof(ch[arp] + 24), 0.16, 'square', 0.07, 2600); else if (s % 2 === 0) Snd.tone(t, mtof(ch[arp] + 24), 0.2, 'triangle', 0.07, 2000);
};
Snd.startMusic = function () {
  if (!Snd.ok || Snd.musicOn) return; Snd.musicOn = true; Snd.step = 0; Snd.nextT = Snd.ctx.currentTime + 0.3;
  Snd.sched = setInterval(() => { if (!Snd.ctx) return; while (Snd.nextT < Snd.ctx.currentTime + 0.3) { if (save.set.music && !Snd.hush) Snd.playStep(Snd.step, Snd.nextT); Snd.step = (Snd.step + 1) & 63; Snd.nextT += BEAT; } }, 60);
};
Snd.beep = function (f, d) { if (!Snd.ok) return; const t = Snd.ctx.currentTime; Snd.tone(t, f, d + 0.1, 'sine', 0.25, 5000, 0.004, Snd.sfx); Snd.tone(t, f * 2, d, 'triangle', 0.08, 5000, 0.004, Snd.sfx); };
Snd.win = function () { if (!Snd.ok) return; const t = Snd.ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => Snd.tone(t + i * 0.1, f, 0.4, 'triangle', 0.22, 5000, 0.01, Snd.sfx)); };
Snd.fail = function () { if (!Snd.ok) return; const t = Snd.ctx.currentTime; [330, 262, 196].forEach((f, i) => Snd.tone(t + i * 0.16, f, 0.4, 'sawtooth', 0.15, 1500, 0.01, Snd.sfx)); };
Snd.crash = function (v) {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime, k = clamp(v / 25, 0.15, 1);
  Snd.noiseHit(t, 0.35, 0.7 * k, 0, 1400, Snd.sfx); const o = Snd.ctx.createOscillator(), g = Snd.ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.3); g.gain.setValueAtTime(0.9 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(Snd.sfx); o.start(t); o.stop(t + 0.4);
};
Snd.pop = function () { if (!Snd.ok) return; Snd.noiseHit(Snd.ctx.currentTime, 0.06, 0.25, 0, 900, Snd.sfx); };
Snd.splash = function () { if (!Snd.ok) return; Snd.noiseHit(Snd.ctx.currentTime, 0.8, 0.6, 0, 2500, Snd.sfx); };

/* ---- fists, sirens and tow-truck sounds ---- */
Snd.whoosh = function () { if (!Snd.ok) return; const t = Snd.ctx.currentTime; Snd.noiseHit(t, 0.13, 0.14, 1400, 0, Snd.sfx); };
Snd.punch = function (k) {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime; k = k || 1;
  Snd.noiseHit(t, 0.1, 0.5 * k, 0, 1900, Snd.sfx); Snd.tone(t, 150, 0.14, 'sine', 0.6 * k, 500, 0.002, Snd.sfx); Snd.tone(t, 68, 0.22, 'sine', 0.5 * k, 300, 0.002, Snd.sfx);
};
Snd.horn = function () { if (!Snd.ok) return; const t = Snd.ctx.currentTime; Snd.tone(t, 311, 0.5, 'sawtooth', 0.13, 1400, 0.02, Snd.sfx); Snd.tone(t, 392, 0.5, 'sawtooth', 0.11, 1400, 0.02, Snd.sfx); };
Snd.hiss = function () { if (!Snd.ok) return; Snd.noiseHit(Snd.ctx.currentTime, 0.8, 0.2, 3200, 0, Snd.sfx); };
Snd.clank = function () { if (!Snd.ok) return; const t = Snd.ctx.currentTime; Snd.tone(t, 520, 0.18, 'square', 0.1, 2400, 0.001, Snd.sfx); Snd.tone(t + 0.02, 310, 0.25, 'triangle', 0.16, 1800, 0.001, Snd.sfx); Snd.noiseHit(t, 0.05, 0.2, 3000, 0, Snd.sfx); };
Snd.ratchet = function () { if (!Snd.ok) return; const t = Snd.ctx.currentTime; Snd.noiseHit(t, 0.025, 0.12, 2600, 0, Snd.sfx); Snd.tone(t, 180 + Math.random() * 30, 0.04, 'square', 0.04, 1200, 0.001, Snd.sfx); };
/* continuous loops (siren, truck engine): refreshed every frame while audible, silenced by a watchdog when they stop being refreshed */
Snd.loopSet = function (name, freq, vol, type, lp) {
  if (!Snd.ok) return; const ctx = Snd.ctx, t = ctx.currentTime; Snd.loops = Snd.loops || {}; let L = Snd.loops[name];
  if (!L) {
    const o = ctx.createOscillator(); o.type = type || 'sawtooth'; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 900; const g = ctx.createGain(); g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(Snd.sfx); o.start(); L = Snd.loops[name] = { o, f, g, seen: 0 };
    if (!Snd.loopWatch) Snd.loopWatch = setInterval(() => { if (!Snd.ctx) return; const now = performance.now(), tt = Snd.ctx.currentTime; for (const k in Snd.loops) if (now - Snd.loops[k].seen > 260) Snd.loops[k].g.gain.setTargetAtTime(0, tt, 0.05); }, 120);
  }
  L.seen = performance.now(); L.o.frequency.setTargetAtTime(freq, t, 0.04); L.g.gain.setTargetAtTime(vol, t, 0.06);
};
Snd.siren = function (vol) { Snd.loopSet('siren', 620 + 560 * (0.5 + 0.5 * Math.sin(App.time * 4.4)), vol * 0.055, 'sawtooth', 1700); };
/* helicopter: low rotor beat, louder when it is overhead */
Snd.heli = function (vol) { const ch = 0.55 + 0.45 * Math.max(0, Math.sin(App.time * 52)); Snd.loopSet('heli', 44 + 5 * Math.sin(App.time * 2.3), vol * 0.2 * ch, 'sawtooth', 190); };
Snd.towEngine = function (vol, rev) { Snd.loopSet('tow', 34 + rev * 46, vol * 0.2, 'sawtooth', 240 + rev * 260); };
