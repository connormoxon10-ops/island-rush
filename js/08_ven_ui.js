/* ================= shared venue widgets: the power slider and little tool buttons the games borrow ================= */
Ven.pw = (function () {
  let el = null, mk = null, trk = null, msk = null, knob = null, lab = null, pid = -1, cb = null, val = 0, drag = false, on = false;
  function init() {
    if (el) return;
    const s = document.createElement('style');
    s.textContent = '#venPw{position:absolute;right:16px;top:50%;transform:translateY(-50%);width:62px;height:min(50vh,330px);pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;text-align:center;color:#dfe6ee;font-size:11px;letter-spacing:.16em;text-transform:uppercase}' +
      '#venPw[hidden]{display:none}#venPw .pwt{position:absolute;left:14px;right:14px;top:20px;bottom:28px;border-radius:12px;border:2px solid rgba(255,255,255,.55);background:linear-gradient(#58d68d,#f4d03f 55%,#e74c3c);overflow:hidden;cursor:ns-resize}' +
      '#venPw .pwt i{position:absolute;left:0;right:0;bottom:0;background:rgba(6,10,16,.9)}#venPw .pwt u{position:absolute;left:0;right:0;height:3px;margin-top:-1px;background:#fff;box-shadow:0 0 6px #000;display:none;text-decoration:none}#venPw .pwk{position:absolute;left:6px;right:6px;height:8px;border-radius:4px;background:#fff;box-shadow:0 0 10px #000;margin-top:-4px;pointer-events:none}' +
      '#venPw b{position:absolute;top:0;left:0;right:0;font-weight:700}#venPw small{position:absolute;bottom:2px;left:-8px;right:-8px;font-size:10px;color:#9fb0c4;letter-spacing:.05em}' +
      '.venTool{position:absolute;left:16px;bottom:64px;pointer-events:auto;touch-action:manipulation}.venTool[hidden]{display:none}';
    document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'venPw'; el.hidden = true; el.innerHTML = '<b></b><div class="pwt"><i></i><u></u></div><div class="pwk"></div><small>drag down, release</small>';
    E.ven.appendChild(el); trk = el.querySelector('.pwt'); msk = trk.querySelector('i'); mk = trk.querySelector('u'); knob = el.querySelector('.pwk'); lab = el.querySelector('b');
    const at = (e) => { const r = trk.getBoundingClientRect(); return clamp((e.clientY - r.top) / r.height, 0, 1); };
    el.addEventListener('pointerdown', (e) => { if (!on) return; pid = e.pointerId; try { el.setPointerCapture(pid); } catch (er) { /* ignore */ } drag = true; api.set(at(e)); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === pid && drag) api.set(at(e)); });
    const rel = (e) => { if (e.pointerId !== pid) return; pid = -1; if (!drag) return; drag = false; const p = val; if (p > 0.045 && cb) { api.set(0); cb(p); } else api.set(0); };
    el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel);
  }
  const api = {
    show(v, fire, text) { init(); on = !!v; el.hidden = !v; mk.style.display = 'none'; if (fire) cb = fire; if (text) lab.textContent = text; if (!v) { drag = false; api.set(0); } },
    set(p) { val = clamp(p, 0, 1); if (!el) return; msk.style.height = ((1 - val) * 100).toFixed(1) + '%'; knob.style.top = (20 + val * trk.clientHeight) + 'px'; },
    mark(p) { init(); mk.style.display = p == null ? 'none' : 'block'; if (p != null) mk.style.top = (p * 100).toFixed(1) + '%'; }, get() { return val; }, dragging() { return drag; }, visible() { return on; }
  };
  return api;
})();
/* a small named button that floats bottom-left in the venue overlay */
Ven.tools = {};
Ven.tool = function (id, label, fn) {
  let b = Ven.tools[id]; if (!b) { Ven.pw.show(false); b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm venTool'; b.hidden = true; E.ven.appendChild(b); Ven.tools[id] = b; b.addEventListener('click', (e) => { e.stopPropagation(); if (b._fn) b._fn(); }); }
  b.textContent = label; b._fn = fn; return b;
};
/* gaussian from a seeded stream */
function venGauss(r) { let u = 0; while (u < 1e-6) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
/* a quick canvas-drawn sprite texture */
function venCanvasTex(w, h, fn, srgb) { const cv = mkCanvas(w, h), g = cv.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(cv); if (srgb !== false) t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; }

/* shift a fixed camera's view so the scene sits beside the lobby panel instead of under it */
Ven.shift = function (cam, dt) {
  const W = innerWidth, H = innerHeight, mod = !E.venModal.hidden, sheet = W <= 760, S = Ven.sh || (Ven.sh = { x: 0, y: 0 });
  const tx = mod && !sheet ? (E.venModal.offsetWidth + 18) / 2 : 0, ty = mod && sheet ? E.venModal.offsetHeight / 2 + 4 : 0, k = 1 - Math.exp(-dt * 6);
  S.x += (tx - S.x) * k; S.y += (ty - S.y) * k; cam.aspect = W / H;
  if (Math.abs(S.x) > 0.5 || Math.abs(S.y) > 0.5) cam.setViewOffset(W, H, S.x, S.y, W, H); else cam.clearViewOffset(); cam.updateProjectionMatrix();
};
/* floating score text: sprites that rise and fade (one pool per scene) */
Ven.pops = function (sc) {
  const list = [];
  return {
    add(txt, col, x, y, z, size) {
      const tex = venCanvasTex(256, 96, (g, w, h) => { g.font = '700 64px "Chakra Petch", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(txt, w / 2, h / 2 + 3); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 3); });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); sp.scale.set(size * 2.67, size, 1); sp.position.set(x, y, z); sp.renderOrder = 20; sc.add(sp); list.push({ sp, t: 0, y0: y, sz: size });
    },
    update(dt) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.t += dt; const u = p.t / 1.0; p.sp.position.y = p.y0 + u * p.sz * 1.6; p.sp.material.opacity = u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4); if (u >= 1) { sc.remove(p.sp); p.sp.material.map.dispose(); p.sp.material.dispose(); list.splice(i, 1); } } },
    clear() { for (const p of list) { sc.remove(p.sp); p.sp.material.dispose(); } list.length = 0; }
  };
};
