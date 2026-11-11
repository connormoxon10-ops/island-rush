/* ================= TERRAIN COLOUR, TREES, BUILDINGS, CHUNKS ================= */
const PAL = {
  grassA: lc(0x486b2c), grassB: lc(0x76883a), dry: lc(0x938a4e), forest: lc(0x2c4a26), sand: lc(0xd6c18c), seabed: lc(0x6f6a50), dirt: lc(0x7b6a4a), mead: lc(0x5f8334),
  rock: lc(0x77716a), rockD: lc(0x4a4743), snow: lc(0xeef1f5), gravel: lc(0x8a8174), pave: lc(0x92928e), asphalt: lc(0x2c2e33)
};
const _tc = new THREE.Color(), _pcs = Array.from({ length: 12 }, () => new THREE.Color());
let _pvK = -1;
function townPave(x, z) {
  let w = 0; _pvK = -1;
  for (let k = 0; k < towns.length; k++) { const T = towns[k]; const dx = Math.abs(x - T.cx) - T.half, dz = Math.abs(z - T.cz) - T.half; if (dx > 20 || dz > 20) continue; const q = 1 - sstep(-2, 14, Math.max(dx, dz)); if (q > w) { w = q; _pvK = k; } }
  return w;
}
function terrainColor(x, z, h, slope, dRoad, halfW, out, k) {
  const n1 = noise2(x * 0.012, z * 0.012), n2 = noise2(x * 0.05 + 9, z * 0.05 - 3), nb = fbm(x * 0.0035 + 7, z * 0.0035 - 3, 2), n3 = noise2(x * 0.19 - 5, z * 0.19 + 11), n4 = noise2(x * 0.006 + 31, z * 0.006 - 17);
  Biome.at(x, z);
  const cGA = Biome.col('grassA', PAL.grassA, _pcs[0]), cGB = Biome.col('grassB', PAL.grassB, _pcs[1]), cMe = Biome.col('mead', PAL.mead, _pcs[2]), cDr = Biome.col('dry', PAL.dry, _pcs[3]), cDi = Biome.col('dirt', PAL.dirt, _pcs[4]),
    cFo = Biome.col('forest', PAL.forest, _pcs[5]), cRo = Biome.col('rock', PAL.rock, _pcs[6]), cRD = Biome.col('rockD', PAL.rockD, _pcs[7]), cSn = Biome.col('snow', PAL.snow, _pcs[8]), cSa = Biome.col('sand', PAL.sand, _pcs[9]), cGr = Biome.col('gravel', PAL.gravel, _pcs[10]);
  _tc.copy(cGA).lerp(cGB, sstep(-0.3, 0.5, n1));
  _tc.lerp(cMe, sstep(0.0, 0.55, n4) * 0.45);
  _tc.lerp(cDr, sstep(0.28, 0.7, n2) * 0.6);
  _tc.lerp(cDi, sstep(0.46, 0.7, n3 + n2 * 0.4) * 0.5 * (1 - sstep(0.12, 0.3, slope)));
  if (nb > 0.0) _tc.lerp(cFo, sstep(0.0, 0.32, nb) * 0.7);
  Biome.tint(x, z, h, slope, _tc);
  const sl = Biome.num('snowLine', null, 112);
  const rockAmt = Math.max(sstep(0.09, 0.26, slope), sstep(55, 88, h + n2 * 10));
  _tc.lerp(cRo, rockAmt * 0.92);
  _tc.lerp(cRD, sstep(0.28, 0.5, slope) * 0.6);
  _tc.lerp(cSn, sstep(sl, sl + 20, h + n1 * 12) * (1 - sstep(0.2, 0.4, slope) * 0.6));
  _tc.lerp(cSa, 1 - sstep(1.2, 3.2, h + n2 * 0.7));
  if (h < 0) _tc.lerp(PAL.seabed, sstep(0, 6, -h) * 0.8);
  const vv = 1 + n3 * 0.09; _tc.r *= vv; _tc.g *= vv * (1 + n2 * 0.03); _tc.b *= vv;
  if (Air.s) { const aw = Air.grassW(x, z); if (aw > 0) { _tc.lerp(AIRGRASS, aw * 0.6); } }
  if (Dock.s) { const dw = Dock.padW(x, z); if (dw > 0) _tc.lerp(DOCKPAD, dw * 0.85); }
  if (Track.s) { const tw = Track.grassW(x, z); if (tw > 0) _tc.lerp(TRKGRASS, tw * 0.7); }
  const tp = townPave(x, z); if (tp > 0) { const R = _pvK >= 0 ? REG[_pvK % REG.length] : null; _tc.lerp(R ? R.paveC : PAL.pave, tp * (R ? R.paveAmt : 0.95)); }
  if (dRoad < halfW + 10) { const w = 1 - sstep(halfW + 1, halfW + 9, dRoad); _tc.lerp(cGr, w * 0.85); if (dRoad < halfW + 0.5) _tc.lerp(PAL.asphalt, 1); }
  out[k] = _tc.r; out[k + 1] = _tc.g; out[k + 2] = _tc.b;
}

/* ---------------- buildings ---------------- */
const BCOL = [0xd8d2c4, 0xc9c3b6, 0xb9b2a4, 0xe2ddd0, 0x9fa7ae, 0x7f95a8, 0xb08f78, 0xa87f6a, 0x8ea0b4].map(lc);
const HCOL = [0xe8d9b8, 0xd7a98a, 0xc9d2c0, 0xb7c6d6, 0xe6e0d4, 0xd9b7a0].map(lc);
const RCOL = [0x8a3a2b, 0x5d4a3f, 0x3d4650, 0x7a2f26].map(lc);
function bldgBox(gb, x0, z0, x1, z1, y0, y1, c, uo, vo, roofK) {
  const tw = 16, w = x1 - x0, d = z1 - z0, h = y1 - y0;
  gb.wall(x1, z1, x1, z0, y0, y1, 1, 0, c.r * 0.92, c.g * 0.92, c.b * 0.92, uo, uo + d / tw, vo, vo + h / tw);
  gb.wall(x0, z0, x0, z1, y0, y1, -1, 0, c.r * 0.82, c.g * 0.82, c.b * 0.82, uo, uo + d / tw, vo, vo + h / tw);
  gb.wall(x0, z1, x1, z1, y0, y1, 0, 1, c.r, c.g, c.b, uo, uo + w / tw, vo, vo + h / tw);
  gb.wall(x1, z0, x0, z0, y0, y1, 0, -1, c.r * 0.88, c.g * 0.88, c.b * 0.88, uo, uo + w / tw, vo, vo + h / tw);
  if (roofK > 0) gb.quadA([x0, y1, z0, 0.03, 0.03], [x1, y1, z0, 0.03, 0.03], [x1, y1, z1, 0.03, 0.03], [x0, y1, z1, 0.03, 0.03], 0, 1, 0, c.r * roofK, c.g * roofK, c.b * roofK);
}
function houseRoof(gb, x0, z0, x1, z1, yw, hr, rc, wc) {
  const o = 0.45, u = 0.03;
  if (x1 - x0 >= z1 - z0) {
    const zc = (z0 + z1) / 2, d = zc - z0 + o, L = Math.hypot(d, hr), ny = d / L, nz = hr / L;
    gb.quadA([x0 - o, yw, z0 - o, u, u], [x1 + o, yw, z0 - o, u, u], [x1 + o, yw + hr, zc, u, u], [x0 - o, yw + hr, zc, u, u], 0, ny, -nz, rc.r, rc.g, rc.b);
    gb.quadA([x0 - o, yw, z1 + o, u, u], [x1 + o, yw, z1 + o, u, u], [x1 + o, yw + hr, zc, u, u], [x0 - o, yw + hr, zc, u, u], 0, ny, nz, rc.r * 0.85, rc.g * 0.85, rc.b * 0.85);
    gb.triA([x0, yw, z0, u, u], [x0, yw, z1, u, u], [x0, yw + hr, zc, u, u], -1, 0, 0, wc.r, wc.g, wc.b);
    gb.triA([x1, yw, z0, u, u], [x1, yw, z1, u, u], [x1, yw + hr, zc, u, u], 1, 0, 0, wc.r, wc.g, wc.b);
  } else {
    const xc = (x0 + x1) / 2, d = xc - x0 + o, L = Math.hypot(d, hr), ny = d / L, nx = hr / L;
    gb.quadA([x0 - o, yw, z0 - o, u, u], [x0 - o, yw, z1 + o, u, u], [xc, yw + hr, z1 + o, u, u], [xc, yw + hr, z0 - o, u, u], -nx, ny, 0, rc.r, rc.g, rc.b);
    gb.quadA([x1 + o, yw, z0 - o, u, u], [x1 + o, yw, z1 + o, u, u], [xc, yw + hr, z1 + o, u, u], [xc, yw + hr, z0 - o, u, u], nx, ny, 0, rc.r * 0.85, rc.g * 0.85, rc.b * 0.85);
    gb.triA([x0, yw, z0, u, u], [x1, yw, z0, u, u], [xc, yw + hr, z0, u, u], 0, 0, -1, wc.r, wc.g, wc.b);
    gb.triA([x0, yw, z1, u, u], [x1, yw, z1, u, u], [xc, yw + hr, z1, u, u], 0, 0, 1, wc.r, wc.g, wc.b);
  }
}
/* ---- per-region architecture + scenery helpers ---- */
let _cylG = null;
function cylAt(gb, x, y, z, rx, h, rz, r, g, b) {
  if (!_cylG) { _cylG = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false); _cylG.translate(0, 0.5, 0); _cylG = _cylG.toNonIndexed(); }
  _p3.set(x, y, z); _q.identity(); _s3.set(rx, h, rz); _m4.compose(_p3, _q, _s3); _tcol.setRGB(r, g, b); gb.geo(_cylG, _m4, _tcol, 0);
}
const _pk = (r, a) => a[(r() * a.length) | 0];
function mixKind(tr, u) { let a = 0; for (const m of tr.mix) { a += m[1]; if (u < a) return m[0]; } return tr.mix[tr.mix.length - 1][0]; }
/* drop a plant of any kind (cypress = tall thin pine) */
function placeTree(gbP, gbF, kind, vi, x, y, z, sc, rot, tint, hue, ch) {
  if (kind === 'cypress') addTree(gbP, gbF, 'pine', vi, x, y, z, sc * 0.52, rot, tint * 0.35, 2.4 + tint * 0.5, hue, ch);
  else addTree(gbP, gbF, kind, vi, x, y, z, sc, rot, tint, 0.9 + tint * 0.25, hue, ch);
}
/* rooftop dressing */
function roofExtra(gbB, gbP, key, ox, oz, w, d, top, r) {
  if (key === 'desert' && r() < 0.5) {
    const tx = ox + 2 + r() * Math.max(1, w - 6), tz = oz + 2 + r() * Math.max(1, d - 6);
    for (const [a, b] of [[0, 0], [2.2, 0], [0, 2.2], [2.2, 2.2]]) gbP.box(tx + a - 0.1, top, tz + b - 0.1, tx + a + 0.1, top + 1.5, tz + b + 0.1, 0.35, 0.3, 0.28);
    cylAt(gbP, tx + 1.1, top + 1.5, tz + 1.1, 1.7, 2.2, 1.7, 0.55, 0.58, 0.62);
  } else if (key === 'harbor' && r() < 0.4) {
    const sx = ox + 3 + r() * Math.max(1, w - 6), sz = oz + 3 + r() * Math.max(1, d - 6);
    cylAt(gbP, sx, top, sz, 1.1, 14, 1.1, 0.62, 0.2, 0.16); cylAt(gbP, sx, top + 9, sz, 1.14, 2.6, 1.14, 0.92, 0.92, 0.9); cylAt(gbP, sx, top + 14, sz, 1.25, 0.5, 1.25, 0.2, 0.2, 0.2);
  } else gbB.box(ox + 3, top, oz + 3, ox + 6, top + 1.6, oz + 7, 0.35, 0.35, 0.36);
}
function chimneyAt(gbP, ox, oz, hw, hd, yw, hr, rc) {
  const long = hw >= hd, cx = long ? ox + hw * 0.3 : ox + hw / 2 + 0.7, cz = long ? oz + hd / 2 + 0.7 : oz + hd * 0.3;
  gbP.box(cx - 0.45, yw + 0.3, cz - 0.45, cx + 0.45, yw + hr + 1.5, cz + 0.45, 0.44, 0.38, 0.34);
}
function genTownLots(ch, T, gbB, gbP) {
  if (!Biome.ready) Biome.prep();
  const ri = Math.max(0, towns.indexOf(T)), R = REG[ri % REG.length], A = R.arch, key = R.key, roof = A.roof, hr = A.hr;
  const x0 = ch.x0, z0 = ch.z0, x1 = x0 + CHUNK, z1 = z0 + CHUNK, baseY = T.baseH - 0.4;
  const dark = (c, k) => ({ r: c.r * k, g: c.g * k, b: c.b * k });
  for (let i = 0; i < T.N; i++) for (let j = 0; j < T.N; j++) {
    const bx0 = T.x0 + i * T.cell + 7, bz0 = T.z0 + j * T.cell + 7, bs = T.cell - 14;
    if (bx0 > x1 + 8 || bx0 + bs < x0 - 8 || bz0 > z1 + 8 || bz0 + bs < z0 - 8) continue;
    const dn = Math.max(Math.abs(i + 0.5 - T.N / 2), Math.abs(j + 0.5 - T.N / 2));
    if (Home.isBlock(T, i, j)) { Home.trees(ch, gbP); continue; }
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const ls = bs / 2 - 3, lx0 = bx0 + a * bs / 2 + 1.5, lz0 = bz0 + b * bs / 2 + 1.5, lcx = lx0 + ls / 2, lcz = lz0 + ls / 2;
      if (lcx < x0 || lcx >= x1 || lcz < z0 || lcz >= z1) continue;
      if (Shop.lot(T, i, j, a, b)) { Shop.build(ch, Shop.sites[ri], gbB, gbP); continue; }
      if (Ven.lot(T, i, j, a, b)) { Ven.build(ch, Ven.sites[ri], gbB, gbP); continue; }
      if (Ven.clubLot(T, i, j, a, b)) { Ven.buildClub(ch, Ven.clubs[ri], gbB, gbP); continue; }
      const r = mulberry32(ihash(T.id * 977 + i * 31 + a, j * 57 + b, 11));
      const uo = ((r() * 4) | 0) * 0.25, vo = ((r() * 4) | 0) * 0.25;
      if (dn < 1) {
        const hgt = 4 * Math.max(2, Math.round((A.dtH[0] + r() * (A.dtH[1] - A.dtH[0])) / 4)), tall = hgt > 34;
        const fw = tall ? 4 * (5 + ((r() * 3) | 0)) : 4 * (5 + ((r() * 2) | 0)), fd = tall ? 4 * (5 + ((r() * 3) | 0)) : 4 * (5 + ((r() * 2) | 0));
        const c = _pk(r, A.B), ox = lx0 + (ls - fw) / 2, oz = lz0 + (ls - fd) / 2;
        if (tall) {
          bldgBox(gbB, lx0 + 0.5, lz0 + 0.5, lx0 + ls - 0.5, lz0 + ls - 0.5, baseY, baseY + 8, _pk(r, A.M), uo, vo, 0.7);
          colBox(ch, lx0 + 0.5, lz0 + 0.5, lx0 + ls - 0.5, lz0 + ls - 0.5, baseY, baseY + 8);
          bldgBox(gbB, ox, oz, ox + fw, oz + fd, baseY + 8, baseY + hgt, c, uo, vo, key === 'city' ? 0.5 : 0.55);
          colBox(ch, ox, oz, ox + fw, oz + fd, baseY, baseY + hgt);
          let top = baseY + hgt;
          if (key === 'city' && hgt > 60) {   /* stepped crowns */
            const tiers = r() < 0.5 ? 2 : 1; let ix = 3, w2 = fw, d2 = fd, cc = c;
            for (let t = 0; t < tiers; t++) { w2 -= 2 * ix; d2 -= 2 * ix; if (w2 < 8 || d2 < 8) break; const th = 8 + r() * 16; cc = dark(cc, 0.93); bldgBox(gbB, ox + (fw - w2) / 2, oz + (fd - d2) / 2, ox + (fw + w2) / 2, oz + (fd + d2) / 2, top, top + th, cc, uo, vo, 0.5); colBox(ch, ox + (fw - w2) / 2, oz + (fd - d2) / 2, ox + (fw + w2) / 2, oz + (fd + d2) / 2, top, top + th); top += th; ix = 2; }
            const sph = 14 + r() * 18; gbP.box(ox + fw / 2 - 0.25, top, oz + fd / 2 - 0.25, ox + fw / 2 + 0.25, top + sph, oz + fd / 2 + 0.25, 0.7, 0.7, 0.72); colBox(ch, ox + fw / 2 - 0.25, oz + fd / 2 - 0.25, ox + fw / 2 + 0.25, oz + fd / 2 + 0.25, top, top + sph);
            gbP.box(ox + fw / 2 - 0.4, top + 20, oz + fd / 2 - 0.4, ox + fw / 2 + 0.4, top + 21, oz + fd / 2 + 0.4, 1, 0.12, 0.1);
          } else if (hgt > 70) { gbP.box(ox + fw / 2 - 0.3, top, oz + fd / 2 - 0.3, ox + fw / 2 + 0.3, top + 10, oz + fd / 2 + 0.3, 0.5, 0.5, 0.5); colBox(ch, ox + fw / 2 - 0.3, oz + fd / 2 - 0.3, ox + fw / 2 + 0.3, oz + fd / 2 + 0.3, top, top + 10); }
          else roofExtra(gbB, gbP, key, ox, oz, fw, fd, top, r);
        } else {
          const wc = _pk(r, A.H), rcol = _pk(r, A.R);
          bldgBox(gbB, ox, oz, ox + fw, oz + fd, baseY, baseY + hgt, c, uo, vo, roof === 'flat' || roof === 'low' ? 0.6 : 0);
          colBox(ch, ox, oz, ox + fw, oz + fd, baseY, baseY + hgt, roof === 'pitch' || roof === 'steep' || roof === 'low' ? hr : 0);
          if (roof === 'pitch' || roof === 'steep') houseRoof(gbB, ox, oz, ox + fw, oz + fd, baseY + hgt, hr, rcol, wc);
          else if (roof === 'low') houseRoof(gbB, ox, oz, ox + fw, oz + fd, baseY + hgt, hr, rcol, c);
          else roofExtra(gbB, gbP, key, ox, oz, fw, fd, baseY + hgt, r);
        }
      } else if (dn < 2) {
        const fw = 4 * (6 + ((r() * 2) | 0)), fd = 4 * (6 + ((r() * 2) | 0)), hgt = 4 * Math.max(2, Math.round((A.midH[0] + r() * (A.midH[1] - A.midH[0])) / 4));
        const ox = lx0 + (ls - fw) / 2, oz = lz0 + (ls - fd) / 2, c = _pk(r, A.M), wc = _pk(r, A.H), rcol = _pk(r, A.R);
        const pitched = roof === 'pitch' || roof === 'steep';
        bldgBox(gbB, ox, oz, ox + fw, oz + fd, baseY, baseY + hgt, c, uo, vo, pitched ? 0 : 0.6);
        colBox(ch, ox, oz, ox + fw, oz + fd, baseY, baseY + hgt, pitched || roof === 'low' ? hr : 0);
        if (pitched) { houseRoof(gbB, ox, oz, ox + fw, oz + fd, baseY + hgt, hr, rcol, wc); if (r() < 0.6) chimneyAt(gbP, ox, oz, fw, fd, baseY + hgt, hr, rcol); }
        else if (roof === 'low') { houseRoof(gbB, ox, oz, ox + fw, oz + fd, baseY + hgt, hr, rcol, c); }
        else roofExtra(gbB, gbP, key, ox, oz, fw, fd, baseY + hgt, r);
        if (key === 'tropic' && r() < 0.7) for (let k = 0; k < 2; k++) { const tx = k ? ox + fw + 3 : ox - 3, tz = oz + 4 + r() * (fd - 8); if (tx > lx0 - 1 && tx < lx0 + ls + 1) { addTree(gbP, ch.gbF, 'palm', (r() * 3) | 0, tx, baseY + 0.4, tz, 0.9 + r() * 0.4, r() * TAU, r(), 1, r(), ch); } }
      } else {
        const t = r();
        if (t < 0.72) {
          const hw = 10 + ((r() * 3) | 0) * 2, hd = 8 + ((r() * 2) | 0) * 2;
          const wh = key === 'city' ? _pk(r, [8, 8, 12, 16]) : key === 'harbor' ? (r() < 0.5 ? 8 : 4) : key === 'desert' ? (r() < 0.2 ? 8 : 4) : r() < 0.4 ? 8 : 4;
          const ox = lx0 + 1.5 + r() * (ls - hw - 3), oz = lz0 + 1.5 + r() * (ls - hd - 3), wc = _pk(r, A.H), rcol = _pk(r, A.R);
          const pitched = roof === 'pitch' || roof === 'steep';
          bldgBox(gbB, ox, oz, ox + hw, oz + hd, baseY, baseY + wh, wc, uo, vo, pitched ? 0 : 0.7);
          colBox(ch, ox, oz, ox + hw, oz + hd, baseY, baseY + wh, pitched || roof === 'low' ? hr : 0);
          if (pitched) { houseRoof(gbB, ox, oz, ox + hw, oz + hd, baseY + wh, hr, rcol, wc); if (key !== 'farm' || r() < 0.5) chimneyAt(gbP, ox, oz, hw, hd, baseY + wh, hr, rcol); }
          else if (roof === 'low') houseRoof(gbB, ox, oz, ox + hw, oz + hd, baseY + wh, hr, rcol, wc);
          else if (key === 'desert' && r() < 0.35) roofExtra(gbB, gbP, key, ox, oz, hw, hd, baseY + wh, r);
          if (key === 'tropic' && r() < 0.6) { const tx = ox + hw + 2.2, tz = oz + hd * 0.5; if (tx < lx0 + ls) { addTree(gbP, ch.gbF, 'palm', (r() * 3) | 0, tx, baseY + 0.4, tz, 0.9 + r() * 0.4, r() * TAU, r(), 1, r(), ch); } }
        } else if (t < 0.88) {
          const fw = 20, fd = 16, ox = lx0 + 3, oz = lz0 + 4;
          if (key === 'farm') {   /* red barn with a silo */
            const bc = lc(_pk(r, [0x9a3a2b, 0x8a3226, 0xa8442f])), bw = 20, bd = 14, bo = lx0 + 2, bz = lz0 + 4;
            bldgBox(gbB, bo, bz, bo + bw, bz + bd, baseY, baseY + 6, bc, uo, vo, 0);
            houseRoof(gbB, bo, bz, bo + bw, bz + bd, baseY + 6, 5.2, lc(0x4a4540), lc(0xd8d2c4));
            cylAt(gbP, bo + bw + 4.5, baseY, bz + 5, 2.8, 15, 2.8, 0.74, 0.76, 0.78); cylAt(gbP, bo + bw + 4.5, baseY + 15, bz + 5, 2.9, 1.1, 2.9, 0.5, 0.52, 0.55);
            colBox(ch, bo, bz, bo + bw, bz + bd, baseY, baseY + 6, 5.2); colCyl(ch, bo + bw + 4.5, bz + 5, 2.8, baseY, baseY + 16.1);
          } else {
            const pitched = roof === 'pitch' || roof === 'steep', c = _pk(r, A.M), sh = key === 'harbor' ? 12 : key === 'tropic' ? 12 : 8, fw2 = key === 'harbor' ? 28 : fw, fd2 = key === 'harbor' ? 22 : fd;
            bldgBox(gbB, ox, oz, ox + fw2, oz + fd2, baseY, baseY + sh, c, uo, vo, pitched || roof === 'low' ? 0 : 0.65);
            colBox(ch, ox, oz, ox + fw2, oz + fd2, baseY, baseY + sh, pitched ? hr : roof === 'low' ? 1.4 : 0);
            if (pitched || roof === 'low') houseRoof(gbB, ox, oz, ox + fw2, oz + fd2, baseY + sh, pitched ? hr : 1.4, _pk(r, A.R), c);
            if (key === 'harbor') { const sx = ox + fw2 - 4, sz = oz + 4; cylAt(gbP, sx, baseY + sh, sz, 1.5, 34, 1.5, 0.66, 0.22, 0.18); cylAt(gbP, sx, baseY + sh + 24, sz, 1.56, 3, 1.56, 0.92, 0.92, 0.9); cylAt(gbP, sx, baseY + sh + 34, sz, 1.7, 0.6, 1.7, 0.22, 0.22, 0.22); colCyl(ch, sx, sz, 1.5, baseY + sh, baseY + sh + 34.6); }
            else if (key === 'desert') roofExtra(gbB, gbP, key, ox, oz, fw2, fd2, baseY + sh, r);
          }
        } else {
          if (key === 'harbor') {   /* container yard */
            const cols = [[0.72, 0.18, 0.14], [0.14, 0.34, 0.62], [0.9, 0.55, 0.12], [0.16, 0.5, 0.42], [0.62, 0.62, 0.6], [0.55, 0.12, 0.22]];
            const yx0 = lx0 + 2, yz0 = lz0 + 2;
            for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
              const cx0 = yx0 + col * 14.5, cz0 = yz0 + row * 6.2, hh = 1 + ((r() * 3) | 0);
              if (cx0 + 13 > lx0 + ls || cz0 + 2.6 > lz0 + ls) continue;
              for (let lv = 0; lv < hh; lv++) { const cc = _pk(r, cols); gbP.box(cx0, baseY + lv * 2.65, cz0, cx0 + 12.2, baseY + lv * 2.65 + 2.6, cz0 + 2.5, cc[0], cc[1], cc[2]); }
              colBox(ch, cx0, cz0, cx0 + 12.2, cz0 + 2.5, baseY, baseY + (hh - 1) * 2.65 + 2.6);
            }
          } else if (key === 'farm' && r() < 0.6) {   /* hay field */
            for (let k = 0; k < 7; k++) { const hx = lx0 + 4 + r() * (ls - 8), hz = lz0 + 4 + r() * (ls - 8); gbP.box(hx - 1, baseY, hz - 0.7, hx + 1, baseY + 1.4, hz + 0.7, 0.82, 0.7, 0.3); colBox(ch, hx - 1, hz - 0.7, hx + 1, hz + 0.7, baseY, baseY + 1.4); }
          } else {
            const nT = key === 'tropic' ? 5 : 3, tr = R.tree;
            for (let k = 0; k < nT; k++) {
              const tx = lx0 + 5 + r() * (ls - 10), tz = lz0 + 5 + r() * (ls - 10), kind = mixKind(tr, r());
              placeTree(gbP, ch.gbF, kind, (r() * 8) | 0, tx, baseY + 0.4, tz, (kind === 'cactus' ? 0.9 : 0.8) + r() * 0.5, r() * TAU, r(), r(), ch);
            }
          }
        }
      }
    }
  }
}
function gb(x) { return x; }

/* ---------------- chunk build ---------------- */
function buildChunk(cx, cz) {
  const key = ckey(cx, cz), x0 = cx * CHUNK, z0 = cz * CHUNK, step = CHUNK / GRID, W = GRID + 3;
  const H = new Float32Array(W * W), D = new Float32Array(W * W), HWd = new Float32Array(W * W);
  let minH = 1e9;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const x = x0 + (i - 1) * step, z = z0 + (j - 1) * step, k = j * W + i;
    H[k] = terrainHeight(x, z); D[k] = NR.seg >= 0 ? NR.d : 999; HWd[k] = NR.seg >= 0 ? NR.halfW : 6.5;
    if (i >= 1 && i <= GRID + 1 && j >= 1 && j <= GRID + 1) minH = Math.min(minH, H[k]);
  }
  const ch = { cx, cz, key, x0, z0, group: new THREE.Group(), cols: { c: [], b: [], t: [] }, minH };
  ch.group.position.set(x0, 0, z0);
  /* terrain mesh */
  const GV = GRID + 1, nv = GV * GV;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  for (let j = 0; j < GV; j++) for (let i = 0; i < GV; i++) {
    const hi = (j + 1) * W + (i + 1), h = H[hi], v = j * GV + i;
    const gx = (H[hi + 1] - H[hi - 1]) / (2 * step), gz = (H[hi + W] - H[hi - W]) / (2 * step);
    const il = 1 / Math.sqrt(gx * gx + 1 + gz * gz);
    const wx = x0 + i * step, wz = z0 + j * step;
    pos[v * 3] = i * step; pos[v * 3 + 1] = h; pos[v * 3 + 2] = j * step;
    nor[v * 3] = -gx * il; nor[v * 3 + 1] = il; nor[v * 3 + 2] = -gz * il;
    uv[v * 2] = wx / 7; uv[v * 2 + 1] = wz / 7;
    terrainColor(wx, wz, h, 1 - il, D[hi], HWd[hi], col, v * 3);
  }
  const idx = new Uint16Array(GRID * GRID * 6); let q = 0;
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { const a = j * GV + i, b = a + 1, c = a + GV, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  tg.setIndex(new THREE.BufferAttribute(idx, 1)); tg.computeBoundingSphere();
  const tm = new THREE.Mesh(tg, MAT.terrain); tm.receiveShadow = true; ch.group.add(tm);

  const hAt = (x, z) => {
    const fx = (x - x0) / step + 1, fz = (z - z0) / step + 1; const i = clamp(Math.floor(fx), 0, W - 2), j = clamp(Math.floor(fz), 0, W - 2); const tx = fx - i, tz = fz - j;
    return (H[j * W + i] * (1 - tx) + H[j * W + i + 1] * tx) * (1 - tz) + (H[(j + 1) * W + i] * (1 - tx) + H[(j + 1) * W + i + 1] * tx) * tz;
  };

  /* roads + furniture */
  const gbF = new GB(x0, z0, true); ch.gbF = gbF;
  const gbHw = new GB(x0, z0, true), gbSt = new GB(x0, z0, true), gbP = new GB(x0, z0, false), gbL = new GB(x0, z0, false), gbPool = new GB(x0, z0, true), gbB = new GB(x0, z0, true);
  const list = roadsByChunk.get(key);
  if (list) {
    for (let li = 0; li < list.length; li++) {
      const r = roads[list[li][0]], i = list[li][1], pts = r.pts, n = pts.length, p0 = pts[i], p1 = pts[i + 1], pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(n - 1, i + 2)];
      let t0x = p1.x - pa.x, t0z = p1.z - pa.z, l0 = Math.hypot(t0x, t0z) || 1; t0x /= l0; t0z /= l0;
      let t1x = pb.x - p0.x, t1z = pb.z - p0.z, l1 = Math.hypot(t1x, t1z) || 1; t1x /= l1; t1z /= l1;
      const s0x = -t0z, s0z = t0x, s1x = -t1z, s1z = t1x, hw = r.halfW;
      const v0 = r.cum[i] / (r.kind === 'hw' ? 12 : 8), v1 = r.cum[i + 1] / (r.kind === 'hw' ? 12 : 8);
      const quad = (g, w, yo, u0, u1) => {
        g.quadA([p0.x + s0x * w, p0.h + yo, p0.z + s0z * w, u0, v0], [p1.x + s1x * w, p1.h + yo, p1.z + s1z * w, u0, v1], [p1.x - s1x * w, p1.h + yo, p1.z - s1z * w, u1, v1], [p0.x - s0x * w, p0.h + yo, p0.z - s0z * w, u1, v0], 0, 1, 0, 1, 1, 1);
      };
      if (r.kind === 'hw') {
        quad(gbHw, hw, 0.13, 0, 1);
        const c0 = r.cum[i], c1 = r.cum[i + 1];
        for (let s = Math.ceil(c0 / 30) * 30; s < c1; s += 30) {
          const t = (s - c0) / (c1 - c0), px = p0.x + (p1.x - p0.x) * t, pz = p0.z + (p1.z - p0.z) * t, ph = p0.h + (p1.h - p0.h) * t;
          for (let side = -1; side <= 1; side += 2) {
            const qx = px + s0x * (hw + 1.3) * side, qz = pz + s0z * (hw + 1.3) * side;
            gbP.box(qx - 0.07, ph, qz - 0.07, qx + 0.07, ph + 0.95, qz + 0.07, 0.8, 0.8, 0.78);
            gbP.box(qx - 0.075, ph + 0.62, qz - 0.075, qx + 0.075, ph + 0.82, qz + 0.075, side > 0 ? 0.9 : 0.8, side > 0 ? 0.04 : 0.55, side > 0 ? 0.04 : 0.05);
          }
        }
      } else {
        const yo = 0.12 + (r.axis === 'z' ? 0.006 : 0);
        quad(gbSt, hw + 2.6, yo - 0.04, 0.2, 0.2);
        quad(gbSt, hw, yo, 0.8, 0.8);
        const side = ((i + (r.axis === 'z' ? 1 : 0)) & 1) ? 1 : -1;
        const mx = (p0.x + p1.x) / 2, mz = (p0.z + p1.z) / 2, mh = (p0.h + p1.h) / 2;
        const lx = mx + s0x * (hw + 1.5) * side, lz = mz + s0z * (hw + 1.5) * side;
        const dx = -s0x * side, dz = -s0z * side;
        gbP.box(lx - 0.09, mh, lz - 0.09, lx + 0.09, mh + 6.4, lz + 0.09, 0.3, 0.3, 0.32);
        const ex = lx + dx * 1.8, ez = lz + dz * 1.8;
        gbP.box(Math.min(lx, ex) - 0.06, mh + 6.2, Math.min(lz, ez) - 0.06, Math.max(lx, ex) + 0.06, mh + 6.38, Math.max(lz, ez) + 0.06, 0.3, 0.3, 0.32);
        gbL.box(ex - 0.28, mh + 6.05, ez - 0.2, ex + 0.28, mh + 6.2, ez + 0.2, 1, 1, 1);
        gbPool.quadA([ex - 9, mh + 0.2, ez - 9, 0, 0], [ex + 9, mh + 0.2, ez - 9, 1, 0], [ex + 9, mh + 0.2, ez + 9, 1, 1], [ex - 9, mh + 0.2, ez + 9, 0, 1], 0, 1, 0, 1, 1, 1);
        colCyl(ch, lx, lz, 0.2, mh, mh + 6.4);
        colBox(ch, Math.min(lx, ex) - 0.25, Math.min(lz, ez) - 0.25, Math.max(lx, ex) + 0.25, Math.max(lz, ez) + 0.25, mh + 6.0, mh + 6.4);
      }
    }
  }
  /* towns */
  for (let k = 0; k < towns.length; k++) {
    const T = towns[k];
    if (x0 < T.x0 + T.N * T.cell + 10 && x0 + CHUNK > T.x0 - 10 && z0 < T.z0 + T.N * T.cell + 10 && z0 + CHUNK > T.z0 - 10) genTownLots(ch, T, gbB, gbP);
  }
  /* nature */
  { const rand = mulberry32(ihash(cx, cz, 77)); let count = 0; const maxT = Math.round(110 * (Q.tree || 1));
    const dRoadAt = (x, z) => D[clamp(Math.round((z - z0) / step) + 1, 0, W - 1) * W + clamp(Math.round((x - x0) / step) + 1, 0, W - 1)];
    for (let gz = 0; gz < CHUNK; gz += 10) for (let gx = 0; gx < CHUNK; gx += 10) {
      const x = x0 + gx + rand() * 10, z = z0 + gz + rand() * 10, rr = rand(), sel = rand(), rot = rand() * TAU, tint = rand(), sz = rand(), rp = rand(), rq = rand();
      const h = hAt(x, z);
      if (h < 1.6 || h > 190 || count > maxT) continue;
      if (townAt(x, z, 34) || Air.clear(x, z, 34) || Dock.clear(x, z, 12) || Track.clear(x, z, 30)) continue;
      if (dRoadAt(x, z) < 17) continue;
      const hx = hAt(x + 2, z) - hAt(x - 2, z), hz = hAt(x, z + 2) - hAt(x, z - 2), slope = Math.hypot(hx, hz) / 4;
      if (slope > 0.8) continue;
      Biome.at(x, z); const R = Biome.pick(rp), tr = R ? R.tree : null, tl = Biome.num('tl', 'tree', 112), dm = Biome.num('dens', 'tree', 1), rk = Biome.num('rockK', 'tree', 1);
      const fn = fbm(x * 0.0035 + 7, z * 0.0035 - 3, 3), dens = sstep(-0.08, 0.3, fn), p = h <= tl ? (0.035 + 0.6 * dens) * dm : 0;
      if (rr < p) {
        let kind;
        if (tr) { kind = mixKind(tr, sel); if (h > 72 && kind !== 'cactus' && kind !== 'scrub' && kind !== 'snowpine') kind = 'pine'; }
        else { if (h < 5.4) kind = sel < 0.55 ? 'palm' : 'oak'; else if (h > 58 || (fn > 0.12 && sel < 0.5)) kind = 'pine'; else kind = sel < 0.82 ? 'oak' : 'pine'; if (h > 98 && kind !== 'pine') continue; }
        const sc = (kind === 'palm' ? 0.85 : 0.8) + sz * (kind === 'cactus' ? 0.6 : kind === 'cypress' ? 0.45 : 0.85), vi = (rand() * 8) | 0, hue = rand();
        placeTree(gbP, gbF, kind, vi, x, hAt(x, z) - 0.12, z, sc, rot, tint, hue, ch); count++;
        const bp = tr ? tr.bush : 0.45;
        if (kind !== 'palm' && kind !== 'scrub' && kind !== 'cactus' && h > 6 && rand() < bp) {
          const a = rand() * TAU, d = 2.4 + rand() * 3.2, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
          if (dRoadAt(bx, bz) > 14 && !townAt(bx, bz, 30) && !Air.clear(bx, bz, 30) && !Dock.clear(bx, bz, 12) && !Track.clear(bx, bz, 26)) addTree(gbP, gbF, R && R.key === 'desert' ? 'scrub' : 'bush', (rand() * 4) | 0, bx, hAt(bx, bz) - 0.05, bz, 0.7 + rand() * 0.7, rand() * TAU, rand(), 1, rand());
        }
      } else if (rr < p + 0.012 + (rk - 1) * 0.02 + slope * 0.1 && h > 6) {
        const big = 1 + slope * 1.3, s = (0.55 + sz * sz * 2.2) * big * (1 + (rk - 1) * 0.45), rocks = tr ? tr.rocks : null;
        const pickRock = () => rocks ? rocks[(rand() * rocks.length) | 0] : (rand() * 8) | 0;
        const ri = pickRock(), nSat = rand() < 0.65 ? 1 + ((rand() * 3) | 0) : 0;
        const put = (px, pz, ss, vi, rt) => {
          _q.setFromEuler(_e.set((rand() - 0.5) * 0.5, rt, (rand() - 0.5) * 0.5)); _p3.set(px, hAt(px, pz) + ss * 0.1, pz); _s3.set(ss * (1 + rand() * 0.35), ss * (0.8 + rand() * 0.45), ss * (0.85 + rand() * 0.3)); _m4.compose(_p3, _q, _s3);
          const rcy = _p3.y, rsx = _s3.x, rsy = _s3.y, rsz = _s3.z, k = 0.8 + rand() * 0.4; _tcol.setRGB(k, k, k); const rkk = TREE.rock[vi]; gbP.geo(rkk.g, _m4, _tcol, 0);
          rockSolid(ch, rkk, px, pz, rcy - ss * 0.1, rcy, rsx, rsy, rsz);
        };
        put(x, z, s, ri, rot);
        for (let q = 0; q < nSat; q++) { const a = rand() * TAU, d = s * (1.1 + rand() * 1.1), sx = x + Math.cos(a) * d, sx2 = z + Math.sin(a) * d; put(sx, sx2, s * (0.25 + rand() * 0.3), pickRock(), rand() * TAU); }
      } else if (R && R.key === 'farm' && slope < 0.1 && rq < 0.06) {   /* hay bale */
        const hy = hAt(x, z); gbP.box(x - 0.95, hy, z - 0.65, x + 0.95, hy + 1.3, z + 0.65, 0.82, 0.7, 0.3); colBox(ch, x - 0.95, z - 0.65, x + 0.95, z + 0.65, hy, hy + 1.3);
      }
    }
    /* ground cover: grass tufts, thickest beside roads and in open meadow */
    { let nGr = 0; const gMax = Math.round(240 * (Q.tree || 1)), st = 5.2, GV1 = GRID + 1;
      for (let gz = 0; gz < CHUNK && nGr < gMax; gz += st) for (let gx = 0; gx < CHUNK && nGr < gMax; gx += st) {
        const x = x0 + gx + rand() * st, z = z0 + gz + rand() * st, rr = rand(), rot = rand() * TAU, sc = 0.75 + rand() * 0.8, vi = (rand() * 3) | 0, tj = rand();
        const dR = dRoadAt(x, z), hw = 7 + 10;
        if (dR < 5.2) continue;
        const pr = dR < 36 ? 0.62 : 0.3;
        if (rr > pr) continue;
        const h = hAt(x, z); if (h < 2.6 || h > 96 || townAt(x, z, 12) || Air.paved(x, z) || Track.clear(x, z, 8) || Dock.clear(x, z, 4) || Air.near(x, z, 6) || (Air.s && Air.near(x, z, 60) && rand() < 0.6)) continue;
        const hx = hAt(x + 2, z) - hAt(x - 2, z), hz = hAt(x, z + 2) - hAt(x, z - 2); if (Math.hypot(hx, hz) / 4 > 0.55) continue;
        const vi2 = clamp(Math.round((z - z0) / step), 0, GRID) * GV1 + clamp(Math.round((x - x0) / step), 0, GRID), cr = col[vi2 * 3], cg = col[vi2 * 3 + 1], cb = col[vi2 * 3 + 2];
        if (cg < cr * 1.02 || cg < cb * 1.25) continue;
        const k = 1.22 + tj * 0.3; addGrass(gbF, vi, x, h, z, sc, rot, cr * k, cg * k * 1.04, cb * k * 0.9); nGr++;
      }
    }
  }
  if (gbHw.count) { const m = gbHw.mesh(MAT.hw, false, true); ch.group.add(m); }
  if (gbSt.count) { const m = gbSt.mesh(MAT.st, false, true); ch.group.add(m); }
  if (gbP.count) { const m = gbP.mesh(MAT.prop, true, true); ch.group.add(m); }
  if (gbF.count) { const m = gbF.mesh(MAT.foliage, true, true); ch.group.add(m); }
  if (gbB.count) { const m = gbB.mesh(MAT.build, true, true); ch.group.add(m); }
  if (gbL.count) { const m = gbL.mesh(MAT.lamp, false, false); ch.group.add(m); }
  if (gbPool.count) { const m = gbPool.mesh(MAT.pool, false, false); m.renderOrder = 2; ch.group.add(m); }
  /* water */
  if (minH < 0.6 && MAT.water) {
    const wpos = new Float32Array(nv * 3), dep = new Float32Array(nv), widx = [];
    for (let j = 0; j < GV; j++) for (let i = 0; i < GV; i++) { const v = j * GV + i; wpos[v * 3] = i * step; wpos[v * 3 + 1] = 0; wpos[v * 3 + 2] = j * step; dep[v] = -H[(j + 1) * W + (i + 1)]; }
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const a = j * GV + i, b = a + 1, c = a + GV, d = c + 1;
      if (Math.max(dep[a], dep[b], dep[c], dep[d]) < -1.5) continue;
      widx.push(a, c, b, b, c, d);
    }
    if (widx.length) {
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wpos, 3)); wg.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1));
      wg.setIndex(widx); wg.computeBoundingSphere(); wg.boundingSphere.radius += 2;
      const wm = new THREE.Mesh(wg, MAT.water); wm.renderOrder = 3; ch.group.add(wm);
    }
  }
  ch.gbF = null;
  ch.group.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });
  ch.group.matrixAutoUpdate = false; ch.group.updateMatrix();
  Home.cols(ch); Air.cols(ch); Dock.cols(ch); Track.cols(ch);
  return ch;
}

const Chunks = {
  map: new Map(), group: new THREE.Group(), radius: 5, cx: 1e9, cz: 1e9, pending: [],
  update(px, pz, budget) {
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK), R = this.radius;
    if (ccx !== this.cx || ccz !== this.cz || this.dirty) {
      this.cx = ccx; this.cz = ccz; this.dirty = false; this.pending.length = 0;
      for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
        const d2 = dx * dx + dz * dz; if (d2 > (R + 0.5) * (R + 0.5)) continue;
        if (!this.map.has(ckey(ccx + dx, ccz + dz))) this.pending.push({ cx: ccx + dx, cz: ccz + dz, d: d2 });
      }
      this.pending.sort((a, b) => a.d - b.d);
      const lim = (R + 1.7) * (R + 1.7);
      for (const [k, ch] of this.map) { const dx = ch.cx - ccx, dz = ch.cz - ccz; if (dx * dx + dz * dz > lim) { this.group.remove(ch.group); ch.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.map.delete(k); } }
    }
    let n = 0; const t0 = performance.now();
    while (this.pending.length && n < budget && performance.now() - t0 < 9) { const p = this.pending.shift(); if (this.map.has(ckey(p.cx, p.cz))) continue; const ch = buildChunk(p.cx, p.cz); this.map.set(ch.key, ch); this.group.add(ch.group); n++; }
    return n;
  },
  get(cx, cz) { return this.map.get(ckey(cx, cz)); }
};
