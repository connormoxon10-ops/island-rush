/* ================= COLLECTION: things hidden around the island =================
   30 golden stars beside the roads and out in the wilds (pick up on foot or by car), 10 sea pearls (boat) and 10 sky sparks (any aircraft). A soft chime speeds up as you close in
   and the minimap glints once you are near. Venue souvenirs, venue trophies and a log of every species you land also count. Finished sets pay out. */
const COLK = {
  s: { name: 'Star', pl: 'Stars', ico: '★', col: 0xffc83a, css: '#ffc83a', pay: 40, vis: 210, ping: 70 },
  p: { name: 'Sea pearl', pl: 'Sea pearls', ico: '◉', col: 0xbfe8ff, css: '#bfe8ff', pay: 90, vis: 340, ping: 100 },
  k: { name: 'Sky spark', pl: 'Sky sparks', ico: '✦', col: 0x7af0ff, css: '#7af0ff', pay: 90, vis: 760, ping: 170 }
};
const COL_FISH = ['bluegill', 'perch', 'crappie', 'bass', 'trout', 'catfish', 'pike', 'muskie', 'carp'];
const COL_SETS = [
  { key: 's10', cnt: (c) => c.s, need: 10, pay: 1000, name: 'Star Hunter I' }, { key: 's20', cnt: (c) => c.s, need: 20, pay: 2000, name: 'Star Hunter II' }, { key: 's30', cnt: (c) => c.s, need: 30, pay: 4000, name: 'Star Hunter III' },
  { key: 'p10', cnt: (c) => c.p, need: 10, pay: 2500, name: 'Pearl Diver' }, { key: 'k10', cnt: (c) => c.k, need: 10, pay: 2500, name: 'Sky Chaser' },
  { key: 'f9', cnt: (c) => c.f, need: 9, pay: 3000, name: 'Master Angler' }, { key: 'v7', cnt: (c) => c.v, need: 7, pay: 2500, name: 'Souvenir Hunter' }, { key: 't7', cnt: (c) => c.t, need: 7, pay: 4000, name: 'Club Champion' },
  { key: 'all', cnt: (c) => c.total, need: -1, pay: 15000, name: 'Island Legend' }
];
const Col = { items: [], ready: false, t: 0, pingT: 0, near: null, nearD: 1e9 };
const _cg = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false };
const colSave = () => save.col || (save.col = { got: {}, n: 0, fish: {}, prize: {} });
Col.dirName = function (dx, dz) { return ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8]; };
Col.where = function (x, z) {
  const ti = nearestTownIdx(x, z), T = towns[ti], dx = x - T.cx, dz = z - T.cz, d = Math.hypot(dx, dz);
  return d < T.half + 60 ? 'in ' + T.name : (d < 1000 ? Math.round(d / 50) * 50 + ' m' : (d / 1000).toFixed(1) + ' km') + ' ' + Col.dirName(dx, dz) + ' of ' + T.name;
};
Col.setup = function () {
  const R = mulberry32(0x5ca7), out = [], cnt = { s: 0, p: 0, k: 0 };
  const add = (k, x, y, z, ex) => { const it = Object.assign({ id: k + (++cnt[k]), k, x, y, z, ox: x, oz: z, ph: R() * 6.28, ok: k !== 's', g: null, hint: '' }, ex); out.push(it); return it; };
  const townD = (x, z) => { let b = 1e9; for (const T of towns) b = Math.min(b, Math.hypot(x - T.cx, z - T.cz) - T.half); return b; };
  const far = (x, z, k, m) => out.every((o) => o.k !== k || Math.hypot(o.x - x, o.z - z) > m);
  const rl = roads.filter((r) => r.len > 80), tot = rl.reduce((a, r) => a + r.len, 0), hw = rl.filter((r) => r.kind === 'hw'), hwTot = hw.reduce((a, r) => a + r.len, 0);
  const pickRoad = (list, t) => { let q = R() * t; for (const r of list) { q -= r.len; if (q <= 0) return r; } return list[list.length - 1]; };
  const onRoad = (r, u) => { let i = 0; while (i < r.pts.length - 2 && r.cum[i + 1] < u) i++; const a = r.pts[i], b = r.pts[i + 1], l = Math.max(1e-6, r.cum[i + 1] - r.cum[i]), f = clamp((u - r.cum[i]) / l, 0, 1), dx = b.x - a.x, dz = b.z - a.z, q = Math.hypot(dx, dz) || 1; return { x: a.x + dx * f, z: a.z + dz * f, nx: -dz / q, nz: dx / q }; };
  /* two stars at the edge of every town */
  for (let ti = 0; ti < towns.length && rl.length; ti++) for (let n = 0; n < 2; n++) {
    const T = towns[ti]; let hit = null;
    for (let a = 0; a < 700 && !hit; a++) {
      const r = pickRoad(rl, tot), P = onRoad(r, R() * r.len); if (Math.hypot(P.x - T.cx, P.z - T.cz) > T.half + 90 || !far(P.x, P.z, 's', 110)) continue;
      const sd = R() < 0.5 ? -1 : 1, off = r.halfW + 3.5 + R() * 7, x = P.x + P.nx * sd * off, z = P.z + P.nz * sd * off, h = terrainHeight(x, z); if (h < 0.6) continue; hit = { x, z, h, rx: P.x, rz: P.z };
    }
    if (hit) add('s', hit.x, hit.h + 1.35, hit.z, { rx: hit.rx, rz: hit.rz, cat: 'town', hint: 'Beside the streets of ' + T.name });
  }
  /* eight along the open road */
  for (let n = 0; n < 8 && (hw.length || rl.length); n++) for (let a = 0; a < 900; a++) {
    const r = hw.length ? pickRoad(hw, hwTot) : pickRoad(rl, tot), P = onRoad(r, R() * r.len); if (townD(P.x, P.z) < 260 || !far(P.x, P.z, 's', 220)) continue;
    const sd = R() < 0.5 ? -1 : 1, off = r.halfW + 8 + R() * 16, x = P.x + P.nx * sd * off, z = P.z + P.nz * sd * off, h = terrainHeight(x, z); if (h < 0.6) continue;
    add('s', x, h + 1.35, z, { rx: P.x, rz: P.z, cat: 'road', hint: 'Off the open road, ' + Col.where(x, z) }); break;
  }
  /* eight in the wilds, the first three up high */
  let high = 0;
  for (let n = 0; n < 8; n++) for (let a = 0; a < 6000; a++) {
    const x = (R() * 2 - 1) * 2700, z = (R() * 2 - 1) * 2700; if (x * x + z * z > 2750 * 2750) continue;
    const h = terrainNoRoad(x, z); if (h < 3 || h > 260 || (n < 3 && h < 70 && a < 5000)) continue;
    if (townD(x, z) < 300 || !far(x, z, 's', 420)) continue; nearestRoad(x, z); if (NR.seg >= 0 && NR.d < 140) continue;
    if (Math.abs(terrainNoRoad(x + 12, z) - h) > 7 || Math.abs(terrainNoRoad(x, z + 12) - h) > 7) continue;
    if (h > 70) high++; add('s', x, h + 1.35, z, { cat: 'wild', hint: (h > 70 ? 'High up, ' : 'Out in the wilds, ') + Col.where(x, z) }); break;
  }
  /* ten pearls out at sea */
  for (let n = 0; n < 10; n++) for (let a = 0; a < 4000; a++) {
    const ang = R() * TAU, rad = 350 + R() * 2750, x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    if (terrainNoRoad(x, z) > -7 || !far(x, z, 'p', 450)) continue; let deep = true; for (let k = 0; k < 4 && deep; k++) deep = terrainNoRoad(x + Math.cos(k * 1.57) * 80, z + Math.sin(k * 1.57) * 80) < -3; if (!deep) continue;
    add('p', x, 0.45, z, { hint: 'Floating at sea, ' + Col.where(x, z) }); break;
  }
  /* ten sparks in the sky: some over towns, some over summits, the rest anywhere */
  for (let n = 0; n < 10; n++) for (let a = 0; a < 4000; a++) {
    let x, z, y;
    if (n < 3) { const T = towns[(n * 2 + 1) % towns.length]; x = T.cx + (R() - 0.5) * 500; z = T.cz + (R() - 0.5) * 500; y = Math.max(0, terrainNoRoad(x, z)) + 150 + R() * 70; }
    else if (n < 6) { x = (R() * 2 - 1) * 2600; z = (R() * 2 - 1) * 2600; const h = terrainNoRoad(x, z); if (h < 90) continue; y = h + 32; }
    else { x = (R() * 2 - 1) * 2800; z = (R() * 2 - 1) * 2800; y = Math.max(0, terrainNoRoad(x, z)) + 70 + R() * 160; }
    if (x * x + z * z > 3000 * 3000 || !far(x, z, 'k', 520)) continue; add('k', x, y, z, { hint: (n < 3 ? 'Above the rooftops, ' : n < 6 ? 'Hanging over a summit, ' : 'High in the sky, ') + Col.where(x, z) }); break;
  }
  Col.items = out; Col.ready = true; Col.high = high; Col.build();
};
/* ----- visuals ----- */
Col.build = function () {
  if (Col.G) return; const G = Col.G = {};
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.21 : 0.52; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath();
  G.star = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 1 }); G.star.translate(0, 0, -0.07);
  G.starM = new THREE.MeshStandardMaterial({ color: lc(0xffc83a), emissive: lc(0xff9d14), emissiveIntensity: 0.9, metalness: 0.55, roughness: 0.3 });
  G.pearl = new THREE.SphereGeometry(0.6, 18, 12); G.pearlM = new THREE.MeshStandardMaterial({ color: lc(0xf6f2ff), emissive: lc(0x7fc8ff), emissiveIntensity: 0.55, metalness: 0.25, roughness: 0.12 });
  G.ring = new THREE.RingGeometry(0.9, 1.15, 32); G.ring.rotateX(-Math.PI / 2);
  G.orb = new THREE.IcosahedronGeometry(2.3, 1); G.orbM = new THREE.MeshBasicMaterial({ color: lc(0xb8f6ff) }); G.cage = new THREE.IcosahedronGeometry(3.6, 0); G.cageM = new THREE.MeshBasicMaterial({ color: lc(0x7af0ff), wireframe: true, transparent: true, opacity: 0.7 });
  G.beam = new THREE.CylinderGeometry(0.05, 0.15, 26, 8, 1, true); G.beam.translate(0, 13, 0);
  G.halo = venCanvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.25, 'rgba(170,245,255,0.5)'); gr.addColorStop(1, 'rgba(100,220,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  G.haloM = new THREE.SpriteMaterial({ map: G.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  G.beamM = {}; for (const k in COLK) G.beamM[k] = new THREE.MeshBasicMaterial({ color: lc(COLK[k].col), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
};
Col.mesh = function (it) {
  const G = Col.G, g = new THREE.Group(); g.userData = {};
  if (it.k === 's') { const m = new THREE.Mesh(G.star, G.starM); m.scale.setScalar(1.7); g.add(m); g.userData.spin = m; }
  else if (it.k === 'p') { const m = new THREE.Mesh(G.pearl, G.pearlM); g.add(m); g.userData.spin = m; const r = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); r.position.y = -0.4; g.add(r); g.userData.ring = r; }
  else { const m = new THREE.Mesh(G.orb, G.orbM), c = new THREE.Mesh(G.cage, G.cageM), h = new THREE.Sprite(G.haloM); h.scale.setScalar(30); g.add(m, c, h); g.userData.spin = c; g.userData.orb = m; }
  if (it.k !== 'k') { const b = new THREE.Mesh(G.beam, G.beamM[it.k].clone()); b.position.y = -0.5; g.add(b); g.userData.beam = b; }
  g.position.set(it.x, it.y, it.z); g.visible = false; scene.add(g); it.g = g;
};
/* ----- settle a roadside star onto a free spot once its chunk is loaded ----- */
Col.settle = function (it) {
  if (!Chunks.get(Math.floor(it.ox / CHUNK), Math.floor(it.oz / CHUNK))) return;
  let x = it.ox, z = it.oz, ok = !footBlockedAt(x, z);
  for (let r = 3; r <= 30 && !ok; r += (r < 12 ? 2 : 4)) for (let k = 0; k < 10 && !ok; k++) { const a = k * 0.628 + r * 0.7; x = it.ox + Math.cos(a) * r; z = it.oz + Math.sin(a) * r; ok = !footBlockedAt(x, z); }
  if (!ok && it.rx != null) { x = it.rx; z = it.rz; ok = true; }
  if (!ok) { x = it.ox; z = it.oz; }
  groundAt(x, z, _cg); it.x = x; it.z = z; it.y = _cg.h + 1.35; it.ok = true;
};
Col.have = (it) => !!colSave().got[it.id];
Col.count = function () {
  const c = { s: 0, p: 0, k: 0, ss: 0, ps: 0, ks: 0, f: 0, fs: COL_FISH.length, v: 0, vs: VDEF.length, t: 0, ts: VDEF.length }, S = colSave(), V = venSave();
  for (const it of Col.items) { c[it.k + 's']++; if (S.got[it.id]) c[it.k]++; }
  for (const f of COL_FISH) if (S.fish[f]) c.f++;
  for (const D of VDEF) { if (V.souv[D.game]) c.v++; if (S.prize['tr_' + D.game]) c.t++; }
  c.total = c.s + c.p + c.k + c.f + c.v + c.t; c.max = c.ss + c.ps + c.ks + c.fs + c.vs + c.ts; return c;
};
Col.sets = function () {
  const c = Col.count(), S = colSave(); let paid = 0;
  for (const st of COL_SETS) {
    if (S.prize[st.key]) continue; const need = st.need < 0 ? c.max : st.need; if (!need || st.cnt(c) < need) continue;
    S.prize[st.key] = 1; save.money += st.pay; paid += st.pay; UI.toast('🏆 ' + st.name + ' · +' + money(st.pay), 'good'); if (Snd.ok) { for (let i = 0; i < 4; i++) Snd.beep(660 + i * 165, 0.12); }
  }
  if (paid) writeSave(); return paid;
};
Col.collect = function (it) {
  const S = colSave(); if (S.got[it.id]) return; const K = COLK[it.k]; S.got[it.id] = 1; S.n = Object.keys(S.got).length; save.money += K.pay;
  const c = Col.count(); UI.toast(K.ico + ' ' + K.name + ' ' + c[it.k] + ' / ' + c[it.k + 's'] + ' · +' + money(K.pay), 'good'); writeSave();
  if (Snd.ok && Snd.ctx) { const t = Snd.ctx.currentTime; [880, 1175, 1568, 2093].forEach((f, i) => Snd.tone(t + i * 0.06, f, 0.28, 'triangle', 0.12, 6000, 0.004, Snd.sfx)); }
  if (typeof emit === 'function' && Part.spark) { const cc = lc(K.col); for (let i = 0; i < 26; i++) { const a = i * 0.9, u = 2 + (i % 5) * 1.2; emit(Part.spark, it.x, it.y, it.z, Math.cos(a) * u, 2 + (i % 4), Math.sin(a) * u, 0.9 + (i % 3) * 0.2, 0.5, 0, cc.r, cc.g, cc.b, 1, -6); } }
  if (it.g) it.g.visible = false; Col.sets();
};
Col.onFish = function (id, kg, isNew) { if (isNew) { UI.toast('🐟 New species logged · ' + (Ven.games.fish.api.SPEC[id] || { n: id }).n, 'good'); } Col.sets(); };
Col.onSouvenir = function (D) { UI.toast('🎁 Souvenir added to your Collection', 'good'); Col.sets(); };
Col.onWin = function (D, stake) {
  if (D.club) return;   /* dance clubs have no trophy shelf */
  const S = colSave(), key = 'tr_' + D.game, idx = D.stakes.indexOf(stake); if (idx < 2 || S.prize[key]) return;
  S.prize[key] = 1; writeSave(); UI.toast('🏆 Trophy won · ' + D.name, 'good'); Col.sets();
};
Col.reset = function () { for (const it of Col.items) { if (it.g) it.g.visible = false; } Col.near = null; };
/* ----- per frame ----- */
Col.update = function (dt, t) {
  if (!Col.ready) return; const S = colSave(), play = App.mode === 'play', px = Pl.x, pz = Pl.z, py = Pl.y, mode = Fly.on ? 'k' : Boat.on ? 'p' : 's';
  let nd = 1e9, ni = null;
  for (const it of Col.items) {
    if (S.got[it.id]) { if (it.g && it.g.visible) it.g.visible = false; continue; }
    const K = COLK[it.k], dx = it.x - px, dz = it.z - pz, h2 = dx * dx + dz * dz;
    if (h2 > K.vis * K.vis) { if (it.g && it.g.visible) it.g.visible = false; continue; }
    if (it.k === 's' && !it.ok) { if (h2 < 170 * 170) Col.settle(it); if (!it.ok) continue; }
    if (!it.g) Col.mesh(it); const g = it.g, U = g.userData, d = Math.sqrt(h2); g.visible = true;
    g.position.set(it.x, it.y + Math.sin(t * 1.8 + it.ph) * (it.k === 's' ? 0.16 : it.k === 'p' ? 0.12 : 0.6), it.z); if (U.spin) U.spin.rotation.y = t * (it.k === 'k' ? 0.7 : 1.6) + it.ph; if (U.ring) { const q = (t * 0.7 + it.ph) % 1; U.ring.scale.setScalar(1 + q * 3.2); U.ring.material.opacity = 0.5 * (1 - q); }
    if (U.beam) U.beam.material.opacity = 0.34 * (1 - sstep(it.k === 'p' ? 60 : 55, it.k === 'p' ? 140 : 120, d)) * sstep(3, 12, d); if (U.orb) { const k = 1 + 0.07 * Math.sin(t * 5 + it.ph); U.orb.scale.setScalar(k); }
    if (!play || it.k !== mode) continue;
    const dy = Math.abs(py - it.y), d3 = Math.sqrt(h2 + dy * dy);
    if (it.k === 's') { if (d < (Foot.on ? 3.4 : 5.8) && dy < 5) { Col.collect(it); continue; } }
    else if (it.k === 'p') { if (d < 9.5 && dy < 7) { Col.collect(it); continue; } }
    else if (d3 < 24) { Col.collect(it); continue; }
    const dd = it.k === 'k' ? d3 : d; if (dd < nd) { nd = dd; ni = it; }
  }
  /* proximity chime: quicker and higher as you close in */
  Col.near = ni; Col.nearD = nd;
  if (play && ni && nd < COLK[ni.k].ping) {
    Col.pingT -= dt; if (Col.pingT <= 0) { const q = nd / COLK[ni.k].ping; Col.pingT = 0.22 + q * 1.7; if (Snd.ok && Snd.ctx) { const tt = Snd.ctx.currentTime; Snd.tone(tt, 1300 + (1 - q) * 1100, 0.09, 'sine', 0.035 + (1 - q) * 0.07, 5000, 0.003, Snd.sfx); } }
  } else Col.pingT = 0;
};
/* ----- map ----- */
Col.drawMini = function (g) {
  if (!Col.ready) return; const m = g.getTransform(), sc = Math.hypot(m.a, m.b) || 0.3, S = colSave(), mode = Fly.on ? 'k' : Boat.on ? 'p' : 's', pu = 0.5 + 0.5 * Math.sin(App.time * 5);
  for (const it of Col.items) {
    if (it.k !== mode || S.got[it.id]) continue; const K = COLK[it.k], dx = it.x - Pl.x, dz = it.z - Pl.z, d = Math.hypot(dx, dz); if (d > K.ping * 1.1) continue;
    const q = 1 - d / (K.ping * 1.1); g.globalAlpha = 0.25 + 0.6 * q * (0.5 + pu * 0.5); g.strokeStyle = K.css; g.fillStyle = K.css; g.lineWidth = 2 / sc; g.beginPath(); g.arc(it.x, it.z, (7 + 7 * pu) / sc, 0, TAU); g.stroke(); g.beginPath(); g.arc(it.x, it.z, 3 / sc, 0, TAU); g.fill();
  } g.globalAlpha = 1;
};
Col.drawFull = function (g, k) {
  if (!Col.ready) return; const S = colSave(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = Math.round(13 * k) + 'px "Segoe UI Symbol","Segoe UI Emoji",sans-serif';
  for (const it of Col.items) { if (!S.got[it.id]) continue; const s = FM.toScreen(it.x, it.z), K = COLK[it.k]; g.lineWidth = 3 * k; g.strokeStyle = '#06090e'; g.strokeText(K.ico, s[0], s[1]); g.fillStyle = K.css; g.fillText(K.ico, s[0], s[1]); }
};
/* ----- the pause menu tab ----- */
Col.pane = function () {
  const c = Col.count(), S = colSave(), V = venSave(), pc = (a, b) => Math.round(100 * a / Math.max(1, b));
  let h = '<div class="sect">Collection · ' + c.total + ' of ' + c.max + ' found<span class="hint">Stars, pearls and sparks are hidden around the island · a chime sounds and the minimap glints when you are close</span></div><div class="colhd"><i style="width:' + pc(c.total, c.max) + '%"></i></div>';
  const card = (ico, col, name, a, b, note) => '<div class="card cham colc" style="--mc:' + col + '"><div class="ty">' + ico + ' ' + name + '</div><h3>' + a + ' / ' + b + '</h3><div class="colbar"><i style="width:' + pc(a, b) + '%;background:' + col + '"></i></div><p>' + note + '</p></div>';
  const nextSet = (list, val) => { for (const st of list) if (!S.prize[st.key]) return 'Next reward at ' + (st.need < 0 ? c.max : st.need) + ' → +' + money(st.pay) + ' · ' + st.name; return 'Every reward claimed'; };
  h += '<div class="colsets">' + card('★', COLK.s.css, 'Stars', c.s, c.ss, nextSet(COL_SETS.slice(0, 3))) + card('◉', COLK.p.css, 'Sea pearls', c.p, c.ps, S.prize.p10 ? 'Pearl Diver · claimed' : 'Boat over them · +' + money(2500) + ' for the set') + card('✦', COLK.k.css, 'Sky sparks', c.k, c.ks, S.prize.k10 ? 'Sky Chaser · claimed' : 'Fly through them · +' + money(2500) + ' for the set')
    + card('🐟', '#4fa86a', 'Fish log', c.f, c.fs, S.prize.f9 ? 'Master Angler · claimed' : 'Catch every species at Lakeshore · +' + money(3000)) + card('🎁', '#c78bff', 'Souvenirs', c.v, c.vs, S.prize.v7 ? 'Souvenir Hunter · claimed' : 'One from every town club · +' + money(2500)) + card('🏆', '#ffb02e', 'Trophies', c.t, c.ts, S.prize.t7 ? 'Club Champion · claimed' : 'Win a stake match at the second tier or higher · +' + money(4000)) + '</div>';
  const SPEC = (Ven.games.fish && Ven.games.fish.api && Ven.games.fish.api.SPEC) || {};
  h += '<div class="sect">Fish log · ' + c.f + ' of ' + c.fs + '<span class="hint">Cast into the rippling spots at Pike &amp; Lure, Lakeshore</span></div><div class="colfish">' + COL_FISH.map((f) => { const kg = S.fish[f], sp = SPEC[f] || { n: f, v: 0 }; return '<div class="colt' + (kg ? ' on' : '') + '"><b>' + (kg ? esc(sp.n) : '???') + '</b><small>' + (kg ? 'Best ' + kg + ' kg' : 'Not caught yet') + '</small></div>'; }).join('') + '</div>';
  h += '<div class="sect">Town clubs<span class="hint">One souvenir and one trophy per club</span></div><div class="colven">' + VDEF.map((D, i) => { const sv = !!V.souv[D.game], tr = !!S.prize['tr_' + D.game]; return '<div class="colv"><div class="ci">' + D.ico + '</div><div><b>' + esc(D.name) + '</b><small>' + esc(TOWN_NAMES[i] || '') + '</small></div><span class="' + (sv ? 'on' : '') + '">' + D.souv.ico + ' ' + (sv ? esc(D.souv.name) : 'Souvenir') + '</span><span class="' + (tr ? 'on' : '') + '">🏆 ' + (tr ? 'Trophy' : 'Stake ' + money(D.stakes[2]) + '+') + '</span></div>'; }).join('') + '</div>';
  h += '<div class="sect">Where to look<span class="hint">Rough areas only · the exact spot is for you to find</span></div>';
  for (const k of ['s', 'p', 'k']) {
    const K = COLK[k], list = Col.items.filter((it) => it.k === k), got = list.filter((it) => S.got[it.id]).length;
    h += '<details class="colhint"><summary><span style="color:' + K.css + '">' + K.ico + '</span> ' + K.pl + ' <em>' + got + ' / ' + list.length + '</em></summary><ul>' + list.map((it, i) => '<li class="' + (S.got[it.id] ? 'on' : '') + '"><span>' + K.ico + ' #' + (i + 1) + '</span>' + (S.got[it.id] ? 'Found' : esc(it.hint)) + '</li>').join('') + '</ul></details>';
  }
  return h;
};
