/* ================= HOME GARAGE: drive-in building, parked cars, valet swaps ================= */
/* local frame: origin on the inside face of the front wall at the door centre, x = east, z = south (so the hall runs to -z). */
const GAR = { W: 40, D: 30, H: 5.5, DW: 4, DH: 4.2, T: 1, S: 0.12, ok: false, ox: 0, oz: 0, y: 0, door: 0, edit: false, inside: false, dist: 1e9, nearId: null, sig: '', dirty: true, cars: {}, disp: [], t: 0, trophies: -1, sigT: 0, plates: [], styled: false };
const GP = {
  wall: [0xd8d4cb, 0xb4bac3, 0x6f7a86, 0x232b38, 0xa13232, 0x2f6b50, 0xc99a45, 0x3d5fa8],
  wallN: ['Warm white', 'Silver', 'Slate', 'Midnight', 'Brick', 'Racing green', 'Mustard', 'Cobalt'],
  ext: [0xa59f90, 0x586170, 0x353c47, 0x8f3a2a, 0x2f6049, 0x365a98],
  extN: ['Sand', 'Slate', 'Charcoal', 'Terracotta', 'Pine', 'Blue'],
  trim: [0xffb02e, 0xe63946, 0x33d4ff, 0xf4f4f4, 0x6bdc58, 0xb06bff],
  trimN: ['Amber', 'Red', 'Cyan', 'White', 'Green', 'Violet'],
  light: [0xfff1d6, 0xffffff, 0xcfe6ff, 0xffc078, 0xff9be4, 0x9be8ff],
  lightN: ['Warm', 'Neutral', 'Cool', 'Amber', 'Pink', 'Ice'],
  floor: ['Concrete', 'Epoxy', 'Checker', 'Timber'],
  decor: [['posters', 'Posters'], ['tools', 'Tool wall'], ['tyres', 'Tyre stacks'], ['rug', 'Rug'], ['trophies', 'Trophy shelf'], ['plants', 'Plants']],
  cost: { 6: 1500, 8: 3000 }
};
const GAR_DEF = () => ({ wall: 0, ext: 1, trim: 0, floor: 0, light: 0, neon: 3, sign: 'HOME GARAGE', bays: 4, decor: { posters: 1, tools: 1, tyres: 1, rug: 1, trophies: 1, plants: 1 }, slots: {} });
const Home = {};
const _gm4 = new THREE.Matrix4(), _gq4 = new THREE.Quaternion(), _gv3 = new THREE.Vector3(), _gs3 = new THREE.Vector3(), _gcol = { r: 1, g: 1, b: 1 };

/* ---------- bays ---------- */
function gBay(i, def) {
  const L = def ? def.body.L : 4.6, hw = def ? def.body.W / 2 : 1.0, W = GAR.W, D = GAR.D;
  if (i < 4) return { x: [-13.5, -4.5, 4.5, 13.5][i], z: -D + 1.5 + L / 2, yaw: 0, hx: hw, hz: L / 2 };
  if (i < 6) return { x: -W / 2 + 1.5 + L / 2, z: [-9, -18][i - 4], yaw: Math.PI / 2, hx: L / 2, hz: hw };
  return { x: W / 2 - 1.5 - L / 2, z: [-9, -18][i - 6], yaw: -Math.PI / 2, hx: L / 2, hz: hw };
}
Home.bayWorld = function (i, def) { const p = gBay(i, def); return { x: GAR.ox + p.x, z: GAR.oz + p.z, yaw: p.yaw }; };
function gAssign() {
  const G = save.gar, slots = G.slots, taken = new Set();
  for (const id in slots) { if (!save.owned[id] || slots[id] >= G.bays || taken.has(slots[id])) delete slots[id]; else taken.add(slots[id]); }
  for (const d of CARS) if (save.owned[d.id] && slots[d.id] == null) for (let b = 0; b < G.bays; b++) if (!taken.has(b)) { slots[d.id] = b; taken.add(b); break; }
}

/* ---------- placement in the town (called once the world is generated) ---------- */
Home.setup = function () {
  const T = towns[0], bs = T.cell - 14;
  GAR.tid = T.id; GAR.bi = 3; GAR.bj = 2; GAR.bs = bs;
  GAR.bx0 = T.x0 + GAR.bi * T.cell + 7; GAR.bz0 = T.z0 + GAR.bj * T.cell + 7;
  GAR.ox = GAR.bx0 + bs / 2; GAR.oz = GAR.bz0 + bs - 15; GAR.y = T.baseH; GAR.town = T.name; GAR.ok = true;
};
Home.isBlock = function (T, i, j) { return GAR.ok && T.id === GAR.tid && i === GAR.bi && j === GAR.bj; };
/* collision boxes: walls + parked display cars (flagged .h so they can be refreshed in place) */
Home.cols = function (ch) {
  if (!GAR.ok) return;
  const b = ch.cols.b, x0 = ch.x0, z0 = ch.z0, x1 = x0 + CHUNK, z1 = z0 + CHUNK, W = GAR.W / 2, D = GAR.D, T = GAR.T, S = GAR.S, DW = GAR.DW;
  for (let i = b.length - 1; i >= 0; i--) if (b[i].h) b.splice(i, 1);
  const add = (a, c, d, e, yb, yt) => { const o = [GAR.ox + a, GAR.oz + c, GAR.ox + d, GAR.oz + e, GAR.y + yt, GAR.y + yb, 0, 0, 0]; if (o[2] < x0 || o[0] > x1 || o[3] < z0 || o[1] > z1) return; o.h = 1; b.push(o); };
  const H = GAR.H, wt = H + 0.9;
  add(-W - T, -D - T, W + T, -D + S, 0, wt); add(-W - T, -D, -W + S, T, 0, wt); add(W - S, -D, W + T, T, 0, wt); add(-W, 0, -DW, T, 0, wt); add(DW, 0, W, T, 0, wt);
  add(-DW, 0, DW, T, GAR.DH, wt); add(-W - T - 0.3, -D - T - 0.3, W + T + 0.3, T + 0.3, H - 0.5, wt);   /* lintel over the door, then the roof slab */
  for (const d of GAR.disp) add(d.x - d.hx, d.z - d.hz, d.x + d.hx, d.z + d.hz, 0, 1.8);
};
Home.syncCols = function () { if (!GAR.ok) return; for (const ch of Chunks.map.values()) Home.cols(ch); };
/* trees round the compound (called while a chunk builds the garage block) */
Home.trees = function (ch, gbP) {
  const r = mulberry32(4242), bx = GAR.bx0, bz = GAR.bz0, bs = GAR.bs, pts = [];
  for (let k = 0; k < 7; k++) pts.push([bx + 5 + k * ((bs - 10) / 6), bz + 4]);
  for (let k = 0; k < 3; k++) { pts.push([bx + 4, bz + 14 + k * 11]); pts.push([bx + bs - 4, bz + 14 + k * 11]); }
  for (const [x, z] of pts) { if (x < ch.x0 || x >= ch.x0 + CHUNK || z < ch.z0 || z >= ch.z0 + CHUNK) continue; addTree(gbP, ch.gbF, 'oak', (r() * 5) | 0, x, GAR.y, z, 0.8 + r() * 0.5, r() * TAU, r(), 1, r(), ch); }
};

/* ---------- textures ---------- */
function gFloorTex(kind) {
  const c = mkCanvas(256, 256), g = c.getContext('2d'), r = mulberry32(31 + kind * 7);
  if (kind === 0) { g.fillStyle = '#9a9a96'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { const v = 120 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); } g.fillStyle = 'rgba(40,40,40,0.5)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256); }
  else if (kind === 1) { g.fillStyle = '#2b2e34'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1800; i++) { const v = 30 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v + 8},0.4)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); } g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256); }
  else if (kind === 2) { for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { g.fillStyle = (a + b) % 2 ? '#1c1d21' : '#e9e9e4'; g.fillRect(a * 64, b * 64, 64, 64); } for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * 256, r() * 256, 2, 2); } }
  else { const cols = ['#8a5a34', '#7a4c2a', '#97663c', '#6f4426']; for (let k = 0; k < 8; k++) { g.fillStyle = cols[(r() * 4) | 0]; g.fillRect(0, k * 32, 256, 32); for (let n = 0; n < 160; n++) { g.fillStyle = `rgba(40,20,5,${r() * 0.18})`; g.fillRect(r() * 256, k * 32 + r() * 32, 10 + r() * 30, 1); } const j = (r() * 200) | 0; g.fillStyle = 'rgba(20,10,0,0.55)'; g.fillRect(j, k * 32, 2, 32); g.fillRect(0, k * 32, 256, 1.5); } }
  const t = canvasTex(c); return t;
}
function gSignTex(text, hex, w, h, plain) {
  const cv = mkCanvas(w, h), g = cv.getContext('2d'), col = '#' + hex.toString(16).padStart(6, '0');
  if (!plain) { g.fillStyle = 'rgba(6,8,12,0.9)'; g.fillRect(0, 0, w, h); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); }
  let fs = h * 0.62; g.font = '700 ' + fs + 'px Rajdhani, "Arial Narrow", Arial, sans-serif'; const lim = w * 0.88; while (g.measureText(text).width > lim && fs > 12) { fs -= 4; g.font = '700 ' + fs + 'px Rajdhani, "Arial Narrow", Arial, sans-serif'; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = h * 0.2; g.fillStyle = col; g.fillText(text, w / 2, h / 2 + h * 0.03); g.shadowBlur = h * 0.05; g.fillStyle = '#fff'; g.globalAlpha = 0.85; g.fillText(text, w / 2, h / 2 + h * 0.03);
  const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function gPosterTex(k) {
  const cv = mkCanvas(220, 150), g = cv.getContext('2d');
  if (k === 0) { const gr = g.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, '#2d1b5e'); gr.addColorStop(0.55, '#ff6a3d'); gr.addColorStop(1, '#ffd36b'); g.fillStyle = gr; g.fillRect(0, 0, 220, 150); g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(110, 84, 30, 0, TAU); g.fill(); g.fillStyle = '#14101c'; g.beginPath(); g.moveTo(0, 150); g.lineTo(0, 100); g.lineTo(100, 90); g.lineTo(120, 90); g.lineTo(220, 100); g.lineTo(220, 150); g.fill(); g.fillStyle = '#14101c'; g.beginPath(); g.moveTo(80, 150); g.lineTo(106, 92); g.lineTo(114, 92); g.lineTo(140, 150); g.fill(); g.fillStyle = '#ffd36b'; for (let i = 0; i < 4; i++) g.fillRect(108, 96 + i * 14, 4, 7); g.fillStyle = '#fff'; g.font = '700 30px Arial'; g.textAlign = 'center'; g.fillText('ISLAND RUSH', 110, 36); }
  else if (k === 1) { g.fillStyle = '#0d2a4a'; g.fillRect(0, 0, 220, 150); g.strokeStyle = 'rgba(120,190,255,0.25)'; g.lineWidth = 1; for (let x = 0; x < 220; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 150); g.stroke(); } for (let y = 0; y < 150; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(220, y); g.stroke(); } g.strokeStyle = '#8fd0ff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(26, 98); g.lineTo(34, 80); g.lineTo(78, 72); g.lineTo(100, 50); g.lineTo(150, 50); g.lineTo(176, 74); g.lineTo(198, 80); g.lineTo(200, 98); g.closePath(); g.stroke(); g.beginPath(); g.arc(62, 100, 14, 0, TAU); g.stroke(); g.beginPath(); g.arc(164, 100, 14, 0, TAU); g.stroke(); g.fillStyle = '#8fd0ff'; g.font = '700 18px Arial'; g.fillText('GT-01  /  1400 KG', 24, 30); g.font = '12px Arial'; g.fillText('FIG. 3 · DRIVETRAIN', 24, 132); }
  else if (k === 2) { for (let a = 0; a < 11; a++) for (let b = 0; b < 3; b++) { g.fillStyle = (a + b) % 2 ? '#111' : '#f2f2f2'; g.fillRect(a * 20, b * 20, 20, 20); } g.fillStyle = '#d62828'; g.fillRect(0, 60, 220, 90); g.fillStyle = '#fff'; g.font = '700 38px Arial'; g.textAlign = 'center'; g.fillText('RACE DAY', 110, 112); g.font = '700 14px Arial'; g.fillText('SATURDAY · PORT MARLOW', 110, 136); }
  else { g.fillStyle = '#12303f'; g.fillRect(0, 0, 220, 150); g.fillStyle = '#2f7d47'; g.beginPath(); g.moveTo(30, 90); g.bezierCurveTo(40, 30, 120, 20, 170, 46); g.bezierCurveTo(205, 70, 180, 126, 110, 128); g.bezierCurveTo(60, 130, 28, 120, 30, 90); g.fill(); g.strokeStyle = '#e8e8e8'; g.lineWidth = 2; g.beginPath(); g.moveTo(52, 96); g.lineTo(90, 70); g.lineTo(130, 78); g.lineTo(168, 56); g.stroke(); g.fillStyle = '#ffb02e'; for (const [x, y] of [[52, 96], [90, 70], [130, 78], [168, 56]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } g.fillStyle = '#fff'; g.font = '700 16px Arial'; g.fillText('SEVEN TOWNS', 12, 22); }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.strokeRect(0, 0, 220, 150); const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function gHazardTex() {
  const cv = mkCanvas(128, 192), g = cv.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, 0, 128, 192); g.save(); g.beginPath(); g.rect(0, 0, 128, 192); g.rect(14, 14, 100, 164); g.clip('evenodd'); g.fillStyle = '#f2c230'; g.fillRect(0, 0, 128, 192); g.fillStyle = '#1a1a1a'; for (let i = -12; i < 24; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 8, 0); g.lineTo(i * 16 + 8 + 192, 192); g.lineTo(i * 16 + 192, 192); g.closePath(); g.fill(); } g.restore();
  const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function gPlateDraw(p, text, sub, locked) {
  const g = p.g, w = 256, h = 64; g.clearRect(0, 0, w, h); g.fillStyle = locked ? 'rgba(40,30,10,0.92)' : 'rgba(8,10,14,0.88)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = locked ? '#f2c230' : '#' + GP.trim[save.gar.trim].toString(16).padStart(6, '0'); g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = locked ? '#f2c230' : '#fff'; g.font = '700 25px Rajdhani, "Arial Narrow", Arial, sans-serif'; g.fillText(text, w / 2, 24);
  g.fillStyle = locked ? '#d8c27a' : '#9fb0c4'; g.font = '600 17px Rajdhani, "Arial Narrow", Arial, sans-serif'; g.fillText(sub, w / 2, 47); p.tex.needsUpdate = true;
}

/* ---------- geometry helpers (merged, vertex-coloured) ---------- */
function gfb(g, x0, y0, z0, x1, y1, z1, c) {
  c = c || [1, 1, 1]; g.box(x0, y0, z0, x1, y1, z1, c[0], c[1], c[2]);
  g.quadA([x0, y0, z0, 0, 0], [x1, y0, z0, 0, 0], [x1, y0, z1, 0, 0], [x0, y0, z1, 0, 0], 0, -1, 0, c[0] * 0.6, c[1] * 0.6, c[2] * 0.6);
}
function gcyl(g, x, y, z, r0, r1, h, c, seg) {
  const geo = ni(new THREE.CylinderGeometry(r1, r0, h, seg || 10, 1)); _gm4.compose(_gv3.set(x, y + h / 2, z), _gq4.identity(), _gs3.set(1, 1, 1)); _gcol.r = c[0]; _gcol.g = c[1]; _gcol.b = c[2]; g.geo(geo, _gm4, _gcol, 0.25); geo.dispose();
}
function gblob(g, x, y, z, sx, sy, sz, c) {
  const geo = ni(new THREE.IcosahedronGeometry(1, 1)); _gm4.compose(_gv3.set(x, y, z), _gq4.identity(), _gs3.set(sx, sy, sz)); _gcol.r = c[0]; _gcol.g = c[1]; _gcol.b = c[2]; g.geo(geo, _gm4, _gcol, 0.3); geo.dispose();
}
const gcol = (hex) => { const c = lc(hex); return [c.r, c.g, c.b]; };

/* ---------- build the building ---------- */
Home.build = function () {
  if (GAR.group) return;
  const W = GAR.W, hW = W / 2, D = GAR.D, H = GAR.H, T = GAR.T, S = GAR.S, DW = GAR.DW, DH = GAR.DH;
  const grp = GAR.group = new THREE.Group(); grp.position.set(GAR.ox, GAR.y, GAR.oz);
  const inner = GAR.inner = new THREE.Group(), outer = GAR.outer = new THREE.Group(); grp.add(outer, inner);
  GAR.carsG = new THREE.Group(); inner.add(GAR.carsG);
  const stdm = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9, metalness: 0 }, o));
  const M = GAR.m = {
    wall: stdm({ roughness: 0.93 }), ext: stdm({ roughness: 0.88 }), trim: stdm({ roughness: 0.55, metalness: 0.15 }), dark: stdm({ roughness: 0.8 }), deco: stdm({ roughness: 0.7, metalness: 0.1 }),
    floor: new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    led: new THREE.MeshBasicMaterial({ color: 0xffffff }), neon: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    door: new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.12, color: 0x868c96 }),
    sign: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    sign2: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    rug: new THREE.MeshStandardMaterial({ roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    apron: new THREE.MeshStandardMaterial({ roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    glass: new THREE.MeshBasicMaterial({ color: 0x10202c, vertexColors: true }),
    sign3: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    hazard: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })
  };
  const wh = [1, 1, 1], K = (n) => [n, n, n];
  /* shell */
  const gE = new GB(0, 0, false), gW = new GB(0, 0, false), gT = new GB(0, 0, false), gC = new GB(0, 0, false), gLd = new GB(0, 0, false), gN = new GB(0, 0, false), gK = new GB(0, 0, false);
  gfb(gE, -hW - T, 0, -D - T, hW + T, H, -D, wh); gfb(gE, -hW - T, 0, -D, -hW, H, T, wh); gfb(gE, hW, 0, -D, hW + T, H, T, wh); gfb(gE, -hW, 0, 0, -DW, H, T, wh); gfb(gE, DW, 0, 0, hW, H, T, wh); gfb(gE, -DW, DH, 0, DW, H, T, wh);
  gfb(gW, -hW, 0, -D, hW, H, -D + S, wh); gfb(gW, -hW, 0, -D + S, -hW + S, H, 0, wh); gfb(gW, hW - S, 0, -D + S, hW, H, 0, wh);
  gfb(gW, -hW + S, 0, -S, -DW, H, 0, wh); gfb(gW, DW, 0, -S, hW - S, H, 0, wh); gfb(gW, -DW, DH, -S, DW, H, 0, wh);
  /* trim: door frame, interior base + stripe, exterior band */
  gfb(gT, -DW - 0.3, 0, -0.05, -DW, DH + 0.3, T + 0.06, wh); gfb(gT, DW, 0, -0.05, DW + 0.3, DH + 0.3, T + 0.06, wh); gfb(gT, -DW - 0.3, DH, -0.05, DW + 0.3, DH + 0.3, T + 0.06, wh);
  for (const [y0, y1] of [[0, 0.32], [1.05, 1.17]]) {
    gfb(gT, -hW + S, y0, -D + S, hW - S, y1, -D + S + 0.05, wh); gfb(gT, -hW + S, y0, -D + S, -hW + S + 0.05, y1, -S, wh); gfb(gT, hW - S - 0.05, y0, -D + S, hW - S, y1, -S, wh);
    gfb(gT, -hW + S, y0, -S - 0.05, -DW, y1, -S, wh); gfb(gT, DW, y0, -S - 0.05, hW - S, y1, -S, wh);
  }
  const eb = H - 1.0, ee = H - 0.8;
  gfb(gT, -hW - T - 0.04, eb, -D - T - 0.04, hW + T + 0.04, ee, -D - T, wh); gfb(gT, -hW - T - 0.04, eb, -D - T, -hW - T, ee, T + 0.04, wh); gfb(gT, hW + T, eb, -D - T, hW + T + 0.04, ee, T + 0.04, wh); gfb(gT, -hW - T - 0.04, eb, T, hW + T + 0.04, ee, T + 0.04, wh);
  /* roof, ceiling beams, parapet */
  gfb(gC, -hW - T - 0.3, H, -D - T - 0.3, hW + T + 0.3, H + 0.3, T + 0.3, K(0.2));
  for (let k = 0; k < 5; k++) gfb(gC, -hW, H - 0.5, -5 - k * 5 - 0.2, hW, H, -5 - k * 5 + 0.2, K(0.26));
  gfb(gE, -hW - T - 0.3, H + 0.3, -D - T - 0.3, hW + T + 0.3, H + 0.9, -D - T, wh); gfb(gE, -hW - T - 0.3, H + 0.3, T, hW + T + 0.3, H + 0.9, T + 0.3, wh); gfb(gE, -hW - T - 0.3, H + 0.3, -D - T, -hW - T, H + 0.9, T + 0.3, wh); gfb(gE, hW + T, H + 0.3, -D - T, hW + T + 0.3, H + 0.9, T + 0.3, wh);
  gfb(gK, -9, H + 0.9, -22, -3, H + 1.9, -17, K(0.55)); gfb(gK, 6, H + 0.9, -12, 14, H + 2.1, -7, K(0.5)); gfb(gK, 10, H + 0.9, -26, 13, H + 1.5, -23, K(0.45));
  /* light panels + neon */
  for (const zc of [-7.5, -12.5, -17.5, -22.5]) for (const xc of [-12, 0, 12]) gfb(gLd, xc - 3, H - 0.58, zc - 0.28, xc + 3, H - 0.5, zc + 0.28, wh);
  const nh = H - 0.26;
  gfb(gN, -hW + S, nh, -D + S, hW - S, nh + 0.09, -D + S + 0.1, wh); gfb(gN, -hW + S, nh, -D + S, -hW + S + 0.1, nh + 0.09, -S, wh); gfb(gN, hW - S - 0.1, nh, -D + S, hW - S, nh + 0.09, -S, wh); gfb(gN, -hW + S, nh, -S - 0.1, hW - S, nh + 0.09, -S, wh);
  gfb(gN, -hW + S, 0.4, -D + S, hW - S, 0.47, -D + S + 0.1, wh); gfb(gN, -hW + S, 0.4, -D + S, -hW + S + 0.1, 0.47, -S, wh); gfb(gN, hW - S - 0.1, 0.4, -D + S, hW - S, 0.47, -S, wh);
  GAR.neonG = gN.mesh(M.neon, false, false);
  outer.add(gE.mesh(M.ext, true, true), gC.mesh(M.dark, true, true), gT.mesh(M.trim, false, true), gK.mesh(M.dark, false, true));
  inner.add(gW.mesh(M.wall, false, true), gLd.mesh(M.led, false, false), GAR.neonG);
  { const gGl = new GB(0, 0, false), gp = new GB(0, 0, false); for (const [x0, x1] of [[-18, -8], [8, 18]]) gfb(gGl, x0, 1.4, T, x1, 3.4, T + 0.06, wh);
    for (const sx of [-1, 1]) for (const [z0, z1] of [[-25, -18], [-13, -6]]) gfb(gGl, sx > 0 ? hW + T : -hW - T - 0.06, 1.4, z0, sx > 0 ? hW + T + 0.06 : -hW - T, 3.4, z1, wh);
    outer.add(gGl.mesh(M.glass, false, true)); for (const sx of [-1, 1]) gfb(gp, sx * 8 - 0.12, H + 0.9, T + 0.1, sx * 8 + 0.12, H + 3.3, T + 0.3, K(0.25)); outer.add(gp.mesh(M.dark, false, true));
    const rs = GAR.signRoof = new THREE.Mesh(new THREE.PlaneGeometry(18.5, 2.4), M.sign3); rs.position.set(0, H + 2.15, T + 0.32); outer.add(rs); const rb = new THREE.Mesh(new THREE.PlaneGeometry(18.5, 2.4), M.sign3); rb.rotation.y = Math.PI; rb.position.set(0, H + 2.15, T + 0.08); outer.add(rb); }
  /* floor + apron */
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.025, -D / 2); fl.receiveShadow = true; GAR.floorMesh = fl; inner.add(fl);
  { const c = mkCanvas(256, 256), g = c.getContext('2d'), r = mulberry32(5); g.fillStyle = '#3a3c42'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2500; i++) { const v = 40 + r() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(r() * 256, r() * 256, 2, 2); } g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 6, 256); g.fillRect(250, 0, 6, 256); g.fillStyle = '#f2c230'; for (let k = 0; k < 4; k++) g.fillRect(124, k * 64 + 8, 8, 34);
    const tx = canvasTex(c); tx.repeat.set(1, 3); M.apron.map = tx; }
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(2 * DW + 3.4, 15.5), M.apron); ap.rotation.x = -Math.PI / 2; ap.position.set(0, 0.02, T + 7.7); ap.receiveShadow = true; outer.add(ap);
  const gB = new GB(0, 0, false); for (const sx of [-1, 1]) for (const dz of [3, 9, 15]) gcyl(gB, sx * (DW + 2.2), 0, T + dz, 0.16, 0.16, 0.95, gcol(0xf2c230), 8);
  outer.add(gB.mesh(M.deco, false, true));
  /* roll-up door */
  { const c = mkCanvas(64, 256), g = c.getContext('2d'); g.fillStyle = '#c4c8cf'; g.fillRect(0, 0, 64, 256); for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#b2b7bf' : '#d2d6dc'; g.fillRect(0, k * 16, 64, 15); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, k * 16 + 15, 64, 1); } const t = canvasTex(c); t.repeat.set(1, 1); M.door.map = t; }
  const door = GAR.doorMesh = new THREE.Mesh(new THREE.BoxGeometry(2 * DW - 0.05, DH, 0.14), M.door); door.position.set(0, DH / 2, T * 0.5); door.castShadow = true; outer.add(door);
  /* exterior sign + lamps */
  const sg = GAR.signOut = new THREE.Mesh(new THREE.PlaneGeometry(2 * DW + 1.2, 1.15), M.sign); sg.position.set(0, DH + 0.78, T + 0.1); outer.add(sg);
  const sg2 = GAR.signIn = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.4), M.sign2); sg2.position.set(0, 4.15, -D + S + 0.04); inner.add(sg2);
  /* bay plates + locked-bay hazard overlays */
  const hz = gHazardTex(); M.hazard.map = hz;
  for (let i = 0; i < 8; i++) {
    const cv = mkCanvas(256, 64), g = cv.getContext('2d'), tex = canvasTex(cv); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; const p = { cv, g, tex };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.475), new THREE.MeshBasicMaterial({ map: tex })); const b = gBay(i, null);
    if (i < 4) { m.position.set(b.x, 2.45, -D + S + 0.03); } else if (i < 6) { m.position.set(-hW + S + 0.03, 2.45, b.z); m.rotation.y = Math.PI / 2; } else { m.position.set(hW - S - 0.03, 2.45, b.z); m.rotation.y = -Math.PI / 2; }
    inner.add(m); p.mesh = m;
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(i < 4 ? 3.6 : 6.0, i < 4 ? 6.0 : 3.6), M.hazard); hm.rotation.x = -Math.PI / 2;
    const bp = i < 4 ? { x: b.x, z: -D + 3.3 } : i < 6 ? { x: -hW + 3.3, z: b.z } : { x: hW - 3.3, z: b.z }; hm.position.set(bp.x, 0.035, bp.z); inner.add(hm); p.haz = hm; GAR.plates.push(p);
    /* bay outline */
    const gm = new GB(0, 0, false), lw = 0.09, ww = i < 4 ? 3.3 : 5.9, dd = i < 4 ? 5.9 : 3.3, cx = bp.x, cz = bp.z, wc = [0.85, 0.85, 0.82];
    gfb(gm, cx - ww / 2, 0.03, cz - dd / 2, cx + ww / 2, 0.045, cz - dd / 2 + lw, wc); gfb(gm, cx - ww / 2, 0.03, cz + dd / 2 - lw, cx + ww / 2, 0.045, cz + dd / 2, wc);
    gfb(gm, cx - ww / 2, 0.03, cz - dd / 2, cx - ww / 2 + lw, 0.045, cz + dd / 2, wc); gfb(gm, cx + ww / 2 - lw, 0.03, cz - dd / 2, cx + ww / 2, 0.045, cz + dd / 2, wc);
    const mk = gm.mesh(M.deco, false, true); mk.material = M.deco; inner.add(mk); p.out = mk;
  }
  Home.buildDecor();
  /* lights */
  GAR.lights = [];
  const nl = Q && Q.shadow === 0 ? 1 : 2;
  for (let k = 0; k < nl; k++) { const l = new THREE.PointLight(0xffffff, 0, 26, 1.5); l.position.set(nl === 1 ? 0 : (k ? 10 : -10), H - 1.3, -15); grp.add(l); GAR.lights.push(l); }
  grp.visible = false; scene.add(grp);
};

Home.buildDecor = function () {
  const inner = GAR.inner, M = GAR.m, D = GAR.D, hW = GAR.W / 2, S = GAR.S, DW = GAR.DW, G = GAR.dec = {};
  const grp = (k) => { const g = new THREE.Group(); inner.add(g); G[k] = g; return g; };
  /* posters */
  { const g = grp('posters'); const spots = [[-13.5, 3.75, 0], [-4.5, 3.75, 1], [4.5, 3.75, 2], [13.5, 3.75, 3]];
    for (const [x, y, k] of spots) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.64), new THREE.MeshStandardMaterial({ map: gPosterTex(k), roughness: 0.6 })); m.position.set(x, y, -D + S + 0.03); g.add(m);
      const f = new GB(0, 0, false); gfb(f, x - 1.26, y - 0.87, -D + S, x + 1.26, y + 0.87, -D + S + 0.02, [0.06, 0.06, 0.07]); g.add(f.mesh(M.deco, false, true)); } }
  /* tool wall + workbench (front wall, right of the door) */
  { const g = grp('tools'); const cv = mkCanvas(512, 128), c = cv.getContext('2d'), r = mulberry32(8); c.fillStyle = '#2b3138'; c.fillRect(0, 0, 512, 128); c.fillStyle = 'rgba(0,0,0,0.5)'; for (let x = 6; x < 512; x += 16) for (let y = 6; y < 128; y += 16) c.fillRect(x, y, 3, 3);
    const tool = (x, y, kind) => { c.fillStyle = '#c9ced6'; c.strokeStyle = '#c9ced6'; c.lineWidth = 6; if (kind === 0) { c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 60, y + 8); c.stroke(); c.fillStyle = '#d62828'; c.fillRect(x + 36, y, 26, 16); } else if (kind === 1) { c.fillRect(x, y, 10, 70); c.fillStyle = '#ffb02e'; c.fillRect(x - 8, y + 70, 26, 22); } else if (kind === 2) { c.beginPath(); c.arc(x + 14, y + 14, 14, 0, TAU); c.stroke(); c.fillRect(x + 12, y + 28, 6, 52); } else { c.fillStyle = '#33d4ff'; c.fillRect(x, y, 22, 60); c.fillStyle = '#c9ced6'; c.fillRect(x + 8, y + 60, 6, 30); } };
    for (let k = 0; k < 11; k++) tool(14 + k * 45, 14 + ((r() * 14) | 0), k % 4);
    const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.25), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.rotation.y = Math.PI; m.position.set(12.5, 2.45, -S - 0.03); g.add(m);
    const b = new GB(0, 0, false), wood = [0.5, 0.36, 0.22], steel = [0.35, 0.37, 0.4]; gfb(b, 6.5, 0.88, -2.2, 18.3, 0.98, -S - 0.1, wood); for (const x of [6.7, 18.1]) for (const z of [-2.1, -S - 0.2]) gfb(b, x - 0.06, 0, z - 0.06, x + 0.06, 0.88, z + 0.06, steel); gfb(b, 6.6, 0.3, -2.1, 18.2, 0.36, -S - 0.15, steel);
    gfb(b, 8, 0.98, -1.9, 9.2, 1.4, -0.9, [0.75, 0.12, 0.12]); gfb(b, 12.3, 0.98, -1.7, 13.2, 1.18, -1.0, [0.2, 0.22, 0.25]); gcyl(b, 16.2, 0.98, -1.4, 0.2, 0.2, 0.5, [0.72, 0.1, 0.1], 10); gcyl(b, 16.9, 0.98, -1.2, 0.16, 0.16, 0.4, [0.1, 0.35, 0.65], 10); g.add(b.mesh(M.deco, false, true)); }
  /* tyre stacks (front-left corner) */
  { const g = grp('tyres'), b = new GB(0, 0, false); for (const [x, z, n] of [[-18.2, -2.3, 5], [-16.7, -2.9, 4], [-18, -4.6, 3]]) for (let k = 0; k < n; k++) { gcyl(b, x, k * 0.24, z, 0.36, 0.36, 0.23, [0.045, 0.045, 0.05], 12); gcyl(b, x, k * 0.24 + 0.005, z, 0.2, 0.2, 0.225, [0.45, 0.46, 0.5], 10); } g.add(b.mesh(M.deco, false, true)); }
  /* rug */
  { const g = grp('rug'); const cv = mkCanvas(256, 160); GAR.rugCv = cv; const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6), M.rug); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.06, -14); g.add(m); }
  /* plants */
  { const g = grp('plants'), b = new GB(0, 0, false); for (const [x, z] of [[-6.2, -1.5], [6.2, -1.5]]) { gcyl(b, x, 0, z, 0.3, 0.38, 0.62, [0.62, 0.32, 0.2], 10); for (let k = 0; k < 7; k++) { const a = k * 0.9; gblob(b, x + Math.cos(a) * 0.28, 0.95 + (k % 3) * 0.28, z + Math.sin(a) * 0.28, 0.28, 0.4, 0.28, [0.12, 0.38 + (k % 2) * 0.08, 0.14]); } } g.add(b.mesh(M.deco, false, true)); }
  GAR.trophyG = grp('trophies'); const sh = new GB(0, 0, false); for (const y of [1.45, 2.25]) gfb(sh, -hW + S, y, -5.6, -hW + S + 0.38, y + 0.06, -0.9, [0.3, 0.2, 0.12]); gfb(sh, -hW + S, 1.5, -5.6, -hW + S + 0.38, 2.9, -5.54, [0.3, 0.2, 0.12]); GAR.trophyG.add(sh.mesh(M.deco, false, true)); GAR.trophyBox = null;
};
Home.buildTrophies = function (n) {
  const G = GAR.trophyG; if (GAR.trophyBox) { G.remove(GAR.trophyBox); GAR.trophyBox.geometry.dispose(); GAR.trophyBox = null; }
  const b = new GB(0, 0, false), gold = [1, 0.62, 0.12], hW = GAR.W / 2 - GAR.S - 0.2;
  for (let k = 0; k < n; k++) { const row = k < 4 ? 0 : 1, y = row ? 2.31 : 1.51, z = -1.7 - (k % 4) * 0.95; gcyl(b, -hW, y, z, 0.13, 0.13, 0.05, [0.12, 0.12, 0.13], 8); gcyl(b, -hW, y + 0.05, z, 0.04, 0.04, 0.2, gold, 8); gcyl(b, -hW, y + 0.25, z, 0.08, 0.15, 0.2, gold, 10); gblob(b, -hW, y + 0.47, z, 0.06, 0.02, 0.06, gold); }
  if (!b.count) return; GAR.trophyBox = b.mesh(GAR.m.deco, false, true); G.add(GAR.trophyBox);
};

/* ---------- apply the saved customisation ---------- */
Home.apply = function () {
  if (!GAR.group) return; const G = save.gar, M = GAR.m;
  M.wall.color.copy(lc(GP.wall[G.wall])); M.ext.color.copy(lc(GP.ext[G.ext])); M.trim.color.copy(lc(GP.trim[G.trim])); M.dark.color.setRGB(1, 1, 1);
  const lcol = lc(GP.light[G.light]); M.led.color.copy(lcol).multiplyScalar(1.7);
  const on = G.neon > 0, nh = GP.trim[(G.neon || 1) - 1]; M.neon.color.copy(lc(nh)).multiplyScalar(2.1); GAR.neonG.visible = on;
  for (const l of GAR.lights) l.color.copy(lcol);
  /* floor */
  GAR.floorTex = GAR.floorTex || {}; const fk = G.floor, ft = GAR.floorTex[fk] || (GAR.floorTex[fk] = gFloorTex(fk));
  const tile = fk === 2 ? 4 : fk === 3 ? 6 : 5; ft.repeat.set(GAR.W / tile, GAR.D / tile); M.floor.map = ft; M.floor.roughness = fk === 1 ? 0.3 : fk === 2 ? 0.4 : fk === 3 ? 0.6 : 0.85; M.floor.metalness = fk === 1 ? 0.25 : 0; M.floor.needsUpdate = true;
  /* signs */
  const tc = GP.trim[G.trim]; if (GAR.signKey !== G.sign + '|' + tc) { GAR.signKey = G.sign + '|' + tc; for (const k of ['sTexO', 'sTexI', 'sTexR']) if (GAR[k]) GAR[k].dispose(); GAR.sTexO = gSignTex(G.sign, tc, 640, 120); GAR.sTexI = gSignTex(G.sign, tc, 800, 150, true); GAR.sTexR = gSignTex(G.sign, tc, 1024, 140); M.sign.map = GAR.sTexO; M.sign2.map = GAR.sTexI; M.sign3.map = GAR.sTexR; M.sign.needsUpdate = M.sign2.needsUpdate = M.sign3.needsUpdate = true; }
  /* rug */
  { const cv = GAR.rugCv, g = cv.getContext('2d'), c1 = '#' + tc.toString(16).padStart(6, '0'); g.fillStyle = '#1b1e25'; g.fillRect(0, 0, 256, 160); g.strokeStyle = c1; g.lineWidth = 8; g.strokeRect(10, 10, 236, 140); g.lineWidth = 3; g.strokeRect(24, 24, 208, 112); g.fillStyle = c1; g.globalAlpha = 0.5; for (let k = 0; k < 9; k++) g.fillRect(40 + k * 22, 60, 12, 40); g.globalAlpha = 1;
    if (!M.rug.map) { M.rug.map = canvasTex(cv); M.rug.map.wrapS = M.rug.map.wrapT = THREE.ClampToEdgeWrapping; } M.rug.map.needsUpdate = true; }
  for (const [k] of GP.decor) if (GAR.dec[k]) GAR.dec[k].visible = !!G.decor[k];
  GAR.signKey2 = 1; Home.plates(); GAR.styled = true;
};
Home.plates = function () {
  if (!GAR.plates.length) return; const G = save.gar;
  for (let i = 0; i < 8; i++) {
    const p = GAR.plates[i], locked = i >= G.bays; p.haz.visible = locked; p.out.visible = !locked; let t = 'BAY ' + (i + 1), s = 'EMPTY';
    if (locked) { s = 'EXPANSION · ' + money(GP.cost[i < 6 ? 6 : 8]); t = 'LOCKED'; }
    else { for (const d of CARS) if (save.owned[d.id] && G.slots[d.id] === i) { t = d.name.toUpperCase(); s = d.id === save.car ? 'OUT ON THE ROAD' : d.cls.toUpperCase(); } }
    const key = t + '|' + s + '|' + G.trim; if (p.key !== key) { p.key = key; gPlateDraw(p, t, s, locked); }
  }
};

/* ---------- parked cars ---------- */
Home.refresh = function () {
  if (!GAR.group) return; gAssign(); const G = save.gar, want = {};
  for (const d of CARS) if (save.owned[d.id] && d.id !== save.car && G.slots[d.id] != null) want[d.id] = G.slots[d.id];
  for (const id in GAR.cars) { const e = GAR.cars[id]; if (!(id in want) || e.paint !== curPaint(id) + cosSig(id)) { GAR.carsG.remove(e.mesh); disposeCar(e.mesh); delete GAR.cars[id]; } }
  GAR.disp.length = 0;
  for (const id in want) {
    const d = CAR_BY_ID[id], p = gBay(want[id], d); let e = GAR.cars[id];
    if (!e) { const m = buildPlayerCar(d, id, false, null, true); e = GAR.cars[id] = { mesh: m, paint: curPaint(id) + cosSig(id) }; m.traverse((o) => { o.castShadow = false; }); GAR.carsG.add(m); }
    e.mesh.position.set(p.x, 0.02, p.z); e.mesh.rotation.y = p.yaw;
    GAR.disp.push({ id, bay: want[id], x: p.x, z: p.z, hx: p.hx + 0.15, hz: p.hz + 0.15 });
  }
  Home.plates(); Home.syncCols(); GAR.dirty = false;
};
function gSig() { const G = save.gar; let s = save.car + '|' + G.bays + '|' + Object.keys(save.done).length; for (const d of CARS) if (save.owned[d.id]) s += ',' + d.id + ':' + curPaint(d.id) + cosSig(d.id); return s; }

/* ---------- per-step logic ---------- */
Home.tick = function (dt) {
  if (!GAR.ok || !GAR.group) return; const px = Pl.x - GAR.ox, pz = Pl.z - GAR.oz, hW = GAR.W / 2;
  GAR.dist = Math.hypot(px, pz + GAR.D / 2);
  GAR.inside = Math.abs(px) < hW + 0.4 && pz > -GAR.D - 0.4 && pz < 1.4;
  GAR.nearId = null;
  if (Foot.on && !Talk.on && !GAR.edit && GAR.dist < 40) {
    let best = 2.7; for (const d of GAR.disp) { const dx = Math.max(Math.abs(px - d.x) - d.hx, 0), dz = Math.max(Math.abs(pz - d.z) - d.hz, 0), h = Math.hypot(dx, dz); if (h < best) { best = h; GAR.nearId = d.id; } }
  }
  const dd = Math.hypot(px, pz - 0.5), want = (dd < 26 || GAR.edit || GAR.inside) ? 1 : 0; GAR.door += clamp(want - GAR.door, -dt * 0.8, dt * 0.8);
  GAR.sigT -= dt; if (GAR.sigT <= 0) { GAR.sigT = 0.4; const s = gSig(); if (s !== GAR.sig) { GAR.sig = s; GAR.dirty = true; } }
  if (GAR.dirty) Home.refresh();
  if (!save.gar.seen && GAR.dist < 70 && App.mode === 'play') { save.gar.seen = 1; writeSave(); UI.toast('Your garage is here · drive in to park, swap cars and customise it', 'info'); }
};
/* ---------- per-frame visuals ---------- */
Home.visual = function (dt) {
  const g = GAR.group; if (!g) return; const d = GAR.dist, lim = Q && Q.shadow === 0 ? 300 : 520;
  g.visible = d < lim; if (!g.visible) return;
  if (!GAR.styled) Home.apply();
  GAR.inner.visible = d < 120 || GAR.edit; GAR.carsG.visible = GAR.edit || GAR.inside || (d < 75 && GAR.door > 0.3);
  const open = GAR.door; GAR.doorMesh.scale.y = Math.max(0.03, 1 - open * 0.97); GAR.doorMesh.position.y = GAR.DH - GAR.DH * GAR.doorMesh.scale.y / 2;
  const night = env && env.lampOn != null ? env.lampOn : 0, near = (GAR.inside || (GAR.dist < 30 && open > 0.2) || GAR.edit) ? 1 : 0;
  for (const l of GAR.lights) l.intensity += ((near ? 1.7 + night * 1.3 : 0) - l.intensity) * Math.min(1, dt * 5);
  { const gl = GAR.m.glass.color; gl.setRGB(0.012, 0.03, 0.05); if (night > 0.02) { const w = lc(GP.light[save.gar.light]); gl.r += (w.r * 0.7 - gl.r) * night; gl.g += (w.g * 0.7 - gl.g) * night; gl.b += (w.b * 0.7 - gl.b) * night; } }
  const nT = Math.min(8, Math.floor(Object.keys(save.done).length / 2)); if (nT !== GAR.trophies) { GAR.trophies = nT; Home.buildTrophies(nT); }
};
