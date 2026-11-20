/* ================= BUILDING VARIETY: every building its own personality =================
   genTownLots (04_chunks.js) raises the town; this gives each building a character of its own, all fixed by the lot's seed so a town looks the
   same every visit:
   - facades: besides the classic punched windows, glass curtain walls, brick with arched windows, ribbon windows, clapboard siding and stucco;
   - shapes and sizes: twin towers with a skybridge, setback towers, footprints from 16 m to 28 m, balconies, cornices, lit shopfronts,
     front porches and garages on the houses;
   - roofs: stepped crowns, spires, antennas with warning lights, copper pyramids, helipads, water tanks, roof gardens and billboards for
     made-up brands; glowing crowns and neon edges on the city towers;
   - signs: neon on the bars, diners and cafés (and most of the city), painted boards on the country shops, bright plates on the chemists
     and laundries, blade signs sticking out over the pavement and OPEN signs in the windows. Neon and lit windows glow at night. */
const BV = { signMats: [], mats: new Map(), tex: new Map() };
const BV_STYLES = ['glass', 'brick', 'ribbon', 'siding', 'stucco'];
const BV_GLASS = [0x8ab8dc, 0x78c8c4, 0xd0b07e, 0x92c092, 0xa8aed6, 0x6a8cb0, 0xb8c8d4].map(lc);
const BV_BRICK = [0xb05a42, 0x9a4a38, 0xc07454, 0x84463a, 0xc89a72, 0x8a5a4a].map(lc);
const BV_NEON = [0xff2a6a, 0x2af0ff, 0xffd02a, 0x7aff4a, 0xb04aff, 0xff7a1a, 0xff4ad8, 0x4a8aff];
const BV_ADS = ['FIZZ COLA · ICE COLD', 'NOVA MOBILE', 'SUNSET RADIO 98.4', 'ISLAND AIR · FLY DAILY', 'HOTEL AURORA', 'KAIJU NOODLES', 'ZENITH WATCHES', 'TURBO OIL', 'BLUE LAGOON RESORT', 'MOXI ENERGY', 'ORBIT TV', 'PALM BANK · LOANS'];
const BV_SUN = { desert: 1, tropic: 1, savanna: 1, vineyard: 1, volcano: 1, jungle: 1 };
/* the shops that light up in neon (and their colour), the ones with painted boards, the ones with bright plates */
const BV_NEONK = { bar: 0xff2a6a, diner: 0xff4ad8, cafe: 0xffb03a, electronics: 0x2af0ff, store: 0x7aff4a, laundry: 0x4a8aff, barber: 0xff3a3a, resto: 0xff7a1a, casino: 0xffd02a, club: 0xb04aff };
const BV_BOARD = { bakery: 1, books: 1, florist: 1, hardware: 1, barber: 1, cafe: 1, bar: 1, diner: 1 };
const BV_LIGHT = { pharmacy: 0x2aa84a, laundry: 0x3a7ad8, store: 0xd83a2a, electronics: 0x2a5ad8, hardware: 0xe08a1a };
const BV_BLADE = { bar: 'BAR', cafe: 'CAFE', diner: 'DINER', books: 'BOOKS', bakery: 'BAKERY', electronics: 'TV·HIFI', pharmacy: 'CHEMIST', barber: 'BARBER', laundry: 'LAUNDRY', hardware: 'TOOLS', store: 'OPEN 24', florist: 'FLOWERS', resto: 'EAT', casino: 'CASINO', club: 'CLUB', apts: 'HOTEL' };

/* ---------- facade textures (256 px = 16 m, four floors of 4 m) ---------- */
function bvFacade(style) {
  const S = 256, c = mkCanvas(S, S), g = c.getContext('2d'), ce = mkCanvas(S, S), ge = ce.getContext('2d'), rnd = mulberry32(91 + BV_STYLES.indexOf(style) * 13);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  const litCol = () => (rnd() < 0.8 ? `rgb(255,${190 + rnd() * 50 | 0},${110 + rnd() * 60 | 0})` : 'rgb(170,205,255)');
  const lit = (x, y, w, h, p) => { if (rnd() < p) { ge.globalAlpha = 0.5 + rnd() * 0.5; ge.fillStyle = litCol(); ge.fillRect(x, y, w, h); ge.globalAlpha = 1; } };
  const grad = (x, y, w, h, a, b) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  const speckle = (n, lo, span, a) => { for (let i = 0; i < n; i++) { const v = lo + rnd() * span | 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 10, 2 + rnd() * 10); } };
  const arch = (gg, x, y, w, h) => { gg.beginPath(); gg.moveTo(x, y + h); gg.lineTo(x, y + w / 2); gg.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); gg.lineTo(x + w, y + h); gg.closePath(); gg.fill(); };
  if (style === 'glass') {   /* a curtain wall: tall panes, thin mullions, a dark spandrel at each floor */
    g.fillStyle = '#e4ebf0'; g.fillRect(0, 0, S, S);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) {
      const x = q * 32 + 1, y = r * 64 + 1, w = 30, h = 55;
      grad(x, y, w, h, '#f6f9fc', '#a2b6c6'); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, y, w * 0.3, h);
      lit(x, y, w, h, 0.34);
    }
    g.fillStyle = '#6a7682'; for (let r = 0; r < 4; r++) g.fillRect(0, r * 64 + 56, S, 8);
  } else if (style === 'brick') {   /* brick courses, arched windows with stone sills and white glazing bars */
    g.fillStyle = '#d4cec6'; g.fillRect(0, 0, S, S);
    for (let y = 0, row = 0; y < S; y += 6, row++) for (let x = (row & 1) * -8; x < S; x += 16) { const v = 196 + rnd() * 58 | 0; g.fillStyle = `rgb(${v},${v - 8},${v - 14})`; g.fillRect(x + 1, y + 1, 14, 4); }
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      const x = q * 64 + 19, y = r * 64 + 10, w = 26, h = 40;
      g.fillStyle = '#f2eee6'; arch(g, x - 4, y - 4, w + 8, h + 4); g.fillRect(x - 5, y + h, w + 10, 5);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#7f9ab2'); gr.addColorStop(0.5, '#2e4458'); gr.addColorStop(1, '#1a2836'); g.fillStyle = gr; arch(g, x, y, w, h);
      g.fillStyle = '#eae4da'; g.fillRect(x + w / 2 - 1, y + 2, 2, h - 2); g.fillRect(x, y + 24, w, 2);
      if (rnd() < 0.5) { ge.globalAlpha = 0.55 + rnd() * 0.45; ge.fillStyle = litCol(); arch(ge, x, y, w, h); ge.globalAlpha = 1; }
    }
  } else if (style === 'ribbon') {   /* continuous bands of glass along every floor */
    g.fillStyle = '#e6e4de'; g.fillRect(0, 0, S, S); speckle(400, 140, 90, 0.05);
    for (let r = 0; r < 4; r++) {
      const y = r * 64 + 14, h = 30; grad(0, y, S, h, '#a4bdd0', '#2c4054'); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, y, S, 6);
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, y + h, S, 4);
      for (let q = 0; q < 8; q++) { g.fillStyle = '#c9c8c2'; g.fillRect(q * 32, y, 2, h); lit(q * 32 + 2, y, 30, h, 0.38); }
    }
  } else if (style === 'siding') {   /* clapboard and shuttered windows: two to a 16 m stretch */
    g.fillStyle = '#efebe3'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 8) { g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, y + 6, S, 2); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, y, S, 1); }
    for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) {
      const x = q * 128 + 46, y = r * 64 + 12, w = 36, h = 40;
      g.fillStyle = '#3e4a44'; g.fillRect(x - 15, y, 11, h); g.fillRect(x + w + 4, y, 11, h);
      g.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 0; k < 6; k++) { g.fillRect(x - 15, y + 3 + k * 6.5, 11, 2); g.fillRect(x + w + 4, y + 3 + k * 6.5, 11, 2); }
      g.fillStyle = '#fbfaf6'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
      grad(x, y, w, h, '#8eaac0', '#22344a'); g.fillStyle = '#fbfaf6'; g.fillRect(x + w / 2 - 1.5, y, 3, h); g.fillRect(x, y + h / 2 - 1.5, w, 3);
      lit(x, y, w, h, 0.55);
    }
  } else {   /* stucco: smooth plaster, arched windows in dark wood */
    g.fillStyle = '#f2ede4'; g.fillRect(0, 0, S, S); speckle(900, 170, 80, 0.07);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) {
      const x = q * 128 + 42, y = r * 64 + 10, w = 42, h = 42;
      g.fillStyle = 'rgba(0,0,0,0.1)'; arch(g, x - 2, y - 1, w + 6, h + 5);
      g.fillStyle = '#5a3a24'; arch(g, x - 3, y - 3, w + 6, h + 4);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#93aec0'); gr.addColorStop(1, '#22323e'); g.fillStyle = gr; arch(g, x, y, w, h);
      g.fillStyle = '#5a3a24'; g.fillRect(x + w / 2 - 1.5, y, 3, h); g.fillStyle = '#e6dccb'; g.fillRect(x - 5, y + h, w + 10, 4);
      if (rnd() < 0.5) { ge.globalAlpha = 0.55 + rnd() * 0.45; ge.fillStyle = litCol(); arch(ge, x, y, w, h); ge.globalAlpha = 1; }
    }
  }
  return [canvasTex(c), canvasTex(ce)];
}
function bvInitMats() {
  MAT.bv = {};
  for (const s of BV_STYLES) { const [m, e] = bvFacade(s); MAT.bv[s] = new THREE.MeshStandardMaterial({ vertexColors: true, map: m, emissive: new THREE.Color(1, 1, 1), emissiveMap: e, emissiveIntensity: 0, roughness: s === 'glass' ? 0.25 : s === 'brick' ? 0.9 : 0.72, metalness: s === 'glass' ? 0.2 : 0.03 }); }
  MAT.neon = new THREE.MeshBasicMaterial({ vertexColors: true });   /* neon tubes, warning lights and lit shop windows: brighter at night */
  MAT.win = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });   /* the light inside the shop windows, added over the glass at night */
  MAT.halo = new THREE.MeshBasicMaterial({ map: MAT.glow, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
}
/* night: lit windows, neon, the glow around the signs (called every frame from the sky) */
function bvNight(l) {
  if (!MAT.bv) return;
  for (const s of BV_STYLES) MAT.bv[s].emissiveIntensity = l * 1.6;
  MAT.neon.color.setScalar(0.8 + 0.9 * l); MAT.halo.opacity = l * 0.55; MAT.win.color.setScalar(l);
  for (const m of BV.signMats) m.color.setScalar(1.05 + 0.6 * l);
}

/* ---------- helpers ---------- */
function bvRng(T, i, j, a, b) { return mulberry32((ihash(T.id * 613 + i * 17 + a, j * 29 + b, 41) * 4294967296) >>> 0); }
function bvSpecial(T, i, j, a, b) { return Bld.plan(T).has(T.id + ':' + i + ':' + j + ':' + a + ':' + b); }
function bvGB(ch, k) { const m = ch.bvG || (ch.bvG = {}); return m[k] || (m[k] = new GB(ch.x0, ch.z0, k !== 'neon' && k !== 'win')); }
function bvMesh(ch) {
  if (!ch.bvG) return;
  for (const k in ch.bvG) {
    const G = ch.bvG[k]; if (!G.count) continue;
    const m = k === 'neon' ? G.mesh(MAT.neon, false, false) : k === 'win' ? G.mesh(MAT.win, false, false) : k === 'halo' ? G.mesh(MAT.halo, false, false) : G.mesh(MAT.bv[k], true, true);
    if (k === 'halo' || k === 'win') m.renderOrder = 3; ch.group.add(m);
  }
  ch.bvG = null;
}
const bvRGB = (h) => { const C = lc(h); return [C.r, C.g, C.b]; };
const bvShade = (c, k) => ({ r: c.r * k, g: c.g * k, b: c.b * k });
/* a box in any order of corners */
function bvB(G, a0, b0, c0, a1, b1, c1, r, g, b) { G.box(Math.min(a0, a1), Math.min(b0, b1), Math.min(c0, c1), Math.max(a0, a1), Math.max(b0, b1), Math.max(c0, c1), r, g, b); }
/* which facade suits it */
function bvStyle(key, cat, v) {
  const u = v(), city = key === 'city' || key === 'metro';
  if (cat === 'tower') { if (city) return u < 0.42 ? 'glass' : u < 0.7 ? 'ribbon' : 'classic'; if (key === 'harbor') return u < 0.4 ? 'brick' : u < 0.65 ? 'ribbon' : 'classic'; return u < 0.25 ? 'glass' : u < 0.5 ? 'ribbon' : 'classic'; }
  if (cat === 'house') { if (BV_SUN[key]) return u < 0.65 ? 'stucco' : 'classic'; if (city) return u < 0.4 ? 'brick' : u < 0.7 ? 'siding' : 'classic'; return u < 0.7 ? 'siding' : u < 0.85 ? 'brick' : 'classic'; }
  if (city) return u < 0.3 ? 'ribbon' : u < 0.5 ? 'brick' : u < 0.65 ? 'glass' : 'classic';
  if (BV_SUN[key]) return u < 0.5 ? 'stucco' : u < 0.7 ? 'ribbon' : 'classic';
  return u < 0.45 ? 'brick' : u < 0.6 ? 'ribbon' : u < 0.7 ? 'siding' : 'classic';
}
function bvColor(sty, c, v) { return sty === 'glass' ? _pk(v, BV_GLASS) : sty === 'brick' ? _pk(v, BV_BRICK) : c; }
/* walls in their style; the roof stays on the classic material (its corner is plain wall) */
function bvBox(ch, gbB, sty, x0, z0, x1, z1, y0, y1, c, uo, vo, roofK) {
  if (!sty || sty === 'classic') return bldgBox(gbB, x0, z0, x1, z1, y0, y1, c, uo, vo, roofK);
  bldgBox(bvGB(ch, sty), x0, z0, x1, z1, y0, y1, c, uo, vo, 0);
  if (roofK > 0) gbB.quadA([x0, y1, z0, 0.03, 0.03], [x1, y1, z0, 0.03, 0.03], [x1, y1, z1, 0.03, 0.03], [x0, y1, z1, 0.03, 0.03], 0, 1, 0, c.r * roofK, c.g * roofK, c.b * roofK);
}
/* neon tubes up the corners and round the top */
function bvNeonEdge(ch, X0, Z0, X1, Z1, y0, y1, hex) {
  const G = bvGB(ch, 'neon'), [r, g, b] = bvRGB(hex), t = 0.24;
  for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) bvB(G, x - t, y0, z - t, x + t, y1, z + t, r, g, b);
  bvB(G, X0 - t, y1 - 0.5, Z0 - t, X1 + t, y1, Z0 + 0.05, r, g, b); bvB(G, X0 - t, y1 - 0.5, Z1 - 0.05, X1 + t, y1, Z1 + t, r, g, b);
  bvB(G, X0 - t, y1 - 0.5, Z0, X0 + 0.05, y1, Z1, r, g, b); bvB(G, X1 - 0.05, y1 - 0.5, Z0, X1 + t, y1, Z1, r, g, b);
}
/* a lit ground floor: the shop window along the street front */
function bvShopfront(ch, gbP, xa, xb, zf, n, y0, v) {
  if (xb - xa < 4) return; const warm = v() < 0.75, k = 0.5 + v() * 0.3, ya = y0 + 0.75, yt = y0 + 3.15, fr = v() < 0.5 ? [0.14, 0.14, 0.15] : [0.32, 0.22, 0.14];
  bvB(gbP, xa, ya, zf, xb, yt, zf + n * 0.04, 0.2, 0.26, 0.31);   /* the glass */
  for (let x = xa; x <= xb + 0.01; x += (xb - xa) / Math.max(1, Math.round((xb - xa) / 2.4))) bvB(gbP, x - 0.07, ya, zf, x + 0.07, yt, zf + n * 0.08, fr[0], fr[1], fr[2]);
  bvB(gbP, xa - 0.1, y0 + 0.4, zf, xb + 0.1, ya, zf + n * 0.1, fr[0], fr[1], fr[2]); bvB(gbP, xa - 0.1, yt, zf, xb + 0.1, y0 + 3.4, zf + n * 0.1, fr[0], fr[1], fr[2]);
  const z = zf + n * 0.05, [r, g, b] = warm ? [k * 1.0, k * 0.8, k * 0.5] : [k * 0.6, k * 0.75, k * 0.95];   /* the light inside, shown at night */
  bvGB(ch, 'win').quadA([xa, ya, z], [xb, ya, z], [xb, yt, z], [xa, yt, z], 0, 0, n, r, g, b);
}
/* balconies from the second floor up, slab and rail */
function bvBalconies(gbP, ox, fw, zf, n, y0, hgt, c, v) {
  const cols = Math.max(1, Math.floor((fw - 2) / 6)), sp = fw / cols, glass = v() < 0.5;
  for (let y = y0 + 8; y <= y0 + hgt - 4; y += 4) for (let k = 0; k < cols; k++) {
    const xc = ox + sp * (k + 0.5);
    bvB(gbP, xc - 1.4, y, zf, xc + 1.4, y + 0.2, zf + n * 1.3, c.r * 1.05, c.g * 1.05, c.b * 1.05);
    if (glass) bvB(gbP, xc - 1.4, y + 0.2, zf + n * 1.22, xc + 1.4, y + 1.05, zf + n * 1.3, 0.55, 0.68, 0.74);
    else { bvB(gbP, xc - 1.4, y + 0.95, zf + n * 1.2, xc + 1.4, y + 1.05, zf + n * 1.3, 0.2, 0.2, 0.22); for (let p = 0; p <= 6; p++) bvB(gbP, xc - 1.38 + p * 0.46, y + 0.2, zf + n * 1.22, xc - 1.32 + p * 0.46, y + 0.95, zf + n * 1.28, 0.2, 0.2, 0.22); }
  }
}
/* a ledge round the top of a flat roof */
function bvCornice(gbP, X0, Z0, X1, Z1, Y, c) {
  const o = 0.4, r = c.r * 0.78, g = c.g * 0.78, b = c.b * 0.78;
  bvB(gbP, X0 - o, Y - 0.55, Z0 - o, X1 + o, Y + 0.25, Z0 + 0.3, r, g, b); bvB(gbP, X0 - o, Y - 0.55, Z1 - 0.3, X1 + o, Y + 0.25, Z1 + o, r, g, b);
  bvB(gbP, X0 - o, Y - 0.55, Z0, X0 + 0.3, Y + 0.25, Z1, r, g, b); bvB(gbP, X1 - 0.3, Y - 0.55, Z0, X1 + o, Y + 0.25, Z1, r, g, b);
}
function bvLight(ch, x, y, z, hex) { const [r, g, b] = bvRGB(hex || 0xff2020); bvB(bvGB(ch, 'neon'), x - 0.35, y, z - 0.35, x + 0.35, y + 0.6, z + 0.35, r, g, b); }

/* ---------- roofs ---------- */
function bvPyramid(ch, gbB, X0, Z0, X1, Z1, Y, h, c) {
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, A = [cx, Y + h, cz, 0.03, 0.03], P = (x, z) => [x, Y, z, 0.03, 0.03], L = (a, b) => Math.hypot(a, b) || 1;
  const kx = h / L(h, (X1 - X0) / 2), kz = h / L(h, (Z1 - Z0) / 2), yx = ((X1 - X0) / 2) / L(h, (X1 - X0) / 2), yz = ((Z1 - Z0) / 2) / L(h, (Z1 - Z0) / 2);
  gbB.triA(P(X0, Z0), P(X1, Z0), A, 0, yz, -kz, c.r * 0.82, c.g * 0.82, c.b * 0.82); gbB.triA(P(X0, Z1), P(X1, Z1), A, 0, yz, kz, c.r, c.g, c.b);
  gbB.triA(P(X0, Z0), P(X0, Z1), A, -kx, yx, 0, c.r * 0.9, c.g * 0.9, c.b * 0.9); gbB.triA(P(X1, Z0), P(X1, Z1), A, kx, yx, 0, c.r * 0.95, c.g * 0.95, c.b * 0.95);
  colBox(ch, X0 + (X1 - X0) * 0.25, Z0 + (Z1 - Z0) * 0.25, X1 - (X1 - X0) * 0.25, Z1 - (Z1 - Z0) * 0.25, Y, Y + h * 0.5);
}
function bvHelipad(ch, gbP, X0, Z0, X1, Z1, Y) {
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, R = Math.min(X1 - X0, Z1 - Z0) / 2 - 1.6;
  gbP.box(X0 + 0.8, Y, Z0 + 0.8, X1 - 0.8, Y + 0.25, Z1 - 0.8, 0.28, 0.29, 0.31);
  for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R; gbP.box(x - 0.45, Y + 0.25, z - 0.45, x + 0.45, Y + 0.3, z + 0.45, 0.95, 0.78, 0.15); }
  const s = R * 0.45; gbP.box(cx - s, Y + 0.25, cz - s, cx - s + 0.7, Y + 0.31, cz + s, 0.95, 0.95, 0.95); gbP.box(cx + s - 0.7, Y + 0.25, cz - s, cx + s, Y + 0.31, cz + s, 0.95, 0.95, 0.95); gbP.box(cx - s, Y + 0.25, cz - 0.35, cx + s, Y + 0.31, cz + 0.35, 0.95, 0.95, 0.95);
  for (const [x, z] of [[X0 + 1, Z0 + 1], [X1 - 1, Z0 + 1], [X0 + 1, Z1 - 1], [X1 - 1, Z1 - 1]]) bvLight(ch, x, Y + 0.25, z, 0x2aff6a);
}
function bvTank(ch, gbP, x, z, Y) {
  for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) gbP.box(x + a - 0.15, Y, z + b - 0.15, x + a + 0.15, Y + 3, z + b + 0.15, 0.3, 0.28, 0.26);
  cylAt(gbP, x, Y + 3, z, 2.1, 3.6, 2.1, 0.5, 0.36, 0.24); cylAt(gbP, x, Y + 6.6, z, 2.25, 0.35, 2.25, 0.3, 0.3, 0.3); cylAt(gbP, x, Y + 6.95, z, 1.2, 0.8, 1.2, 0.32, 0.32, 0.32);
  colCyl(ch, x, z, 2.1, Y, Y + 7.7);
}
function bvGarden(gbP, X0, Z0, X1, Z1, Y, v, key) {
  if (BV_SUN[key]) gbP.box(X0 + 1.2, Y, Z0 + 1.2, X1 - 1.2, Y + 0.3, Z1 - 1.2, 0.66, 0.42, 0.3);   /* a tiled terrace */
  else gbP.box(X0 + 1.2, Y, Z0 + 1.2, X1 - 1.2, Y + 0.45, Z1 - 1.2, 0.3, 0.5, 0.24);
  for (let k = 0; k < 6; k++) { const x = X0 + 2.5 + v() * (X1 - X0 - 5), z = Z0 + 2.5 + v() * (Z1 - Z0 - 5), s = 0.5 + v() * 0.7; gbP.box(x - s, Y + 0.45, z - s, x + s, Y + 0.45 + s * 1.6, z + s, 0.2, 0.42 + v() * 0.15, 0.18); }
  const px = X0 + 1.6, pz = Z0 + 1.6; for (const [a, b] of [[0, 0], [3, 0], [0, 3], [3, 3]]) gbP.box(px + a, Y + 0.45, pz + b, px + a + 0.18, Y + 2.8, pz + b + 0.18, 0.92, 0.9, 0.86);
  gbP.box(px - 0.2, Y + 2.8, pz - 0.2, px + 3.4, Y + 2.95, pz + 3.4, 0.92, 0.9, 0.86);
}
/* a billboard on the roof, facing the street */
function bvBillboard(ch, gbP, cx, cz, Y, n, w, v, neon) {
  const h = Math.max(3, w * 0.32), ad = _pk(v, BV_ADS), col = _pk(v, BV_NEON);
  for (const s of [-1, 1]) { gbP.box(cx + s * w * 0.32 - 0.2, Y, cz - n * 0.6 - 0.2, cx + s * w * 0.32 + 0.2, Y + 2.6 + h, cz - n * 0.6 + 0.2, 0.25, 0.25, 0.27); }
  bvB(gbP, cx - w / 2 - 0.2, Y + 2.4, cz - n * 0.1, cx + w / 2 + 0.2, Y + 2.6 + h + 0.2, cz - n * 0.4, 0.18, 0.18, 0.2);
  bvPlane(ch, bvTex(ad, neon ? 'neon' : 'bill', col), w, h, cx, Y + 2.5 + h / 2 + 0.1, cz + n * 0.02, n, neon);
  if (neon) bvHalo(ch, cx, Y + 2.5 + h / 2, cz + n * 0.3, w * 1.4, h * 2.2, n, col);
  else for (const s of [-0.3, 0.3]) bvLight(ch, cx + s * w, Y + 2.6 + h + 0.25, cz + n * 0.3, 0xfff0c0);
}
/* the top of a tower */
function bvCrown(ch, gbB, gbP, key, X0, Z0, X1, Z1, Y, hgt, c, v, n, r) {
  const w = X1 - X0, d = Z1 - Z0, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, city = key === 'city' || key === 'metro';
  const opts = hgt > 60 ? ['tiers', 'spire', 'antenna', 'pyramid', 'helipad', 'lit'] : ['tank', 'garden', 'mech', 'helipad', 'pyramid', 'antenna'];
  if (city) opts.push(hgt > 60 ? 'lit' : 'billboard', 'billboard');
  let cr = _pk(v, opts); if ((cr === 'helipad' || cr === 'garden') && (w < 12 || d < 12)) cr = 'antenna';
  if (cr === 'tiers') {
    let ix = 3, w2 = w, d2 = d, cc = c, top = Y;
    for (let t = 0; t < 2; t++) { w2 -= 2 * ix; d2 -= 2 * ix; if (w2 < 8 || d2 < 8) break; const th = 8 + v() * 14; cc = bvShade(cc, 0.93); bldgBox(gbB, cx - w2 / 2, cz - d2 / 2, cx + w2 / 2, cz + d2 / 2, top, top + th, cc, 0, 0, 0.5); colBox(ch, cx - w2 / 2, cz - d2 / 2, cx + w2 / 2, cz + d2 / 2, top, top + th); top += th; ix = 2; }
    const sp = 14 + v() * 16; gbP.box(cx - 0.25, top, cz - 0.25, cx + 0.25, top + sp, cz + 0.25, 0.72, 0.72, 0.74); colBox(ch, cx - 0.25, cz - 0.25, cx + 0.25, cz + 0.25, top, top + sp); bvLight(ch, cx, top + sp, cz);
  } else if (cr === 'spire') {
    const sp = 18 + v() * 22; gbP.box(cx - 1.2, Y, cz - 1.2, cx + 1.2, Y + 3, cz + 1.2, 0.5, 0.5, 0.52); gbP.box(cx - 0.3, Y + 3, cz - 0.3, cx + 0.3, Y + sp, cz + 0.3, 0.78, 0.78, 0.8);
    colBox(ch, cx - 0.3, cz - 0.3, cx + 0.3, cz + 0.3, Y, Y + sp); bvLight(ch, cx, Y + sp, cz);
  } else if (cr === 'antenna') {
    for (const [a, b, hh] of [[-0.25, -0.2, 10 + v() * 8], [0.2, 0.25, 6 + v() * 6]]) { const x = cx + a * w, z = cz + b * d; gbP.box(x - 0.2, Y, z - 0.2, x + 0.2, Y + hh, z + 0.2, 0.55, 0.55, 0.57); colBox(ch, x - 0.2, z - 0.2, x + 0.2, z + 0.2, Y, Y + hh); bvLight(ch, x, Y + hh, z); }
    gbB.box(X0 + 2, Y, Z0 + 2, X0 + 5, Y + 1.8, Z0 + 5.5, 0.35, 0.35, 0.36);
  } else if (cr === 'pyramid') {
    bvPyramid(ch, gbB, X0, Z0, X1, Z1, Y, Math.min(w, d) * (0.35 + v() * 0.3), lc(_pk(v, [0x5f9a86, 0x4a5058, 0xc8a050, 0x3a4a5a, 0x8a4a3a])));
  } else if (cr === 'helipad') bvHelipad(ch, gbP, X0, Z0, X1, Z1, Y);
  else if (cr === 'lit') {   /* a glowing crown: a lit top floor in a band of light */
    const col = _pk(v, [0xffe0a0, 0xa0d8ff, 0xffffff, 0xff9ad0, 0x9affd0]), [rr, gg, bb] = bvRGB(col), G = bvGB(ch, 'neon');
    bvB(G, X0 + 1.5, Y, Z0 + 1.5, X1 - 1.5, Y + 5, Z1 - 1.5, rr * 0.7, gg * 0.7, bb * 0.7); gbP.box(X0 + 1.5, Y + 5, Z0 + 1.5, X1 - 1.5, Y + 5.4, Z1 - 1.5, 0.3, 0.3, 0.32);
    bvNeonEdge(ch, X0, Z0, X1, Z1, Y - 1, Y, col); colBox(ch, X0 + 1.5, Z0 + 1.5, X1 - 1.5, Z1 - 1.5, Y, Y + 5.4);
    const sp = 8 + v() * 10; gbP.box(cx - 0.25, Y + 5.4, cz - 0.25, cx + 0.25, Y + 5.4 + sp, cz + 0.25, 0.7, 0.7, 0.72); bvLight(ch, cx, Y + 5.4 + sp, cz);
  } else if (cr === 'tank') bvTank(ch, gbP, X0 + 3.5 + v() * Math.max(0, w - 7), Z0 + 3.5 + v() * Math.max(0, d - 7), Y);
  else if (cr === 'garden') bvGarden(gbP, X0, Z0, X1, Z1, Y, v, key);
  else if (cr === 'billboard') bvBillboard(ch, gbP, cx, n > 0 ? Z1 - 2 : Z0 + 2, Y, n, Math.min(w - 2, 14), v, key === 'metro' || v() < 0.4);
  else roofExtra(gbB, gbP, key, X0, Z0, w, d, Y, r);
}
/* a downtown tower over its podium: style, shape (plain, twins, setbacks), crown, neon */
function bvTower(ch, gbB, gbP, key, ox, oz, fw, fd, y0, hgt, c, uo, vo, v, n, r) {
  const sty = bvStyle(key, 'tower', v), tc = bvColor(sty, c, v), rk = key === 'city' ? 0.5 : 0.55, Y = y0 + hgt, yb = y0 + 8, city = key === 'city' || key === 'metro';
  const part = (x0, z0, x1, z1, ya, yt, col) => { bvBox(ch, gbB, sty, x0, z0, x1, z1, ya, yt, col, uo, vo, rk); colBox(ch, x0, z0, x1, z1, y0, yt); };
  const u = v(); let cb;
  if (u < 0.22 && fw >= 24 && hgt > 40) {   /* twin towers, the second shorter, often a skybridge */
    const w = (fw - 4) / 2, yB = y0 + 4 * Math.max(10, Math.round(hgt * (0.66 + v() * 0.2) / 4));
    part(ox, oz, ox + w, oz + fd, yb, Y, tc); part(ox + w + 4, oz, ox + fw, oz + fd, yb, yB, bvShade(tc, 0.94));
    if (v() < 0.65) { const ys = y0 + (yB - y0) * 0.6; gbP.box(ox + w, ys, oz + fd * 0.35, ox + w + 4, ys + 3.4, oz + fd * 0.65, 0.42, 0.58, 0.68); colBox(ch, ox + w, oz + fd * 0.35, ox + w + 4, oz + fd * 0.65, ys, ys + 3.4); }
    bvCornice(gbP, ox + w + 4, oz, ox + fw, oz + fd, yB, tc);
    cb = [ox, oz, ox + w, oz + fd, yb];
  } else if (u < 0.52 && hgt > 40) {   /* setbacks: a broad base, a narrower shaft, sometimes a third step */
    const h1 = 4 * Math.round(hgt * (0.42 + v() * 0.2) / 4), ins = 2 + ((v() * 2) | 0);
    part(ox, oz, ox + fw, oz + fd, yb, y0 + h1, tc); bvCornice(gbP, ox, oz, ox + fw, oz + fd, y0 + h1, tc);
    let X0 = ox + ins, Z0 = oz + ins, X1 = ox + fw - ins, Z1 = oz + fd - ins, ya = y0 + h1;
    if (hgt - h1 >= 24 && v() < 0.6) { const h2 = 4 * Math.round((hgt - h1) * 0.5 / 4); part(X0, Z0, X1, Z1, ya, ya + h2, tc); ya += h2; X0 += 2; Z0 += 2; X1 -= 2; Z1 -= 2; }
    part(X0, Z0, X1, Z1, ya, Y, tc); cb = [X0, Z0, X1, Z1, ya];
  } else { part(ox, oz, ox + fw, oz + fd, yb, Y, tc); cb = [ox, oz, ox + fw, oz + fd, yb]; }
  if (city && v() < (key === 'metro' ? 0.75 : 0.4)) bvNeonEdge(ch, cb[0], cb[1], cb[2], cb[3], cb[4], Y, _pk(v, BV_NEON));
  bvCrown(ch, gbB, gbP, key, cb[0], cb[1], cb[2], cb[3], Y, hgt, tc, v, n, r);
}
/* a block of a few floors (downtown or the middle ring): footprint, style, cornice or pitched roof, shop window, balconies, roof */
function bvBlock(ch, gbB, gbP, o) {
  const v = o.v, n = o.b ? 1 : -1; let fw = o.fw, fd = o.fd, hgt = o.hgt;
  if (!o.spc) { fw = 4 * (4 + ((v() * 4) | 0)); fd = 4 * (4 + ((v() * 4) | 0)); if (fw <= 20 && v() < 0.3) hgt += 8; }
  const ox = o.lx0 + (o.ls - fw) / 2, oz = o.lz0 + (o.ls - fd) / 2, Y = o.baseY + hgt, zf = o.b ? oz + fd : oz;
  const sty = bvStyle(o.key, 'mid', v), col = bvColor(sty, o.c, v), pitched = o.roof === 'pitch' || o.roof === 'steep', low = o.roof === 'low';
  bvBox(ch, gbB, sty, ox, oz, ox + fw, oz + fd, o.baseY, Y, col, o.uo, o.vo, pitched ? 0 : 0.6);
  Bld.reg(ch, o.T, o.i, o.j, o.a, o.b, ox, oz, ox + fw, oz + fd, o.baseY, hgt, o.cat, gbP);
  colBox(ch, ox, oz, ox + fw, oz + fd, o.baseY, Y, pitched || low ? o.hr : 0);
  if (pitched) { houseRoof(gbB, ox, oz, ox + fw, oz + fd, Y, o.hr, o.rcol, col); if (o.chim && v() < 0.6) chimneyAt(gbP, ox, oz, fw, fd, Y, o.hr, o.rcol); }
  else if (low) houseRoof(gbB, ox, oz, ox + fw, oz + fd, Y, o.hr, o.rcol, col);
  else {
    if (v() < 0.55) bvCornice(gbP, ox, oz, ox + fw, oz + fd, Y, col);
    const city = o.key === 'city' || o.key === 'metro', u = v();
    if (u < (city ? 0.3 : 0.15) && fw >= 16) bvBillboard(ch, gbP, ox + fw / 2, o.b ? oz + fd - 2.5 : oz + 2.5, Y, n, Math.min(fw - 3, 12), v, o.key === 'metro' || v() < 0.3);
    else if (u < 0.45) bvTank(ch, gbP, ox + 4 + v() * (fw - 8), oz + 4 + v() * (fd - 8), Y);
    else if (u < 0.6 && fw >= 16 && fd >= 16) bvGarden(gbP, ox, oz, ox + fw, oz + fd, Y, v, o.key);
    else roofExtra(gbB, gbP, o.key, ox, oz, fw, fd, Y, o.r);
  }
  if (v() < 0.75) bvShopfront(ch, gbP, ox + 1, ox + fw - 1, zf, n, o.baseY, v);
  if (hgt >= 12 && sty !== 'glass' && sty !== 'ribbon' && v() < 0.45) bvBalconies(gbP, ox, fw, zf, n, o.baseY, hgt, col, v);
  if (o.key === 'metro' && v() < 0.35) bvNeonEdge(ch, ox, oz, ox + fw, oz + fd, o.baseY + 4, Y, _pk(v, BV_NEON));
  return { ox, oz, fw, fd };
}
/* a house: its style, and maybe a front porch and a garage */
function bvHouse(ch, gbB, gbP, o) {
  const v = o.v, n = o.b ? 1 : -1, { ox, oz, hw, hd, wh, baseY } = o, zf = o.b ? oz + hd : oz;
  const sty = bvStyle(o.key, 'house', v), hc = sty === 'brick' ? _pk(v, BV_BRICK) : o.wc;
  bvBox(ch, gbB, sty, ox, oz, ox + hw, oz + hd, baseY, baseY + wh, hc, o.uo, o.vo, o.pitched ? 0 : 0.7);
  if (wh <= 8 && v() < 0.5) {   /* a porch: deck, posts and a little roof */
    const pw = Math.min(hw - 2, 6 + v() * 2), xm = ox + hw / 2, pr = o.rcol, dk = [0.62, 0.5, 0.38];
    bvB(gbP, xm - pw / 2, baseY, zf, xm + pw / 2, baseY + 0.55, zf + n * 2.3, dk[0], dk[1], dk[2]);
    for (const s of [-1, 1]) bvB(gbP, xm + s * (pw / 2 - 0.2) - 0.14, baseY + 0.55, zf + n * 2.05, xm + s * (pw / 2 - 0.2) + 0.14, baseY + 3.2, zf + n * 2.3, 0.95, 0.94, 0.9);
    bvB(gbP, xm - pw / 2 - 0.2, baseY + 3.2, zf, xm + pw / 2 + 0.2, baseY + 3.4, zf + n * 2.5, pr.r, pr.g, pr.b);
  }
  if (v() < 0.42) {   /* a garage beside it, where the lot has room */
    const gw = 5.6, gd = Math.min(hd, 6.5), left = ox - gw > o.lx0 - 0.5, right = ox + hw + gw < o.lx0 + o.ls + 0.5;
    if (left || right) {
      const gx0 = right && (!left || v() < 0.5) ? ox + hw : ox - gw, gx1 = gx0 + gw, za = zf, zb = zf - n * gd, gc = bvShade(hc, 0.95);
      bvBox(ch, gbB, sty, gx0, Math.min(za, zb), gx1, Math.max(za, zb), baseY, baseY + 3.4, gc, o.uo, o.vo, 0.7);
      colBox(ch, gx0, Math.min(za, zb), gx1, Math.max(za, zb), baseY, baseY + 3.4);
      bvB(gbP, gx0 + 0.6, baseY + 0.3, za, gx1 - 0.6, baseY + 2.8, za + n * 0.06, 0.86, 0.86, 0.84);
      for (let k = 1; k < 4; k++) bvB(gbP, gx0 + 0.6, baseY + 0.3 + k * 0.62, za, gx1 - 0.6, baseY + 0.36 + k * 0.62, za + n * 0.09, 0.62, 0.62, 0.6);
    }
  }
  return { sty, hc };
}

/* ---------- signs ---------- */
function bvTex(txt, sty, col, vert) {
  const key = txt + '|' + sty + '|' + col + '|' + (vert ? 1 : 0); if (BV.tex.has(key)) return BV.tex.get(key);
  const W = vert ? 160 : 1024, H = vert ? 640 : 160, cv = mkCanvas(W, H), g = cv.getContext('2d'), cs = col != null ? _hexCss(col) : '#f4f0e6';
  const fam = sty === 'board' ? 'Georgia, "Times New Roman", serif' : sty === 'light' ? 'Arial, Helvetica, sans-serif' : '"Chakra Petch", Rajdhani, "Arial Black", sans-serif';
  const font = (n) => (sty === 'neon' && !vert ? 'italic 700 ' : '700 ') + n + 'px ' + fam;
  if (sty === 'neon') { g.fillStyle = '#06070b'; g.fillRect(0, 0, W, H); g.strokeStyle = cs; g.lineWidth = 5; g.shadowColor = cs; g.shadowBlur = 16; g.strokeRect(12, 12, W - 24, H - 24); g.shadowBlur = 0; }
  else if (sty === 'board') { g.fillStyle = '#5b3a20'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 7) { g.fillStyle = `rgba(0,0,0,${0.05 + (y * 7 % 13) / 130})`; g.fillRect(0, y, W, 3); } g.strokeStyle = '#c9a24e'; g.lineWidth = 8; g.strokeRect(8, 8, W - 16, H - 16); }
  else if (sty === 'light') { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = cs; if (vert) g.fillRect(0, 0, 18, H); else g.fillRect(0, H - 22, W, 22); }
  else if (sty === 'bill') { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, cs); gr.addColorStop(1, '#14161c'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(W * 0.85, H * 0.2, H * 0.9, 0, TAU); g.fill(); }
  else { g.fillStyle = '#101318'; g.fillRect(0, 0, W, H); if (col != null) { g.fillStyle = cs; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10); } }
  const fg = sty === 'neon' ? '#fff' : sty === 'board' ? '#f3e3b6' : sty === 'light' ? '#1e2228' : sty === 'bill' ? '#fff' : cs;
  const draw = (s, x, y, fs) => {
    g.font = font(fs); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (sty === 'neon') { g.lineJoin = 'round'; g.strokeStyle = cs; g.shadowColor = cs; g.shadowBlur = fs * 0.35; g.lineWidth = Math.max(3, fs * 0.13); g.strokeText(s, x, y); g.shadowBlur = fs * 0.15; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText(s, x, y); g.shadowBlur = 0; }
    else { if (sty === 'bill' || sty === 'board') { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText(s, x + fs * 0.04, y + fs * 0.05); } g.fillStyle = fg; g.fillText(s, x, y); }
  };
  if (vert) {
    const L = [...txt.replace(/\s/g, '')], step = (H - 50) / Math.max(1, L.length), fs = Math.min(W * 0.62, step * 0.9);
    L.forEach((ch, k) => draw(ch, W / 2 + (sty === 'light' ? 8 : 0), 25 + step * (k + 0.5), fs));
  } else {
    let fs = Math.round(H * 0.56); g.font = font(fs); while (fs > 10 && g.measureText(txt).width > W * 0.88) { fs -= 2; g.font = font(fs); }
    draw(txt, W / 2, H / 2 + (sty === 'light' ? -6 : 2), fs);
  }
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.__keep = true; BV.tex.set(key, t); return t;
}
/* a sign plane facing along z (n = ±1), or along x when ax is set */
function bvPlane(ch, tex, w, h, x, y, z, n, neon, ax) {
  const key = tex.uuid; let mat = BV.mats.get(key);
  if (!mat) { mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.15, 1.15, 1.15) }); if (neon) BV.signMats.push(mat); BV.mats.set(key, mat); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x - ch.x0, y, z - ch.z0);
  m.rotation.y = ax ? (n > 0 ? Math.PI / 2 : -Math.PI / 2) : (n > 0 ? 0 : Math.PI); ch.group.add(m); return m;
}
/* the soft glow round a neon sign at night */
function bvHalo(ch, x, y, z, w, h, n, hex, ax) {
  const G = bvGB(ch, 'halo'), [r, g, b] = bvRGB(hex), a = w / 2, c = h / 2;
  if (ax) G.quadA([x, y - c, z - a, 0, 0], [x, y - c, z + a, 1, 0], [x, y + c, z + a, 1, 1], [x, y + c, z - a, 0, 1], n, 0, 0, r, g, b);
  else G.quadA([x - a, y - c, z, 0, 0], [x + a, y - c, z, 1, 0], [x + a, y + c, z, 1, 1], [x - a, y + c, z, 0, 1], 0, 0, n, r, g, b);
}
/* the shop's signs: its board over the door (neon, painted, a bright plate or the old dark one), maybe a blade sign and an OPEN sign */
function bvSign(ch, rec, x, z, n, g0, dh, dw, shop, gbP) {
  const v = mulberry32((rec.seed ^ 0x5bd1e995) >>> 0), reg = rec.reg, city = reg === 'city' || reg === 'metro', ic = BLD_ICO[rec.kind];
  let sty, col;
  if (rec.special && !BV_NEONK[rec.kind]) { sty = reg === 'metro' ? 'neon' : 'plate'; col = ic ? ic[1] : null; }
  else if (BV_NEONK[rec.kind] && (city || reg === 'harbor' || v() < 0.5)) { sty = 'neon'; col = v() < 0.6 ? BV_NEONK[rec.kind] : _pk(v, BV_NEON); }
  else if (reg === 'metro' || (city && v() < 0.35)) { sty = 'neon'; col = _pk(v, BV_NEON); }
  else if (BV_BOARD[rec.kind] && !city) { sty = 'board'; col = null; }
  else if (BV_LIGHT[rec.kind]) { sty = 'light'; col = BV_LIGHT[rec.kind]; }
  else { sty = 'plate'; col = rec.special && ic ? ic[1] : null; }
  const neon = sty === 'neon', W = Math.min(rec.W - 2, Math.max(6, rec.name.length * 0.62)) * (neon ? 1.05 : 1), H = neon ? 1.35 : 1.15, yy = g0 + dh + (shop && rec.kind !== 'office' ? 1.35 : 0.9) + (neon ? 0.1 : 0);
  bvPlane(ch, bvTex(rec.name.toUpperCase(), sty, col), W, H, x, yy, z + n * 0.14, n, neon);
  if (neon) bvHalo(ch, x, yy, z + n * 0.3, W * 1.5, H * 3, n, col);
  rec.signStyle = sty;
  if (!shop || rec.kind === 'office') return;
  /* a blade sign, sticking out over the pavement near the corner */
  if (rec.h >= 8 && rec.W >= 10 && (neon ? v() < 0.75 : v() < 0.35)) {
    const word = BV_BLADE[rec.kind] || rec.name.split(/\s+/)[0].toUpperCase().slice(0, 7), s = v() < 0.5 ? -1 : 1, bx = x + s * (rec.W / 2 - 0.9), hb = Math.min(rec.h - 5.6, 0.75 + word.length * 0.62), yb = g0 + 5.0 + hb / 2;
    const bs = neon ? 'neon' : sty === 'board' ? 'board' : 'light', bc = col != null ? col : 0xc8302a, tex = bvTex(word, bs, bc, true), zc = z + n * 1.05;
    bvPlane(ch, tex, 1.2, hb, bx + 0.04, yb, zc, 1, neon, true); bvPlane(ch, tex, 1.2, hb, bx - 0.04, yb, zc, -1, neon, true);
    bvB(gbP, bx - 0.03, yb - hb / 2 - 0.08, z, bx + 0.03, yb + hb / 2 + 0.08, z + n * 1.7, 0.16, 0.16, 0.18);
    bvB(gbP, bx - 0.06, yb + hb / 2 + 0.05, z, bx + 0.06, yb + hb / 2 + 0.15, z + n * 1.8, 0.16, 0.16, 0.18);
    if (neon) { bvHalo(ch, bx + 0.1, yb, zc, 2.4, hb * 1.6, 1, bc, true); bvHalo(ch, bx - 0.1, yb, zc, 2.4, hb * 1.6, -1, bc, true); }
  }
  /* OPEN in the window */
  if (v() < 0.6 && x + dw + 2.9 < rec.x1) {
    const oc = _pk(v, [0xff2a3a, 0xff2a3a, 0x2af0ff, 0xffd02a]), ox = x + dw + 1.95;
    bvPlane(ch, bvTex('OPEN', 'neon', oc), 1.5, 0.62, ox, g0 + 1.8, z + n * 0.2, n, true); bvHalo(ch, ox, g0 + 1.8, z + n * 0.3, 2.6, 1.5, n, oc);
  }
}
