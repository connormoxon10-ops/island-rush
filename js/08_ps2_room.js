/* ================= BUSTED, part 2: booking, the interrogation room and the paperwork =================
   After the squad car pulls away (08_ps1_street.js) the game switches to its own first-person mode ('bust') and reuses the courtroom's scene
   machinery (CR.build / CR.render and the articulated people): first a booking room with a height chart and a mugshot (front and profile, with
   flashes), then Interview Room 2. You sit cuffed at a steel table; a detective questions you about what you did. Every question has three
   answers and a clock. Your answers move two meters (your composure, the detective's patience) and a few hidden tallies: honesty, cooperation,
   hostility. They decide the outcome: a plea deal (fine -40 %), plain charges, a public defender, a signed confession, or a night in a cell
   with obstruction added. Skip jumps straight to the paperwork. */

/* ---------- booking room: grey wall, height chart, a line on the floor ---------- */
CR.builders.booking = function () {
  const mats = CR.mats, sc = crStage(0.012);
  sc.add(new THREE.HemisphereLight(0xe8eef4, 0x3a3d44, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(1.2, 3, 5); sc.add(key);
  const fl = CR.flashL = new THREE.PointLight(0xffffff, 0, 18, 1.0); fl.position.set(0.2, 1.7, 2.4); sc.add(fl);
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false), HX = 3.0, HZ = 3.7, HY = 3.1, BLK = lc(0x0d0e10), WH = lc(0xeceae4);
  S.quadA([-HX, 0, -HZ, 0, 0], [HX, 0, -HZ, 0, 0], [HX, 0, HZ, 0, 0], [-HX, 0, HZ, 0, 0], 0, 1, 0, lc(0x4e5258).r, lc(0x4e5258).g, lc(0x4e5258).b);
  crWalls(S, P, { hx: HX, hz: HZ, hy: HY, up: lc(0xa5aeab), low: lc(0x7f8a87), wh: 1.0, rail: lc(0x3a4249), ceil: lc(0x303236) });
  /* the chart: a white board with a black mark every inch from 4'0" to 7'0", feet labelled */
  crBox(S, -1.1, 0.0, -HZ + 0.005, 1.1, 2.36, -HZ + 0.03, WH, 1);
  for (let i = 48; i <= 92; i++) { const y = i * 0.0254, w = i % 12 === 0 ? 0.9 : i % 6 === 0 ? 0.55 : 0.28; crBox(S, -1.1, y - 0.006, -HZ + 0.03, -1.1 + w, y + 0.006, -HZ + 0.036, BLK, 1); }
  for (const f of [4, 5, 6, 7]) if (f * 12 * 0.0254 < 2.3) crSign(sc, crTex(f + "'0\"", 128, 48, { size: 34, fg: '#0d0e10', font: 'Arial, sans-serif' }), 0.3, 0.11, -0.4, f * 12 * 0.0254 + 0.08, -HZ + 0.04);
  crBox(S, -1.12, 0, -HZ + 0.005, -1.1, 2.36, -HZ + 0.04, BLK, 1); crBox(S, 1.1, 0, -HZ + 0.005, 1.12, 2.36, -HZ + 0.04, BLK, 1);
  /* floor tape, a stool, a clip-on lamp */
  crBox(S, -0.8, 0.003, -2.95, 0.8, 0.007, -2.88, lc(0xe3b341), 0.9); crBox(S, -0.8, 0.003, -1.9, 0.8, 0.007, -1.84, lc(0xe3b341), 0.9);
  crCyl(P, 2.3, 0.3, -2.9, 0.22, 0.6, 0.22, lc(0x2b2f36), 0.3); crBox(P, -2.4, 0.0, -3.4, -1.6, 0.9, -2.7, lc(0x6f7780), 0.8); crBox(S, -2.35, 0.9, -3.35, -1.65, 0.93, -2.75, lc(0xc8c4b8), 0.8);
  crBox(S, -2.2, 0.93, -3.2, -1.9, 0.945, -2.9, lc(0x1a1b1e), 0.5);
  sc.add(S.mesh(mats.std, false, true), P.mesh(mats.pol, false, true), E.mesh(mats.emi, false, false));
  /* you, holding the placard */
  const you = CR.A.you = bsPlayer(); you.root.position.set(0, 0, -2.4); sc.add(you.root);
  const pl = new GB(0, 0, false); crObx(pl, 0, 0, 0, 0.52, 0.36, 0.015, lc(0x16181d), 0.3); crObx(pl, 0, 0, -0.01, 0.54, 0.38, 0.01, lc(0xeeeeee), 0); you.placard = pl.mesh(mats.std, false, false); you.placard.position.set(0, 0.3, 0.44); you.tor.add(you.placard);
  you.plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), new THREE.MeshBasicMaterial({ map: bsPlateTex() })); you.plate.position.set(0, 0.3, 0.453); you.tor.add(you.plate);
  CR.A.pose = bsActor(you, 0, -2.4, 0); CR.A.pose.flat = true; CR.A.pose.pose = 'plate';
  return { eye: new THREE.Vector3(0, 1.3, 2.3), expo: 1.18, focus: { ahead: [0, 1.1, -2.4, 30] }, lay: {} };
};
BS_POSE.plate = [-0.35, 0.16, -1.5, -0.35, -0.16, -1.5];
function bsPlateTex() {
  const cv = mkCanvas(512, 348), g = cv.getContext('2d'), d = new Date(), ds = ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + '-' + String(d.getFullYear()).slice(-2);
  g.fillStyle = '#14161b'; g.fillRect(0, 0, 512, 348); g.fillStyle = '#f2f2ee'; g.textAlign = 'center'; g.textBaseline = 'middle'; const F = (n, w) => w + ' ' + n + 'px Rajdhani, "Arial Narrow", Arial, sans-serif';
  g.font = F(36, 700); g.fillText('ISLAND COUNTY P.D.', 256, 44); g.fillRect(40, 76, 432, 3); g.font = F(104, 700); g.fillText('#' + (40000 + ((Math.random() * 9000) | 0)), 256, 156);
  g.font = F(40, 600); g.fillText(ds, 256, 236); g.font = F(32, 600); g.fillStyle = '#ffb02e'; g.fillText(String(Bust.ch[0] || 'EVADING POLICE').toUpperCase().slice(0, 28), 256, 296);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
BS_POSE.hang = [0.0, -0.05, -0.1, 0.0, 0.05, -0.1];

/* ---------- Interview Room 2 ---------- */
CR.builders.interro = function () {
  const mats = CR.mats, pal = crPal(), SK = pal.skinA, HR = pal.hairA, sc = crStage(0.006);
  sc.add(new THREE.HemisphereLight(0x7a8a99, 0x14161a, 0.5));
  const cold = new THREE.PointLight(0x9ab8dc, 0.4, 10, 1.5); cold.position.set(0, 2.5, 2.2); sc.add(cold);
  const lampG = new THREE.Group(); lampG.position.set(0, 2.85, 0.1); sc.add(lampG);
  const lamp = new THREE.PointLight(0xffc880, 2.5, 11, 1.4); lamp.position.set(0, -0.98, 0); lampG.add(lamp); CR.lamp = lamp;
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false), HX = 3.4, HZ = 4.6, HY = 2.9, STEEL = lc(0x8d949c), DARKM = lc(0x23262c), CH = lc(0x3a3d42);
  S.quadA([-HX, 0, -HZ, 0, 0], [HX, 0, -HZ, 0, 0], [HX, 0, HZ, 0, 0], [-HX, 0, HZ, 0, 0], 0, 1, 0, lc(0x4a4d52).r, lc(0x4a4d52).g, lc(0x4a4d52).b);
  crWalls(S, P, { hx: HX, hz: HZ, hy: HY, up: lc(0xb3ad96), low: lc(0x5c7567), wh: 1.25, rail: lc(0x2f3a44), ceil: lc(0x2a2c30) });
  /* the table, bolted down, with a recorder, a file and a paper cup */
  crTable(P, -1.15, -0.7, 1.15, 1.1, STEEL, DARKM, 0.76);
  crBox(S, -0.25, 0.76, -0.2, 0.15, 0.8, 0.05, lc(0x1a1b1e), 0.9); crBox(E, 0.08, 0.8, -0.16, 0.12, 0.815, -0.12, new THREE.Color(3, 0.1, 0.1), 1);
  crCyl(S, -0.75, 0.82, -0.3, 0.05, 0.1, 0.05, lc(0xf2f2ee), 0.2); crBox(S, 0.35, 0.76, 0.0, 0.8, 0.775, 0.45, lc(0xc9a55a), 0.9); crBox(S, 0.4, 0.775, 0.05, 0.78, 0.78, 0.42, lc(0xf2efe6), 0);
  /* pendant lamp (swings a little) */
  { const g = new GB(0, 0, false); crCyl(g, 0, -0.45, 0, 0.012, 0.9, 0.012, DARKM, 0); crCyl(g, 0, -0.95, 0, 0.32, 0.22, 0.32, lc(0x3a3d42), 0.3); lampG.add(g.mesh(mats.pol, false, false)); const e = new GB(0, 0, false); crCyl(e, 0, -1.07, 0, 0.12, 0.04, 0.12, new THREE.Color(3.2, 2.5, 1.5), 0); lampG.add(e.mesh(mats.emi, false, false)); }
  /* the one-way mirror on the left wall */
  crBox(P, -HX, 0.95, -2.7, -HX + 0.06, 2.5, 1.9, lc(0x1c1e22), 0.9);
  S.quadA([-HX + 0.07, 1.05, -2.6, 0, 0], [-HX + 0.07, 1.05, 1.8, 0, 0], [-HX + 0.07, 2.4, 1.8, 0, 0], [-HX + 0.07, 2.4, -2.6, 0, 0], 1, 0, 0, 0.02, 0.03, 0.045);
  E.quadA([-HX + 0.075, 1.2, -1.9, 0, 0], [-HX + 0.075, 1.2, -1.3, 0, 0], [-HX + 0.075, 2.3, -0.4, 0, 0], [-HX + 0.075, 2.3, -1.0, 0, 0], 1, 0, 0, 0.1, 0.13, 0.17);
  /* back wall: height chart, camera in the corner, sign */
  crBox(S, -1.4, 0.0, -HZ + 0.01, 1.4, 2.4, -HZ + 0.03, lc(0xe8e6de), 0.95);
  for (let i = 0; i < 9; i++) crBox(S, -1.4, 0.3 + i * 0.22, -HZ + 0.03, 1.4, 0.32 + i * 0.22, -HZ + 0.04, lc(0x1b1d22), 0);
  crBox(P, HX - 0.35, 2.5, -HZ + 0.2, HX - 0.05, 2.75, -HZ + 0.6, lc(0x1b1d22), 0.9);
  crSign(sc, crTex('INTERVIEW 2', 512, 80, { size: 52, ls: '6px', fg: '#e8e4d8', bg: '#2a3038' }), 0.9, 0.14, 0, 2.5, -HZ + 0.12);
  /* fluorescent panel (dead), vent */
  crBox(S, -0.6, HY - 0.03, -3.4, 0.6, HY, -2.6, lc(0x55575c), 0.8); crBox(P, 2.2, HY - 0.05, 2.8, 3.0, HY, 3.2, lc(0x1b1d22), 0.9);
  /* chairs */
  crBox(S, -0.3, 0, -1.9, 0.3, 0.46, -1.35, CH, 0.95); crBox(S, -0.3, 0.46, -1.95, 0.3, 1.1, -1.85, CH, 0.9);
  crBox(S, -0.3, 0, 1.2, 0.3, 0.46, 1.8, CH, 0.95); crBox(S, -0.3, 0.46, 1.75, 0.3, 1.1, 1.85, CH, 0.9);
  /* the door (hinged at the far end of the right wall) with a window onto the lit corridor */
  const doorG = new THREE.Group(); doorG.position.set(HX - 0.04, 0, -3.95); sc.add(doorG);
  { const g = new GB(0, 0, false); crBox(g, -0.03, 0, 0, 0.03, 2.1, 1.1, lc(0x6f7780), 0.9); crBox(g, -0.035, 1.45, 0.3, 0.035, 1.8, 0.8, lc(0x1a2733), 0.2); crBox(g, -0.05, 0.98, 0.9, 0.05, 1.04, 1.04, STEEL, 0.9); doorG.add(g.mesh(mats.pol, false, false)); }
  { const g = new GB(0, 0, false); crBox(g, 0, 0, 0, 0.02, 2.2, 1.2, new THREE.Color(1.7, 1.75, 1.5), 1); const m = g.mesh(mats.emi, false, false); m.position.set(HX + 0.05, 0, -3.95); sc.add(m); }
  crBox(P, HX - 0.1, 0, -4.0, HX, 2.15, -3.95, lc(0x30343a), 0.9); crBox(P, HX - 0.1, 0, -2.85, HX, 2.15, -2.8, lc(0x30343a), 0.9); crBox(P, HX - 0.1, 2.1, -4.0, HX, 2.15, -2.8, lc(0x30343a), 0.9);
  /* wall clock, right wall, hands follow the game's time */
  crCyl(P, HX - 0.04, 2.35, 0.9, 0.24, 0.04, 0.24, lc(0xf4f4f0), 0, 0, 0, Math.PI / 2);
  const hh = new THREE.Group(), mh = new THREE.Group(); hh.position.set(HX - 0.075, 2.35, 0.9); mh.position.set(HX - 0.08, 2.35, 0.9); sc.add(hh, mh);
  { const g = new GB(0, 0, false); crBox(g, -0.006, 0, -0.008, 0.006, 0.12, 0.008, lc(0x1b1b1b), 0); hh.add(g.mesh(mats.std, false, false)); const g2 = new GB(0, 0, false); crBox(g2, -0.004, 0, -0.008, 0.004, 0.18, 0.008, lc(0x1b1b1b), 0); mh.add(g2.mesh(mats.std, false, false)); }
  hh.rotation.order = mh.rotation.order = 'YXZ';
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.05, 0.05) })); led.position.set(HX - 0.3, 2.62, -HZ + 0.62); sc.add(led);
  sc.add(S.mesh(mats.std, false, true), P.mesh(mats.pol, false, true), E.mesh(mats.emi, false, false));
  /* people: the detective (arrives later, then sits) and the officer who brought you in */
  const A = CR.A, det = crPerson({ skin: SK[2], hair: HR[5], jacket: lc(0x5a4a3a), sleeve: lc(0x5a4a3a), shirt: lc(0xd8d2c0), tie: lc(0x7a2a2a), pants: lc(0x2b2a2e), hairStyle: 'short', build: 'stout' });
  A.det = bsActor(det, HX - 0.5, -3.5, -Math.PI / 2); A.det.flat = true; A.det.hid = true; A.det.sitT = 0; sc.add(det.root);
  const cop = bsOfficer(0); cop.beam.visible = false; cop.light.visible = false; A.cop = bsActor(cop, 2.75, -2.4, -2.2); A.cop.flat = true; A.cop.pose = 'cross'; sc.add(cop.root);
  A.door = doorG; A.hh = hh; A.mh = mh; A.led = led; A.lampG = lampG;
  /* your hands, cuffed, on the table */
  crHandsInit(lc(0x2a2f3a)); const chm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: 0.35, metalness: 0.6 })); CR.cam.add(chm); A.chain = chm;
  const STE = lc(0xc3c9d1); for (const h of CR.hands) { const g = new GB(0, 0, false); crCyl(g, 0, 0, 0.14, 0.072, 0.05, 0.072, STE, 0.6, Math.PI / 2, 0, 0); h.add(g.mesh(mats.pol, false, false)); }
  return { eye: new THREE.Vector3(0, 1.14, 1.5), expo: 1.05, focus: { ahead: [0, 1.18, -1.6, 50] }, lay: {} };
};
const BS_FOC = { ahead: [0, 1.18, -1.6, 52], det: [0, 1.3, -1.45, 30], cop: [2.7, 1.45, -2.4, 38], mirror: [-3.4, 1.5, -0.4, 56], table: [0, 0.78, 0.2, 60], hands: [0, 0.78, 0.9, 52], door: [3.3, 1.2, -3.4, 48], folder: [0.4, 0.78, 0.2, 48], clock: [3.4, 2.3, 0.9, 40], down: [0, 0.55, 0.7, 60] };

/* ---------- little helpers ---------- */
function* bsWait(s) { let t = 0; while (t < s) { t += Bust.dt; yield; } }
function* bsTalk(who, text, focus, speak, hold) {
  if (focus) Bust.focus = focus; Bust.speak = speak || who; Bust.say(who, text);
  const c = Bust.cap; let t = 0; const need = Math.max(1.3, text.length / 36 + 0.9) + (hold || 0); Bust.adv = false;
  while (t < need) { t += Bust.dt; if (Bust.adv) { if (c.n < c.text.length) { c.n = c.text.length; Bust.adv = false; } else break; } yield; }
  Bust.speak = '';
}
Bust.title = function (k, t) { const b = E.bTitle; E.bTk.textContent = k; E.bTt.textContent = t; b.className = ''; void b.offsetWidth; b.className = 'show'; };
Bust.flash = function () {
  const f = E.bFlash; f.className = ''; void f.offsetWidth; f.className = 'go'; if (CR.flashL) CR.flashL.intensity = 9;
  if (Snd.ok) { const t = Snd.ctx.currentTime; Snd.noiseHit(t, 0.05, 0.9, 2000, 0, Snd.sfx); Snd.tone(t, 2400, 0.04, 'square', 0.08, 6000, 0.001, Snd.sfx); Snd.noiseHit(t + 0.09, 0.07, 0.6, 700, 0, Snd.sfx); Snd.tone(t + 0.03, 180, 0.2, 'sine', 0.25, 800, 0.002, Snd.sfx); }
};
const bsClockStr = () => { const h = Math.floor(App.tod) % 24, m = Math.floor((App.tod % 1) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
Bust.meters = function () {
  const T = Bust.tally; if (!T) return;
  E.bC.style.width = clamp(T.c, 0, 100) + '%'; E.bC.className = T.c < 30 ? 'low' : ''; E.bP.style.width = clamp(T.p, 0, 100) + '%'; E.bP.className = T.p < 25 ? 'low' : T.p > 70 ? 'ok' : '';
  E.bust.classList.toggle('tense', T.c < 32);
};
Bust.fx = function (f) {
  const T = Bust.tally; if (!f) return; T.c = clamp(T.c + (f.c || 0), 0, 100); T.p = clamp(T.p + (f.p || 0), 0, 100); T.coop += f.coop || 0; T.host += f.host || 0; T.lies += f.lie || 0; Bust.meters();
};
/* one question: the detective asks, three answers, a clock. Returns the chosen option or null on silence (or -1 if you break). */
function* bsAsk(q) {
  const T = Bust.tally; yield* bsTalk(q.who || 'det', q.text, q.focus || 'det');
  E.bChoice.innerHTML = '<div class="bq">' + q.opts.map((o, i) => '<button class="bch" type="button" data-i="' + i + '"><kbd>' + (i + 1) + '</kbd><span>' + esc(o.t) + '</span>' + (o.s ? '<em>' + esc(o.s) + '</em>' : '') + '</button>').join('') + '</div><div class="btm"><i id="bTm"></i></div>';
  E.bChoice.hidden = false; Bust.pick = -1; Bust.picking = true; let tm = q.time || 12, beat = 0; const T0 = tm; Bust.speak = '';
  while (Bust.pick < 0 && tm > 0) {
    tm -= Bust.dt; T.c = Math.max(0, T.c - Bust.dt * 0.7); Bust.meters(); E.bTm.style.width = clamp(tm / T0 * 100, 0, 100) + '%'; E.bTm.className = tm < 4 ? 'low' : '';
    beat -= Bust.dt; if (T.c < 38 && beat <= 0) { beat = 0.9; Court.sfx('beat'); } else if (tm < 4 && beat <= 0) { beat = 0.5; Court.sfx('tick'); }
    if (T.c <= 0.4) { T.broke = true; break; }
    yield;
  }
  Bust.picking = false; E.bChoice.hidden = true;
  if (T.broke) return -1;
  if (Bust.pick < 0) { Bust.fx({ c: -8, p: -10, host: 0.5 }); T.noreply++; return null; }
  const o = q.opts[Bust.pick]; Bust.fx(o.fx); if (o.lawyer) T.lawyer = true; return o;
}

/* ---------- the room scenes: per frame ---------- */
Bust.sceneInit = function (kind) {
  CR.build(kind); Bust.scn = kind; Bust.focus = 'ahead'; Bust.speak = ''; Bust.look = { x: 0, y: 0, tx: 0, ty: 0 }; Bust.foc = new THREE.Vector3(); Bust.fv = 50; Bust.sat = 0;
  const f = BS_FOC.ahead; Bust.foc.set(f[0], f[1], f[2]); const cam = CR.cam; if (kind === 'interro') { cam.position.set(0, 1.14, 1.5); }
  if (kind === 'booking') { Bust.fv = 40; Bust.foc.set(0, 1.1, -2.4); CR.A.pose.yaw = 0; CR.A.pose.face = 0; }
  if (kind === 'interro') { const A = CR.A; A.det.hid = true; A.det.sit = 0; A.det.sitT = 0; A.det.x = 2.9; A.det.z = -3.5; A.door.rotation.y = 0; A.cop.pose = 'cross'; }
};
Bust.roomUpdate = function (dt) {
  const A = CR.A, cam = CR.cam, t = Bust.clock, kind = Bust.scn, sp = Bust.speak;
  if (CR.flashL) CR.flashL.intensity = Math.max(0, CR.flashL.intensity - dt * 30);
  Bust.look.x = bsEase(Bust.look.x, Bust.look.tx, 5, dt); Bust.look.y = bsEase(Bust.look.y, Bust.look.ty, 5, dt);
  if (kind === 'booking') {
    bsStep(A.pose, dt);
    const r = A.you; r.root.rotation.y = A.pose.yaw;
    const k = Bust.fv; cam.position.set(Math.sin(t * 0.7) * 0.012, 1.34 + Math.cos(t * 0.5) * 0.008, 2.3); Bust.foc.set(0, 1.12, -2.4); cam.up.set(0, 1, 0); cam.lookAt(Bust.foc);
    cam.rotation.y += Bust.look.x * 0.3; cam.rotation.x += Bust.look.y * 0.3; Bust.fv = bsEase(Bust.fv, Bust.fvT || 32, 2.6, dt); bsFit(cam, Bust.fv);
    return;
  }
  const D = A.det, C = A.cop, T = Bust.tally;
  D.sit = bsEase(D.sit, D.sitT, 3.2, dt); bsStep(D, dt); bsStep(C, dt);
  /* detective: arms on the table, head on you, hands talk */
  if (!D.hid) {
    const r = D.rig, sat = D.sit > 0.7, talk = sp === 'det';
    if (sat) { const lean = (Bust.leanT || 0); r.tor.rotation.x = bsEase(r.tor.rotation.x, 0.06 + lean + (sp === 'folder' ? 0.28 : 0), 4, dt); r.armL.rotation.x = -1.08 - lean * 0.3; r.armL.rotation.z = 0.1; r.elL.rotation.x = -0.55; r.armR.rotation.x = -1.08 - (talk ? 0.35 + 0.25 * Math.sin(t * 3.1) : 0) - lean * 0.3; r.armR.rotation.z = -0.1 - (talk ? 0.2 * Math.abs(Math.sin(t * 2.3)) : 0); r.elR.rotation.x = -0.55 - (talk ? 0.3 * Math.sin(t * 2.7 + 1) : 0); }
    const hx = Math.atan2(cam.position.x - D.x, cam.position.z - D.z) - D.yaw; r.head.rotation.y = bsEase(r.head.rotation.y, clamp(angDiff(0, hx), -0.8, 0.8) * 0.8, 4, dt); r.head.rotation.x = Math.sin(t * 0.5) * 0.03 + (talk ? Math.sin(t * 4) * 0.04 : 0.02) + (sp === 'folder' ? 0.35 : 0);
  }
  /* officer by the door: arms crossed, watches you, shifts his weight */
  { const r = C.rig; const hx = Math.atan2(cam.position.x - C.x, cam.position.z - C.z) - C.yaw; r.head.rotation.y = bsEase(r.head.rotation.y, clamp(angDiff(0, hx), -0.9, 0.9) * 0.9, 3, dt); r.tor.rotation.z = Math.sin(t * 0.6) * 0.03; r.hips.position.x = Math.sin(t * 0.6) * 0.03; if (sp === 'cop1') { r.head.rotation.x = Math.sin(t * 4) * 0.04; } }
  /* lamp, clock, LED */
  A.lampG.rotation.z = Math.sin(t * 0.55) * 0.03; A.lampG.rotation.x = Math.sin(t * 0.43 + 1) * 0.025; A.led.visible = Math.sin(t * 2.2) > -0.4;
  const hr = (App.tod % 12) / 12 * TAU, mn = (App.tod % 1) * TAU; A.hh.rotation.x = 0; A.hh.rotation.z = 0; A.hh.rotation.x = -hr; A.mh.rotation.x = -mn;
  /* the door */
  A.door.rotation.y = bsEase(A.door.rotation.y, Bust.doorT || 0, 4, dt);
  /* the camera: sits behind the table, looks at whoever is speaking, a little handheld breathing */
  const fa = BS_FOC[Bust.focus] || BS_FOC.ahead; Bust.foc.x = bsEase(Bust.foc.x, fa[0], 3.2, dt); Bust.foc.y = bsEase(Bust.foc.y, fa[1], 3.2, dt); Bust.foc.z = bsEase(Bust.foc.z, fa[2], 3.2, dt); Bust.fv = bsEase(Bust.fv, fa[3], 3.5, dt);
  const sh = CR.shake = Math.max(0, (CR.shake || 0) - dt * 1.7), s2 = sh * sh;
  cam.position.set(Math.sin(t * 0.6) * 0.012 + (Math.random() - 0.5) * s2 * 0.05, 1.14 + Math.sin(t * 1.1) * 0.01 + (Math.random() - 0.5) * s2 * 0.05, 1.5); cam.up.set(0, 1, 0); cam.lookAt(Bust.foc);
  cam.rotation.y += Bust.look.x; cam.rotation.x += Bust.look.y; cam.rotation.z += (Math.random() - 0.5) * s2 * 0.03; bsFit(cam, Bust.fv);
  /* your hands on the table: cuffed, a little tremble when you are rattled */
  const tr = T ? clamp((50 - T.c) / 50, 0, 1) : 0, down = Bust.picking ? 1 : 0;
  CR.hands.forEach((h, i) => { const sx = h.userData.sx; h.position.set(sx * 0.115 + Math.sin(t * 19 + i) * 0.003 * tr, -0.385 + Math.sin(t * 1.1 + i) * 0.003, -0.6); h.rotation.set(-0.02, -sx * 0.2, sx * 0.03); });
  A.chain.position.set(0, -0.372, -0.56); A.chain.scale.set(0.2, 0.014, 0.014);
};
function bsFit(cam, fov) { const a = window.innerWidth / Math.max(1, window.innerHeight), v = Math.max(fov, 2 * Math.atan(Math.tan(20 * DEG) / Math.max(0.1, a)) / DEG); if (Math.abs(cam.aspect - a) > 1e-3 || Math.abs(cam.fov - v) > 0.01) { cam.aspect = a; cam.fov = v; cam.updateProjectionMatrix(); } }

/* ---------- start of the room part (screen is black) ---------- */
Bust.startRoom = function () {
  Bust.phase = 'booking'; UI.setMode('bust'); E.bust.className = 'screen room'; E.bSkip.hidden = false; E.bTop.hidden = true; E.bCap.hidden = true; E.bChoice.hidden = true; E.bCard.hidden = true; E.bLower.hidden = true;
  Bust.clock = 0; Bust.tally = { c: 72, p: 60, coop: 0, host: 0, lies: 0, lawyer: false, broke: false, noreply: 0 }; Bust.meters();
  Bust.sceneInit('booking'); Bust.gen = Bust.script();
};
Bust.frame = function (dt, noRender) {
  dt = Math.min(dt, 0.05); if (Bust.paused) dt = 0; Bust.clock += dt; Bust.dt = dt || 0.0001;
  if (Snd.ok) Snd.update(car, dt, true);
  if (Bust.gen) { try { if (Bust.gen.next().done) Bust.gen = null; } catch (e) { console.error(e); Bust.gen = null; Bust.verdict(); } }
  if (Bust.cap) { const c = Bust.cap; c.n = Math.min(c.text.length, c.n + dt * 62); const s = c.text.slice(0, Math.floor(c.n)); if (E.bTxt.textContent !== s) E.bTxt.textContent = s; }
  if (Bust.phase === 'closing') { Bust.closeT -= dt; if (Bust.closeT <= 0) { Bust.finish(); return; } }
  Bust.roomUpdate(dt); if (!noRender) CR.render();
};

/* ---------- the script ---------- */
Bust.script = function* () {
  const T = Bust.tally, A = () => CR.A, ch = Bust.ch, car0 = CUR.name || 'car', night = env.lampOn > 0.4;
  const list = ch.length > 1 ? ch.slice(0, -1).join(', ') + ' and ' + ch[ch.length - 1] : ch[0];
  const pl = (Wanted.log.indexOf('Assault') >= 0 && Police.victim && Police.victim.pers) ? _fn(Police.victim.pers) : (Wanted.victimName || 'The pedestrian');
  /* ----- booking ----- */
  yield* bsWait(0.5); UI.fade(false); Bust.title('Island County Police Dept.', 'Booking · ' + bsClockStr());
  yield* bsWait(1.2); Bust.fvT = 36;
  yield* bsTalk('cop2', 'Stand on the line. Face the camera. Chin up.', null, 'cop2');
  yield* bsWait(0.5); Bust.flash(); yield* bsWait(0.4);
  CR.A.pose.face = -Math.PI / 2; yield* bsTalk('cop2', 'Now turn to your left.', null, 'cop2'); yield* bsWait(0.6); Bust.flash(); yield* bsWait(0.5);
  Bust.fvT = 30;
  yield* bsTalk('cop2', 'Prints done. Phone, wallet and keys go in the bag. Detective Marlow will see you now.', null, 'cop2');
  UI.fade(true); yield* bsWait(0.75);
  /* ----- Interview Room 2 ----- */
  Bust.sceneInit('interro'); E.bTop.hidden = false; Bust.meters(); Bust.phase = 'interro'; Bust.speak = '';
  yield* bsWait(0.3); UI.fade(false); Bust.title('Interview Room 2', bsClockStr() + ' · recording');
  yield* bsWait(1.4);
  yield* bsTalk('', 'Steel table. Bolted chair. A mirror that is not a mirror.', 'mirror', ''); yield* bsWait(0.2);
  yield* bsTalk('', 'They cuff you to the ring and leave you to think about it.', 'hands', '');
  yield* bsWait(0.9); Bust.focus = 'door'; yield* bsWait(1.4);
  /* the detective comes in */
  const D = A().det, doorAng = -1.35; Bust.doorT = doorAng; if (Snd.ok) Snd.door(); yield* bsWait(0.7); D.hid = false;
  const path = [[2.6, -3.3], [1.4, -3.0], [0.5, -2.4]]; for (const p of path) { D.tx = p[0]; D.tz = p[1]; D.spd = 1.45; D.pose = 'idle'; Bust.focus = 'door'; while (D.tx != null) yield; }
  Bust.doorT = 0; if (Snd.ok) Snd.door(); D.tx = 0; D.tz = -1.45; D.spd = 1.2; while (D.tx != null) yield; D.face = 0; D.sitT = 1; Bust.focus = 'det'; yield* bsWait(1.0);
  if (Snd.ok) { const t = Snd.ctx.currentTime; Snd.noiseHit(t, 0.07, 0.7, 250, 0, Snd.sfx); Snd.tone(t, 110, 0.18, 'sine', 0.3, 600, 0.002, Snd.sfx); } CR.shake = 0.35;
  yield* bsTalk('det', 'Evening. Detective Marlow. You’ve already met Officer Reyes.', 'det');
  yield* bsTalk('cop1', 'Smooth ride, wasn’t it.', 'cop', 'cop1');
  Bust.speak = 'folder'; yield* bsWait(0.5); yield* bsTalk('det', 'Let’s see… ' + ch.length + ' charge' + (ch.length > 1 ? 's' : '') + ': ' + list + '. Busy ' + (night ? 'night' : 'day') + '.', 'folder', 'folder');
  yield* bsTalk('det', 'For the tape: this interview is recorded. You were driving a ' + car0 + '. Right?', 'det');
  Bust.leanT = 0.08;
  /* Q1: rights */
  let o = yield* bsAsk({ text: 'You understand the rights Officer Tanaka read you?', opts: [
    { t: 'I understand. I’ll talk.', s: 'cooperate', fx: { coop: 1, p: 5, c: -2 } },
    { t: 'I want a lawyer.', s: 'ends the interview', lawyer: true, fx: { c: 4, p: -4 } },
    { t: '…', s: 'say nothing', fx: { c: 6, p: -10, host: 0.6 } }] });
  if (o === -1) return yield* bsBreak();
  if (o && o.lawyer) {
    yield* bsTalk('det', 'Your right. Public defender’s on the way. Don’t go anywhere.', 'det'); yield* bsTalk('cop1', 'He won’t.', 'cop', 'cop1');
    UI.fade(true); yield* bsWait(0.8); Bust.verdict(); return;
  }
  if (o === null) yield* bsTalk('det', 'The silent type. I’ll go slower.', 'det'); else yield* bsTalk('det', 'Good. This goes easier if you stay honest.', 'det');
  /* Q2: where to */
  o = yield* bsAsk({ text: 'Where were you headed in such a hurry?', opts: [
    { t: 'Home. I wasn’t thinking.', s: 'honest', fx: { coop: 1, p: 5, c: -3 } },
    { t: 'Out for a drive. Is that a crime?', s: 'smart mouth', fx: { host: 1, p: -10, c: 3 } },
    { t: 'A friend’s place. I can give you a name.', s: 'a story', fx: { lie: 1, c: -4 } }] });
  if (o === -1) return yield* bsBreak();
  if (o === null) yield* bsTalk('det', 'Don’t make me ask twice.', 'det');
  else if (Bust.pick === 0) yield* bsTalk('det', 'At least that sounds like the truth.', 'det');
  else if (Bust.pick === 1) { yield* bsTalk('det', 'Don’t get cute with me.', 'det'); yield* bsTalk('cop1', 'He’s been like this since the stop.', 'cop', 'cop1'); }
  else yield* bsTalk('det', 'Sure you can. We’ll check.', 'det');
  /* Q3: the specific charge */
  const Q = bsCrimeQ(pl); o = yield* bsAsk(Q);
  if (o === -1) return yield* bsBreak();
  if (o === null) yield* bsTalk('det', 'Silence isn’t an answer, friend.', 'det'); else yield* bsTalk('det', o.r, 'det');
  /* Q4: the evidence, or the last word */
  if (T.lies > 0.4) {
    Bust.speak = 'folder'; yield* bsTalk('det', 'Funny. The helicopter camera has you from the first light to the cuffs. Care to revise?', 'folder', 'folder');
    o = yield* bsAsk({ text: 'The footage doesn’t match what you told me.', focus: 'det', opts: [
      { t: 'Fine. I lied. I’m sorry.', s: 'come clean', fx: { coop: 1, lie: -1, c: -8, p: 8 } },
      { t: 'That could be anyone.', s: 'double down', fx: { lie: 1, host: 0.5, c: -14, p: -14 } },
      { t: 'I want a lawyer.', s: 'ends the interview', lawyer: true, fx: { c: 4, p: -6 } }] });
    if (o === -1) return yield* bsBreak();
    if (o && o.lawyer) { yield* bsTalk('det', 'Then we’re done here.', 'det'); UI.fade(true); yield* bsWait(0.8); Bust.verdict(); return; }
    if (o === null) yield* bsTalk('det', 'That’s what I thought.', 'det'); else if (Bust.pick === 0) yield* bsTalk('det', 'Thank you. That took courage. A little.', 'det'); else yield* bsTalk('det', 'The camera disagrees. So does the judge.', 'det');
  } else {
    yield* bsTalk('det', 'Your story matches the footage. Last thing: anything you want on the record?', 'det');
    o = yield* bsAsk({ text: 'Anything you want to say for the record?', opts: [
      { t: 'I’ll pay the fine and keep my nose clean.', s: 'cooperate', fx: { coop: 1, p: 8, c: 4 } },
      { t: 'I just want to go home.', s: 'tired', fx: { c: 2, p: 1 } },
      { t: 'This is harassment.', s: 'hostile', fx: { host: 1, p: -10, c: 2 } }] });
    if (o === -1) return yield* bsBreak();
    if (o === null) yield* bsTalk('det', 'Noted.', 'det'); else if (Bust.pick === 0) yield* bsTalk('det', 'I’ll tell the DA you were cooperative.', 'det'); else if (Bust.pick === 1) yield* bsTalk('det', 'Soon enough.', 'det'); else yield* bsTalk('cop1', 'It’s a Tuesday. Everything is harassment.', 'cop', 'cop1');
  }
  Bust.leanT = 0; Bust.focus = 'folder'; yield* bsTalk('det', 'I’ll write it up. Officer Reyes will take you to processing.', 'folder', 'folder');
  UI.fade(true); yield* bsWait(0.8); Bust.verdict();
};
function* bsBreak() {
  const T = Bust.tally; T.broke = true; Bust.meters(); Court.sfx('bad');
  yield* bsTalk('', 'Your hands are shaking. The words come out before you can stop them.', 'hands', '');
  yield* bsTalk('det', 'There it is. Officer, get the stenographer.', 'det'); yield* bsTalk('cop1', 'Finally.', 'cop', 'cop1');
  UI.fade(true); yield* bsWait(0.8); Bust.verdict();
}
/* the question about the thing you actually did */
function bsCrimeQ(victim) {
  const L = Wanted.log, has = (k) => L.indexOf(k) >= 0;
  if (has('Running over an officer') || has('Assaulting an officer')) return { text: 'You put hands on an officer. A cop. Think about what that means.', opts: [
    { t: 'That was a mistake. I’m sorry.', s: 'honest', fx: { coop: 1, c: -8, p: 6 }, r: 'It was. At least you know it.' },
    { t: 'He grabbed me first.', s: 'a story', fx: { lie: 1, c: -3, p: -3 }, r: 'His body camera says otherwise.' },
    { t: 'I’d do it again.', s: 'hostile', fx: { host: 1, p: -16, c: 3 }, r: 'I’ll make sure the judge hears that.' }] };
  if (has('Carjacking')) return { text: 'You dragged a driver out of their own car and took it. Tell me why.', opts: [
    { t: 'I was desperate. It was a terrible decision.', s: 'honest', fx: { coop: 1, c: -8, p: 7 }, r: 'Desperate people still have other options.' },
    { t: 'It was an abandoned car.', s: 'a story', fx: { lie: 1, c: -3, p: -4 }, r: 'The abandoned car was doing thirty at the time.' },
    { t: 'Nobody got hurt.', s: 'deflect', fx: { c: -3, p: -3 }, r: 'Tell that to the man you threw onto the tarmac.' }] };
  if (has('Hit and run')) return { text: 'Somebody was lying in the road, and you kept driving. Walk me through that.', opts: [
    { t: 'I panicked. I’m sorry. I should have stopped.', s: 'honest', fx: { coop: 1, c: -8, p: 8 }, r: 'Panic I believe. That counts for something.' },
    { t: 'I never touched anyone.', s: 'a story', fx: { lie: 1, c: -2, p: -4 }, r: 'Funny. We have a witness.' },
    { t: 'They stepped out of nowhere!', s: 'deflect', fx: { c: -3, p: -4 }, r: 'At your speed everything is out of nowhere.' }] };
  if (has('Assault')) return { text: victim + ' says you threw the first punch.', opts: [
    { t: 'I lost my temper. I regret it.', s: 'honest', fx: { coop: 1, c: -6, p: 7 }, r: 'Regret I can work with.' },
    { t: 'They had it coming.', s: 'hostile', fx: { host: 1, p: -10, c: 2 }, r: 'Careful. That’s a confession with an attitude.' },
    { t: 'Prove it.', s: 'defiant', fx: { host: 0.5, lie: 0.5, p: -6, c: 3 }, r: 'Oh, we can.' }] };
  if (has('Ramming police') || has('Wrecked a patrol car')) return { text: 'Two patrol cars are in the shop because of you. Care to explain?', opts: [
    { t: 'I panicked. You were all over me.', s: 'honest', fx: { coop: 1, c: -5, p: 6 }, r: 'That I can believe.' },
    { t: 'I never saw you.', s: 'a story', fx: { lie: 1, c: -3, p: -3 }, r: 'There were nine of us. With lights.' },
    { t: 'Send me the bill.', s: 'hostile', fx: { host: 1, p: -12, c: 3 }, r: 'Oh, we will. With interest.' }] };
  return { text: 'Why didn’t you pull over when the lights came on?', opts: [
    { t: 'I panicked.', s: 'honest', fx: { coop: 1, c: -4, p: 6 }, r: 'Most people do. Most.' },
    { t: 'I didn’t see the lights.', s: 'a story', fx: { lie: 1, c: -3, p: -3 }, r: 'Blue and red. At night. In your mirror.' },
    { t: 'You’ll never catch me next time.', s: 'hostile', fx: { host: 1, p: -12, c: 3 }, r: 'There won’t be a next time.' }] };
}

/* ---------- the verdict: what it costs ---------- */
Bust.settle = function () {
  const T = Bust.tally || { c: 60, p: 60, coop: 0, host: 0, lies: 0, lawyer: false, broke: false }, base = Police.fine, R = (n) => Math.round(n / 10) * 10;
  const score = T.coop * 2 - T.host * 2 - T.lies * 2.5 + (T.c - 50) / 30 + (T.p - 50) / 30;
  let tier, title, ok = false, line, rows = [['Fine', base]], over = false;
  if (T.lawyer) { tier = 'counsel'; title = 'Counsel negotiates'; rows.push(['Public defender cuts the fine', -R(base * 0.15)], ['Counsel fee', 200]); line = 'Your public defender talks the DA down. It is not free.'; }
  else if (T.broke) { tier = 'confession'; title = 'Confession signed'; rows.push(['Prosecutors add a surcharge', R(base * 0.1)]); line = 'You told them everything. The charges stand as filed.'; }
  else if (score >= 2.2) { tier = 'plea'; title = 'Plea deal'; ok = true; rows.push(['Cooperation · charges reduced', -R(base * 0.4)]); line = 'Detective Marlow puts in a word with the DA. You walk with a smaller fine.'; }
  else if (score <= -2.2) { tier = 'night'; title = 'Held overnight'; rows.push(['Obstruction of justice', 250], ['Uncooperative · fine +50 %', R(base * 0.5)]); over = true; line = 'You spend the night in a cell. They let you out in the morning.'; }
  else { tier = 'filed'; title = 'Charges filed'; line = 'Pay the fine and walk. Try not to do this again.'; }
  let total = 0; for (const r of rows) total += r[1]; total = Math.max(0, total);
  return { tier, title, ok, line, rows, total, over, score };
};
Bust.verdict = function () {
  if (Bust.phase === 'verdict' || Bust.phase === 'closing') return;
  if (Bust.phase === 'street' || Bust.phase === 'toBooking') { if (Bust.phase === 'street') Bust.endStreet(); UI.setMode('bust'); E.bust.className = 'screen room'; Bust.clock = 0; Bust.tally = Bust.tally || { c: 70, p: 60, coop: 0, host: 0, lies: 0, lawyer: false, broke: false, noreply: 0 }; }
  if (Bust.scn !== 'interro' || Bust.phase !== 'interro') { Bust.sceneInit('interro'); const A = CR.A; A.det.hid = false; A.det.x = 0; A.det.z = -1.45; A.det.yaw = 0; A.det.sit = 1; A.det.sitT = 1; }
  Bust.phase = 'verdict'; Bust.gen = null; Bust.cap = null; Bust.speak = ''; Bust.focus = 'folder'; Bust.picking = false; Bust.leanT = 0;
  E.bChoice.hidden = true; E.bCap.hidden = true; E.bLower.hidden = true; E.bTop.hidden = true; E.bSkip.hidden = true; E.bust.classList.remove('tense'); UI.fade(false);
  const o = Bust.out = Bust.settle(), no = 1000 + ((Math.random() * 8999) | 0), pay = Math.min(o.total, save.money);
  E.bCard.innerHTML = '<div class="ck">Island County P.D. · case #' + no + '</div><h2 class="' + (o.ok ? 'ok' : 'no') + '">' + o.title + '</h2>' +
    '<div class="chg">' + Bust.ch.map((c) => '<i>' + esc(c) + '</i>').join('') + '</div>' +
    '<div class="rows">' + o.rows.map((r) => '<div><span>' + r[0] + '</span><b class="' + (r[1] < 0 ? 'pos' : '') + '">' + (r[1] < 0 ? '−' : r[1] > 0 && o.rows.indexOf(r) > 0 ? '+' : '') + money(Math.abs(r[1])) + '</b></div>').join('') + '</div>' +
    '<p>' + o.line + '</p>' + (o.total > save.money ? '<p class="dim">That is more than you have, so they take all of it.</p>' : '') +
    '<div class="rw neg">−' + money(pay) + '</div><div class="acts"><button class="btn primary" type="button" data-b="go">Walk out</button></div>';
  E.bCard.hidden = false;
};
Bust.leave = function () {
  if (Bust.phase !== 'verdict') return; Bust.phase = 'closing'; Bust.closeT = 0.75; E.bCard.hidden = true; UI.fade(true);
};
Bust.finish = function () {
  const o = Bust.out; Police.fine = o ? Math.min(save.money, o.total) : Police.fine;
  Bust.on = false; Bust.phase = 'off'; Bust.gen = null; Bust.cap = null; Bust.paused = false; Bust.S = null; Bust.A = null; document.body.classList.remove('cut');
  E.bust.hidden = true; E.bCard.hidden = true; E.bSkip.hidden = true; E.bChoice.hidden = true; E.bust.classList.remove('tense');
  if (CR.cam && CR.hands) CR.shake = 0;
  Police.release(); Police.hold = false; Police.phase = 'off'; Police.on = false; Police.done = true; Police.t = 0; Police.hud(1);
  if (o && o.over) App.tod = 7.5;
  UI.setMode('play'); UI.fade(false); last = performance.now(); Keys.Space = false; Cam.shake = 0;
  if (o && o.over) UI.banner('RELEASED', 'You spent the night in a cell');
};

/* ---------- input ---------- */
Bust.skip = function () {
  if (!Bust.on || Bust.phase === 'verdict' || Bust.phase === 'closing') return;
  Bust.gen = null; Bust.cap = null; E.bCap.hidden = true; E.bChoice.hidden = true; Bust.picking = false; Bust.verdict();
};
Bust.key = function (code) {
  const ph = Bust.phase;
  if (ph === 'verdict') { if (code === 'Enter' || code === 'Space') Bust.leave(); return; }
  if (ph === 'closing') return;
  if (code === 'Escape') { Bust.skip(); return; }
  if (Bust.picking && /^(Digit|Numpad)[1-3]$/.test(code)) { const i = +code.slice(-1) - 1; if (Bust.pick < 0) Bust.pick = i; return; }
  if (code === 'Space' || code === 'Enter') Bust.adv = true;
};
Bust.bind = function () {
  if (Bust.bound) return; Bust.bound = true;
  E.bSkip.addEventListener('click', () => Bust.skip());
  E.bCard.addEventListener('click', (e) => { const b = e.target.closest('[data-b]'); if (b && b.dataset.b === 'go') Bust.leave(); });
  E.bChoice.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; e.stopPropagation(); e.preventDefault(); if (Bust.picking && Bust.pick < 0) Bust.pick = +b.dataset.i; });
  E.bCap.addEventListener('pointerdown', (e) => { e.stopPropagation(); Bust.adv = true; });
  E.bust.addEventListener('pointerdown', (e) => { if (e.target.closest('button,[data-i]')) return; Bust.adv = true; });
  window.addEventListener('pointermove', (e) => { if (App.mode !== 'bust' || !Bust.look) return; Bust.look.tx = -((e.clientX / window.innerWidth) - 0.5) * 0.4; Bust.look.ty = -((e.clientY / window.innerHeight) - 0.5) * 0.22; });
};
