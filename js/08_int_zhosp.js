/* ================= THE HOSPITAL =================
   Every town has a General Hospital (on the map). Walk in any time: the reception, a waiting area, a ward of beds behind curtains, heart
   monitors, drips, doctors and nurses on their rounds; see a doctor to be patched up, or try the rehab games.
   When your health hits zero you do not just reappear: your car is brought round to the kerb outside the nearest hospital and you wake up
   in a bed on its ward. A medical scene plays (a blurry first look at the doctor, the nurse checking your monitor, what happened to you),
   then three recovery tests, each a little game:
   - Physio: a marker sweeps along a bar; press when it is in the green. Every good press gives you back some health.
   - Reflexes: wait for the light to turn green, then press. A quick time takes money off the bill.
   - Pills: sort your tablets into the right cups before the nurse comes back. Each one right is a little health and a little off the bill.
   Then you walk out (pay the bill at the door) and your car is waiting. */
const Hosp = { adm: null, scene: null, game: null };
const HOSP_DOC = 'Dr. Okafor', HOSP_NURSE = 'Nurse Bell';
/* the nearest hospital to (x, z) */
Hosp.site = function (x, z) { Bld.prep(); let best = null, bd = 1e18; for (const S of Bld.sites) if (S.kind === 'hospital') { const d = (S.x - x) ** 2 + (S.z - z) ** 2; if (d < bd) { bd = d; best = S; } } return best; };

/* ---------- the building inside ---------- */
INT_KINDS.hospital = { name: 'Hospital', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 24, 18); K.shell({ W, D, H: 3.2, floor: 0xd8dcd8, wall: 0xf2f4f2, ceil: 0xf6f8f8, trim: 0x2a8a8a, tiles: 0xc4cac6, lamp: 0xf4fbff, lightI: 1.05 });
  K.sign((rec.name || 'HOSPITAL').toUpperCase(), 0, 2.7, K.z1 - 0.03, Math.min(W - 2, 7), 0.42, Math.PI, { fg: '#e83a4a', bg: '#f4f6f6' });
  /* reception by the door, a waiting area along the left wall */
  K.counter(K.x1 - 4.6, K.z1 - 3.4, K.x1 - 1, K.z1 - 2.7, 0xe8ecea, 0x2a8a8a, 1.05); intStaff(K, K.x1 - 2.8, K.z1 - 3.9, Math.PI, 0x3aa8a0, { sleeve: false });
  K.act(K.x1 - 2.8, K.z1 - 2.2, 1.5, () => (Hosp.adm ? 'Settle the bill and go (' + money(Hosp.bill()) + ')' : 'See a doctor (health back to full · $90)'), () => Hosp.reception(), { wide: true });
  for (let z = K.z1 - 2.2; z > K.z1 - 2.2 - Math.min(6, D * 0.35); z -= 1.0) K.chair(K.x0 + 0.7, z, Math.PI / 2, 0x3a7a9a, true);
  for (let k = 0; k < 2; k++) if (r() < 0.8) intSeat(K, K.x0 + 0.7, K.z1 - 2.2 - k * 2, Math.PI / 2, { phone: r() < 0.5 });
  K.plant(K.x0 + 0.6, K.z1 - 0.7, 0.9); K.pic(K.x0 + 0.02, 1.7, K.z1 - 4.5, Math.PI / 2, 1.1, 0.8, 0x6aa8c8);
  /* the ward: beds along the back wall, curtains between, a monitor and a drip at each */
  const n = Math.max(3, Math.min(6, Math.floor((W - 2) / 2.7))), bx0 = K.x0 + 1.6, beds = [];
  for (let k = 0; k < n; k++) {
    const x = bx0 + k * 2.7, z = K.z0 + 1.3; K.bed(x, z, 0, [0x8ac8d8, 0xe8eef0, 0x9ad8c8][k % 3]); beds.push([x, z]);
    if (k < n - 1) K.box(x + 1.3, 0.05, K.z0 + 0.05, x + 1.36, 2.1, K.z0 + 2.8, 0x9ad0e0);   /* the curtain to the next bed */
    K.box(x + 0.55, 1.35, K.z0 + 0.05, x + 0.95, 1.65, K.z0 + 0.2, 0x1a1e22); K.glow(x + 0.58, 1.38, K.z0 + 0.2, x + 0.92, 1.62, K.z0 + 0.21, k === 1 ? 0x101418 : 0x2aff7a, 0.5);   /* monitor */
    K.cyl(x - 0.75, 0, z - 0.4, 0.02, 1.9, 0xb8c0c4); K.box(x - 0.82, 1.7, z - 0.43, x - 0.68, 1.95, z - 0.37, 0xd8ecf4);   /* drip */
    if (k !== 1) { K.chair(x + 0.9, z + 1.4, -Math.PI / 2, 0x6a8a9a); if (r() < 0.5) intSeat(K, x + 0.9, z + 1.4, -Math.PI / 2, {}); }
  }
  /* your bed (the second one), with its own monitor that draws your heartbeat */
  const yb = beds[1]; Hosp.bed = [yb[0], yb[1], 0];
  { const cv = mkCanvas(256, 160), tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(yb[0] + 0.75, 1.5, K.z0 + 0.215); K.sc.add(m); Hosp.ecg = { cv, tex, x: 0, last: 0.5, bpm: 72 }; }
  K.act(yb[0] + 1.1, yb[1] + 0.6, 1.4, 'Recovery tests (physio, reflexes, pills)', () => Hosp.menu(), { wide: true });
  /* the staff on their rounds */
  K.person({ x: bx0, z: K.z0 + 3.4, kind: 'walk', vt: 0.9, shirt: 0xf6f6f4, pants: 0x3a4a5a, path: [[bx0, K.z0 + 3.4, 3], [bx0 + (n - 1) * 2.7, K.z0 + 3.4, 2.5], [K.x1 - 3, (K.z0 + K.z1) / 2, 2]] });
  K.person({ x: K.x1 - 3, z: K.z0 + 3.2, kind: 'walk', vt: 1.0, shirt: 0x3aa8a0, pants: 0x3aa8a0, path: [[K.x1 - 3, K.z0 + 3.2, 2], [bx0 + 2.7, K.z0 + 3.0, 3], [K.x0 + 2.5, K.z1 - 4, 2]] });
  K.tick((dt, t) => Hosp.tick(dt, t));
} }, leave(rec) { if (Hosp.adm) Hosp.pay(); } };

/* ---------- waking up ---------- */
Hosp.admit = function (why) {
  const S = Hosp.site(Pl.x, Pl.z); if (!S) return false;
  loadAround(S.x, S.z, 10); const rec = Bld.lots.get(S.key); if (!rec) return false;
  const d = rec.door; spawnAt(d.ox + d.nz * 7.5, d.oz + d.nz * 7.5, Math.PI / 2);   /* your car, brought round to the kerb outside */
  if (car.wrecked > 0) { car.wrecked = 0; car.health = Math.max(car.health, 40); }
  Hosp.adm = { bill: Math.min(save.money, 250), disc: 0, heal: 0, why: why || 'You blacked out', games: {}, rec };
  Int.hook = { allowHeat: true }; const ok = Int.enter(rec); Int.hook = null; if (!ok) { Hosp.adm = null; return false; }
  Hosp.cut(); return true;
};
Hosp.bill = function () { const A = Hosp.adm; return A ? Math.round(A.bill * (1 - Math.min(0.7, A.disc))) : 90; };
Hosp.cause = function (w) {
  return /bike|Thrown/i.test(w) ? 'You came off a motorbike. Your helmet is in two pieces. Your head is in one. Count yourself lucky.'
    : /Bailed/i.test(w) ? 'Somebody saw you jump out of a moving car. On purpose. We have questions, but they can wait.'
      : /crash|landing/i.test(w) ? 'You were in a crash. The car took most of it. You took the rest.'
        : /Hit by a car/i.test(w) ? 'You were hit by a car. Rule one of roads: look both ways.'
          : /Beaten|Knocked out/i.test(w) ? 'You lost a fist fight. Badly. Whoever it was, do not do that again.'
            : /fall/i.test(w) ? 'You fell. From quite high up, by the look of the bruises.'
              : /Starv|Dehydr/i.test(w) ? 'You collapsed. When did you last eat? Or drink anything that was not coffee?'
                : /drank|unconscious/i.test(w) ? 'Alcohol poisoning. The bar called us. Your liver sends its regards.'
                  : 'You were brought in unconscious. Nobody quite knows how.';
};
Hosp.cut = function () {
  if (Vit.black) { Vit.black.style.transition = 'opacity 2.4s'; Vit.black.style.opacity = '0'; }   /* you come round */
  if (!Int.ped || !Int.ped.hu) Int.mkPed(); const P = Int.ped.hu; P.root.visible = true;
  const docA = pedRandomLook(); docA.shirt = lc(0xf6f6f4); docA.sleeve = true; docA.pants = lc(0x3a4a5a); docA.coat = true; docA.kid = false; docA.old = false;
  const nurA = pedRandomLook(); nurA.shirt = lc(0x3aa8a0); nurA.pants = lc(0x3aa8a0); nurA.sleeve = false; nurA.kid = false; nurA.coat = false;
  const doc = Human.make(pedSpec(docA, 8.3)), nur = Human.make(pedSpec(nurA, 9.1)); Int.sc.add(doc.root, nur.root);
  const A = Hosp.adm, cv = renderer && renderer.domElement;
  Hosp.scene = { doc, nur, P, t: 0, cv };
  const lines = [['', 'ADMITTED · ' + (Int.rec.name || 'HOSPITAL').toUpperCase(), 'card'],
    ['', 'Beeping. Bright lights. Somebody saying your name.', 'pov'], [HOSP_DOC, 'There you are. Can you hear me? Squeeze my hand if you can hear me.', 'pov'],
    [HOSP_NURSE, 'Pressure is coming up. Heart rate is good, seventy-two.', 'monitor'], [HOSP_DOC, 'Welcome back. You gave us a scare.', 'doc'], [HOSP_DOC, Hosp.cause(A.why), 'doc'],
    ['', 'What do you say?', 'bed', [
      ['“How long was I out?”', {}, [['you', 'How long was I out?', 'bed'], [HOSP_DOC, 'Long enough for the nurse to name you. She went with “Lucky”.', 'doc'], [HOSP_NURSE, 'It suits you.', 'nurse']]],
      ['“Where’s my car?”', {}, [['you', 'Where is my car?', 'bed'], [HOSP_DOC, 'Of course that is your first question. Outside, by the kerb. Somebody brought it round.', 'doc']]],
      ['“Can I go now?”', {}, [['you', 'Great. Can I go now?', 'bed'], [HOSP_DOC, 'Not so fast.', 'doc']]]]],
    [HOSP_DOC, 'Before you go: a few tests. Your balance, your reflexes, and whether you can take your own pills.', 'doc'],
    [HOSP_DOC, 'Do well and you get out sooner, and I knock some off the bill. The bill is ' + money(A.bill) + '.', 'doc'], ['you', '…That is a lot of money for a bed.', 'bed'], [HOSP_NURSE, 'The jelly is included.', 'nurse']];
  Cut.play(lines, null, () => Hosp.endCut());
};
Hosp.endCut = function () {
  const H = Hosp.scene; Hosp.scene = null; if (!H) return;
  Human.dispose(H.doc); Human.dispose(H.nur); if (H.cv) { H.cv.style.filter = ''; H.cv.__vitBlur = null; }
  Int.x = Hosp.bed[0] + 1.1; Int.z = Hosp.bed[1] + 1.4; Int.yaw = Math.PI * 0.85; Int.pitch = -0.15; if (Int.ped && Int.ped.hu) Int.ped.hu.root.visible = Int.tp;
  if (Vit.black) Vit.black.style.opacity = '0';
  Hosp.menu();
};
/* lying in the bed, on your back, head on the pillow */
Hosp.lie = function (h, t) {
  const [bx, bz, yaw] = Hosp.bed, R = h.root, b = h.b; R.position.set(bx + Math.sin(yaw) * 0.85, 0.66, bz + Math.cos(yaw) * 0.85); R.rotation.set(-Math.PI / 2 + 0.12, yaw, 0, 'YXZ');
  b.hips.position.set(0, 0.93, 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(0, 0, 0); b.chest.rotation.set(0.01 * Math.sin(t * 1.4), 0, 0); b.head.rotation.set(0.25, 0.15 * Math.sin(t * 0.3), 0);
  for (const k of ['legL', 'legR', 'knL', 'knR']) b[k].rotation.set(0, 0, 0); b.armL.rotation.set(0, 0, -0.12); b.armR.rotation.set(0, 0, 0.12); b.elL.rotation.x = -0.2; b.elR.rotation.x = -0.2;
};
const _hsV = new THREE.Vector3();
Hosp.frame = function (dt) {
  App.time += dt; Int.t += dt; const H = Hosp.scene, LT = Cut.lineTick(dt); if (!Cut.on || !LT || !H) return; H.t += dt;
  const t = H.t, shot = LT.shot, sp = LT.L[0], talk = (w) => sp === w && Cut.typed < LT.L[1].length + 8, [bx, bz] = Hosp.bed;
  Hosp.lie(H.P, t);
  /* the doctor at the bedside, the nurse at the monitor */
  H.doc.root.position.set(bx - 0.95, 0, bz + 0.2); H.doc.root.rotation.set(0, Math.PI / 2 + 0.25, 0); Cut.gesture(H.doc, talk(HOSP_DOC), t, 3.1);
  if (shot === 'pov' && Cut.i <= 2) { H.doc.b.tor.rotation.x = 0.35; H.doc.b.armL.rotation.set(-0.9, 0, 0.3); H.doc.b.elL.rotation.x = -0.4; }   /* leaning over you, a hand on yours */
  H.nur.root.position.set(bx + 0.85, 0, bz - 0.3); H.nur.root.rotation.set(0, shot === 'nurse' ? -Math.PI / 2 : Math.PI * 0.85, 0); Cut.gesture(H.nur, talk(HOSP_NURSE), t, 5.3);
  if (shot === 'monitor') { H.nur.b.armR.rotation.set(-1.3, 0, 0.2); H.nur.b.elR.rotation.x = -0.4; }
  for (const h of [H.doc, H.nur, H.P]) Human.alive(h, dt, t, h === H.P ? 4.7 : 3.3);
  Hosp.ecgDraw(dt);
  const px = Pl.x, pz = Pl.z; Pl.x = bx; Pl.z = bz + 2; HU.frame = (HU.frame || 0) + 1; try { for (const q of Int.npcs) intNpc(q, dt); } finally { Pl.x = px; Pl.z = pz; }
  /* the camera: through your eyes at first (blurred, clearing), the doctor, the monitor, you in the bed */
  const cam = Int.cam; cam.aspect = innerWidth / innerHeight; cam.fov = shot === 'pov' ? 62 : 46; cam.updateProjectionMatrix();
  const blur = shot === 'pov' ? Math.max(0, 7 - Cut.i * 2.4 - LT.k * 2) : 0; if (H.cv) { H.cv.style.filter = blur > 0.2 ? 'blur(' + blur.toFixed(1) + 'px) brightness(1.15)' : ''; H.cv.__vitBlur = null; }
  if (shot === 'card') { cam.position.set(bx, 14, bz + 2); _hsV.set(bx, 0, bz + 1); }
  else if (shot === 'pov') { cam.position.set(bx, 1.0, bz - 0.55); _hsV.set(bx - 0.75, 1.55 + 0.1 * Math.sin(t * 0.6), bz + 0.4); }
  else if (shot === 'doc') { cam.position.set(bx + 0.4, 1.45, bz + 0.6); _hsV.set(bx - 0.95, 1.55, bz + 0.2); }
  else if (shot === 'nurse') { cam.position.set(bx - 0.2, 1.4, bz + 0.9); _hsV.set(bx + 0.85, 1.5, bz - 0.3); }
  else if (shot === 'monitor') { cam.position.set(bx + 0.55, 1.5, bz + 0.25); _hsV.set(bx + 0.75, 1.5, bz - 0.45); }
  else { const a = 0.6 + LT.k * 0.3; cam.position.set(bx + Math.cos(a) * 2.6, 2.1, bz + 0.9 + Math.sin(a) * 1.6); _hsV.set(bx, 0.75, bz + 0.1); }
  cam.lookAt(_hsV);
  const s0 = scene, c0 = camera, e0 = env.exposure; scene = Int.sc; camera = cam; env.exposure = Int.K.expo || Int.expo;
  try { renderFrame(Int.fx, App.time); } finally { env.exposure = e0; scene = s0; camera = c0; }
};
const _cutFrameInt0 = Cut.frameInt;
Cut.frameInt = function (dt) { if (Hosp.scene) return Hosp.frame(dt); return _cutFrameInt0(dt); };
/* the heartbeat on your monitor: a green trace scrolling across, a blip each beat */
Hosp.ecgDraw = function (dt) {
  const E = Hosp.ecg; if (!E) return; const g = E.cv.getContext('2d'), W = 256, H = 160;
  if (!E.init) { g.fillStyle = '#050a08'; g.fillRect(0, 0, W, H); E.init = true; }
  E.ph = (E.ph || 0) + dt * E.bpm / 60; const step = Math.max(1, Math.round(dt * 90));
  for (let s = 0; s < step; s++) {
    const f = (E.ph - (step - s) / step * dt * E.bpm / 60) % 1, y = f < 0.06 ? 0.5 - Math.sin(f / 0.06 * Math.PI) * 0.06 : f < 0.1 ? 0.5 + (f - 0.06) * 6 : f < 0.14 ? 0.74 - (f - 0.1) * 14 : f < 0.17 ? 0.18 + (f - 0.14) * 12 : f > 0.3 && f < 0.42 ? 0.5 - Math.sin((f - 0.3) / 0.12 * Math.PI) * 0.08 : 0.5;
    g.fillStyle = '#050a08'; g.fillRect((E.x + 3) % W, 0, 6, H - 34); g.strokeStyle = '#2aff7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(E.x, E.last * (H - 40) + 6); E.x = (E.x + 1) % W; g.lineTo(E.x, y * (H - 40) + 6); if (E.x > 0) g.stroke(); E.last = y;
  }
  g.fillStyle = '#050a08'; g.fillRect(0, H - 32, W, 32); g.fillStyle = '#2aff7a'; g.font = '700 24px monospace'; g.fillText('♥ ' + E.bpm, 8, H - 8); g.fillStyle = '#4ac8ff'; g.fillText('SpO₂ 98', 130, H - 8); E.tex.needsUpdate = true;
};

/* ---------- reception, the bill ---------- */
Hosp.reception = function () {
  if (Hosp.adm) { Int.leave(); return; }
  if (Vit.hp >= 99.5) { Int.say('“You look fine to me. Next!”'); return; }
  if (save.money < 90) { Int.say('A doctor costs $90'); return; }
  save.money -= 90; Vit.hp = 100; Vit.store(); writeSave(); Snd.beep(660, 0.06); Int.say('Stitched, bandaged and lectured. Health back to full · −$90', 4);
};
Hosp.pay = function () {
  const A = Hosp.adm; if (!A) return; const due = Math.min(save.money, Hosp.bill()); save.money -= due; Hosp.adm = null; Hosp.game = null; Vit.store(); writeSave();
  UI.toast('Discharged · bill ' + money(due) + (A.disc > 0 ? ' (' + Math.round(Math.min(0.7, A.disc) * 100) + '% off for your tests)' : '') + ' · your car is out front', 'info');
};

/* ---------- the recovery tests ---------- */
const HOSP_GAMES = [['physio', 'Physio', 'Press SPACE when the marker is in the green. Six goes. Health back for each good one.'], ['reflex', 'Reflexes', 'Wait for the light to turn green, then press SPACE. Three goes. A fast time takes money off the bill.'], ['pills', 'Pills', 'Put each tablet in its cup: 1 red, 2 blue, 3 yellow. Ten tablets, quickly. Each one right: a little health and a little off the bill.']];
Hosp.menu = function () {
  Hosp.game = null; const A = Hosp.adm, done = A ? A.games : (Hosp.free || (Hosp.free = {}));
  const rows = HOSP_GAMES.map((g) => '<div class="vrow"><b>' + g[1] + '</b><small>' + g[2] + '</small><span>' + (done[g[0]] ? esc(done[g[0]]) : '—') + '</span></div>').join('');
  Int.panel({ title: A ? 'Recovery' : 'Rehab games', sub: A ? 'Health ' + Math.round(Vit.hp) + ' · bill ' + money(Hosp.bill()) + (A.disc > 0 ? ' (' + Math.round(Math.min(0.7, A.disc) * 100) + '% off)' : '') : 'Just for practice: no bill, no prizes but health from physio',
    body: '<div class="hsp">' + rows + '</div>',
    btns: HOSP_GAMES.map((g) => [g[1], () => Hosp.start(g[0]), !done[g[0]], A && !!done[g[0]]]).concat(A ? [['Discharge · pay ' + money(Hosp.bill()), () => Int.leave(), Object.keys(done).length === 3]] : []) });
};
Hosp.start = function (k) {
  const G = Hosp.game = { k, t: 0, n: 0, ok: 0, log: [] };
  if (k === 'physio') { G.zone = Hosp.zone(0.22); G.sp = 1.6; }
  if (k === 'reflex') { G.ph = 'wait'; G.go = 1.4 + Math.random() * 2.4; }
  if (k === 'pills') { G.cur = (Math.random() * 3) | 0; G.left = 2.4; }
  const body = k === 'physio' ? '<div class="hg-bar"><i id="hgZ"></i><b id="hgM"></b></div>' : k === 'reflex' ? '<div id="hgL" class="hg-light">WAIT…</div>' : '<div id="hgP" class="hg-pill"></div><div class="hg-cups">' + ['red', 'blue', 'yellow'].map((c, i) => '<button type="button" data-ia="c' + i + '" class="hg-cup ' + c + '">' + (i + 1) + '</button>').join('') + '</div><div class="hg-t"><i id="hgT"></i></div>';
  Int.panel({ title: HOSP_GAMES.find((g) => g[0] === k)[1], sub: HOSP_GAMES.find((g) => g[0] === k)[2], body: '<div class="hg">' + body + '<div id="hgS" class="hg-s"></div></div>',
    btns: k === 'pills' ? [] : [['PRESS (Space)', () => Hosp.hit(), true]], pick: (v) => { if (/^c\d$/.test(v)) Hosp.hit(+v.slice(1)); }, key: (code) => Hosp.key(code) });
  Hosp.css(); Hosp.paintGame();
};
Hosp.zone = function (w) { const a = 0.08 + Math.random() * (0.84 - w); return [a, a + w]; };
Hosp.key = function (code) {
  if (!Hosp.game) return false; if (code === 'Space' || code === 'Enter') { Hosp.hit(); return true; }
  if (Hosp.game.k === 'pills' && /^Digit[123]$/.test(code)) { Hosp.hit(+code.slice(5) - 1); return true; }
  if (code === 'Escape') { Hosp.menu(); return true; } return false;
};
/* every interior frame: the marker sweeps, the light waits, the pill timer runs out */
Hosp.tick = function (dt, t) {
  if (Hosp.ecg && !Hosp.scene) Hosp.ecgDraw(dt);
  const G = Hosp.game; if (G && !(Int.pan && Int.pan.key)) { Hosp.game = null; return; }   /* the panel was closed: the game is off */
  if (!G || G.end) return; G.t += dt;
  if (G.k === 'physio') G.pos = 0.5 + 0.5 * Math.sin(G.t * G.sp);
  if (G.k === 'reflex' && G.ph === 'wait' && G.t >= G.go) { G.ph = 'go'; G.t0 = G.t; Snd.beep(990, 0.05); }
  if (G.k === 'pills') { G.left -= dt; if (G.left <= 0) { G.log.push('✗'); G.n++; Snd.beep(200, 0.06); Hosp.nextPill(); } }
  Hosp.paintGame();
};
Hosp.hit = function (cup) {
  const G = Hosp.game; if (!G || G.end) return; const A = Hosp.adm;
  if (G.k === 'physio') {
    const inZ = G.pos >= G.zone[0] && G.pos <= G.zone[1]; G.n++; G.log.push(inZ ? '✓' : '✗'); if (inZ) { G.ok++; Vit.hp = Math.min(100, Vit.hp + 5); Snd.beep(880, 0.05); } else Snd.beep(220, 0.08);
    G.zone = Hosp.zone(Math.max(0.08, 0.22 - G.n * 0.025)); G.sp += 0.35; if (G.n >= 6) Hosp.finish(G.ok + '/6 · +' + G.ok * 5 + ' health');
  } else if (G.k === 'reflex') {
    if (G.ph === 'wait') { G.log.push('too soon'); Snd.beep(200, 0.08); } else { const ms = Math.round((G.t - G.t0) * 1000); G.log.push(ms + ' ms'); G.best = Math.min(G.best || 1e9, ms); Snd.beep(880, 0.05); }
    G.n++; G.ph = 'wait'; G.t = 0; G.go = 1.2 + Math.random() * 2.4;
    if (G.n >= 3) { const b = G.best || 9999, off = b < 300 ? 0.35 : b < 420 ? 0.2 : b < 600 ? 0.1 : 0; if (A) A.disc += off; Hosp.finish((G.best ? 'best ' + G.best + ' ms' : 'no clean go') + (A ? ' · ' + Math.round(off * 100) + '% off' : '')); }
  } else if (G.k === 'pills') {
    if (cup == null) return; const ok = cup === G.cur; G.log.push(ok ? '✓' : '✗'); G.n++; if (ok) { G.ok++; Vit.hp = Math.min(100, Vit.hp + 2); if (A) A.disc += 0.02; Snd.beep(880, 0.04); } else Snd.beep(220, 0.08); Hosp.nextPill();
  }
  Vit.store(); Hosp.paintGame();
};
Hosp.nextPill = function () { const G = Hosp.game; if (G.n >= 10) { Hosp.finish(G.ok + '/10 · +' + G.ok * 2 + ' health' + (Hosp.adm ? ' · ' + G.ok * 2 + '% off' : '')); return; } G.cur = (Math.random() * 3) | 0; G.left = Math.max(1.2, 2.4 - G.n * 0.12); };
Hosp.finish = function (res) {
  const G = Hosp.game; G.end = true; const done = Hosp.adm ? Hosp.adm.games : (Hosp.free || (Hosp.free = {})); done[G.k] = res; Snd.win(); writeSave();
  const s = document.getElementById('hgS'); if (s) s.textContent = 'Done: ' + res;
  setTimeout(() => { if (Hosp.game === G) Hosp.menu(); }, 1400);
};
Hosp.paintGame = function () {
  const G = Hosp.game; if (!G) return; const $ = (id) => document.getElementById(id);
  if (G.k === 'physio') { const z = $('hgZ'), m = $('hgM'); if (z) { z.style.left = (G.zone[0] * 100).toFixed(1) + '%'; z.style.width = ((G.zone[1] - G.zone[0]) * 100).toFixed(1) + '%'; } if (m) m.style.left = ((G.pos || 0) * 100).toFixed(1) + '%'; }
  if (G.k === 'reflex') { const l = $('hgL'); if (l) { l.textContent = G.end ? 'DONE' : G.ph === 'go' ? 'GO!' : 'WAIT…'; l.classList.toggle('go', G.ph === 'go' && !G.end); } }
  if (G.k === 'pills') { const p = $('hgP'), tt = $('hgT'); if (p) p.className = 'hg-pill ' + ['red', 'blue', 'yellow'][G.cur]; if (tt) tt.style.width = Math.max(0, G.left / 2.4 * 100).toFixed(0) + '%'; }
  const s = $('hgS'); if (s && !G.end) s.textContent = G.log.join('  ') + (G.k === 'physio' ? '  (' + G.n + '/6)' : G.k === 'reflex' ? '  (' + G.n + '/3)' : '  (' + G.n + '/10)');
};
Hosp.css = function () {
  if (Hosp.cssOn) return; Hosp.cssOn = true; const st = document.createElement('style');
  st.textContent = '.hsp .vrow{display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1)}.hsp .vrow small{color:var(--dim);font-size:12px}.hsp .vrow span{font-variant-numeric:tabular-nums;color:#7affb0}' +
    '.hg{display:grid;gap:12px;padding:6px 0}.hg-bar{position:relative;height:34px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden}.hg-bar i{position:absolute;top:0;bottom:0;background:rgba(60,220,120,.55)}.hg-bar b{position:absolute;top:-2px;bottom:-2px;width:5px;margin-left:-2px;background:#fff;box-shadow:0 0 8px #fff}' +
    '.hg-light{height:110px;border-radius:12px;display:grid;place-items:center;font:700 38px/1 var(--display,sans-serif);background:#5a1a1a;color:#fff;letter-spacing:.1em}.hg-light.go{background:#1aa84a}' +
    '.hg-pill{width:84px;height:34px;border-radius:17px;margin:4px auto;box-shadow:inset -6px -6px 0 rgba(0,0,0,.18)}.hg-pill.red,.hg-cup.red{background:#e2483a}.hg-pill.blue,.hg-cup.blue{background:#3a7ae2}.hg-pill.yellow,.hg-cup.yellow{background:#f2c83a;color:#222}' +
    '.hg-cups{display:flex;gap:10px;justify-content:center}.hg-cup{width:74px;height:54px;border-radius:0 0 18px 18px;border:2px solid rgba(255,255,255,.5);color:#fff;font:700 22px sans-serif;cursor:pointer}.hg-t{height:5px;background:rgba(255,255,255,.1)}.hg-t i{display:block;height:100%;background:#f2c83a}.hg-s{min-height:20px;color:var(--dim);font-variant-numeric:tabular-nums}';
  document.head.appendChild(st);
};
