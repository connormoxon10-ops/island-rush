/* ================= VENUE STOREFRONTS: seven different buildings, one per town =================
   Built into the chunk that owns the lot (like the Customs storefront). Every venue faces the street to the north (-z): a forecourt with the
   marker in front, the building behind, a neon sign band, and its own dressing. */
function venSignTex(S) {
  const D = S.D, col = _hexCss(D.col), cv = mkCanvas(1024, 160), g = cv.getContext('2d');
  g.fillStyle = '#0a0d12'; g.fillRect(0, 0, 1024, 160); g.fillStyle = col; g.fillRect(0, 0, 1024, 8); g.fillRect(0, 152, 1024, 8);
  g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#fff'; let fs = 84; g.font = '700 ' + fs + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif';
  while (fs > 40 && g.measureText(D.name.toUpperCase()).width > 780) { fs -= 4; g.font = '700 ' + fs + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; }
  g.fillText(D.name.toUpperCase(), 150, 74); g.fillStyle = col; g.font = '600 36px Rajdhani, "Arial Narrow", sans-serif'; g.fillText(D.sub.toUpperCase(), 152, 128);
  g.font = '84px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(D.ico, 76, 84);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t;
}
Ven.build = function (ch, S, gbB, gbP) {
  const R = S.R, D = S.D, key = R.key, g0 = S.T.baseH, X0 = S.bx, X1 = S.bx + S.bw, Z0 = S.bz, Z1 = S.bz + S.bd, XM = (X0 + X1) / 2;
  const acc = lc(D.col), dark = lc(0x15181d), conc = lc(0x6b6e72), glass = lc(0x101c28), line = lc(0xe8e4d4);
  const B = (a, b, c, d, e, f, col, k) => { k = k == null ? 1 : k; gbP.box(a, b, c, d, e, f, col.r * k, col.g * k, col.b * k); };
  const C = (hex) => lc(hex);
  const r = mulberry32(ihash(S.ti * 313 + 5, 11, 7));
  const tree = (kind, x, z, sc) => { addTree(gbP, ch.gbF, kind, (r() * 3) | 0, x, g0, z, sc, r() * TAU, r(), 1, r(), ch); };
  const fx0 = S.lx0 + 0.6, fx1 = S.lx0 + S.ls - 0.6, fz0 = S.lz0 + 0.6;
  let H = 9, wallC = C(0x6a727c), roofC = C(0x3a4048), pitched = false, hr = 2.6;
  /* per-venue shell */
  if (key === 'city') { H = 13; wallC = C(0x14161c); }
  else if (key === 'harbor') { H = 8; wallC = C(0x8a4a3a); roofC = C(0x4c5258); pitched = true; hr = 2.4; }
  else if (key === 'desert') { H = 7.2; wallC = C(0xd9b27c); roofC = C(0xc8a078); }
  else if (key === 'farm') { H = 8; wallC = C(0xa23a2c); roofC = C(0x4a4540); pitched = true; hr = 5.2; }
  else if (key === 'tropic') { H = 7.4; wallC = C(0x7fe0d8); roofC = C(0xff8a9a); pitched = true; hr = 2.2; }
  else if (key === 'alpine') { H = 8; wallC = C(0x8d6b48); roofC = C(0xf2f6fa); pitched = true; hr = 5.4; }
  else if (key === 'lake') { H = 7.4; wallC = C(0x5a4632); roofC = C(0x2f4a3a); pitched = true; hr = 3.4; }
  /* forecourt apron */
  B(fx0, g0 - 0.2, fz0, fx1, g0 + 0.05, Z0, key === 'alpine' ? C(0xdfe8f0) : key === 'tropic' ? C(0xe8dcc0) : key === 'farm' ? C(0x8a7a5a) : key === 'desert' ? C(0xb89c70) : C(0x30333a));
  B(fx0, g0 + 0.05, fz0, fx1, g0 + 0.075, fz0 + 0.4, acc, 1.05);
  /* body */
  B(X0 - 0.2, g0 - 0.3, Z0 - 0.2, X1 + 0.2, g0 + 0.5, Z1 + 0.2, conc);
  B(X0, g0 - 0.3, Z0, X1, g0 + H, Z1, wallC);
  /* door and windows common to all: double door centred, a window each side */
  const DW = 3.6, dx0 = XM - DW / 2, dx1 = XM + DW / 2, trim = key === 'city' ? acc : key === 'farm' ? C(0xf0eadb) : key === 'alpine' ? C(0x5a4632) : key === 'harbor' ? C(0x2a2f36) : key === 'tropic' ? C(0xffffff) : key === 'desert' ? C(0x7a4a2c) : C(0x3a2a1c);
  B(dx0 - 0.3, g0, Z0 - 0.15, dx1 + 0.3, g0 + 3.9, Z0 - 0.02, trim, key === 'city' ? 1.8 : 1);
  B(dx0, g0, Z0 - 0.3, dx1, g0 + 3.6, Z0 - 0.15, key === 'city' ? glass : C(0x3a2a20));
  B(XM - 0.06, g0, Z0 - 0.34, XM + 0.06, g0 + 3.6, Z0 - 0.3, dark);
  for (const wx of [X0 + 3, X1 - 7]) { B(wx - 0.25, g0 + 1.0, Z0 - 0.15, wx + 4.25, g0 + 4.1, Z0 - 0.02, trim, key === 'city' ? 1.6 : 0.9); B(wx, g0 + 1.25, Z0 - 0.3, wx + 4, g0 + 3.85, Z0 - 0.15, glass); }
  /* sign band */
  B(X0 + 0.5, g0 + H - 3.2, Z0 - 0.3, X1 - 0.5, g0 + H - 0.1, Z0 - 0.04, dark);
  B(X0 + 0.5, g0 + H - 3.28, Z0 - 0.32, X1 - 0.5, g0 + H - 3.2, Z0 - 0.28, acc, 2.2); B(X0 + 0.5, g0 + H - 0.1, Z0 - 0.32, X1 - 0.5, g0 + H - 0.02, Z0 - 0.28, acc, 2.2);
  let solidTop = g0 + H;
  /* roof */
  if (pitched) {
    if (key === 'harbor') houseRoof(gbB, X0, Z0, X1, Z1, g0 + H, hr, roofC, wallC);
    else houseRoof(gbB, X0, Z0, X1, Z1, g0 + H, hr, roofC, wallC);
    solidTop = g0 + H;
  } else {
    B(X0 - 0.3, g0 + H, Z0 - 0.3, X1 + 0.3, g0 + H + 0.45, Z1 + 0.3, roofC);
    if (key === 'city') { B(X0 + 1, g0 + H + 0.45, Z0 + 1, X1 - 1, g0 + H + 1.2, Z1 - 1, dark); B(X0 + 1, g0 + H + 1.2, Z0 + 0.8, X1 - 1, g0 + H + 1.35, Z0 + 1.0, acc, 2.4); }
  }
  colBox(ch, X0 - 0.3, Z0 - 0.3, X1 + 0.3, Z1 + 0.3, g0 - 0.3, solidTop + (key === 'city' ? 1.4 : pitched ? 0 : 0.45), pitched ? hr : 0);
  const pole = (x, z, h, col, rr) => { cylAt(gbP, x, g0, z, rr || 0.12, h, rr || 0.12, col.r, col.g, col.b); colCyl(ch, x, z, (rr || 0.12) + 0.08, g0, g0 + h); };
  /* region dressing: each one is its own little scene */
  if (key === 'city') {   /* velvet rope club: red carpet, brass stanchions, planters, a huge rooftop sign frame */
    B(dx0 - 0.4, g0 + 0.05, fz0 + 0.5, dx1 + 0.4, g0 + 0.09, Z0 - 0.3, C(0x8a1220));
    for (const sx of [dx0 - 1.6, dx1 + 1.6]) for (let k = 0; k < 4; k++) { const z = Z0 - 2 - k * 2.6; cylAt(gbP, sx, g0, z, 0.1, 1.05, 0.1, 0.85, 0.66, 0.2); cylAt(gbP, sx, g0 + 1.05, z, 0.17, 0.12, 0.17, 0.85, 0.66, 0.2); if (k) B(sx - 0.03, g0 + 0.82, z, sx + 0.03, g0 + 0.9, z + 2.6, C(0x7a0f1c)); }
    for (const px of [X0 + 1.2, X1 - 1.2]) { B(px - 0.9, g0, Z0 - 2.4, px + 0.9, g0 + 0.8, Z0 - 0.6, dark); B(px - 0.7, g0 + 0.8, Z0 - 2.2, px + 0.7, g0 + 0.9, Z0 - 0.8, C(0x2c5a34)); colBox(ch, px - 0.9, Z0 - 2.4, px + 0.9, Z0 - 0.6, g0, g0 + 0.9); }
    B(X0 + 2, g0 + H - 5.5, Z0 - 0.4, X0 + 2.25, g0 + H - 3.4, Z0 - 0.3, acc, 2.4); B(X1 - 2.25, g0 + H - 5.5, Z0 - 0.4, X1 - 2, g0 + H - 3.4, Z0 - 0.3, acc, 2.4);
    for (let k = 0; k < 3; k++) B(fx0 + 3 + k * 9, g0 + 0.075, fz0 + 0.5, fx0 + 3.4 + k * 9, g0 + 0.09, fz0 + 2.4, acc, 1.8);
  } else if (key === 'harbor') {   /* dive pub: barrels, crates, an anchor and a lantern bracket */
    for (const [bx, bz] of [[X0 + 0.9, Z0 - 1.4], [X0 + 2.2, Z0 - 1.0], [X1 - 1.4, Z0 - 1.2]]) { cylAt(gbP, bx, g0, bz, 0.52, 1.0, 0.52, 0.42, 0.28, 0.16); cylAt(gbP, bx, g0 + 0.3, bz, 0.545, 0.07, 0.545, 0.12, 0.12, 0.13); cylAt(gbP, bx, g0 + 0.72, bz, 0.545, 0.07, 0.545, 0.12, 0.12, 0.13); colCyl(ch, bx, bz, 0.55, g0, g0 + 1.0); }
    B(X1 - 3.4, g0, Z0 - 2.6, X1 - 1.4, g0 + 0.8, Z0 - 1.2, C(0x8a6a48)); B(X1 - 3.2, g0 + 0.8, Z0 - 2.4, X1 - 1.6, g0 + 1.5, Z0 - 1.4, C(0x7a5a3c)); colBox(ch, X1 - 3.4, Z0 - 2.6, X1 - 1.4, Z0 - 1.2, g0, g0 + 1.5);
    B(XM + 5.9, g0 + 1.0, Z0 - 1.9, XM + 6.1, g0 + 3.7, Z0 - 1.7, C(0x22272e)); B(XM + 5.1, g0 + 2.7, Z0 - 1.9, XM + 6.9, g0 + 2.85, Z0 - 1.7, C(0x22272e)); B(XM + 5.2, g0 + 1.0, Z0 - 1.9, XM + 6.8, g0 + 1.15, Z0 - 1.7, C(0x22272e));
    for (const lx of [dx0 - 1.2, dx1 + 1.2]) { B(lx - 0.25, g0 + 4.6, Z0 - 1.0, lx + 0.25, g0 + 5.3, Z0 - 0.5, C(0xffc860), 2.0); B(lx - 0.04, g0 + 5.3, Z0 - 0.75, lx + 0.04, g0 + 5.6, Z0 - 0.02, dark); }
    for (let k = 0; k < 6; k++) B(S.lx0 + 3 + k * 4.5, g0 + 0.05, fz0 + 0.1, S.lx0 + 4.2 + k * 4.5, g0 + 0.08, fz0 + 1.6, C(0x8a8a82), 0.8);
    cylAt(gbP, X1 + 0.8, g0, Z1 - 3, 0.9, 5.4, 0.9, 0.55, 0.55, 0.52);
  } else if (key === 'desert') {   /* frontier false-front + a shooting yard with target boards and cans */
    B(X0 - 0.3, g0 + H, Z0 - 0.5, X1 + 0.3, g0 + H + 2.4, Z0 + 0.4, wallC); B(X0 + 6, g0 + H + 2.4, Z0 - 0.5, X1 - 6, g0 + H + 3.4, Z0 + 0.4, wallC);
    for (const px of [X0 + 1, XM - 6, XM + 6, X1 - 1]) pole(px, Z0 - 3.0, 4.2, C(0x6a4a2c), 0.18);
    B(X0 - 0.4, g0 + 4.2, Z0 - 3.3, X1 + 0.4, g0 + 4.6, Z0 - 0.04, C(0x7a4a2c)); colBox(ch, X0 - 0.4, Z0 - 3.3, X1 + 0.4, Z0 - 0.04, g0 + 4.2, g0 + 4.6);
    for (let k = 0; k < 3; k++) { const tx = S.lx0 + 4 + k * 9, tz = fz0 + 4.5; B(tx - 0.07, g0, tz, tx + 0.07, g0 + 2.4, tz + 0.14, C(0x6a4a2c)); B(tx - 1.0, g0 + 1.4, tz - 0.06, tx + 1.0, g0 + 3.0, tz + 0.06, C(0xe9e0c8)); B(tx - 0.55, g0 + 1.85, tz - 0.1, tx + 0.55, g0 + 2.55, tz - 0.06, C(0xc23a2c)); B(tx - 0.2, g0 + 2.05, tz - 0.12, tx + 0.2, g0 + 2.35, tz - 0.1, C(0xf4f0e6)); for (let c = 0; c < 3; c++) cylAt(gbP, tx - 0.8 + c * 0.8, g0 + 0.9, tz + 1.5, 0.14, 0.34, 0.14, 0.75, 0.75, 0.72); B(tx - 1.2, g0 + 0.85, tz + 1.35, tx + 1.2, g0 + 0.92, tz + 1.65, C(0x6a4a2c)); B(tx - 1.2, g0, tz + 1.4, tx - 1.1, g0 + 0.85, tz + 1.6, C(0x6a4a2c)); B(tx + 1.1, g0, tz + 1.4, tx + 1.2, g0 + 0.85, tz + 1.6, C(0x6a4a2c)); }
    tree('cactus', X0 - 2.6, Z0 - 6, 1.0); tree('cactus', X1 + 2.0, Z0 - 3, 0.9); tree('scrub', S.lx0 + 22, fz0 + 6, 0.9);
    cylAt(gbP, X1 - 4, g0 + H + 0.45, Z1 - 4, 1.5, 2.2, 1.5, 0.55, 0.58, 0.62);
  } else if (key === 'farm') {   /* big barn doors, bunting, hay and a striped stall */
    B(XM - 5, g0, Z0 - 0.2, XM + 5, g0 + 5.4, Z0 - 0.02, C(0xf0eadb)); B(XM - 4.6, g0 + 0.2, Z0 - 0.3, XM - 0.1, g0 + 5.2, Z0 - 0.18, C(0x8a2e22)); B(XM + 0.1, g0 + 0.2, Z0 - 0.3, XM + 4.6, g0 + 5.2, Z0 - 0.18, C(0x8a2e22));
    for (const [a, b] of [[XM - 4.6, XM - 0.1], [XM + 0.1, XM + 4.6]]) { for (let k = 0; k < 14; k++) B(a + k * (b - a) / 14, g0 + 0.2 + k * 0.357, Z0 - 0.36, a + (k + 1) * (b - a) / 14, g0 + 0.2 + (k + 1) * 0.357, Z0 - 0.3, C(0xf0eadb), 0.9); }
    const pc = [0xe2342c, 0xf2c230, 0x2c8ae2, 0x3aa84a, 0xe2342c, 0xf2c230, 0x2c8ae2, 0x3aa84a, 0xe2342c, 0xf2c230, 0x2c8ae2, 0x3aa84a];
    pole(S.lx0 + 1, fz0 + 8, 6, C(0x5a4632), 0.14); pole(S.lx0 + S.ls - 1, fz0 + 8, 6, C(0x5a4632), 0.14);
    for (let k = 0; k < 12; k++) { const x = S.lx0 + 1.6 + k * 2.4, sag = Math.sin(k / 11 * Math.PI) * -0.9; B(x, g0 + 5.6 + sag, fz0 + 7.9, x + 1.3, g0 + 6.1 + sag, fz0 + 8.1, C(pc[k]), 1.4); }
    for (let k = 0; k < 8; k++) B(S.lx0 + 3 + k * 1.1, g0, fz0 + 2.2, S.lx0 + 3.8 + k * 1.1, g0 + 1.0, fz0 + 3.0, C(k % 2 ? 0xe2342c : 0xf4f0e6)); B(S.lx0 + 2.6, g0 + 1.0, fz0 + 2.0, S.lx0 + 12, g0 + 1.15, fz0 + 3.2, C(0x8a6a48)); colBox(ch, S.lx0 + 2.6, fz0 + 2.0, S.lx0 + 12, fz0 + 3.2, g0, g0 + 1.15);
    for (let k = 0; k < 4; k++) { const hx = X1 + 1.6 - (k % 2) * 2.2, hz = Z0 - 3 + ((k / 2) | 0) * 2.0; B(hx - 1, g0, hz - 0.7, hx + 1, g0 + 1.3, hz + 0.7, C(0xd0b04a), 0.9); colBox(ch, hx - 1, hz - 0.7, hx + 1, hz + 0.7, g0, g0 + 1.3); }
    cylAt(gbP, X0 - 3.2, g0, Z1 - 3, 1.4, 11, 1.4, 0.74, 0.76, 0.78); cylAt(gbP, X0 - 3.2, g0 + 11, Z1 - 3, 1.5, 1, 1.5, 0.5, 0.52, 0.55); colCyl(ch, X0 - 3.2, Z1 - 3, 1.45, g0, g0 + 12);
  } else if (key === 'tropic') {   /* beach hut with a mini-golf green, windmill and palms out front */
    B(S.lx0 + 1.5, g0 + 0.05, fz0 + 1.0, S.lx0 + S.ls - 1.5, g0 + 0.16, Z0 - 2.0, C(0x2e9a4a));
    B(S.lx0 + 1.5, g0 + 0.05, fz0 + 1.0, S.lx0 + S.ls - 1.5, g0 + 0.3, fz0 + 1.25, C(0xffffff)); B(S.lx0 + 1.5, g0 + 0.05, Z0 - 2.25, S.lx0 + S.ls - 1.5, g0 + 0.3, Z0 - 2.0, C(0xffffff));
    B(S.lx0 + 1.5, g0 + 0.05, fz0 + 1.0, S.lx0 + 1.75, g0 + 0.3, Z0 - 2.0, C(0xffffff)); B(S.lx0 + S.ls - 1.75, g0 + 0.05, fz0 + 1.0, S.lx0 + S.ls - 1.5, g0 + 0.3, Z0 - 2.0, C(0xffffff));
    cylAt(gbP, S.lx0 + 8, g0 + 0.16, fz0 + 6, 0.5, 0.05, 0.5, 0.05, 0.05, 0.06); B(S.lx0 + 12, g0 + 0.16, fz0 + 2.2, S.lx0 + 12.6, g0 + 0.7, fz0 + 6.5, C(0xff8a9a)); B(S.lx0 + 16, g0 + 0.16, fz0 + 4.4, S.lx0 + 22, g0 + 0.7, fz0 + 5.0, C(0xffd23d));
    const wmx = S.lx0 + 24, wmz = fz0 + 4; B(wmx - 1.0, g0, wmz - 1.0, wmx + 1.0, g0 + 3.4, wmz + 1.0, C(0xf4efe0)); B(wmx - 1.2, g0 + 3.4, wmz - 1.2, wmx + 1.2, g0 + 3.9, wmz + 1.2, C(0xff6a7a)); colBox(ch, wmx - 1, wmz - 1, wmx + 1, wmz + 1, g0, g0 + 3.9);
    B(wmx - 0.12, g0 + 3.4, wmz - 1.35, wmx + 0.12, g0 + 6.9, wmz - 1.15, C(0xffffff)); B(wmx - 1.75, g0 + 4.95, wmz - 1.35, wmx + 1.75, g0 + 5.2, wmz - 1.15, C(0xffffff)); B(wmx - 0.3, g0 + 4.85, wmz - 1.38, wmx + 0.3, g0 + 5.3, wmz - 1.12, C(0xffd23d));
    tree('palm', S.lx0 + 2.6, Z0 - 5.4, 1.2); tree('palm', X1 + 1.4, Z0 - 4, 1.1); tree('palm', X0 - 1.6, Z0 - 1.5, 1.15);
    B(dx0 - 1.0, g0 + 4.4, Z0 - 2.6, dx1 + 1.0, g0 + 4.7, Z0 - 0.02, C(0x2fc4c0)); for (let k = 0; k < 6; k++) B(dx0 - 1.0 + k * (dx1 - dx0 + 2) / 6, g0 + 4.4, Z0 - 2.6, dx0 - 1.0 + (k + 0.5) * (dx1 - dx0 + 2) / 6, g0 + 4.72, Z0 - 0.02, C(0xffffff));
  } else if (key === 'alpine') {   /* chalet with a frozen rink, stones and a log stack */
    B(S.lx0 + 3, g0 + 0.05, fz0 + 0.8, S.lx0 + S.ls - 3, g0 + 0.2, Z0 - 2.4, C(0xcfe8f6));
    for (const [cr, col] of [[3.4, 0x2c78d8], [2.4, 0xf4f8fc], [1.4, 0xd8342c]]) cylAt(gbP, XM, g0 + 0.2, fz0 + 6.2, cr, 0.03 + (3.4 - cr) * 0.005, cr, ((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255);
    for (const [sx, sz, col] of [[XM - 7, fz0 + 2.2, 0xd8342c], [XM - 6, fz0 + 3.4, 0xd8342c], [XM + 6.5, fz0 + 2.6, 0xf2c230], [XM + 5.8, fz0 + 3.8, 0xf2c230]]) { cylAt(gbP, sx, g0 + 0.2, sz, 0.4, 0.22, 0.4, 0.46, 0.46, 0.48); cylAt(gbP, sx, g0 + 0.42, sz, 0.42, 0.1, 0.42, ((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255); B(sx - 0.05, g0 + 0.52, sz - 0.18, sx + 0.05, g0 + 0.72, sz + 0.18, C(0x222222)); }
    for (let lv = 0; lv < 3; lv++) for (let k = 0; k < 4 - lv; k++) { B(X0 + 0.5 + k * 1.1 + lv * 0.55, g0 + lv * 0.62, Z0 - 2.2, X0 + 0.5 + k * 1.1 + lv * 0.55 + 0.95, g0 + lv * 0.62 + 0.6, Z0 - 0.6, C(lv % 2 ? 0x6a4a2c : 0x7a5632), 0.9); }
    colBox(ch, X0 + 0.5, Z0 - 2.3, X0 + 5, Z0 - 0.5, g0, g0 + 1.85);
    tree('snowpine', X1 + 2.4, Z0 - 3.5, 1.2); tree('snowpine', S.lx0 + 1.6, fz0 + 8, 1.15);
    B(X0 + 1, g0 + H - 0.4, Z0 - 0.7, X1 - 1, g0 + H + 0.1, Z0 - 0.04, C(0x5a4632));
    for (let k = 0; k < 4; k++) B(dx0 - 1.4 + k * 1.7, g0 + 3.6, Z0 - 0.5, dx0 - 1.4 + k * 1.7 + 0.5, g0 + 4.9, Z0 - 0.3, C(0xf4f8fc));
  } else if (key === 'lake') {   /* tackle cabin: porch, rowboat on trestles, drying nets and rod rack */
    B(X0 - 1.0, g0, Z0 - 4.2, X1 + 1.0, g0 + 0.6, Z0 - 0.04, C(0x6a4a2c)); for (let k = 0; k < 12; k++) B(X0 - 1.0 + k * 2.17, g0 + 0.6, Z0 - 4.2, X0 - 1.0 + k * 2.17 + 2.0, g0 + 0.64, Z0 - 0.04, C(k % 2 ? 0x7a5632 : 0x8a6238), 0.95);
    for (const px of [X0 - 0.6, X1 + 0.6, XM - 5, XM + 5]) pole(px, Z0 - 4.0, 3.8, C(0x4a3a2a), 0.16);
    B(X0 - 1.0, g0 + 3.8, Z0 - 4.3, X1 + 1.0, g0 + 4.1, Z0 - 0.04, C(0x2f4a3a)); colBox(ch, X0 - 1.0, Z0 - 4.3, X1 + 1.0, Z0 - 0.04, g0 + 3.8, g0 + 4.1);
    const bx = S.lx0 + 14, bz = fz0 + 5; B(bx - 0.2, g0, bz - 1.3, bx + 0.2, g0 + 0.9, bz - 1.0, C(0x4a3a2a)); B(bx - 0.2, g0, bz + 1.0, bx + 0.2, g0 + 0.9, bz + 1.3, C(0x4a3a2a)); B(bx - 3, g0 + 0.9, bz - 1.0, bx + 3, g0 + 1.4, bz + 1.0, C(0x2f6a8a)); B(bx - 2.4, g0 + 1.4, bz - 0.9, bx + 2.4, g0 + 1.55, bz + 0.9, C(0xf0e8d0)); B(bx + 3, g0 + 0.9, bz - 0.6, bx + 3.7, g0 + 1.3, bz + 0.6, C(0x2f6a8a)); colBox(ch, bx - 3, bz - 1.3, bx + 3.7, bz + 1.3, g0, g0 + 1.6);
    for (let k = 0; k < 5; k++) { B(S.lx0 + 3 + k * 0.55, g0 + 0.6, Z0 - 3.4, S.lx0 + 3.1 + k * 0.55, g0 + 3.6, Z0 - 3.3, C(0xc2a878), 0.9); }
    for (let k = 0; k < 3; k++) B(XM + 4 + k * 1.0, g0 + 0.64, Z0 - 3.5, XM + 4.5 + k * 1.0, g0 + 1.15, Z0 - 3.0, C(0x8a8a82));
    tree('pine', S.lx0 + 2.6, Z0 - 6.5, 1.15); tree('pine', X1 + 2.2, Z1 - 2, 1.05); tree('birch', X0 - 2.2, Z1 - 4, 1.0);
    B(XM - 1.2, g0 + 5.1, Z0 - 0.4, XM + 1.2, g0 + 6.3, Z0 - 0.2, C(0x7ab8a0)); B(XM - 2.4, g0 + 5.5, Z0 - 0.38, XM - 1.2, g0 + 5.9, Z0 - 0.22, C(0x7ab8a0));
  }
  /* sign meshes (emissive, not part of the batch) */
  if (!S.tex) { S.tex = venSignTex(S); S.mat = new THREE.MeshBasicMaterial({ map: S.tex, color: new THREE.Color(1.3, 1.3, 1.3) }); }
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(S.bw - 1.4, (S.bw - 1.4) * 160 / 1024 * (key === 'city' ? 1.15 : 1.0)), S.mat); sg.position.set(XM - ch.x0, g0 + H - 1.65, Z0 - 0.34 - ch.z0); sg.rotation.y = Math.PI; ch.group.add(sg);
};
