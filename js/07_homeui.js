/* ================= HOME GARAGE: customise panel, valet swap, editor camera ================= */
const _gcp = new THREE.Vector3(), _gct = new THREE.Vector3();

Home.openEdit = function () {
  if (GAR.edit || !GAR.ok) return;
  if (!GAR.inside) { UI.toast('Drive into your garage to customise it', 'info'); return; }
  if (Mi) { UI.toast('Finish or abandon the run first', 'bad'); return; }
  if (!Foot.on && Math.abs(car.speed) > 4) { UI.toast('Stop the car first', 'bad'); return; }
  if (Talk.on) Talk.close(true);
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  GAR.edit = true; GAR.ct = 0; GAR.cpos = camera.position.clone(); camera.getWorldDirection(_gcp); GAR.clook = camera.position.clone().addScaledVector(_gcp, 8);
  E.gedit.hidden = false; document.body.classList.add('gedit'); Home.paint(); Snd.beep(620, 0.06);
};
Home.closeEdit = function () {
  if (!GAR.edit) return; GAR.edit = false; if (GAR.vo) { camera.clearViewOffset(); GAR.vo = 0; } E.gedit.hidden = true; document.body.classList.remove('gedit'); writeSave(); Snd.beep(480, 0.06);
};
Home.key = function (code) { if (code === 'Escape' || code === 'KeyG') Home.closeEdit(); };
/* slow orbit inside the hall while customising */
Home.camera = function (dt) {
  GAR.ct += dt; const a = GAR.ct * 0.15 + 0.7, cx = GAR.ox, cz = GAR.oz - GAR.D / 2, y = GAR.y;
  _gcp.set(cx + Math.sin(a) * 12.5, y + 3.0 + Math.sin(a * 0.6) * 0.7, cz + Math.cos(a) * 7.4); _gct.set(cx - Math.sin(a) * 4, y + 1.3, cz - Math.cos(a) * 2.5);
  const k = 1 - Math.exp(-dt * (GAR.ct < 1.8 ? 2.2 : 8)); GAR.cpos.lerp(_gcp, k); GAR.clook.lerp(_gct, k);
  camera.position.copy(GAR.cpos); camera.lookAt(GAR.clook); Cockpit.group.visible = false; car.ext.visible = true;
  /* portrait phones: the sheet covers the lower half, so slide the picture up into the top half */
  if (innerHeight > innerWidth * 1.1) { camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.21, innerWidth, innerHeight); GAR.vo = 1; }
  else if (GAR.vo) { camera.clearViewOffset(); GAR.vo = 0; }
};

/* ---------- panel ---------- */
function gSw(kind, arr, cur, names, off) {
  let h = ''; if (off) h += '<button type="button" class="gs off' + (cur === 0 ? ' on' : '') + '" data-g="' + kind + '" data-i="0" aria-pressed="' + (cur === 0) + '" title="Off">Off</button>';
  const o = off ? 1 : 0;
  return h + arr.map((hx, i) => '<button type="button" class="gs' + (cur === i + o ? ' on' : '') + '" data-g="' + kind + '" data-i="' + (i + o) + '" aria-pressed="' + (cur === i + o) + '" title="' + names[i] + '" aria-label="' + names[i] + '" style="background:#' + hx.toString(16).padStart(6, '0') + '"></button>').join('');
}
Home.paint = function () {
  const G = save.gar, nb = G.bays < 8 ? G.bays + 2 : 0, cost = nb ? GP.cost[nb] : 0, el = E.gBody;
  const chips = (kind, names, cur) => names.map((n, i) => '<button type="button" class="gc' + (cur === i ? ' on' : '') + '" data-g="' + kind + '" data-i="' + i + '" aria-pressed="' + (cur === i) + '">' + n + '</button>').join('');
  const sign = el.querySelector('#gSign'), keep = sign && document.activeElement === sign ? sign.value : null;
  el.innerHTML =
    '<div class="gsec">Interior walls</div><div class="gsw">' + gSw('wall', GP.wall, G.wall, GP.wallN) + '</div>' +
    '<div class="gsec">Exterior</div><div class="gsw">' + gSw('ext', GP.ext, G.ext, GP.extN) + '</div>' +
    '<div class="gsec">Trim &amp; accents</div><div class="gsw">' + gSw('trim', GP.trim, G.trim, GP.trimN) + '</div>' +
    '<div class="gsec">Floor</div><div class="gch">' + chips('floor', GP.floor, G.floor) + '</div>' +
    '<div class="gsec">Ceiling lights</div><div class="gsw">' + gSw('light', GP.light, G.light, GP.lightN) + '</div>' +
    '<div class="gsec">Neon strips</div><div class="gsw">' + gSw('neon', GP.trim, G.neon, GP.trimN, true) + '</div>' +
    '<div class="gsec">Sign</div><input id="gSign" type="text" maxlength="16" spellcheck="false" autocomplete="off" value="' + esc(G.sign) + '" aria-label="Garage sign text">' +
    '<div class="gsec">Decor</div><div class="gch">' + GP.decor.map(([k, n]) => '<button type="button" class="gc' + (G.decor[k] ? ' on' : '') + '" data-g="decor" data-k="' + k + '" aria-pressed="' + !!G.decor[k] + '">' + n + '</button>').join('') + '</div>' +
    '<div class="gsec">Bays<span>' + G.bays + ' of 8 open</span></div>' +
    (nb ? '<button type="button" class="btn sm gbuy" data-g="bays"' + (save.money < cost ? ' disabled' : '') + '>Open 2 more bays · ' + money(cost) + '</button>' : '<div class="gnote">Every bay is open.</div>') +
    '<div class="gnote">Your other cars are parked in the bays. Walk up to one on foot and press F to swap, and the valet parks the car you left.</div>' +
    '<button type="button" class="btn sm ghost" data-g="reset">Reset style</button>';
  if (keep != null) { const s = el.querySelector('#gSign'); if (s) { s.value = keep; } }
};
Home.act = function (b) {
  const G = save.gar, k = b.dataset.g, i = +b.dataset.i;
  if (k === 'close') { Home.closeEdit(); return; }
  if (k === 'wall' || k === 'ext' || k === 'trim' || k === 'floor' || k === 'light' || k === 'neon') { G[k] = i; Snd.beep(520 + i * 40, 0.04); }
  else if (k === 'decor') { const d = b.dataset.k; G.decor[d] = G.decor[d] ? 0 : 1; Snd.beep(G.decor[d] ? 700 : 450, 0.04); }
  else if (k === 'bays') { if (G.bays >= 8) return; const cost = GP.cost[G.bays + 2]; if (save.money < cost) return; save.money -= cost; G.bays += 2; Snd.win(); UI.toast('Two more bays open', 'good'); GAR.dirty = true; }
  else if (k === 'reset') { const d = GAR_DEF(); for (const key of ['wall', 'ext', 'trim', 'floor', 'light', 'neon', 'sign']) G[key] = d[key]; G.decor = d.decor; Snd.beep(400, 0.05); }
  writeSave(); Home.apply(); Home.paint();
};
Home.bind = function () {
  E.gedit.addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b && !b.disabled) Home.act(b); });
  E.gedit.addEventListener('input', (e) => { if (e.target.id !== 'gSign') return; const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 &'!.\-]/g, '').slice(0, 16); save.gar.sign = v.trim() ? v : 'HOME GARAGE'; Home.apply(); });
  E.gedit.addEventListener('change', () => writeSave());
};

/* ---------- valet swap: walk up to a parked car, press F ---------- */
Home.drive = function (id) {
  if (Mi) { UI.toast('Finish or abandon the run first', 'bad'); return; }
  if (Fare.phase !== 'idle') { UI.toast('Drop off your passenger first', 'bad'); return; }
  const slot = save.gar.slots[id]; if (slot == null || id === save.car) return;
  const d = CAR_BY_ID[id], p = Home.bayWorld(slot, d), old = CUR.name;
  if (!App.setCar(id)) return;
  spawnAt(p.x, p.z, p.yaw); GAR.dirty = true; Home.refresh(); Snd.door(); UI.toast(d.name + ' ready · valet parked your ' + old, 'good');
};
Home.warp = function () {
  if (Mi) { UI.toast('Finish or abandon the run first', 'bad'); return; }
  const x = GAR.ox, z = GAR.oz + 11; loadAround(x, z, 14); spawnAt(x, z, Math.PI); UI.toast('Welcome home', 'info');
};
