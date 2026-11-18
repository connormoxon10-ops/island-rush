/* ================= INTERIORS: walk inside the buildings =================
   Every town building has a door (08_int_bld.js). Walk up to it and press E: the building's interior is its own first-person scene (mode 'int'),
   built from its kind (shop, office, home, bank, gym, ...) and the building's real footprint, and thrown away when you leave. You walk, run and look
   about exactly as on foot (keys, mouse, pad or touch), bump into the furniture, and press E at anything marked to use it (buy, eat, work out, sleep,
   take the lift, leave by the door). The people inside are the game's Humans, posed by the pedestrian code (standing, walking, sitting, working).
   A kind is INT_KINDS[k] = { name, rooms: { main(K, rec, r), ...more rooms }, enter?(rec) }; K is the room kit (08_int_kit.js). */
const INT = { EYE: 1.62, R: 0.3, NPC_CAP: 14 };
const Int = { on: false, rec: null, kind: null, room: 'main', sc: null, cam: null, x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, bob: 0, cols: [], acts: [], npcs: [], ticks: [], swim: null, tp: false, near: null,
  t: 0, msg: '', msgT: 0, hudH: '', botH: '', pan: null, fx: { speed: 0, damage: 0, chroma: 0, expo: 1 }, expo: 1.15, ped: null, back: null, drag: null, look: { k: 0 }, busy: null, entered: 0, hook: null };
const _ii = { f: 0, r: 0, run: false, lx: 0, ly: 0, use: false, back: false };
function intSave() { const s = save.int || (save.int = { apts: {}, fit: 0, gym: 0, meals: 0, swims: 0, jail: 0, nights: 0, rooms: 0, banks: {} }); s.apts = s.apts || {}; s.banks = s.banks || {}; return s; }

/* ---------- enter / leave ---------- */
Int.enter = function (rec, room) {
  if (!rec || App.mode !== 'play') return false; const D = INT_KINDS[rec.kind]; if (!D) return false;
  if (Wanted.stars > 0 && !rec.jail && !(Int.hook && Int.hook.allowHeat)) { UI.toast('The cops are on you · lose the heat first', 'bad'); return false; }
  if (D.enter && D.enter(rec) === false) return false;
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  if (Talk.on) Talk.close(true);
  Int.back = { foot: Foot.on, x: Foot.on ? Foot.x : car.x, z: Foot.on ? Foot.z : car.z };
  Int.rec = rec; Int.kind = D; Int.on = true; Int.t = 0; Int.entered = App.time; Int.tp = !!(Foot.on && Foot.tp); Int.pan = null;
  if (!Int.cam) Int.cam = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
  Int.go(room || 'main');
  UI.setMode('int'); E.intTitle.textContent = rec.name; E.intSub.textContent = rec.sub || D.name; E.intPan.hidden = true; Snd.door();
  return true;
};
Int.go = function (room, spawn) {
  const rec = Int.rec, D = Int.kind, fn = D.rooms[room]; if (!fn) return;
  Int.clear(); Int.room = room;
  const K = new IntKit(rec, room), r = mulberry32((ihash(rec.seed | 0, room.length * 131 + room.charCodeAt(0), 3) * 4294967296) >>> 0);
  fn(K, rec, r); K.done(); Int.sc = K.sc; Int.cols = K.cols; Int.acts = K.acts; Int.npcs = K.npcs; Int.ticks = K.ticks; Int.swim = K.swim; Int.bounds = K.bounds; Int.K = K;
  const s = (spawn && K.spawns[spawn]) || K.spawns.door || [0, 0, Math.PI]; Int.x = s[0]; Int.z = s[1]; Int.yaw = s[2]; Int.pitch = 0; Int.vx = Int.vz = 0; Int.y = 0;
  if (Int.tp) Int.mkPed();
  Int.hudH = Int.botH = ''; Int.near = null; if (D.onRoom) D.onRoom(room, K);
};
Int.clear = function () {
  if (Int.K && Int.K.extra) { for (const f of Int.K.extra) try { f(); } catch (e) { console.error(e); } Int.K.extra = null; }
  for (const n of Int.npcs) if (n.hu) Human.dispose(n.hu);
  if (Int.ped && Int.ped.hu) { Human.dispose(Int.ped.hu); Int.ped.hu = null; }
  if (Int.sc) Int.sc.traverse((o) => { if (o.geometry && !o.geometry.__keep) o.geometry.dispose(); if (o.material && o.material.__own) { if (o.material.map && !o.material.map.__keep) o.material.map.dispose(); o.material.dispose(); } });
  Int.sc = null; Int.npcs = []; Int.acts = []; Int.cols = []; Int.ticks = [];
};
Int.leave = function (silent) {
  if (!Int.on) return; const rec = Int.rec, D = Int.kind;
  if (Int.busy && Int.busy.lock) { Int.say(Int.busy.lock); return; }
  if (D && D.leave && D.leave(rec) === false) return;
  Int.panel(null); Int.clear(); Int.on = false; Int.busy = null;
  const d = rec.door; let x = d.ox, z = d.oz;
  if (!Foot.on) { if (!Foot.ped) Foot.ped = footNewPed(); Foot.ped.app = footApp(); Foot.on = true; Foot.state = 'walk'; Foot.tp = Int.tp; UI.footMode(true); Foot.parkCar(car); }
  if (footBlockedAt(x, z)) { x = d.ox + d.nx * 1.2; z = d.oz + d.nz * 1.2; }
  Foot.x = x; Foot.z = z; groundAt(x, z, _fg); Foot.y = _fg.h; Foot.vx = Foot.vz = Foot.vy = 0; Foot.air = false; Foot.yaw = Math.atan2(d.nx, d.nz); Foot.body = Foot.yaw; Foot.pitch = 0; Foot.tp = Int.tp;
  syncPl(); UI.setMode('play'); writeSave(); if (!silent) Snd.door(); last = performance.now();
  if (Int.hook && Int.hook.left) { const h = Int.hook; Int.hook = null; h.left(rec); }
};
Int.say = function (m, sec) { Int.msg = m; Int.msgT = sec || 2.6; };

/* ---------- the player's own body (third person, and in the mirror of shop windows) ---------- */
Int.mkPed = function () {
  const P = Int.ped || (Int.ped = { app: null, x: 0, y: 0, z: 0, yaw: 0, v: 0, ph: 0, state: 'stand', seed: 3.7, avatar: true, tilt: 0, t: 0, vx: 0, vz: 0, vy: 0, wave: 0, pn: 0, jump: false, phone: false });
  P.app = footApp(); if (P.hu) { Human.dispose(P.hu); P.hu = null; }
  const h = P.hu = Human.make(pedSpec(P.app, P.seed)); h.sig = Human.sig(P.app); h.app = P.app; h.chk = 0; h.gy = 0; h.ps = null; if (Int.sc) Int.sc.add(h.root);
};
Int.view = function (tp) { Int.tp = tp == null ? !Int.tp : !!tp; if (Int.tp && !(Int.ped && Int.ped.hu)) Int.mkPed(); if (Int.ped && Int.ped.hu) Int.ped.hu.root.visible = Int.tp; };

/* ---------- input ---------- */
function intInput() {
  const K = Keys, T = TouchIn, I = _ii;
  I.f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + T.gas - T.brk; I.r = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + T.r - T.l; I.lx = I.ly = 0;
  if (K.ArrowLeft) I.lx -= 1; if (K.ArrowRight) I.lx += 1;
  I.run = !!(K.ShiftLeft || K.ShiftRight) || !!T.nit; I.use = false; I.back = false;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { pads = null; }
  if (pads) for (const p of pads) if (p && p.connected) {
    const dz = (v) => (Math.abs(v) > 0.15 ? v : 0), bv = (i) => (p.buttons[i] ? p.buttons[i].value || (p.buttons[i].pressed ? 1 : 0) : 0);
    I.r += dz(p.axes[0]); I.f -= dz(p.axes[1]); I.lx += dz(p.axes[2] || 0); I.ly += dz(p.axes[3] || 0); I.run = I.run || bv(1) > 0.5 || bv(10) > 0.5;
    for (const [i, code] of [[0, 'KeyE'], [2, 'KeyE'], [3, 'KeyC'], [9, 'Escape'], [1, 'Backspace']]) { const on = bv(i) > 0.5; if (on && !padPrev[100 + i]) onKey(code); padPrev[100 + i] = on; }
    break;
  }
  I.f = clamp(I.f, -1, 1); I.r = clamp(I.r, -1, 1); return I;
}
Int.look = function (dx, dy) { Int.yaw -= dx * 0.0042; Int.pitch = clamp(Int.pitch - dy * 0.0036 * (save.set.finv ? -1 : 1), -1.3, 1.2); };
Int.key = function (code) {
  if (Int.busy && Int.busy.press && (code === 'KeyE' || code === 'Space' || code === 'Enter')) { Int.busy.press(); return; }
  if (Int.pan && Int.pan.key && Int.pan.key(code)) return;
  switch (code) {
    case 'Escape': case 'Backspace': if (Int.pan) Int.panel(null); else if (Int.busy && Int.busy.cancel) Int.busy.cancel(); else if (code === 'Escape') Int.leave(); break;
    case 'KeyE': case 'Enter': if (Int.pan) { const b = E.intPan.querySelector('button.primary:not([disabled])'); if (b && code === 'Enter') b.click(); else if (code === 'KeyE') Int.panel(null); break; } if (Int.near) Int.use(Int.near); break;
    case 'KeyC': case 'KeyV': Int.view(); break;
    case 'Digit1': Int.view(false); break; case 'Digit2': Int.view(true); break;
    case 'KeyF': if (!Int.pan && Int.near && Int.near.f) Int.use(Int.near, 'f'); break;
    default: if (Int.kind && Int.kind.key) Int.kind.key(code);
  }
};
Int.use = function (a, how) {
  if (!a || (Int.busy && Int.busy.lock)) return;
  if (a.cost && save.money < a.cost) { Int.say('You need ' + money(a.cost) + ' for that'); Snd.beep(200, 0.08); return; }
  try { a.fn(a, how); } catch (e) { console.error(e); }
};

/* ---------- a panel (menus: buy a room, order food, pick a floor, a car on the showroom floor) ---------- */
/* o = { title, sub, body (html), btns: [[label, fn, primary, disabled]], key?(code) } ; null closes it */
Int.panel = function (o) {
  Int.pan = o; const P = E.intPan;
  if (!o) { P.hidden = true; P.innerHTML = ''; return; }
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  let h = '<div class="vmh"><b>' + esc(o.title) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div>' + (o.body || '');
  h += '<div class="vfoot">' + (o.btns || []).map((b, i) => '<button type="button" class="btn' + (b[2] ? ' primary' : '') + '" data-ib="' + i + '"' + (b[3] ? ' disabled' : '') + '>' + b[0] + '</button>').join('') + '<button type="button" class="btn" data-ib="x">Close</button></div>';
  P.innerHTML = h; P.hidden = false; Int.hudH = '';
};
Int.initUI = function () {
  E.intPan.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('[data-ib],[data-ia]') : null; if (!b || b.disabled || !Int.pan) return;
    if (b.dataset.ib === 'x') { Int.panel(null); return; }
    const o = Int.pan; if (b.dataset.ia != null && o.pick) { o.pick(b.dataset.ia, b); return; }
    const bt = o.btns && o.btns[+b.dataset.ib]; if (bt && bt[1]) bt[1](b);
  });
  E.intTop.addEventListener('click', (e) => { const b = e.target.closest ? e.target.closest('[data-act]') : null; if (b && b.dataset.act === 'leave') Int.leave(); });
  const gl = E.gl;
  gl.addEventListener('pointerdown', (e) => {
    if (App.mode !== 'int' || Int.pan) return;
    if (e.pointerType === 'mouse') { try { const r = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (er) { /* ignore */ } return; }
    Int.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  gl.addEventListener('pointermove', (e) => {
    if (App.mode !== 'int') return;
    if (document.pointerLockElement === gl) { Int.look(e.movementX, e.movementY); return; }
    const d = Int.drag; if (!d || d.id !== e.pointerId) return; Int.look((e.clientX - d.x) * 1.6, (e.clientY - d.y) * 1.6); d.x = e.clientX; d.y = e.clientY;
  });
  const up = (e) => { if (Int.drag && Int.drag.id === e.pointerId) Int.drag = null; };
  gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
};

/* ---------- per frame ---------- */
const _intV = new THREE.Vector3();
function intResolve(x, z, R, cols, B) {
  const o = { x, z };
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < cols.length; i++) {
    const c = cols[i]; if (c.off) continue; if (o.x < c[0] - R || o.x > c[2] + R || o.z < c[1] - R || o.z > c[3] + R) continue;
    const qx = clamp(o.x, c[0], c[2]), qz = clamp(o.z, c[1], c[3]);
    if (qx === o.x && qz === o.z) { const dl = o.x - c[0], dr = c[2] - o.x, dt = o.z - c[1], db = c[3] - o.z, m = Math.min(dl, dr, dt, db); if (m === dl) o.x = c[0] - R; else if (m === dr) o.x = c[2] + R; else if (m === dt) o.z = c[1] - R; else o.z = c[3] + R; }
    else { const ex = o.x - qx, ez = o.z - qz, d = Math.hypot(ex, ez); if (d < R) { o.x = qx + ex / d * R; o.z = qz + ez / d * R; } }
  }
  if (B) { o.x = clamp(o.x, B[0] + R, B[2] - R); o.z = clamp(o.z, B[1] + R, B[3] - R); }
  return o;
}
Int.frame = function (dt) {
  App.time += dt; Int.t += dt; if (Snd.ok) Snd.update(car, dt, true);
  App.tod = (App.tod + dt * (save.set.cycle ? 24 / 1440 : 0)) % 24;
  if (Int.msgT > 0) Int.msgT -= dt;
  const I = Int.pan || (Int.busy && Int.busy.freeze) ? { f: 0, r: 0, run: false, lx: 0, ly: 0 } : intInput();
  if (I.lx) Int.yaw -= I.lx * 2.4 * dt; if (I.ly) Int.pitch = clamp(Int.pitch - I.ly * 1.8 * dt, -1.3, 1.2);
  /* walk (or swim) */
  const sw = Int.swim && Int.swim.at(Int.x, Int.z), s = Math.sin(Int.yaw), c = Math.cos(Int.yaw), fit = intSave().fit || 0;
  let mx = s * I.f - c * I.r, mz = c * I.f + s * I.r; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const run = I.run && I.f > -0.2 && ml > 0.1, vmax = sw ? (run ? 1.9 : 1.2) * (1 + fit * 0.002) : (run ? 5.2 * (1 + fit * 0.0015) : 2.2) * (I.f < -0.3 && !I.r ? 0.6 : 1);
  Int.vx += (mx * vmax - Int.vx) * Math.min(1, dt * (sw ? 3 : 10)); Int.vz += (mz * vmax - Int.vz) * Math.min(1, dt * (sw ? 3 : 10));
  const o = intResolve(Int.x + Int.vx * dt, Int.z + Int.vz * dt, INT.R, Int.cols, Int.bounds); Int.x = o.x; Int.z = o.z;
  const sp = Math.hypot(Int.vx, Int.vz); Int.bob += sp * dt * (run ? 1.7 : 2.1);
  const swy = sw ? sw.y : 0; Int.y += ((swy) - Int.y) * Math.min(1, dt * 6);
  if (sw) intSave().swimT = (intSave().swimT || 0) + dt;
  /* what is in reach */
  let best = null, bs = 1e9;
  if (!Int.pan && !(Int.busy && Int.busy.freeze)) for (const a of Int.acts) {
    if (a.off || (a.when && !a.when())) continue; const dx = a.x - Int.x, dz = a.z - Int.z, d = Math.hypot(dx, dz); if (d > a.r) continue;
    const face = d < 0.5 ? 1 : (dx * s + dz * c) / d; if (face < (a.wide ? -0.2 : 0.25)) continue; const sc = d - face * 0.8; if (sc < bs) { bs = sc; best = a; }
  }
  Int.near = best;
  for (const f of Int.ticks) f(dt, Int.t);
  if (Int.kind && Int.kind.tick) Int.kind.tick(dt, Int.t);
  if (Int.busy && Int.busy.tick) Int.busy.tick(dt);
  if (!Int.on) return;   /* a tick can send you out (released from jail, caught in the vault) */
  /* people */
  const px = Pl.x, pz = Pl.z; Pl.x = Int.x; Pl.z = Int.z; HU.frame = (HU.frame || 0) + 1;
  try { for (const n of Int.npcs) intNpc(n, dt); if (Int.tp && Int.ped && Int.ped.hu) { const P = Int.ped; P.x = Int.x; P.z = Int.z; P.y = Int.y - (sw ? 1.0 : 0); P.yaw = Int.yaw; P.v = sp; P.state = sp > 0.2 ? 'walk' : 'stand'; P.ph += TAU * sp / pedCyc(Math.max(0.4, sp), P.app) * dt; pedPose(P, App.time, dt, false, false); } }
  finally { Pl.x = px; Pl.z = pz; }
  if (Int.ped && Int.ped.hu) Int.ped.hu.root.visible = Int.tp;
  /* camera */
  const cam = Int.cam, W = innerWidth, H = innerHeight; cam.aspect = W / H; cam.fov = save.set.fov || 72; cam.updateProjectionMatrix();
  const eye = (sw ? 0.55 : INT.EYE) + Int.y + (sp > 0.3 && !sw ? Math.sin(Int.bob * 2) * 0.025 : 0), cp = Math.cos(Int.pitch);
  if (Int.tp) {
    const bx = Int.x - s * 2.6 * cp, bz = Int.z - c * 2.6 * cp, o2 = intResolve(bx, bz, 0.2, Int.cols, Int.bounds);
    cam.position.set(o2.x, eye + 0.3 - Math.sin(Int.pitch) * 1.6, o2.z); cam.lookAt(Int.x, eye - 0.1, Int.z);
  } else { cam.position.set(Int.x, eye, Int.z); _intV.set(Int.x + s * cp, eye + Math.sin(Int.pitch), Int.z + c * cp); cam.lookAt(_intV); }
  /* draw */
  const s0 = scene, c0 = camera, e0 = env.exposure; scene = Int.sc; camera = cam; env.exposure = Int.K.expo || Int.expo;
  try { renderFrame(Int.fx, App.time); } finally { env.exposure = e0; scene = s0; camera = c0; }
  Int.hudT = (Int.hudT || 0) - dt; if (Int.hudT <= 0) { Int.hudT = 0.08; Int.paint(); }
};
Int.paint = function () {
  let b = '';
  if (Int.msgT > 0) b = '<b>' + Int.msg + '</b>';
  else if (Int.busy && Int.busy.hint) b = Int.busy.hint();
  else if (Int.near && !Int.pan) { const a = Int.near, lab = typeof a.label === 'function' ? a.label() : a.label; b = (TouchIn.on ? '<em>USE</em> ' : '<em>E</em> ') + lab + (a.cost ? ' · ' + money(a.cost) : '') + (a.f ? ' &nbsp; <em>F</em> ' + a.f : ''); }
  else if (!Int.pan && Int.t < 4) b = TouchIn.on ? 'Drag to look · walk out the door to leave' : 'Mouse to look · WASD walk · Shift run · E use · C view · walk out the door (or Esc) to leave';
  if (b !== Int.botH) { Int.botH = b; E.intBot.innerHTML = b; E.intBot.hidden = !b; }
  const h = Int.busy && Int.busy.hud ? Int.busy.hud() : Int.kind && Int.kind.hud ? Int.kind.hud() : '';
  if (h !== Int.hudH) { Int.hudH = h; E.intHud.innerHTML = h; E.intHud.hidden = !h; }
  E.intCash.textContent = money(save.money); E.intDot.hidden = Int.tp || !!Int.pan;
  if (E.tAct) { E.tAct.dataset.k = 'KeyE'; E.tAct.textContent = Int.near ? 'USE' : '·'; }
};

/* ---------- people inside ---------- */
/* n = ped-like: { app, x, z, y, yaw, v, ph, seed, state, kind: 'stand' | 'walk' | 'sit' | 'lift' | 'swim' | 'dance' | 'sleep' | 'lie', path?: [[x,z,wait]...] } */
function intNpc(n, dt) {
  if (n.kind === 'walk' && n.path) {
    const P = n.path, q = P[n.pi]; if (n.wait > 0) { n.wait -= dt; n.v = 0; n.state = 'stand'; }
    else { const dx = q[0] - n.x, dz = q[1] - n.z, d = Math.hypot(dx, dz); if (d < 0.25) { n.wait = q[2] || 0; n.pi = (n.pi + 1) % P.length; if (q[3] != null) n.yaw = q[3]; } else { n.state = 'walk'; n.v = n.vt; n.x += dx / d * n.v * dt; n.z += dz / d * n.v * dt; n.yaw += angDiff(n.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 6); n.ph += TAU * n.v / pedCyc(n.v, n.app) * dt; } }
  } else if (n.kind === 'chase' && n.tgt) { /* moved by its owner */ }
  else if (n.kind === 'treadmill') { n.v = 2.7; n.state = 'walk'; n.ph += TAU * n.v / pedCyc(n.v, n.app) * dt; }
  else if (n.kind !== 'walk') { n.v = 0; n.state = n.talk ? 'talk' : 'stand'; }
  if (n.face) { const dx = Int.x - n.x, dz = Int.z - n.z; if (dx * dx + dz * dz < 16) n.yaw += angDiff(n.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 3); }
  n.spk = n.talk ? 0.6 : 0;
  pedPose(n, App.time, dt, false, false);
  const h = n.hu; if (!h) return; const b = h.b, R = h.root, t = App.time + n.seed;
  if (n.kind === 'sit') {
    R.position.set(n.x, n.y + (n.sy || 0.0), n.z); R.rotation.set(0, n.yaw, 0);
    b.hips.position.set(0, 0.47 + (n.sy0 || 0), 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(-0.05, 0, 0); b.chest.rotation.set(0.02 + 0.02 * Math.sin(t * 1.6), 0, 0);
    b.legL.rotation.set(-1.5, 0, -0.06); b.knL.rotation.set(1.5, 0, 0); b.footL.rotation.set(0.0, 0, 0); b.legR.rotation.set(-1.5, 0, 0.06); b.knR.rotation.set(1.5, 0, 0); b.footR.rotation.set(0.0, 0, 0);
    if (n.eat) { const u = Math.max(0, Math.sin(t * 1.3)); b.armR.rotation.set(-0.5 - 0.6 * u, 0, 0.15); b.elR.rotation.set(-1.3 - 0.5 * u, 0, 0); b.armL.rotation.set(-0.5, 0, -0.15); b.elL.rotation.set(-1.2, 0, 0); }
    else if (n.type) { const u = Math.sin(t * 9); b.armR.rotation.set(-0.55, 0, 0.12); b.elR.rotation.set(-1.25 + 0.05 * u, 0, 0); b.armL.rotation.set(-0.55, 0, -0.12); b.elL.rotation.set(-1.25 - 0.05 * u, 0, 0); b.head.rotation.x = 0.15; }
    else { b.armL.rotation.set(-0.35, 0, -0.1); b.armR.rotation.set(-0.35, 0, 0.1); b.elL.rotation.set(-0.9, 0, 0); b.elR.rotation.set(-0.9, 0, 0); }
  } else if (n.kind === 'lift') {   /* a bench press, a curl or a squat, in time */
    const u = 0.5 + 0.5 * Math.sin(t * 2.2), m = n.move || 'curl';
    if (m === 'curl') { b.armL.rotation.set(-0.15, 0, -0.08); b.armR.rotation.set(-0.15, 0, 0.08); b.elL.rotation.set(-0.2 - 1.9 * u, 0, 0); b.elR.rotation.set(-0.2 - 1.9 * (1 - u), 0, 0); }
    else if (m === 'press') { b.armL.rotation.set(-1.55 - 1.2 * u, 0, -0.35); b.armR.rotation.set(-1.55 - 1.2 * u, 0, 0.35); b.elL.rotation.set(-1.6 * (1 - u), 0, 0); b.elR.rotation.set(-1.6 * (1 - u), 0, 0); }
    else if (m === 'squat') { const k = 1.3 * u; b.hips.position.y -= 0.32 * u; b.legL.rotation.set(-k, 0, -0.1); b.legR.rotation.set(-k, 0, 0.1); b.knL.rotation.set(k * 1.8, 0, 0); b.knR.rotation.set(k * 1.8, 0, 0); b.footL.rotation.set(-k * 0.8, 0, 0); b.footR.rotation.set(-k * 0.8, 0, 0); b.tor.rotation.x = 0.4 * u; b.armL.rotation.set(-2.6, 0, -0.5); b.armR.rotation.set(-2.6, 0, 0.5); b.elL.rotation.set(-2.2, 0, 0); b.elR.rotation.set(-2.2, 0, 0); }
    else if (m === 'run') { n.ph += dt * 9; }
  } else if (n.kind === 'dance') {
    const u = Math.sin(t * 6), v = Math.sin(t * 3 + n.seed); R.position.y = n.y + 0.04 * Math.abs(u); b.hips.rotation.set(0, 0.3 * v, 0.08 * u); b.armL.rotation.set(-1.2 - 0.8 * Math.max(0, u), 0, -0.4); b.armR.rotation.set(-1.2 - 0.8 * Math.max(0, -u), 0, 0.4); b.elL.rotation.set(-0.8, 0, 0); b.elR.rotation.set(-0.8, 0, 0); b.knL.rotation.x = 0.2 + 0.2 * Math.max(0, u); b.knR.rotation.x = 0.2 + 0.2 * Math.max(0, -u);
  } else if (n.kind === 'swim') {
    const u = Math.sin(t * 2.4); R.position.y = n.y - 1.0 + 0.04 * u; b.armL.rotation.set(-0.4 - 0.3 * u, 0, -0.9); b.armR.rotation.set(-0.4 + 0.3 * u, 0, 0.9); b.elL.rotation.set(-0.4, 0, 0); b.elR.rotation.set(-0.4, 0, 0);
  } else if (n.kind === 'lie' || n.kind === 'sleep') {
    R.rotation.order = 'YXZ'; R.position.set(n.x, n.y + 0.14, n.z); R.rotation.set(-Math.PI / 2, n.yaw, 0); b.hips.position.set(0, 0.955, 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(0, 0, 0); b.chest.rotation.set(0.015 * Math.sin(t * 1.2), 0, 0);
    b.armL.rotation.set(0, 0, -0.12); b.armR.rotation.set(0, 0, 0.12); b.elL.rotation.set(-0.1, 0, 0); b.elR.rotation.set(-0.1, 0, 0); b.legL.rotation.set(0, 0, 0); b.legR.rotation.set(0, 0, 0); b.knL.rotation.set(0.05, 0, 0); b.knR.rotation.set(0.05, 0, 0); b.footL.rotation.set(0.6, 0, 0); b.footR.rotation.set(0.6, 0, 0);
    if (n.kind === 'sleep') { b.head.rotation.set(0, 0.4, 0); }
  } else if (n.kind === 'work') {   /* busy with the hands at a counter: sweep, wipe, type */
    const u = Math.sin(t * 3.1); b.armR.rotation.set(-0.7 + 0.15 * u, 0, 0.1); b.elR.rotation.set(-0.9 - 0.2 * u, 0, 0); b.armL.rotation.set(-0.5, 0, -0.1); b.elL.rotation.set(-1.0, 0, 0); b.head.rotation.x = 0.25;
  }
  if (n.after) n.after(n, h, t);
}
