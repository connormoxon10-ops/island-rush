/* ================= FIGHTING =================
   On foot, Q (or a left click once the mouse is captured, or the PUNCH button, or X on a pad) throws a punch, alternating hands.
   Whoever you hit either squares up and punches back (they chase you down and take a few hits to drop) or backs off, points at you
   and phones the police (see Police: a patrol car arrives, the officer runs you down, you are fined). Pedestrians use the same
   punch animation as the player through ped.pn (0..1 progress) and ped.hand, drawn in writePed. */
const Fight = { t: -1, cool: 0, hand: 0, done: true, taken: 0, takenT: 0, view: null };
const FIGHT_T = 0.42, FIGHT_HIT = 0.168;
/* mood -> [chance they hit back instead of calling the police, hits to put them down] */
const FMOOD = { grumpy: [0.82, 4], sporty: [0.78, 4], busy: [0.55, 3], friendly: [0.4, 3], chatty: [0.35, 3], dreamy: [0.2, 2], shy: [0.08, 2], kid: [0, 1] };
const F_FIGHT_SAY = ['Oh, you want some?!', 'Big mistake, pal!', 'Come here!', 'Right. That is it.', 'Put them up!'];
const F_CALL_SAY = ['You hit me! Calling the police!', 'Help! He punched me!', 'I am calling the cops!', 'Assault! I saw that!', 'You are in so much trouble!'];
const F_KID_SAY = ['I am telling my mum!', 'Waaaah! Police!'];
const _fn = (P) => (P && P.name ? P.name.split(' ')[0] : 'Someone');

Fight.say = function (p, text) { UI.toast(_fn(p.pers) + ': ' + text, 'bad'); };
Fight.reset = function () { Fight.t = -1; Fight.cool = 0; Fight.taken = 0; if (Fight.view) Fight.view.g.visible = false; };
/* put a pedestrian back into normal life */
Fight.clear = function (p) { p.own = false; p.keep = false; p.hp = null; p.stun = 0; p.pn = 0; p.phone = false; p.called = false; p.report = false; p.cop = false; p.callT = 0; };
Fight.calm = function (p) { Fight.clear(p); p.state = 'walk'; p.v = 0; pedReattach(p); };
/* a cop (or anybody the story is finished with) goes back to being a random ped somewhere else */
Fight.release = function (p) {
  Fight.clear(p); const i = Peds.list.indexOf(p); if (i < 0) return;
  p.state = 'walk'; p.v = 0; if (!pedRespawn(p, i)) p.y = -500;
};
const _fgr = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false };
Fight.ground = function (p) { groundAt(p.x, p.z, _fgr); p.y = _fgr.h + 0.09; };
Fight.move = function (p, dx, dz) {
  if (!footBlockedAt(p.x + dx, p.z)) p.x += dx;
  if (!footBlockedAt(p.x, p.z + dz)) p.z += dz;
  Fight.ground(p);
};

/* ---------- the player's punch ---------- */
Fight.punch = function () {
  const F = Foot;
  if (!F.on || F.state !== 'walk' || Talk.on || GAR.edit || App.mode !== 'play' || Police.hold || Fight.cool > 0) return;
  Fight.t = 0; Fight.cool = 0.46; Fight.hand ^= 1; Fight.done = false; Snd.whoosh();
};
Fight.update = function (dt) {
  if (Fight.freezeT != null) { Fight.t = Fight.freezeT; return; }
  Fight.cool -= dt;
  if (Fight.takenT > 0) { Fight.takenT -= dt; if (Fight.takenT <= 0) Fight.taken = 0; }
  if (Fight.t >= 0) {
    Fight.t += dt;
    if (!Fight.done && Fight.t >= FIGHT_HIT) { Fight.done = true; Fight.impact(); }
    if (Fight.t >= FIGHT_T) Fight.t = -1;
  }
};
Fight.impact = function () {
  const F = Foot, fs = Math.sin(F.yaw), fc = Math.cos(F.yaw); let best = null, bd = 9;
  for (const p of Peds.list) {
    const st = p.state; if (!(st === 'walk' || st === 'stand' || st === 'wait' || st === 'flee' || st === 'fight' || st === 'accuse' || st === 'chase' || st === 'arrest')) continue;
    const dx = p.x - F.x, dz = p.z - F.z, d = Math.hypot(dx, dz); if (d > 1.85 || d >= bd || Math.abs(p.y - F.y) > 1.4) continue;
    if (d > 0.55 && (dx * fs + dz * fc) / d < 0.6) continue;
    bd = d; best = p;
  }
  if (best) Fight.hit(best, best.x - F.x, best.z - F.z);
};
Fight.hit = function (p, dx, dz) {
  const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  Snd.punch(1); Cam.shake = Math.max(Cam.shake, 0.5); sparks(p.x - dx * 0.2, p.y + 1.4, p.z - dz * 0.2, 6, 2.2);
  if (p.cop) { Police.copHit(p, dx, dz); return; }
  const P = Talk.persona(p), M = FMOOD[P.mood] || FMOOD.friendly;
  if (p.reg) Rel.hurt(p.reg.id, p.hp == null ? 15 : 5, 'you hit them', 900);
  if (p.hp == null) p.hp = M[1];
  p.hp--; p.stun = 0.5; Fight.move(p, dx * 0.5, dz * 0.5); p.yaw = Math.atan2(-dx, -dz);
  if (p.hp <= 0) { Fight.ko(p, dx, dz); return; }
  if (p.state === 'fight') return;
  if (p.state === 'accuse') { if (!p.called) p.callT += 0.9; return; }
  /* first blood: decide how they take it */
  p.own = true; p.pn = 0; p.phone = false;
  if (Math.random() < M[0]) { Fight.say(p, F_FIGHT_SAY[(Math.random() * F_FIGHT_SAY.length) | 0]); p.state = 'fight'; p.fcool = 0.55 + Math.random() * 0.35; p.pdone = true; }
  else { Fight.say(p, P.mood === 'kid' ? F_KID_SAY[(Math.random() * F_KID_SAY.length) | 0] : F_CALL_SAY[(Math.random() * F_CALL_SAY.length) | 0]); Fight.accuse(p); }
};
Fight.accuse = function (p) { p.own = true; p.state = 'accuse'; p.callT = 2.5 + Math.random() * 0.8; p.backT = 0.9; p.called = false; p.pn = 0; p.stun = Math.max(p.stun || 0, 0.35); };
Fight.ko = function (p, dx, dz) {
  const wasAccusing = p.state === 'accuse' || p.called; if (p.reg) Rel.hurt(p.reg.id, 10, 'knocked out', 1500);
  p.state = 'down'; p.t = 0; p.air = true; p.vx = dx * 2.6; p.vz = dz * 2.6; p.vy = 2.5; p.spin = (Math.random() < 0.5 ? -1 : 1) * 5; p.tilt = 0; p.crossing = false; p.onRoad = false;
  p.own = false; p.phone = false; p.pn = 0; p.hp = null; p.report = wasAccusing || Math.random() < 0.45;
  if (p.called) p.keep = true; Snd.crash(6); Cam.shake = Math.max(Cam.shake, 0.9); UI.toast('Knocked out', 'good');
};
/* when a knocked-out pedestrian gets up they may decide to call the police after all (called from updatePeds) */
Fight.afterRise = function (p) {
  if (p.cop) { p.report = false; p.state = 'chase'; p.own = true; p.stun = 0.35; p.hp = null; return true; }
  if (p.report) { p.report = false; Fight.accuse(p); const P = Talk.persona(p); Fight.say(p, F_CALL_SAY[(Math.random() * F_CALL_SAY.length) | 0]); return true; }
  return false;
};

/* ---------- a pedestrian's turn (called from updatePeds for fight / accuse / chase / arrest) ---------- */
Fight.pedUpdate = function (p, dt) {
  if (p.state === 'fight') Fight.pedFight(p, dt); else if (p.state === 'accuse') Fight.pedAccuse(p, dt); else Police.pedCop(p, dt);
};
Fight.pedFight = function (p, dt) {
  const F = Foot;
  if (!F.on || F.state === 'down' || F.state === 'rise') { Fight.calm(p); return; }
  const dx = F.x - p.x, dz = F.z - p.z, d = Math.hypot(dx, dz);
  if (d > 18) { Fight.calm(p); return; }
  if (p.stun > 0) { p.stun -= dt; p.v += (0 - p.v) * Math.min(1, dt * 8); return; }
  p.yaw += angDiff(p.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 9);
  let vt = 0;
  if (p.pn > 0) vt = 0;
  else if (d > 1.2) vt = d > 6 ? 4.2 : 3.0;
  else { p.fcool -= dt; if (p.fcool <= 0) { p.pn = 0.001; p.hand ^= 1; p.pdone = false; p.fcool = 0.95 + Math.random() * 0.7; Snd.whoosh(); } }
  p.v += (vt - p.v) * Math.min(1, dt * 7);
  if (p.v > 0.05) Fight.move(p, Math.sin(p.yaw) * p.v * dt, Math.cos(p.yaw) * p.v * dt); else Fight.ground(p);
  if (p.pn > 0) {
    p.pn += dt / 0.5;
    if (!p.pdone && p.pn >= 0.4) { p.pdone = true; if (d < 1.75) Fight.hitPlayer(p, dx / (d || 1), dz / (d || 1)); }
    if (p.pn >= 1) p.pn = 0;
  }
};
Fight.pedAccuse = function (p, dt) {
  const F = Foot, tx = F.on ? F.x : car.x, tz = F.on ? F.z : car.z, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  p.yaw += angDiff(p.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 8);
  if (p.stun > 0) { p.stun -= dt; p.v += (0 - p.v) * Math.min(1, dt * 8); return; }
  let vt = 0;
  if (p.backT > 0 && d < 4) { p.backT -= dt; Fight.move(p, -Math.sin(p.yaw) * 1.7 * dt, -Math.cos(p.yaw) * 1.7 * dt); vt = 0.9; } else Fight.ground(p);
  p.v += (vt - p.v) * Math.min(1, dt * 6);
  if (!p.called) { p.callT -= dt; if (p.callT <= 0) { p.called = true; p.keep = true; Police.dispatch(p); } }
  else if (!Police.on || Police.victim !== p) { Fight.calm(p); }
};

/* a punch lands on you */
Fight.hitPlayer = function (p, ux, uz) {
  const F = Foot; if (F.state !== 'walk') return;
  Snd.punch(0.9); Cam.shake = Math.max(Cam.shake, 1.0); App.dmg = Math.min(1, App.dmg + 0.4);
  F.vx += ux * 3.4; F.vz += uz * 3.4; Fight.taken++; Fight.takenT = 7;
  if (Fight.taken >= 3) { Fight.taken = 0; Fight.t = -1; F.knock({ vx: ux * 3, vz: uz * 3 }, 'Knocked out'); }
  else UI.toast('Ouch! ' + (3 - Fight.taken) + ' more and you are down', 'bad');
};

/* ---------- first-person fist (drawn in camera space; the avatar's own arm is used in third person) ---------- */
Fight.buildView = function () {
  const a = footApp(), mk = (col) => { const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.82, metalness: 0 }); m.depthTest = false; return m; };
  const skin = mk(a.skin), sleeve = mk(a.shirt), g = new THREE.Group(), arm = new THREE.Group();
  const fist = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.11, 0.15), skin), thumb = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.09), skin), fore = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8), sleeve);
  thumb.position.set(-0.05, 0.065, 0.02); fore.position.set(0, -0.005, 0.47);
  arm.add(fist, thumb, fore); g.add(arm); g.visible = false; for (const m of [fist, thumb, fore]) { m.renderOrder = 60; m.castShadow = false; m.frustumCulled = false; }
  scene.add(g); Fight.view = { g, arm, skin, sleeve, k: 0 };
};
const _fv1 = new THREE.Vector3(), _fv2 = new THREE.Vector3(), _fvq = new THREE.Quaternion(), _fvz = new THREE.Vector3(0, 0, 1);
const _ease = (x) => x * x * (3 - 2 * x);
Fight.viewUpdate = function () {
  const on = Foot.on && !Foot.tp && Fight.t >= 0 && App.mode === 'play';
  if (!on) { if (Fight.view && Fight.view.g.visible) Fight.view.g.visible = false; return; }
  if (!Fight.view) Fight.buildView(); const V = Fight.view; V.g.visible = true;
  const a = footApp(); V.skin.color.copy(a.skin); V.sleeve.color.copy(a.shirt);
  const u = Fight.t / FIGHT_T, sx = Fight.hand ? 1 : -1;
  /* rest -> guard -> strike -> hold -> back */
  const rest = [sx * 0.3, -0.42, -0.34], guard = [sx * 0.17, -0.22, -0.44], strike = [sx * 0.02, -0.07, -1.05]; let from, to, k;
  if (u < 0.2) { from = rest; to = guard; k = _ease(u / 0.2); }
  else if (u < 0.4) { from = guard; to = strike; k = _ease((u - 0.2) / 0.2); }
  else if (u < 0.55) { from = strike; to = strike; k = 0; }
  else { from = strike; to = rest; k = _ease((u - 0.55) / 0.45); }
  _fv1.set(lerp(from[0], to[0], k), lerp(from[1], to[1], k), lerp(from[2], to[2], k));
  V.arm.position.copy(_fv1);
  _fv2.set(sx * 0.42, -0.62, 0.35).sub(_fv1).normalize(); V.arm.quaternion.setFromUnitVectors(_fvz, _fv2);
  V.g.position.copy(camera.position); V.g.quaternion.copy(camera.quaternion);
};
