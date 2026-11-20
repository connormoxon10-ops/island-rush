/* ================= GYM WORKOUTS: animated, with quick-time events =================
   Every machine in the gym is a short workout you see yourself doing (the camera moves round you) and play as a run of quick-time events:
   - TIMING: a marker sweeps a bar; press Space (or E) in the green and the rep goes up.
   - MASH: the weight sticks; hammer Space to grind it up before the time runs out.
   - KEY: a key flashes up (W A S D); press it before the ring closes. On the punch bag each key is a different punch.
   - ALTERNATE: A, D, A, D as fast as you can to keep the belt or the pedals going.
   Bench press (on your back, the bar over your chest), dumbbell curls, squats under the rack, the treadmill, the punch bag, the exercise bike.
   Each success is a rep and raises your fitness (you run and swim faster the fitter you are); a stuck last rep you fail, the spotter takes. */
const Gym = { S: null };
const GYM_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'], GYM_KEYN = { KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D' };
const GYM_PUNCH = { KeyA: 'Jab', KeyD: 'Cross', KeyW: 'Uppercut', KeyS: 'Hook' };
/* the machines: where you stand (in the gym's own coordinates), which way you face, and the run of events */
const GYM_M = {
  press: { name: 'Bench press', gain: 0.5, ev: ['time', 'time', 'time', 'time', 'time', ['mash', 12, 3.2, 'The bar sticks!']], prop: 'bar' },
  curl: { name: 'Dumbbell curls', gain: 0.4, ev: ['time', 'time', 'time', 'time', 'time', 'time', ['mash', 10, 2.6, 'Last rep: squeeze!']], prop: 'bells' },
  squat: { name: 'Squats', gain: 0.55, ev: ['time', ['key', 1.3, 'Brace!'], 'time', 'time', ['key', 1.1, 'Brace!'], ['mash', 14, 3.4, 'Drive up out of the hole!']], prop: 'bar' },
  run: { name: 'Treadmill', gain: 0.5, ev: [['alt', 22, 6, 'Keep the pace: A D A D'], ['alt', 18, 4, 'Uphill!'], ['mash', 16, 3, 'Sprint finish!']] },
  bag: { name: 'Punch bag', gain: 0.45, ev: [['key', 1.2], ['key', 1.2], ['key', 1.1], ['key', 1.0], ['key', 1.0], ['key', 0.9], ['key', 0.9], ['key', 0.8], ['mash', 14, 3, 'Flurry!']] },
  bike: { name: 'Exercise bike', gain: 0.45, ev: [['alt', 20, 6, 'Pedal: A D A D'], ['mash', 15, 3.2, 'The climb!'], ['alt', 16, 4, 'Spin it out']] }
};
/* start a workout on machine m at (x, z) facing yaw */
Gym.start = function (m, x, z, yaw, cost) {
  const s = intSave(); if (!s.gymMem && cost) { if (save.money < cost) { Int.say('A gym pass is ' + money(cost)); return; } save.money -= cost; s.gymMem = 1; writeSave(); Int.say('Gym pass bought · ' + money(cost) + ' · train any time, in any gym', 3); }
  const M = GYM_M[m]; if (!M) return; Gym.css();
  let hide = null, hd = 0.9; for (const n of Int.npcs) { const d = Math.hypot(n.x - x, n.z - z); if (d < hd) { hd = d; hide = n; } }   /* whoever was on it steps off */
  const G = Gym.S = { m, M, x, z, yaw, i: -1, ev: null, ok: 0, miss: 0, t: 0, u: 0, rep: 0, flex: 0, strain: 0, punch: null, pace: 0, ph: 0, hide, done: 0, log: [], camA: yaw + 2.2, prop: Gym.prop(M.prop) };
  if (!Int.ped || !Int.ped.hu) Int.mkPed();
  const B = Int.busy = { freeze: true, gym: G, t: 0,
    hint: () => Gym.hint(), hud: () => Gym.hud(), tick: (dt) => Gym.tick(dt), press: () => Gym.input('Space'), key: (code) => Gym.input(code), cancel: () => Gym.stop(true),
    pose: (h, dt) => Gym.pose(h, dt), cam: (cam, dt) => Gym.cam(cam, dt) };
  Gym.next(); return B;
};
Gym.prop = function (k) {
  if (!k) return null; const g = new THREE.Group(), mt = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.6 }), st = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.3, metalness: 0.9 });
  if (k === 'bar') { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.9, 8), st); bar.rotation.z = Math.PI / 2; g.add(bar); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), mt); p.rotation.z = Math.PI / 2; p.position.x = s * 0.72; g.add(p); } }
  else for (const s of [-1, 1]) { const d = new THREE.Group(); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 6), st); h.rotation.z = Math.PI / 2; d.add(h); for (const e of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), mt); w.rotation.z = Math.PI / 2; w.position.x = e * 0.13; d.add(w); } d.userData.side = s; g.add(d); }
  Int.sc.add(g); return g;
};
/* the next event, or the end */
Gym.next = function () {
  const G = Gym.S; G.i++; if (G.i >= G.M.ev.length) { Gym.finish(); return; }
  const e = G.M.ev[G.i], k = typeof e === 'string' ? e : e[0]; G.t = 0;
  if (k === 'time') G.ev = { k, u: 0, dir: 1, spd: 0.8 + Math.min(0.9, (intSave().fit || 0) / 90) + G.i * 0.06, zone: Gym.zone(0.26 - Math.min(0.1, (intSave().fit || 0) / 600) - G.i * 0.01) };
  else if (k === 'mash') G.ev = { k, need: e[1], T: e[2], n: 0, msg: e[3] };
  else if (k === 'key') G.ev = { k, key: GYM_KEYS[(Math.random() * 4) | 0], T: e[1], msg: e[2] || '' };
  else if (k === 'alt') G.ev = { k, need: e[1], T: e[2], n: 0, last: null, msg: e[3] };
};
Gym.zone = function (w) { const a = 0.12 + Math.random() * (0.8 - w); return [a, a + w]; };
Gym.result = function (good, what) {
  const G = Gym.S; if (good) { G.ok++; G.rep = 1; G.log.push('✓'); Snd.beep(880, 0.04); } else { G.miss++; G.log.push('✗'); G.flex = 1; Snd.beep(220, 0.06); }
  if (what) G.say = what; G.ev = null; G.wait = 0.55;
};
Gym.input = function (code) {
  const G = Gym.S; if (!G || G.done || !G.ev) return true; const e = G.ev;
  if (code === 'Escape') { Gym.stop(true); return true; }
  if (e.k === 'time') { if (code !== 'Space' && code !== 'KeyE' && code !== 'Enter') return true; Gym.result(e.u >= e.zone[0] && e.u <= e.zone[1]); }
  else if (e.k === 'mash') { if (code !== 'Space' && code !== 'KeyE' && code !== 'Enter') return true; e.n++; G.strain = Math.min(1, G.strain + 0.12); Snd.beep(500 + e.n * 25, 0.02); if (e.n >= e.need) Gym.result(true, 'Up it goes!'); }
  else if (e.k === 'key') { if (!GYM_KEYS.includes(code)) return true; const good = code === e.key; if (G.m === 'bag') G.punch = { k: good ? code : null, t: 0 }; Gym.result(good, G.m === 'bag' && good ? GYM_PUNCH[code] + '!' : good ? 'Solid.' : 'Wrong key!'); }
  else if (e.k === 'alt') { if (code !== 'KeyA' && code !== 'KeyD') return true; if (code !== e.last) { e.n++; e.last = code; G.pace = Math.min(1, G.pace + 0.12); G.ph += 0.9; Snd.beep(code === 'KeyA' ? 520 : 620, 0.015); } if (e.n >= e.need) Gym.result(true, 'Good pace!'); }
  return true;
};
Gym.tick = function (dt) {
  const G = Gym.S; if (!G) return; Int.busy.t += dt;
  if (G.done) { G.done -= dt; if (G.done <= 0) Gym.stop(false); return; }
  G.rep = Math.max(0, G.rep - dt * 1.4); G.flex = Math.max(0, G.flex - dt * 2); G.pace = Math.max(0, G.pace - dt * 0.35); G.ph += dt * (1 + G.pace * 9); if (G.punch) G.punch.t += dt;
  if (G.wait > 0) { G.wait -= dt; if (G.wait <= 0) Gym.next(); return; }
  const e = G.ev; if (!e) return; G.t += dt;
  if (e.k === 'time') { e.u += e.dir * e.spd * dt; if (e.u > 1) { e.u = 1; e.dir = -1; } else if (e.u < 0) { e.u = 0; e.dir = 1; } G.u = e.u; }
  else if (e.k === 'mash') { G.strain = Math.max(0.15, G.strain - dt * 0.5); if (G.t > e.T) { Gym.result(false, G.m === 'press' || G.m === 'squat' ? 'The spotter takes the weight' : 'Out of gas'); } }
  else if ((e.k === 'key' || e.k === 'alt') && G.t > e.T) Gym.result(false, e.k === 'key' ? 'Too slow!' : 'You fell behind');
};
Gym.finish = function () {
  const G = Gym.S, f = intSave(), g = G.ok * G.M.gain * (1 - (f.fit || 0) / 140); f.fit = Math.min(100, (f.fit || 0) + g); f.gym = (f.gym || 0) + 1;
  if (typeof Vit !== 'undefined' && Vit.st != null) Vit.st = Math.max(0, Vit.st - 25);
  writeSave(); G.done = 2.4; G.ev = null; G.res = G.ok + ' / ' + (G.ok + G.miss) + ' · fitness ' + Math.round(f.fit) + ' (+' + g.toFixed(1) + ')'; Int.say(G.M.name + ': ' + G.res + ' · you run and swim faster the fitter you are', 3.5); Snd.win();
};
Gym.stop = function (early) {
  const G = Gym.S; if (!G) return; Gym.S = null; Int.busy = null; if (G.prop) { Int.sc && Int.sc.remove(G.prop); G.prop.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  if (G.hide && G.hide.hu) G.hide.hu.root.visible = true; Int.x = G.x + Math.sin(G.yaw + Math.PI) * 1.1; Int.z = G.z + Math.cos(G.yaw + Math.PI) * 1.1; Int.yaw = G.yaw; if (early) Int.say('Workout stopped', 1.5);
};

/* ---------- you, doing it ---------- */
const _gyA = new THREE.Vector3(), _gyB = new THREE.Vector3();
Gym.pose = function (h, dt) {
  const G = Gym.S; if (!G) return; const b = h.b, R = h.root, t = App.time, P = Int.ped; if (G.hide && G.hide.hu) G.hide.hu.root.visible = false;
  /* rep height: rises with a good rep, wobbles on a strain, sags on a miss */
  const ev = G.ev, up = Math.max(G.rep > 0 ? Math.sin((1 - G.rep) * Math.PI) : 0, ev && ev.k === 'mash' ? 0.25 + 0.5 * G.strain * (ev.n / ev.need) + 0.04 * Math.sin(t * 40) * G.strain : 0) - G.flex * 0.2;
  const u = clamp(up, 0, 1), m = G.m;
  if (m === 'run') { P.x = G.x; P.z = G.z; P.y = 0.2; P.yaw = G.yaw; P.v = 1.2 + G.pace * 3.2; P.state = 'walk'; P.ph += TAU * P.v / pedCyc(P.v, P.app) * dt; pedPose(P, t, dt, false, false); R.visible = true; return; }
  R.visible = true; R.rotation.order = 'YXZ';
  for (const k of ['legL', 'legR', 'knL', 'knR', 'footL', 'footR', 'armL', 'armR', 'elL', 'elR', 'tor', 'chest', 'head']) b[k].rotation.set(0, 0, 0);
  b.hips.rotation.set(0, 0, 0); b.hips.position.set(0, 0.93, 0); b.jaw.rotation.x = G.strain > 0.3 ? 0.08 : 0.02;
  if (m === 'press') {   /* on your back on the bench, head at the far end, the bar going up from the chest */
    R.position.set(G.x, 0.45 + 0.12, G.z + 0.78); R.rotation.set(-Math.PI / 2, G.yaw, 0);
    b.legL.rotation.set(-1.4, 0, -0.25); b.legR.rotation.set(-1.4, 0, 0.25); b.knL.rotation.x = 1.4; b.knR.rotation.x = 1.4;   /* feet on the floor either side */
    b.armL.rotation.set(-1.1 - 0.45 * u, 0, -0.55 + 0.35 * u); b.armR.rotation.set(-1.1 - 0.45 * u, 0, 0.55 - 0.35 * u); b.elL.rotation.x = -1.5 * (1 - u); b.elR.rotation.x = -1.5 * (1 - u); b.head.rotation.x = 0.15;
  } else if (m === 'curl') {
    R.position.set(G.x, 0, G.z); R.rotation.set(0, G.yaw, 0); const a = (G.ok + G.miss) % 2 ? u : 0.1, c = (G.ok + G.miss) % 2 ? 0.1 : u;
    b.armL.rotation.set(-0.12, 0, -0.1); b.armR.rotation.set(-0.12, 0, 0.1); b.elL.rotation.x = -0.15 - 2.0 * a; b.elR.rotation.x = -0.15 - 2.0 * c; b.legL.rotation.z = -0.06; b.legR.rotation.z = 0.06;
  } else if (m === 'squat') {
    R.position.set(G.x, 0, G.z); R.rotation.set(0, G.yaw, 0); const k = 1.35 * (1 - u) * (G.rep > 0 || (ev && ev.k === 'mash') ? 1 : 0.25 + 0.1 * Math.sin(t * 2));
    b.hips.position.y = 0.93 - 0.36 * k / 1.35; b.legL.rotation.set(-k, 0, -0.12); b.legR.rotation.set(-k, 0, 0.12); b.knL.rotation.x = k * 1.8; b.knR.rotation.x = k * 1.8; b.footL.rotation.x = -k * 0.8; b.footR.rotation.x = -k * 0.8; b.tor.rotation.x = 0.42 * k / 1.35;
    b.armL.rotation.set(-0.35, 0, -1.25); b.armR.rotation.set(-0.35, 0, 1.25); b.elL.rotation.x = -2.0; b.elR.rotation.x = -2.0;   /* elbows out, hands up by the shoulders on the bar */
  } else if (m === 'bag') {
    R.position.set(G.x, 0, G.z); R.rotation.set(0, G.yaw, 0); b.legL.rotation.set(-0.25, 0, -0.08); b.legR.rotation.set(0.2, 0, 0.08); b.knL.rotation.x = 0.25; b.knR.rotation.x = 0.3; b.tor.rotation.set(0.1, 0, 0);
    b.armL.rotation.set(-1.2, 0, -0.25); b.armR.rotation.set(-1.2, 0, 0.25); b.elL.rotation.x = -1.9; b.elR.rotation.x = -1.9;   /* guard up */
    const p = G.punch; if (p && p.k && p.t < 0.35) { const e = Math.sin(clamp(p.t / 0.35, 0, 1) * Math.PI);
      if (p.k === 'KeyA') { b.armL.rotation.set(-1.2 - 0.35 * e, 0, -0.25 + 0.2 * e); b.elL.rotation.x = -1.9 * (1 - e); b.chest.rotation.y = 0.25 * e; }
      else if (p.k === 'KeyD') { b.armR.rotation.set(-1.2 - 0.35 * e, 0, 0.25 - 0.2 * e); b.elR.rotation.x = -1.9 * (1 - e); b.chest.rotation.y = -0.4 * e; b.hips.rotation.y = -0.2 * e; }
      else if (p.k === 'KeyW') { b.armR.rotation.set(-1.2 - 0.9 * e, 0, 0.15); b.elR.rotation.x = -1.9 + 0.6 * e; b.hips.position.y = 0.93 - 0.06 * e; b.chest.rotation.y = -0.2 * e; }
      else { b.armL.rotation.set(-1.4, 0, -0.25 - 1.1 * e); b.elL.rotation.x = -1.4; b.chest.rotation.y = 0.5 * e; } }
  } else if (m === 'bike') {
    R.position.set(G.x, 0.12, G.z); R.rotation.set(0, G.yaw, 0); b.hips.position.set(0, 0.68, 0); b.tor.rotation.x = 0.45 + 0.1 * G.strain;
    const ph = G.ph * 2.2; b.legL.rotation.set(-1.15 + 0.38 * Math.sin(ph), 0, -0.05); b.legR.rotation.set(-1.15 - 0.38 * Math.sin(ph), 0, 0.05); b.knL.rotation.x = 1.3 + 0.45 * Math.cos(ph); b.knR.rotation.x = 1.3 - 0.45 * Math.cos(ph);
    b.armL.rotation.set(-1.0, 0, -0.1); b.armR.rotation.set(-1.0, 0, 0.1); b.elL.rotation.x = -0.4; b.elR.rotation.x = -0.4;
  }
  Human.alive(h, dt, t, 4.7);
  /* the weights in the hands */
  if (G.prop) { h.root.updateMatrixWorld(true); b.handL.getWorldPosition(_gyA); b.handR.getWorldPosition(_gyB);
    if (G.M.prop === 'bar' && m === 'squat') { b.neck.getWorldPosition(_gyA); G.prop.position.set(_gyA.x - Math.sin(G.yaw) * 0.12, _gyA.y - 0.02, _gyA.z - Math.cos(G.yaw) * 0.12); G.prop.rotation.set(0, G.yaw, 0); }   /* across the back of the shoulders */
    else if (G.M.prop === 'bar') { G.prop.position.copy(_gyA).add(_gyB).multiplyScalar(0.5); G.prop.rotation.set(0, Math.atan2(_gyB.x - _gyA.x, _gyB.z - _gyA.z) - Math.PI / 2, 0); }
    else for (const d of G.prop.children) { d.position.copy(d.userData.side < 0 ? _gyA : _gyB); d.rotation.set(0, G.yaw, 0); } }
};
/* the camera: round you, closer and lower for the strain */
Gym.cam = function (cam, dt) {
  const G = Gym.S; if (!G) return; G.camA += dt * 0.18; const ms = G.ev && G.ev.k === 'mash', d = ms ? 2.2 : 2.9, y = G.m === 'press' ? 2.1 : ms ? 1.2 : 1.55;
  const cx = G.x + Math.sin(G.camA) * d, cz = G.z + Math.cos(G.camA) * d, o = intResolve(cx, cz, 0.25, Int.cols, Int.bounds);
  cam.position.set(o.x, y + (ms ? 0.02 * Math.sin(App.time * 30) * G.strain : 0), o.z); cam.lookAt(G.x, G.m === 'press' ? 0.6 : G.m === 'bike' ? 1.0 : 1.05, G.z);
};

/* ---------- the prompts ---------- */
Gym.hint = function () { const G = Gym.S; if (!G) return ''; return G.done ? '<b>' + esc(G.M.name) + ': ' + esc(G.res || '') + '</b>' : '<em>Esc</em> stop · ' + esc(G.M.name) + ' · ' + G.log.join(' '); };
Gym.hud = function () {
  const G = Gym.S; if (!G) return ''; const e = G.ev, say = G.wait > 0 && G.say ? '<div class="gq-say">' + esc(G.say) + '</div>' : '';
  let q = '';
  if (e && e.k === 'time') q = '<div class="gq-t">PRESS <kbd>SPACE</kbd> IN THE GREEN</div><div class="ibt"><i class="iz" style="left:' + (e.zone[0] * 100).toFixed(1) + '%;width:' + ((e.zone[1] - e.zone[0]) * 100).toFixed(1) + '%"></i><i class="ik" style="left:' + (e.u * 100).toFixed(1) + '%"></i></div>';
  else if (e && e.k === 'mash') q = '<div class="gq-t gq-hot">' + esc(e.msg || 'MASH') + ' · MASH <kbd>SPACE</kbd></div><div class="gq-bar"><i style="width:' + (e.n / e.need * 100).toFixed(0) + '%"></i></div><div class="gq-time"><i style="width:' + Math.max(0, (1 - G.t / e.T) * 100).toFixed(0) + '%"></i></div>';
  else if (e && e.k === 'key') { const r = Math.max(0, 1 - G.t / e.T); q = '<div class="gq-t">' + esc(e.msg || (G.m === 'bag' ? GYM_PUNCH[e.key].toUpperCase() : 'PRESS')) + '</div><div class="gq-key" style="--r:' + r.toFixed(2) + '"><kbd>' + GYM_KEYN[e.key] + '</kbd></div>'; }
  else if (e && e.k === 'alt') q = '<div class="gq-t">' + esc(e.msg || 'A D A D') + '</div><div class="gq-alt"><kbd class="' + (e.last === 'KeyD' || !e.last ? 'on' : '') + '">A</kbd><kbd class="' + (e.last === 'KeyA' ? 'on' : '') + '">D</kbd></div><div class="gq-bar"><i style="width:' + (e.n / e.need * 100).toFixed(0) + '%"></i></div><div class="gq-time"><i style="width:' + Math.max(0, (1 - G.t / e.T) * 100).toFixed(0) + '%"></i></div>';
  return '<div class="gq"><small>' + esc(G.M.name) + ' · ' + Math.min(G.i + 1, G.M.ev.length) + ' / ' + G.M.ev.length + ' · fitness ' + Math.round(intSave().fit || 0) + '</small>' + q + say + '</div>';
};
Gym.css = function () {
  if (Gym.cssOn) return; Gym.cssOn = true; const s = document.createElement('style');
  s.textContent = '.gq{display:grid;gap:8px;min-width:min(420px,86vw);text-align:center}.gq small{color:var(--dim);letter-spacing:.08em}.gq-t{font:700 20px/1.1 var(--display,sans-serif);letter-spacing:.08em}.gq-t kbd,.gq-key kbd,.gq-alt kbd{display:inline-block;padding:2px 9px;border:2px solid #fff;border-radius:6px;font:700 18px monospace}' +
    '.gq-hot{color:#ff8a3a;animation:pulse .3s infinite alternate}.gq-bar,.gq-time{height:12px;background:rgba(255,255,255,.12);border-radius:6px;overflow:hidden}.gq-time{height:4px}.gq-bar i{display:block;height:100%;background:#ff8a3a}.gq-time i{display:block;height:100%;background:#fff}' +
    '.gq-key{width:96px;height:96px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#ffd23a calc(var(--r)*360deg),rgba(255,255,255,.12) 0)}.gq-key kbd{font-size:40px;padding:10px 20px;background:#0c0f14}' +
    '.gq-alt{display:flex;gap:14px;justify-content:center}.gq-alt kbd{font-size:30px;padding:8px 18px;opacity:.4}.gq-alt kbd.on{opacity:1;background:#ffd23a;color:#111}.gq-say{font:700 18px var(--display,sans-serif);color:#7affb0}';
  document.head.appendChild(s);
};
