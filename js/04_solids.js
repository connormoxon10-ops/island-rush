/* ================= SOLIDS =================
   What the world's obstacles really occupy, in absolute world y, so nothing collides with empty sky.
   Every chunk keeps three lists (ch.cols):
     c  upright cylinders and domes   [x, z, r, yb, yt, dome, kind]      kind 0 tree trunk, 1 rock, 2 pole / prop
     b  boxes, optional roof          [x0, z0, x1, z1, yt, yb, rise, axis, arch]
          rise = extra roof height at the ridge; axis 0 = ridge along the longer side, 1 = along x, 2 = along z; arch = round profile
     t  tree canopies                 [x, z, yb, yt, rb, rt, ell]       radius runs rb -> rt from yb to yt, or an ellipsoid when ell
   Cars and walkers use the footprints (and ignore what they are above or under); aircraft test the true volume. */

function colCyl(ch, x, z, r, yb, yt, kind) { ch.cols.c.push([x, z, r, yb, yt, 0, kind == null ? 2 : kind]); }
function colDome(ch, x, z, r, yb, yt) { ch.cols.c.push([x, z, r, yb, yt, 1, 1]); }
function colBox(ch, x0, z0, x1, z1, yb, yt, rise, axis, arch) { const o = [x0, z0, x1, z1, yt, yb, rise || 0, axis || 0, arch ? 1 : 0]; ch.cols.b.push(o); return o; }

/* a tree's solid parts, from the numbers its bake recorded (sh): trunk always, canopy for aircraft */
function treeSolid(ch, kind, vi, x, y, z, sc, sy) {
  const list = TREE[kind]; if (!list) return; const s = list[vi % list.length].sh; if (!s) return; sy = sy || 1;
  colCyl(ch, x, z, s.tr * sc, y, y + s.top * sc * sy, 0);
  const c = s.can; if (c) ch.cols.t.push([x, z, y + c[0] * sc * sy, y + c[1] * sc * sy, c[2] * sc, c[3] * sc, c[4]]);
}

/* mean silhouette of a rock model, measured once from its mesh */
function rockStat(rk) {
  if (rk.rad) return rk; const p = rk.g.attributes.position, n = p.count; let s2 = 0, top = -1e9;
  for (let i = 0; i < n; i++) { const x = p.getX(i), z = p.getZ(i); s2 += x * x + z * z; if (p.getY(i) > top) top = p.getY(i); }
  rk.rad = 1.12 * Math.sqrt(s2 / n); rk.top = top * 0.95; return rk;
}
/* a placed rock: model, centre, per-axis scale */
function rockSolid(ch, rk, x, z, gy, cy, sx, sy, sz) {
  rockStat(rk); const r = rk.rad * (sx + sz) * 0.5, yt = cy + rk.top * sy;
  if (r >= 0.3 && yt - gy >= 0.25) colDome(ch, x, z, r, gy - 0.05, yt);
}

/* ---------- point tests for aircraft ---------- */
function solidBoxTop(o, x, z) {
  let top = o[4]; const rise = o[6];
  if (rise) {
    const w = o[2] - o[0], d = o[3] - o[1], ax = o[7], alongX = ax === 1 ? true : ax === 2 ? false : w >= d;
    const half = alongX ? d * 0.5 : w * 0.5, off = alongX ? Math.abs(z - (o[1] + o[3]) * 0.5) : Math.abs(x - (o[0] + o[2]) * 0.5), t = Math.min(1, off / half);
    top += rise * (o[8] ? Math.sqrt(1 - t * t) : 1 - t);
  }
  return top;
}
function solidBoxHit(o, x, y, z, pad) {
  if (x <= o[0] - pad || x >= o[2] + pad || z <= o[1] - pad || z >= o[3] + pad) return false;
  if (o[5] !== undefined && y < o[5] - 0.3) return false;
  return y < solidBoxTop(o, x, z) + 0.3;
}
/* 0 = clear, else 1 tree, 2 rock, 3 building, 4 pole, 5 silo or tank */
const SOLID_MSG = ['', 'Flew into a tree', 'Hit a rock', 'Hit a building', 'Hit a pole', 'Hit a silo or tank'];
function solidHit(x, y, z, pad) {
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), lx = x - cx * CHUNK, lz = z - cz * CHUNK, M = 45;
  const x0 = lx < M ? -1 : 0, x1 = lx > CHUNK - M ? 1 : 0, z0 = lz < M ? -1 : 0, z1 = lz > CHUNK - M ? 1 : 0;
  for (let dz = z0; dz <= z1; dz++) for (let dx = x0; dx <= x1; dx++) {
    const ch = Chunks.get(cx + dx, cz + dz); if (!ch) continue;
    const C = ch.cols.c, B = ch.cols.b, T = ch.cols.t;
    for (let i = 0; i < C.length; i++) {
      const o = C[i], ex = x - o[0], ez = z - o[1], r = o[2] + pad, d2 = ex * ex + ez * ez; if (d2 >= r * r || y < o[3] - 0.3) continue;
      const top = o[5] ? o[3] + (o[4] - o[3]) * Math.sqrt(1 - d2 / (r * r)) : o[4];
      if (y < top + 0.3) return o[6] === 0 ? 1 : o[6] === 1 ? 2 : o[2] < 0.6 ? 4 : 5;
    }
    for (let i = 0; i < T.length; i++) {
      const o = T[i]; if (y < o[2] - 0.2 || y > o[3] + 0.2) continue;
      const t = clamp((y - o[2]) / (o[3] - o[2]), 0, 1), r = (o[6] ? o[4] * Math.sqrt(Math.max(0, 1 - (2 * t - 1) * (2 * t - 1))) : o[4] + (o[5] - o[4]) * t) + pad * 0.5, ex = x - o[0], ez = z - o[1];
      if (ex * ex + ez * ez < r * r) return 1;
    }
    for (let i = 0; i < B.length; i++) if (solidBoxHit(B[i], x, y, z, pad)) return 3;
  }
  return 0;
}
