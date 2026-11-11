/* ================= FAR WORLD: coarse island + ocean beyond the streamed chunks ================= */
const Far = { uCam: { value: new THREE.Vector2() }, uR0: { value: 400 }, group: null };

function buildFarWorld() {
  const N = 192, EXT = 3072, step = EXT * 2 / N, NV = N + 1;
  const H = new Float32Array(NV * NV), pos = new Float32Array(NV * NV * 3), nor = new Float32Array(NV * NV * 3), col = new Float32Array(NV * NV * 3), uv = new Float32Array(NV * NV * 2), dep = new Float32Array(NV * NV);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) H[j * NV + i] = terrainNoRoad(-EXT + i * step, -EXT + j * step);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) {
    const k = j * NV + i, x = -EXT + i * step, z = -EXT + j * step, h = H[k];
    const hl = H[j * NV + Math.max(i - 1, 0)], hr = H[j * NV + Math.min(i + 1, N)], hd = H[Math.max(j - 1, 0) * NV + i], hu = H[Math.min(j + 1, N) * NV + i];
    const gx = (hr - hl) / (2 * step), gz = (hu - hd) / (2 * step), il = 1 / Math.sqrt(gx * gx + 1 + gz * gz);
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; nor[k * 3] = -gx * il; nor[k * 3 + 1] = il; nor[k * 3 + 2] = -gz * il; uv[k * 2] = x / 7; uv[k * 2 + 1] = z / 7;
    terrainColor(x, z, h, 1 - il, 999, 6.5, col, k * 3);
    /* the chunks have trees, the far mesh doesn't: darken forested ground so the woods read from a distance */
    if (h > 1.8 && h < 112 && 1 - il < 0.5) {
      const fn = fbm(x * 0.0035 + 7, z * 0.0035 - 3, 3), dens = sstep(-0.08, 0.3, fn) * (0.25 + 0.75 * sstep(0.2, 0.5, 0.5 + noise2(x * 0.021 + 3, z * 0.021 - 8)));
      const f = 1 - 0.34 * dens * (1 - sstep(70, 112, h)); col[k * 3] *= f * 0.97; col[k * 3 + 1] *= f; col[k * 3 + 2] *= f * 0.95;
    }
    dep[k] = -h;
  }
  const idx = new Uint32Array(N * N * 6); let q = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * NV + i, b = a + 1, c = a + NV, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const land = new THREE.Mesh(g, MAT.terrainFar); land.frustumCulled = false; land.renderOrder = -5;
  MAT.terrainFar.polygonOffset = true; MAT.terrainFar.polygonOffsetFactor = 3; MAT.terrainFar.polygonOffsetUnits = 3;
  /* sea: coarse shore-aware grid + four deep-ocean strips out to the horizon (shares the chunk water shader and its uniforms, but is cut away around the camera) */
  const wi = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * NV + i, b = a + 1, c = a + NV, d = c + 1;
    if (Math.max(dep[a], dep[b], dep[c], dep[d]) < -1.5) continue;
    wi.push(a, c, b, b, c, d);
  }
  const wpos = new Float32Array(pos.length); for (let k = 0; k < NV * NV; k++) { wpos[k * 3] = pos[k * 3]; wpos[k * 3 + 1] = 0; wpos[k * 3 + 2] = pos[k * 3 + 2]; }
  const OUT = 12000, E = EXT, strips = [[-OUT, -OUT, OUT, -E], [-OUT, E, OUT, OUT], [-OUT, -E, -E, E], [E, -E, OUT, E]], sp = [], sd = [], si = [];
  strips.forEach(([x0, z0, x1, z1], s) => { const o = s * 4; sp.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1); sd.push(24, 24, 24, 24); si.push(o, o + 2, o + 1, o, o + 3, o + 2); });
  const wg = new THREE.BufferGeometry();
  const allP = new Float32Array(wpos.length + sp.length), allD = new Float32Array(dep.length + sd.length);
  allP.set(wpos); allP.set(sp, wpos.length); allD.set(dep); allD.set(sd, dep.length);
  const base = NV * NV, all = wi.concat(si.map((v) => v + base));
  wg.setAttribute('position', new THREE.BufferAttribute(allP, 3)); wg.setAttribute('aDepth', new THREE.BufferAttribute(allD, 1)); wg.setIndex(new THREE.BufferAttribute(new Uint32Array(all), 1));
  const sea = new THREE.Mesh(wg, MAT.waterFar); sea.frustumCulled = false; sea.renderOrder = 3;
  Far.group = new THREE.Group(); Far.group.add(land); Far.group.add(sea);
}
