/* ================= MAP: pre-rendered island, minimap, full map ================= */
const WorldMap = { S: 420, EXT: 6400, base: null, g: null, H: null, row: 0, ready: false, stamp: 0 };
WorldMap.init = function () {
  const S = WorldMap.S; WorldMap.base = mkCanvas(S, S); WorldMap.g = WorldMap.base.getContext('2d'); WorldMap.H = new Float32Array(S * S); WorldMap.row = 0; WorldMap.ready = false;
};
/* sample a band of rows; returns true once the whole island is sampled and painted */
WorldMap.slice = function (ms) {
  const S = WorldMap.S, H = WorldMap.H, t0 = performance.now();
  while (WorldMap.row < S && performance.now() - t0 < ms) {
    const j = WorldMap.row++, z = (j / S - 0.5) * WorldMap.EXT;
    for (let i = 0; i < S; i++) H[j * S + i] = terrainHeight((i / S - 0.5) * WorldMap.EXT, z);
  }
  if (WorldMap.row < S) return false;
  const im = WorldMap.g.createImageData(S, S), d = im.data;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = j * S + i, h = H[k];
    const hl = H[j * S + Math.max(0, i - 1)], hr = H[j * S + Math.min(S - 1, i + 1)], hu = H[Math.max(0, j - 1) * S + i], hd = H[Math.min(S - 1, j + 1) * S + i];
    const sh = clamp(1 + ((hl - hr) * 0.7 + (hu - hd) * 0.7) * 0.035, 0.62, 1.45);
    let r, g, b;
    if (h < -0.4) { const t = clamp(-h / 22, 0, 1); r = 32 - 22 * t; g = 118 - 80 * t; b = 142 - 70 * t; }
    else if (h < 2.6) { r = 214; g = 198; b = 146; }
    else if (h < 85) { const t = clamp((h - 3) / 80, 0, 1); r = 78 - 22 * t; g = 128 - 34 * t; b = 70 - 20 * t; }
    else { const t = clamp((h - 85) / 80, 0, 1); r = 116 + 120 * t; g = 112 + 122 * t; b = 104 + 120 * t; }
    const w = h < -0.4 ? 1 : sh;
    const o = k * 4; d[o] = clamp(r * w, 0, 255); d[o + 1] = clamp(g * w, 0, 255); d[o + 2] = clamp(b * w, 0, 255); d[o + 3] = 255;
  }
  WorldMap.g.putImageData(im, 0, 0); WorldMap.ready = true; return true;
};

/* ---- minimap (heading-up) ---- */
const _mm = { x: 0, y: 0 };
function miniXY(x, z, c, sc, R) { const th = c.yaw - Math.PI, cs = Math.cos(th), sn = Math.sin(th), dx = x - c.x, dz = z - c.z; _mm.x = R + (dx * cs - dz * sn) * sc; _mm.y = R + (dx * sn + dz * cs) * sc; return _mm; }
WorldMap.drawMini = function (cv) {
  const g = cv.getContext('2d'), W = cv.width, R = W / 2, c = Pl;
  const range = Fly.on ? 420 + clamp(Math.abs(c.speed) * 4, 0, 520) : Boat.on ? 260 + clamp(Math.abs(c.speed) * 6, 0, 340) : (Foot.on ? 170 : 250) + clamp(Math.abs(c.speed) * 3.2, 0, 220), sc = R / range;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W); g.fillStyle = '#0a1118'; g.fillRect(0, 0, W, W);
  g.save(); g.translate(R, R); g.rotate(c.yaw - Math.PI); g.scale(sc, sc); g.translate(-c.x, -c.z);
  if (WorldMap.ready) { g.globalAlpha = 0.92; g.imageSmoothingEnabled = true; g.drawImage(WorldMap.base, -WorldMap.EXT / 2, -WorldMap.EXT / 2, WorldMap.EXT, WorldMap.EXT); g.globalAlpha = 1; }
  g.fillStyle = 'rgba(6,10,16,0.34)'; g.fillRect(c.x - range * 1.6, c.z - range * 1.6, range * 3.2, range * 3.2);
  /* roads */
  const st = ++WorldMap.stamp, cr = Math.ceil(range * 1.45 / SEGC), ix0 = Math.floor(c.x / SEGC), iz0 = Math.floor(c.z / SEGC);
  const hw = new Path2D(), sr = new Path2D();
  for (let dz = -cr; dz <= cr; dz++) for (let dx = -cr; dx <= cr; dx++) {
    const arr = segHash.get(sk(ix0 + dx, iz0 + dz)); if (!arr) continue;
    for (let k = 0; k < arr.length; k++) { const s = segs[arr[k]]; if (s._st === st) continue; s._st = st; const p = roads[s.road].kind === 'hw' ? hw : sr; p.moveTo(s.ax, s.az); p.lineTo(s.ax + s.dx, s.az + s.dz); }
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(8,12,18,0.9)'; g.lineWidth = 17; g.stroke(hw); g.lineWidth = 12; g.stroke(sr);
  g.strokeStyle = '#d9dee6'; g.lineWidth = 11; g.stroke(hw); g.strokeStyle = '#a9b2bf'; g.lineWidth = 7.5; g.stroke(sr);
  if (GAR.ok) { g.fillStyle = 'rgba(255,176,46,0.9)'; g.fillRect(GAR.ox - 21, GAR.oz - 31, 42, 32); g.fillStyle = '#06090e'; g.fillRect(GAR.ox - 4, GAR.oz - 3, 8, 3); }
  Shop.drawMini(g); Ven.drawMini(g); Air.drawMini(g); Wk.drawMini(g); Dock.drawMini(g); Track.drawMini(g); Col.drawMini(g);
  /* route */
  if (Target.on) {
    g.strokeStyle = '#33d4ff'; g.lineWidth = 8; g.setLineDash([]); g.beginPath();
    if (GPS.pts && GPS.pts.length > 1) { g.moveTo(GPS.pts[0].x, GPS.pts[0].z); for (let i = 1; i < GPS.pts.length; i++) g.lineTo(GPS.pts[i].x, GPS.pts[i].z); }
    else { g.setLineDash([22, 18]); g.moveTo(c.x, c.z); g.lineTo(Target.x, Target.z); }
    g.stroke(); g.setLineDash([]);
  }
  g.restore();
  /* icons (upright) */
  g.lineWidth = 3;
  const icon = (x, z, col, r, clampEdge) => {
    const p = miniXY(x, z, c, sc, R); let px = p.x, py = p.y; const dx = px - R, dy = py - R, d = Math.hypot(dx, dy);
    if (d > R - r - 4) { if (!clampEdge) return; px = R + dx / d * (R - r - 4); py = R + dy / d * (R - r - 4); }
    g.fillStyle = col; g.strokeStyle = '#06090e'; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.stroke();
  };
  if (!Mi) for (const mk of MView.markers) icon(mk.m.x, mk.m.z, MT[mk.m.type].col, 10, false);
  if (Mi && Mi.rival) icon(Mi.rival.x, Mi.rival.z, '#ff4d5e', 8, true);
  if (Mi && Mi.cps[Mi.idx + 1]) icon(Mi.cps[Mi.idx + 1].x, Mi.cps[Mi.idx + 1].z, '#ffffff', 6, false);
  if (Target.on) icon(Target.x, Target.z, Mi ? MT[Mi.type].col : '#33d4ff', 11, true);
  if (Boat.inited) for (const P of Boat.boats) if (Boat.owned(P.id) && !(Boat.on && Boat.p === P)) icon(P.x, P.z, '#2aa8d6', 6, Foot.on);
  VM.mini(icon);
  /* race: every rival as a dot in its own paint colour with its running position; a white ring marks the cars ahead of you, and a car off the map sticks to the rim */
  if (Race.on && Bots.on && Race.me) {
    g.font = '700 17px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3.5;
    for (const b of Bots.list) {
      const e = b.e; if (!e) continue; const p = miniXY(b.c.x, b.c.z, c, sc, R); let px = p.x, py = p.y; const dx = px - R, dy = py - R, d = Math.hypot(dx, dy), r = 13;
      if (d > R - r - 3) { px = R + dx / d * (R - r - 3); py = R + dy / d * (R - r - 3); }
      const ahead = e.prog > Race.me.prog, lum = ((b.hex >> 16) & 255) * 0.3 + ((b.hex >> 8) & 255) * 0.59 + (b.hex & 255) * 0.11;
      g.fillStyle = _hexCss(b.hex); g.strokeStyle = ahead ? '#ffffff' : '#06090e'; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = lum > 120 ? '#06090e' : '#ffffff'; g.fillText(String(e.pos || ''), px, py + 0.5);
    }
  }
  if (Foot.on) { icon(car.x, car.z, '#ffb02e', 7, true); for (const p of Peds.list) if (p.state === 'walk' || p.state === 'stand' || p.state === 'wait' || p.state === 'talk') icon(p.x, p.z, p.reg ? '#ff7aa2' : p === Foot.target ? '#ffffff' : 'rgba(255,255,255,0.55)', p.reg ? 6 : p === Foot.target ? 5 : 3, !!p.reg); }
  /* police blips: they flash red and blue while you are being hunted */
  if (Wanted.stars > 0) { const fl = Math.floor(App.time * 3) % 2 ? '#ff4d5e' : '#4d7bff'; for (const u of Police.units) if (!u.blk && u.mode !== 'dead' && u.mode !== 'leave') icon(u.x, u.z, fl, 6, true); if (Police.heli && !Police.heli.leaving) icon(Police.heli.x, Police.heli.z, '#ffffff', 7, true); }
  /* player arrow */
  g.save(); g.translate(R, R); g.fillStyle = '#ffb02e'; g.strokeStyle = '#06090e'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -17); g.lineTo(12, 13); g.lineTo(0, 7); g.lineTo(-12, 13); g.closePath(); g.stroke(); g.fill(); g.restore();
};

/* ---- full map ---- */
const FM = { cx: 0, cz: 0, zoom: 1, w: 1, h: 1, ppm: 0.1, drag: null };
FM.toScreen = function (x, z) { return [(x - FM.cx) * FM.ppm + FM.w / 2, (z - FM.cz) * FM.ppm + FM.h / 2]; };
FM.toWorld = function (sx, sy) { return [(sx - FM.w / 2) / FM.ppm + FM.cx, (sy - FM.h / 2) / FM.ppm + FM.cz]; };
FM.fit = function (cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(50, Math.round(r.width * dpr)), h = Math.max(50, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  FM.w = w; FM.h = h; FM.dpr = dpr; FM.ppm = Math.min(w, h) / 5600 * FM.zoom;
};
WorldMap.drawFull = function (cv) {
  FM.fit(cv); const g = cv.getContext('2d'), W = FM.w, H = FM.h, k = FM.dpr, c = Pl;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0a1d2c'; g.fillRect(0, 0, W, H);
  const a = FM.toScreen(-WorldMap.EXT / 2, -WorldMap.EXT / 2);
  if (WorldMap.ready) { g.imageSmoothingEnabled = true; g.drawImage(WorldMap.base, a[0], a[1], WorldMap.EXT * FM.ppm, WorldMap.EXT * FM.ppm); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = new Path2D();
  for (const r of roads) { if (r.kind !== 'hw') continue; r.pts.forEach((p, i) => { const s = FM.toScreen(p.x, p.z); if (i) path.lineTo(s[0], s[1]); else path.moveTo(s[0], s[1]); }); }
  g.strokeStyle = 'rgba(6,9,14,0.85)'; g.lineWidth = 5.5 * k; g.stroke(path); g.strokeStyle = '#e4e8ee'; g.lineWidth = 2.6 * k; g.stroke(path);
  if (FM.zoom > 2.2) {
    const sp = new Path2D(); for (const r of roads) { if (r.kind === 'hw') continue; r.pts.forEach((p, i) => { const s = FM.toScreen(p.x, p.z); if (i) sp.lineTo(s[0], s[1]); else sp.moveTo(s[0], s[1]); }); }
    g.strokeStyle = 'rgba(210,216,226,0.85)'; g.lineWidth = 1.6 * k; g.stroke(sp);
  }
  g.font = '700 ' + Math.round(14 * k) + 'px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const T of towns) {
    const s = FM.toScreen(T.cx, T.cz), hs = T.half * FM.ppm; g.fillStyle = 'rgba(255,176,46,0.28)'; g.strokeStyle = '#ffb02e'; g.lineWidth = 1.5 * k; g.fillRect(s[0] - hs, s[1] - hs, hs * 2, hs * 2); g.strokeRect(s[0] - hs, s[1] - hs, hs * 2, hs * 2);
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText(T.name.toUpperCase(), s[0], s[1] - hs - 10 * k); g.fillText(T.name.toUpperCase(), s[0], s[1] - hs - 10 * k);
  }
  Air.drawFull(g, k); Track.drawFull(g, k); Ven.drawFull(g, k); Col.drawFull(g, k); Dock.drawFull(g, k); Boat.drawFullIcons(g, k); VM.full(g, k);
  if (GAR.ok) { const s = FM.toScreen(GAR.ox, GAR.oz - 15), u = k * 1.1; g.fillStyle = '#ffb02e'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(s[0] - 9 * u, s[1] + 7 * u); g.lineTo(s[0] - 9 * u, s[1] - 2 * u); g.lineTo(s[0], s[1] - 10 * u); g.lineTo(s[0] + 9 * u, s[1] - 2 * u); g.lineTo(s[0] + 9 * u, s[1] + 7 * u); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#06090e'; g.fillRect(s[0] - 4 * u, s[1] + 0.5 * u, 8 * u, 6.5 * u); if (FM.zoom > 1.8) { g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3 * k; g.strokeText('HOME', s[0], s[1] + 19 * u); g.fillText('HOME', s[0], s[1] + 19 * u); } } Shop.drawMap(g, k);
  if (GPS.pts && Target.on) { g.strokeStyle = '#33d4ff'; g.lineWidth = 3 * k; g.beginPath(); GPS.pts.forEach((p, i) => { const s = FM.toScreen(p.x, p.z); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.stroke(); }
  for (const mk of MView.markers) {
    const m = mk.m, s = FM.toScreen(m.x, m.z), done = save.done[m.id]; g.fillStyle = MT[m.type].col; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k;
    g.beginPath(); g.arc(s[0], s[1], 8 * k, 0, TAU); g.fill(); g.stroke();
    if (done) { g.fillStyle = '#06090e'; g.font = '700 ' + Math.round(11 * k) + 'px Rajdhani, sans-serif'; g.fillText('✓', s[0], s[1] + 0.5 * k); g.font = '700 ' + Math.round(14 * k) + 'px Rajdhani, sans-serif'; }
  }
  if (Waypoint.on) { const s = FM.toScreen(Waypoint.x, Waypoint.z); g.fillStyle = '#33d4ff'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[0] - 8 * k, s[1] - 18 * k); g.lineTo(s[0] + 8 * k, s[1] - 18 * k); g.closePath(); g.fill(); g.stroke(); }
  if (Race.on && Bots.on && Race.me) {
    g.font = '700 ' + Math.round(11 * k) + 'px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 2.5 * k;
    for (const b of Bots.list) {
      const e = b.e; if (!e) continue; const s = FM.toScreen(b.c.x, b.c.z), lum = ((b.hex >> 16) & 255) * 0.3 + ((b.hex >> 8) & 255) * 0.59 + (b.hex & 255) * 0.11;
      g.fillStyle = _hexCss(b.hex); g.strokeStyle = e.prog > Race.me.prog ? '#ffffff' : '#06090e'; g.beginPath(); g.arc(s[0], s[1], 8 * k, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = lum > 120 ? '#06090e' : '#ffffff'; g.fillText(String(e.pos || ''), s[0], s[1] + 0.5 * k);
    }
  }
  const p = FM.toScreen(c.x, c.z); if (Foot.on) { const q = FM.toScreen(car.x, car.z); g.fillStyle = '#ffb02e'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.fillRect(q[0] - 5 * k, q[1] - 5 * k, 10 * k, 10 * k); g.strokeRect(q[0] - 5 * k, q[1] - 5 * k, 10 * k, 10 * k); } g.save(); g.translate(p[0], p[1]); g.rotate(Math.PI - c.yaw); g.fillStyle = '#ffb02e'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k;
  g.beginPath(); g.moveTo(0, -11 * k); g.lineTo(8 * k, 9 * k); g.lineTo(0, 4 * k); g.lineTo(-8 * k, 9 * k); g.closePath(); g.stroke(); g.fill(); g.restore();
};
