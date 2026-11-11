/* ================= FLIGHT & HARBOUR MISSIONS =================
   Two mission boards: the Flight Office on the airfield apron and the Harbour Master at the marina. Walk up, press E, pick a job, then climb
   into a plane (or take a boat out) and the run begins. Four kinds of job:
     hoops   fly a plane through a string of glowing rings (some start on the runway, some in the air)
     dog     shoot down enemy drones with the plane's guns; the tougher ones shoot back
     buoys   race a boat through pairs of buoys
     chase   run down a fleeing smuggler boat and stay on his tail
   Runs use their own state (VM.m) and their own save record (save.vm), and never overlap the car missions (Mi). Kind-specific code lives in
   08_vmb_plane.js (rings, guns, drones) and 08_vmc_boat.js (gates, chase). Everything here is metres and seconds. */
const VMK = {
  hoops: { name: 'Hoop Course', ico: '⭕', col: '#ffb02e', veh: 'plane' },
  dog: { name: 'Dogfight', ico: '🎯', col: '#ff4d5e', veh: 'plane' },
  buoys: { name: 'Buoy Race', ico: '🚩', col: '#33d4ff', veh: 'boat' },
  chase: { name: 'Smuggler Chase', ico: '🚨', col: '#c07bff', veh: 'boat' }
};
const VMD = [
  { id: 'v_ring1', kind: 'hoops', title: 'Runway Rings', diff: 1, reward: 700, rep: 12, R: 26, slack: 1.3, air: false, course: 'oval', desc: 'Take off, then thread ten big rings in a loop around the airfield. The clock starts at the first ring.' },
  { id: 'v_ring2', kind: 'hoops', title: 'Figure Eight', diff: 2, reward: 1500, rep: 20, R: 21, slack: 1.15, air: true, course: 'eight', desc: 'Fourteen rings in a lazy figure eight, crossing over yourself. You start in the air, lined up on ring one.' },
  { id: 'v_ring3', kind: 'hoops', title: 'Ace Gauntlet', diff: 3, reward: 3000, rep: 34, R: 17, slack: 1.05, air: true, course: 'gauntlet', desc: 'Eighteen tight rings climbing and diving round a looping valley run. Pure stick work.' },
  { id: 'v_dog1', kind: 'dog', title: 'Drone Swat', diff: 1, reward: 1000, rep: 16, limit: 200, drones: ['scout', 'scout', 'scout'], desc: 'Three slow scout drones are buzzing the airfield. Shoot them all down. They do not shoot back.' },
  { id: 'v_dog2', kind: 'dog', title: 'Hunter Pair', diff: 2, reward: 2200, rep: 26, limit: 230, drones: ['striker', 'striker', 'scout', 'scout'], desc: 'Four drones, two of them armed. They will turn on you, so keep moving and keep shooting.' },
  { id: 'v_dog3', kind: 'dog', title: 'Ace Duel', diff: 3, reward: 3800, rep: 40, limit: 240, drones: ['ace', 'striker', 'striker'], desc: 'An ace drone and two armed escorts. They fly dirty and hit hard. Do not sit on anyone\'s tail.' },
  { id: 'v_buoy1', kind: 'buoys', title: 'Buoy Sprint', diff: 1, reward: 700, rep: 12, slack: 1.5, course: 'sprint', desc: 'Seven gates out round the bay and back. The clock starts at the first gate.' },
  { id: 'v_buoy2', kind: 'buoys', title: 'Harbour Slalom', diff: 2, reward: 1400, rep: 20, slack: 1.4, course: 'slalom', desc: 'A tight zigzag of narrow gates out past the breakwater and home again. Small boats win here.' },
  { id: 'v_buoy3', kind: 'buoys', title: 'Coast Run', diff: 3, reward: 2800, rep: 34, slack: 1.3, course: 'coast', desc: 'A long fast lap of the coast: fourteen gates, open water, big sweeping turns.' },
  { id: 'v_chase1', kind: 'chase', title: 'Smuggler Chase', diff: 2, reward: 2000, rep: 24, limit: 150, pace: 0.86, need: 14, desc: 'A smuggler is making a run for the open sea. Get alongside him and stay close until he gives up.' },
  { id: 'v_chase2', kind: 'chase', title: 'Night Runner', diff: 3, reward: 3400, rep: 38, limit: 160, pace: 0.92, need: 18, desc: 'A faster, nastier smuggler who weaves and doubles back. Stay on his stern and keep your nerve.' }
];
const VMBY = {}; for (const d of VMD) VMBY[d.id] = d;
const VM = { m: null, armed: null, boards: [], near: null, group: null, pick: null, loan: false, mouse: false, hitT: 0, H: {}, inited: false };
const _vmP = { x: 0, z: 0 }, _vmG = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false };
const VMDIFF = ['', 'Easy', 'Medium', 'Hard'];

/* ---------- boards ---------- */
function vmSignTex(title, sub, col, ico) {
  const c = mkCanvas(640, 220), g = c.getContext('2d'); g.fillStyle = '#0b1118'; g.fillRect(0, 0, 640, 220); g.fillStyle = col; g.fillRect(0, 0, 18, 220); g.fillRect(0, 0, 640, 10);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(18, 10, 622, 210); g.textBaseline = 'middle'; g.fillStyle = '#fff'; let fs = 74; g.font = '700 ' + fs + 'px Rajdhani, Arial, sans-serif'; while (fs > 34 && g.measureText(title.toUpperCase()).width > 480) { fs -= 4; g.font = '700 ' + fs + 'px Rajdhani, Arial, sans-serif'; }
  g.fillText(title.toUpperCase(), 52, 82); g.fillStyle = col; g.font = '600 38px Rajdhani, Arial, sans-serif'; g.fillText(sub, 54, 160);
  g.font = '92px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.fillText(ico, 566, 112);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
VM.makeBoard = function (id, veh, title, sub, col, ico, x, z, yaw) {
  groundAt(x, z, _vmG); const y = _vmG.h, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw;
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a323c, roughness: 0.6, metalness: 0.4 });
  for (const sx of [-1.9, 1.9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.9, 8), metal); p.position.set(sx, 1.95, 0); p.castShadow = true; g.add(p); }
  const tex = vmSignTex(title, sub, col, ico), sm = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.58), sm); sign.position.set(0, 3.15, 0.09); g.add(sign);
  const sign2 = new THREE.Mesh(sign.geometry, sm); sign2.position.set(0, 3.15, -0.09); sign2.rotation.y = Math.PI; g.add(sign2);
  const back = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.74, 0.14), metal); back.position.set(0, 3.15, 0); g.add(back);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.16, 20), new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.8 })); base.position.y = 0.08; g.add(base);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.7, 3.2, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).convertSRGBToLinear().multiplyScalar(2.2), side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  const beam = makeBeam(col, 1.9, 150); g.add(beam); const spr = iconSprite(ico, col); spr.position.y = 11; g.add(spr);
  VM.group.add(g); const B = { id, veh, title, sub, col, x, z, y, g, beam, spr, ring }; VM.boards.push(B); return B;
};
VM.init = function () {
  if (VM.inited) return; VM.inited = true; VM.group = new THREE.Group(); scene.add(VM.group);
  if (Air.s && Fly.inited) { Air.toWorld(-70, 166, _vmP); VM.makeBoard('air', 'plane', 'Flight Office', 'Hoops & dogfights', '#ffb02e', '✈️', _vmP.x, _vmP.z, Math.PI); }
  if (Dock.s && Boat.inited) { Dock.toWorld(-16, -6, _vmP); VM.makeBoard('sea', 'boat', 'Harbour Master', 'Races & chases', '#33d4ff', '⚓', _vmP.x, _vmP.z, Math.atan2(-Dock.s.Sx, -Dock.s.Sz)); }
};
VM.visual = function (dt) {
  if (!VM.inited) return; const t = App.time;
  for (const B of VM.boards) {
    const d = Math.hypot(B.x - Pl.x, B.z - Pl.z); B.g.visible = d < 900 && !VM.m && !Mi;
    if (!B.g.visible) continue;
    B.beam.material.opacity = lerp(0.03, 0.8, sstep(15, 300, d)); const k = clamp(d / 55, 5, 28); B.spr.scale.setScalar(k); B.spr.position.y = 9 + k * 0.35; B.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
  }
  const H = VM.m && VM.H[VM.m.kind]; if (H && H.visual) H.visual(VM.m, dt);
};
VM.scan = function () {
  VM.near = null; if (!VM.inited || !Foot.on || Talk.on || VM.m) return;
  for (const B of VM.boards) if (Math.hypot(B.x - Foot.x, B.z - Foot.z) < 4.6) { VM.near = B; break; }
};

/* ---------- picker ---------- */
VM.defsFor = function (B) { return VMD.filter((d) => VMK[d.kind].veh === B.veh); };
VM.open = function () {
  const B = VM.near; if (!B || App.mode !== 'play' || VM.m) return; VM.pick = B; UI.setMode('vm'); VM.paint(); Snd.beep(620, 0.06);
};
VM.close = function () { if (App.mode !== 'vm') return; VM.pick = null; UI.setMode('play'); };
VM.key = function (code) { if (code === 'Escape' || code === 'KeyP' || code === 'KeyE' || code === 'Enter') VM.close(); };
VM.reqText = function (d) {
  if (d.kind === 'hoops') return d.air ? 'Any aircraft · you start in the air' : 'Any aircraft · take off from the runway';
  if (d.kind === 'dog') return 'Any aircraft · fire with click, Enter or G';
  if (d.kind === 'buoys') return 'Any boat · borrow the Tern if you own none';
  return 'Any boat · faster boats finish sooner';
};
VM.paint = function () {
  const B = VM.pick; if (!B) return; const defs = VM.defsFor(B), K = B.col; E.vmp.style.setProperty('--sa', K);
  E.vmTitle.textContent = B.title; E.vmSub.textContent = B.sub; E.vmCash.textContent = money(save.money);
  let n = 0, st = 0; for (const d of defs) { const r = save.vm.done[d.id]; if (r) { n++; st += r.stars; } }
  let h = '<div class="vmsum">' + n + ' of ' + defs.length + ' cleared · ' + st + ' of ' + defs.length * 3 + ' stars</div>';
  if (VM.armed) h += '<div class="vmarm">Accepted: <b>' + esc(VM.armed.title) + '</b> · ' + (VMK[VM.armed.kind].veh === 'plane' ? 'climb into a plane to begin' : 'take a boat out to begin') + ' <button class="btn sm" type="button" data-act="cancel">Cancel</button></div>';
  h += '<div class="vmgrid">';
  for (const d of defs) {
    const k = VMK[d.kind], r = save.vm.done[d.id], armed = VM.armed === d;
    h += '<div class="vmc' + (armed ? ' on' : '') + '" style="--mc:' + k.col + '"><div class="ty">' + k.ico + ' ' + k.name + ' · ' + VMDIFF[d.diff] + '</div><h3>' + esc(d.title) + '</h3><p>' + esc(d.desc) + '</p><div class="rq">' + esc(VM.reqText(d)) + '</div>' +
      '<div class="meta"><span class="rw">' + money(d.reward) + '</span><span>' + (r && r.best != null ? 'Best ' + fmtT(r.best) : 'Not cleared') + '</span><span class="st">' + (r ? '★'.repeat(r.stars) + '<s>' + '★'.repeat(3 - r.stars) + '</s>' : '<s>★★★</s>') + '</span></div>' +
      '<button class="btn sm' + (armed ? '' : ' primary') + '" type="button" data-act="' + (armed ? 'cancel' : 'arm') + '" data-id="' + d.id + '">' + (armed ? 'Cancel' : 'Accept') + '</button></div>';
  }
  h += '</div><div class="vmnote">First clear pays in full · repeat clears pay 60% · stars: finish with plenty of time to spare</div>';
  E.vmList.innerHTML = h;
};
VM.initUI = function () {
  E.vmp.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || !E.vmp.contains(b)) { if (e.target === E.vmp) VM.close(); return; }
    const a = b.dataset.act; if (a === 'arm') VM.arm(VMBY[b.dataset.id]); else if (a === 'cancel') { VM.armed = null; UI.toast('Mission cancelled', 'info'); VM.paint(); } else if (a === 'close') VM.close();
  });
  const gl = E.gl;
  gl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0 && VM.m && VM.m.kind === 'dog' && Fly.on) VM.mouse = true; });
  window.addEventListener('pointerup', () => { VM.mouse = false; }); window.addEventListener('blur', () => { VM.mouse = false; });
};
VM.arm = function (d) {
  if (!d) return; VM.armed = d; VM.close(); Snd.beep(880, 0.08);
  UI.banner('MISSION ACCEPTED', d.title);
  UI.toast(VMK[d.kind].veh === 'plane' ? 'Walk to a plane and press F to take off on the run' : 'Walk to a boat and press F to begin the run', 'info');
};

/* ---------- starting, ending ---------- */
VM.onBoard = function (veh) {
  const d = VM.armed; if (!d || VMK[d.kind].veh !== veh || VM.m || Mi) return;
  if (veh === 'plane' && Fly.p && (Fly.p.spec.heli || Fly.p.spec.blimp)) { UI.toast('Flight Office runs need a fixed-wing plane', 'bad'); return; }
  VM.start(d);
};
VM.start = function (d) {
  const K = VMK[d.kind], M = VM.m = { def: d, kind: d.kind, veh: K.veh, phase: 'wait', t: 0, left: 0, limit: d.limit || 0, hull: 100, stars: 0, born: App.time };
  VM.armed = null; VM.hitT = 0; E.mp._h = '';
  try { VM.H[d.kind].start(M); } catch (err) { console.error(err); VM.m = null; UI.toast('That run could not start', 'bad'); return; }
  document.body.classList.toggle('dogfight', d.kind === 'dog');
  UI.banner(K.name.toUpperCase(), d.title); Snd.beep(720, 0.08);
};
VM.cleanup = function (M) {
  const H = VM.H[M.kind]; try { if (H && H.end) H.end(M); } catch (err) { console.error(err); }
  document.body.classList.remove('dogfight'); E.mp._h = '';
};
VM.stars = function (M) {
  const d = M.def;
  if (M.kind === 'dog') { const f = M.limit > 0 ? M.left / M.limit : 0; return 1 + (M.hull >= 50 ? 1 : 0) + (f >= 0.3 ? 1 : 0); }
  const f = M.limit > 0 ? M.left / M.limit : 0; return f >= (d.s3 || 0.3) ? 3 : f >= (d.s2 || 0.12) ? 2 : 1;
};
VM.finish = function (ok, title, lines) {
  const M = VM.m; if (!M || M.phase === 'done') return; M.phase = 'done'; const D = M.def; let reward = 0, stars = 0; lines = lines || [];
  if (ok) {
    stars = VM.stars(M); const rec = save.vm.done[D.id] || { stars: 0, best: null, n: 0 }; reward = Math.round(D.reward * (0.7 + 0.15 * stars) / 10) * 10;
    if (rec.n > 0) { reward = Math.round(reward * 0.6 / 10) * 10; lines.push('Repeat run pays 60%'); }
    const rp = Rel.perk('reward'); if (rp > 0) { const ex = Math.round(reward * rp / 5) * 5; if (ex > 0) { reward += ex; lines.push('Inside tips from friends +' + money(ex)); } }
    save.money += reward; save.rep += D.rep + stars * 6; rec.stars = Math.max(rec.stars, stars); rec.n++; if (M.t > 0 && (rec.best == null || M.t < rec.best)) rec.best = M.t;
    save.vm.done[D.id] = rec; writeSave(); Snd.win();
  } else Snd.fail();
  UI.result(ok, title, lines, reward, stars); VM.cleanup(M); VM.m = null;
};
VM.fail = function (title, lines) { VM.finish(false, title, lines || []); };
VM.abort = function (msg) {
  const M = VM.m; if (!M) return; VM.cleanup(M); VM.m = null; if (msg) UI.toast(msg, 'bad');
};
/* the pause menu's "abandon run" button and the dev tab's skip */
VM.dev = function () { const M = VM.m; if (!M || M.phase === 'done') return; if (M.limit > 0 && M.left <= 0) M.left = M.limit * 0.5; M.t = M.t || 5; VM.finish(true, 'RUN COMPLETE', ['Dev shortcut']); };

VM.update = function (dt) {
  VM.scan(); const M = VM.m; if (!M || M.phase === 'done' || App.mode !== 'play') return;
  if ((M.veh === 'plane' && (!Fly.on || !Fly.p)) || (M.veh === 'boat' && (!Boat.on || !Boat.p))) { VM.abort('Run abandoned'); return; }
  VM.hitT = Math.max(0, VM.hitT - dt);
  VM.H[M.kind].update(M, dt); if (VM.m !== M || M.phase === 'done') return;
  if (M.phase === 'run' && M.limit > 0) { M.t += dt; M.left = M.limit - M.t; if (M.left <= 0) { M.left = 0; VM.H[M.kind].timeUp(M); } }
};

/* ---------- HUD panel (shares the car-mission panel's element) ---------- */
VM.panel = function (mp) {
  const M = VM.m, D = M.def, K = VMK[D.kind]; mp.style.setProperty('--mc', K.col); mp.classList.add('vm');
  const row = (a, b, cls) => '<div class="row"><span>' + a + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + b + '</b></div>';
  let h = '<div class="mt"><span>' + K.ico + '</span>' + esc(K.name) + '</div><div class="mn">' + esc(D.title) + '</div>';
  if (M.phase === 'wait') h += '<div class="time">READY</div>'; else h += '<div class="time' + (M.limit > 0 && M.left < 10 ? ' low' : '') + '">' + (M.limit > 0 ? fmtT(M.left) : fmtT(M.t)) + '</div>';
  h += VM.H[M.kind].panel(M, row);
  if (mp._h !== h) { mp._h = h; mp.innerHTML = h; } mp.hidden = false;
};

/* ---------- screen overlay, mini-map and map ---------- */
VM.overlay = function (g, w, h) {
  const M = VM.m; if (!M || M.phase === 'done') return; const H = VM.H[M.kind]; if (H.overlay) H.overlay(M, g, w, h);
  if (VM.hitT > 0 && M.kind === 'dog') { g.save(); g.strokeStyle = 'rgba(255,255,255,' + clamp(VM.hitT * 4, 0, 1) + ')'; g.lineWidth = 3; const cx = w / 2, cy = h / 2; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + a * 8, cy + b * 8); g.lineTo(cx + a * 18, cy + b * 18); g.stroke(); } g.restore(); }
};
/* a marker for something in the world: diamond when on screen, arrow at the screen edge when not */
const _vmv = new THREE.Vector3();
VM.marker = function (g, w, h, x, y, z, col, label) {
  _vmv.set(x, y, z).project(camera); const behind = _vmv.z > 1; let sx = (_vmv.x * 0.5 + 0.5) * w, sy = (-_vmv.y * 0.5 + 0.5) * h; if (behind) { sx = w - sx; sy = h - sy; }
  const m = 46, mx = w / 2, my = h / 2; const off = behind || sx < m || sx > w - m || sy < m || sy > h - m; let ang = 0;
  if (off) { const dx = sx - mx, dy = sy - my, k = Math.min((mx - m) / Math.abs(dx || 1e-4), (my - m - 40) / Math.abs(dy || 1e-4)); ang = Math.atan2(dy, dx); sx = mx + dx * k; sy = my + dy * k; if (behind) sx = clamp(sx, m, w - m); }
  g.save(); g.translate(sx, sy); g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 3;
  if (off) { g.rotate(ang); g.beginPath(); g.moveTo(16, 0); g.lineTo(-9, -11); g.lineTo(-3, 0); g.lineTo(-9, 11); g.closePath(); g.stroke(); g.fill(); g.rotate(-ang); }
  else { g.beginPath(); g.moveTo(0, 14); g.lineTo(11, 0); g.lineTo(0, -14); g.lineTo(-11, 0); g.closePath(); g.stroke(); g.fill(); }
  if (label) { g.font = '700 17px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 4; const ty = off ? 30 : 32; g.strokeText(label, 0, ty); g.fillText(label, 0, ty); }
  g.restore();
};
VM.dist = function (d) { return d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1) + ' km'; };
VM.mini = function (icon) {
  for (const B of VM.boards) icon(B.x, B.z, B.col, 7, false);
  const M = VM.m; if (M && VM.H[M.kind].mini) VM.H[M.kind].mini(M, icon);
};
VM.full = function (g, k) {
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const B of VM.boards) {
    const s = FM.toScreen(B.x, B.z); g.fillStyle = B.col; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], 9 * k, 0, TAU); g.fill(); g.stroke();
    g.font = Math.round(12 * k) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.fillStyle = '#06090e'; g.fillText(B.veh === 'plane' ? '✈' : '⚓', s[0], s[1] + 0.5 * k);
  }
  const M = VM.m; if (M && VM.H[M.kind].full) VM.H[M.kind].full(M, g, k);
  g.restore();
};

/* ---------- aircraft helpers shared by the plane files ---------- */
const _vmX = new THREE.Vector3(), _vmY = new THREE.Vector3(), _vmZ = new THREE.Vector3(), _vmMx = new THREE.Matrix4();
/* put an aircraft in the air at (x,y,z) pointing along (dx,dy,dz) at the given speed, with the throttle set for level cruise */
VM.launch = function (P, x, y, z, dx, dy, dz, speed) {
  const S = P.spec; _vmZ.set(dx, dy, dz).normalize(); _vmX.set(0, 1, 0).cross(_vmZ); if (_vmX.lengthSq() < 1e-4) _vmX.set(1, 0, 0); _vmX.normalize(); _vmY.copy(_vmZ).cross(_vmX);
  _vmMx.makeBasis(_vmX, _vmY, _vmZ); P.q.setFromRotationMatrix(_vmMx);
  P.x = x; P.y = y; P.z = z; P.vx = _vmZ.x * speed; P.vy = _vmZ.y * speed; P.vz = _vmZ.z * speed; P.speed = speed; P.gnd = false; P.gt = 0; P.airT = 5; P.land = null; P.st = 'flying';
  P.ip = P.ir = P.iy = 0; P.wp = P.wy = P.wr = 0; P.rh = 0; P.cN = 9; P.agl = y - S.cgY - Air.groundY(x, z); P.stalled = false;
  const V = speed, aD = S.kd * V * V * (1 + 0.8 * (V / S.Vmax) * (V / S.Vmax)) + 0.012 * S.Vs * S.Vs * 96 / Math.max(V * V, 0.36 * S.Vs * S.Vs);
  const lim = S.jet ? Math.max(0.05, 1 - Math.pow(V / S.Vprop, 2)) : Math.max(0.05, 1 - V / S.Vprop); P.thr = clamp(aD / (S.thrust * lim), 0.2, 1); P.rpm = S.idle + (1 - S.idle) * P.thr;
  P.holder.visible = true; Fly.snapCam = true; Fly.place(P); Fly.focus.x = x; Fly.focus.y = y; Fly.focus.z = z;
};
VM.cruise = function (S) { return Math.max(S.Vs * 1.6, S.Vmax * 0.5); };
