/* ================= STORY MODE: DATES WITH MARA =================
   Relationship side quests. Each starts with a call, then you pick Mara up at the garage: she gets in beside you (behind you on a bike) and
   talks on the way. Where you take her, the date plays out there, animated:
   - Dinner Uptown: the bistro in the city. The waiter brings the plates, you raise a glass.
   - The Boat Ride: a skiff out of the marina at sunset, her on the bow seat facing you, the wake behind, the camera round the boat.
   - Sunset on the Sand: a walk along a beach side by side (hand in hand if you are together), then sitting down to watch the sun go.
   - A Night at the Golden Ace: drinks at a table in the casino, a toast to your luck.
   - Stargazing at the Cape: parked up at the cape late at night, the two of you in the car.
   They unlock one after another as she warms to you, and what you say on them moves how she feels. */

/* ---------- places ---------- */
const _stPlace0 = Story.place;
Story.place = function (k) {
  const site = (S) => { const o = { x: S.x, z: S.z + (S.b ? 3.5 : -3.5), yaw: S.b ? 0 : Math.PI, label: S.name + ', ' + S.T.name, town: S.T.name, site: S }; o.y = terrainHeight(o.x, o.z); return o; };
  if (k === 'uptown') return site(storySite((s) => s.kind === 'resto' && /Lumi/.test(s.name)) || storySite((s) => s.kind === 'resto' && s.ti === 6) || storySite((s) => s.kind === 'resto'));
  if (k === 'ace') { const S = storySite((s) => s.kind === 'casino' && s.ti === 6) || storySite((s) => s.kind === 'casino') || storySite((s) => s.kind === 'resto' && s.ti === 6); return site(S); }
  if (k === 'marina') { if (!Dock.s) return _stPlace0('pier'); const p = Dock.toWorld(14, -26, { x: 0, z: 0 }); return { x: p.x, z: p.z, y: terrainHeight(p.x, p.z), yaw: 0, label: Dock.name }; }
  if (k === 'sand') { const B = Surf.beaches[1] || Surf.beaches[0]; if (!B) return _stPlace0('cape'); return { x: B.px, z: B.pz, y: terrainHeight(B.px, B.pz), yaw: 0, label: B.name, beach: B }; }
  return _stPlace0(k);
};

/* ---------- Mara in the passenger seat ---------- */
/* (the motorcycle may not be in this build) */
const dtBike = () => typeof isBike === 'function' && isBike(CUR);
const Dates = { h: null, who: null, chatT: 0, chatI: {}, scene: null };
Story.passOn = function (who) { Story.S().pass = who; writeSave(); };
Story.passOff = function () { Story.S().pass = null; Dates.dropPass(); writeSave(); };
Dates.dropPass = function () { if (Dates.h) { Human.dispose(Dates.h); Dates.h = null; Dates.who = null; } };
/* where she sits: beside you in a car, behind you on a bike (car-local, as the driver's eye) */
Dates.seat = function () { return dtBike() ? { x: 0, y: 0.47, z: -0.42, sit: 0.0 } : { x: 0.36, y: EYE.y - 1.22, z: -0.04, sit: 0.0 }; };
Dates.pass = function (dt) {
  const S = Story.on ? Story.S() : null, who = S && S.pass && !Dates.scene ? S.pass : null;
  if (!who || !car.body) { Dates.dropPass(); return; }
  if (!Dates.h || Dates.who !== who) { Dates.dropPass(); Dates.h = Human.make(STORY_CAST[who].o()); Dates.who = who; car.body.add(Dates.h.root); }
  const h = Dates.h, s = Dates.seat(), t = App.time; Story.sitPose(h, s.x, s.y, s.z, 0, t);
  if (dtBike()) { h.b.armL.rotation.set(-1.2, 0, -0.35); h.b.armR.rotation.set(-1.2, 0, 0.35); h.b.elL.rotation.x = -0.6; h.b.elR.rotation.x = -0.6; h.b.legL.rotation.set(-1.2, 0, -0.25); h.b.legR.rotation.set(-1.2, 0, 0.25); h.b.knL.rotation.x = 1.9; h.b.knR.rotation.x = 1.9; }   /* arms round you, feet on the pegs */
  else { h.b.armL.rotation.set(-0.35, 0, -0.08); h.b.armR.rotation.set(-0.35, 0, 0.08); h.b.elL.rotation.x = -0.9; h.b.elR.rotation.x = -0.9; }   /* hands in her lap */
  const C = Story.comm, talk = (C && C.cur && C.cur.who === who) || (Cut.on && Cut.lines && Cut.lines[Cut.i] && Cut.lines[Cut.i][0] === who && Cut.typed < Cut.lines[Cut.i][1].length + 8);
  if (talk) Cut.gesture(h, true, t, 2.3); else { h.b.head.rotation.y = 0.35 * Math.sin(t * 0.4) + (Math.abs(car.ayL || 0) > 3 ? -0.1 * Math.sign(car.ayL) : 0); h.b.jaw.rotation.x = 0.02; }
  Human.alive(h, dt, t, 2.3); h.root.visible = true;
};
/* chatter on the way: a line every so often while she is in the car on a drive step */
Dates.chat = function (dt) {
  if (Cut.on || Mi) return;
  for (const e of Story.entries()) {
    const st = e.st; if (st.t !== 'goto' || !st.with || !st.chat || Story.S().pass !== st.with) continue;
    Dates.chatT -= dt; if (Dates.chatT > 0) return; const L = typeof st.chat === 'function' ? st.chat() : st.chat, k = e.key + ':' + e.i, i = Dates.chatI[k] | 0;
    if (i < L.length) { Story.say([[st.with, L[i]]]); Dates.chatI[k] = i + 1; } Dates.chatT = 16 + Math.random() * 8; return;
  }
};
/* while she is out with you she is not also at the garage */
const _maraHome0 = Story.maraHome;
Story.maraHome = function () { return !(Story.on && Story.S().pass) && !Dates.scene && _maraHome0(); };
const _stTick0 = Story.tick;
Story.tick = function (dt) { _stTick0(dt); if (Story.on && App.mode === 'play') { Dates.chat(dt); Dates.pass(dt); } };

/* ---------- animated scenes outdoors: the boat ride, the beach ---------- */
const _cutFrame0 = Cut.frame, _cutEnd0 = Cut.end, _playCut0 = Story.playCut;
Story.playCut = function (E, npc) {
  const sc = E.st.scene; if (!sc || Cut.on) return _playCut0(E, npc);
  const key = E.key, i = E.i; Dates.scene = DATE_SCENES[sc](E.st); Dates.dropPass();
  Cut.play(STORY_LINES(E.st.lines), null, () => Story.advance(key, i));
};
Cut.frame = function (dt) {
  if (!Dates.scene) { if (Story.on && Story.S().pass) Dates.pass(dt); return _cutFrame0(dt); }
  const LT = Cut.lineTick(dt); if (!LT || !Cut.on || !Dates.scene) return; const D = Dates.scene; D.t += dt;
  D.frame(dt, LT); placeBody(); if (Cockpit.group) Cockpit.group.visible = false;
  if (Math.abs(camera.fov - 44) > 0.1) { camera.fov = 44; camera.updateProjectionMatrix(); }
};
Cut.end = function () { const D = Dates.scene; Dates.scene = null; if (D) D.end(); _cutEnd0(); };
/* the two people in a scene */
Dates.people = function () { const m = Human.make(STORY_CAST.mara.o()), y = Human.make(pedSpec(footApp(), 3.7)); return { m, y }; };
/* a simple walk: legs and arms swinging at phase ph, a little bob */
function dateWalk(h, ph, hand, side) {
  const b = h.b, s = Math.sin(ph), c = Math.cos(ph);
  b.hips.position.set(0, 0.93 + 0.02 * Math.abs(c), 0); b.hips.rotation.set(0, 0.06 * s, 0); b.tor.rotation.set(0.03, -0.06 * s, 0); b.chest.rotation.set(0, 0, 0);
  b.legL.rotation.set(-0.42 * s, 0, 0); b.legR.rotation.set(0.42 * s, 0, 0); b.knL.rotation.x = 0.15 + Math.max(0, c) * 0.55; b.knR.rotation.x = 0.15 + Math.max(0, -c) * 0.55;
  b.armL.rotation.set(0.32 * s, 0, -0.08); b.armR.rotation.set(-0.32 * s, 0, 0.08); b.elL.rotation.x = -0.25; b.elR.rotation.x = -0.25;
  if (hand) { const a = side > 0 ? b.armL : b.armR; a.rotation.set(-0.12, 0, side > 0 ? -0.32 : 0.32); (side > 0 ? b.elL : b.elR).rotation.x = -0.15; }   /* the inner hands held between you */
}
/* sitting on the sand, legs out, leaning back on the hands */
function dateSand(h, t, lean) {
  const b = h.b; b.hips.position.set(0, 0.14, 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(-0.18, 0, 0); b.chest.rotation.set(0.02 * Math.sin(t * 1.6), 0, lean || 0);
  b.legL.rotation.set(-1.25, 0, -0.08); b.legR.rotation.set(-1.25, 0, 0.08); b.knL.rotation.x = 0.55; b.knR.rotation.x = 0.55;
  b.armL.rotation.set(0.55, 0, -0.3); b.armR.rotation.set(0.55, 0, 0.3); b.elL.rotation.x = -0.1; b.elR.rotation.x = -0.1;
}
const _dtV = new THREE.Vector3(), _dtL = new THREE.Vector3();
const DATE_SCENES = {
  /* a skiff from the marina: a slow circle out on the open water, Mara on the bow seat facing you at the tiller */
  boat(st) {
    if (!Dock.s) return DATE_SCENES.none();
    const C = Dock.toWorld(0, 150, { x: 0, z: 0 }), R = 52, S = Dock.s, P = Dates.people(), o = buildTern(BLIV.tern[2] || BLIV.tern[0]), g = new THREE.Group();
    loadAround(C.x, C.z, 10); g.add(o.root, P.m.root, P.y.root); scene.add(g);
    /* the wake: a pale V of churned water behind the stern */
    { const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.04, -2.3, -3.2, 0.04, -16, 3.2, 0.04, -16, -0.5, 0.04, -2.3, 0.5, 0.04, -2.3, 0, 0.04, -9], 3));
      const wm = new THREE.Mesh(w, new THREE.MeshBasicMaterial({ color: 0xeef6fa, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide })); wm.renderOrder = 2; g.add(wm); g.userData.wake = wm; }
    const D = { t: 0, g, P, ang: Math.atan2(-S.Sz, -S.Sx), shot: '',
      frame(dt, LT) {
        const k = LT.k, shot = LT.shot, t = D.t, a0 = D.ang + t * 3.4 / R;   /* 3.4 m/s round the circle */
        const ca = Math.cos(a0), sa = Math.sin(a0), x = C.x + (ca * S.Ax + sa * S.Sx) * R, z = C.z + (ca * S.Az + sa * S.Sz) * R;
        const tx = -sa * S.Ax + ca * S.Sx, tz = -sa * S.Az + ca * S.Sz;   /* the way round */
        g.position.set(x, -0.06 + 0.06 * Math.sin(t * 1.3), z); g.rotation.set(0.025 * Math.sin(t * 1.1), Math.atan2(tx, tz), 0.04 * Math.sin(t * 0.9 + 1), 'YXZ'); g.updateMatrixWorld(true);
        const sp = LT.L[0];
        Story.sitPose(P.m, 0, 0.17, 0.7, Math.PI, t); Story.sitPose(P.y, 0, 0.17, -1.1, 0, t); P.y.b.armR.rotation.set(-0.6, 0, 0.25); P.y.b.elR.rotation.x = -0.7;   /* your hand on the tiller */
        Cut.gesture(P.m, sp === 'mara' && Cut.typed < LT.L[1].length + 8, t, 2.1); Cut.gesture(P.y, sp === 'you' && Cut.typed < LT.L[1].length + 8, t, 4.7);
        if (shot === 'lean') { P.m.b.tor.rotation.x = -0.35; P.y.b.tor.rotation.x = -0.3; }   /* leaning in to each other */
        Human.alive(P.m, dt, t, 2.1); Human.alive(P.y, dt, t, 4.7);
        const side = Cut.i % 2 ? 1 : -1, W = (lx, ly, lz) => g.localToWorld(_dtV.set(lx, ly, lz));
        if (shot === 'card') { camera.position.set(x, 70, z); camera.lookAt(x, 0, z + 1); return; }
        if (shot === 'wide') { const a = t * 0.12 + 0.8; camera.position.set(x + Math.sin(a) * (26 - 6 * k), 7 - 2 * k, z + Math.cos(a) * (26 - 6 * k)); camera.lookAt(x, 1, z); return; }
        if (shot === 'npc') { camera.position.copy(W(0.5 * side, 1.35, -1.75)); camera.lookAt(W(0, 1.15, 0.7)); return; }
        if (shot === 'me') { camera.position.copy(W(0.5 * side, 1.35, 1.45)); camera.lookAt(W(0, 1.15, -1.1)); return; }
        camera.position.copy(W(3.6 * side, 1.7 - 0.3 * k, -0.4 + 0.8 * k)); camera.lookAt(W(0, 0.9, -0.2));   /* the two of you, from off the beam */
      },
      end() { scene.remove(g); Human.dispose(P.m); Human.dispose(P.y); g.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); }
    };
    return D;
  },
  /* a beach: along the sand side by side, then down to sit and watch the sun (a line shot 'sit' sits them down) */
  beach(st) {
    const B = Surf.beaches[1] || Surf.beaches[0]; if (!B) return DATE_SCENES.none();
    const il = Math.hypot(B.ix, B.iz) || 1, ix = B.ix / il, iz = B.iz / il, ax = -iz, az = ix, P = Dates.people();   /* inland, and along the shore */
    const x0 = B.x + ix * 14 - ax * 18, z0 = B.z + iz * 14 - az * 18, love = !!Story.F().maraLove;
    loadAround(x0, z0, 10); scene.add(P.m.root, P.y.root);
    const D = { t: 0, sat: 0, P, along: 0,
      frame(dt, LT) {
        const k = LT.k, shot = LT.shot, t = D.t; if (shot === 'sit') D.sat = Math.max(D.sat, 1e-3); if (D.sat > 0) D.sat = Math.min(1, D.sat + dt * 0.8); else D.along += dt * 1.15;
        const yawS = Math.atan2(ax, az), yawSea = Math.atan2(-ix, -iz), yaw = D.sat > 0.5 ? yawSea : yawS, ph = D.along / 1.15 * 5.6;
        const cx = x0 + ax * D.along, cz = z0 + az * D.along, rx = Math.cos(yawS) * 0.35, rz = -Math.sin(yawS) * 0.35;
        for (const [h, sd] of [[P.m, 1], [P.y, -1]]) {
          const hx = cx + rx * sd, hz = cz + rz * sd, hy = terrainHeight(hx, hz); h.root.position.set(hx, hy, hz); h.root.rotation.set(0, yaw, 0);
          if (D.sat > 0) dateSand(h, t, love ? -0.18 * sd : 0); else dateWalk(h, ph + (sd > 0 ? 0.3 : 0), love, sd);
          const sp = LT.L[0], me = sd > 0 ? 'mara' : 'you'; if (sp === me && Cut.typed < LT.L[1].length + 8) { h.b.head.rotation.y = -0.4 * sd; h.b.jaw.rotation.x = 0.06 + 0.07 * Math.abs(Math.sin(t * 13)); } else { h.b.head.rotation.y = sp && sp !== me ? -0.3 * sd : 0; h.b.jaw.rotation.x = 0.02; }
          Human.alive(h, dt, t, sd > 0 ? 2.1 : 4.7);
        }
        const gy = terrainHeight(cx, cz), side = Cut.i % 2 ? 1 : -1;
        if (shot === 'card') { camera.position.set(cx, gy + 60, cz); camera.lookAt(cx, gy, cz + 1); return; }
        if (shot === 'wide' || shot === 'sit') { const d = 14 + 4 * k; camera.position.set(cx + ix * d + ax * 6 * side, gy + 3.2, cz + iz * d + az * 6 * side); camera.lookAt(cx - ix * 30, gy + 1, cz - iz * 30); return; }   /* from behind, out to the sunset */
        const fx = D.sat > 0 ? -ix : ax, fz = D.sat > 0 ? -iz : az, sy = D.sat > 0 ? 0.75 : 1.5;   /* in front of them, a few steps ahead */
        if (shot === 'npc' || shot === 'me') { const sd = shot === 'npc' ? 1 : -1; _dtL.set(cx + rx * sd, gy + sy + 0.1, cz + rz * sd); camera.position.set(_dtL.x + fx * 1.8 - rx * sd * 1.2, gy + sy + 0.15, _dtL.z + fz * 1.8 - rz * sd * 1.2); camera.lookAt(_dtL); return; }
        camera.position.set(cx + fx * (4.2 - k) + rx * 1.5 * side, gy + sy + 0.2, cz + fz * (4.2 - k) + rz * 1.5 * side); camera.lookAt(cx, gy + sy - 0.15, cz);
      },
      end() { Human.dispose(P.m); Human.dispose(P.y); }
    };
    return D;
  },
  none() { return { t: 0, frame() {}, end() {} }; }
};

/* ---------- dinner: plates brought to the table and a toast (adds to the table scene inside, Story.intRoom) ---------- */
const _intRoom0 = Story.intRoom;
Story.intRoom = function (K, rec, room) {
  _intRoom0(K, rec, room); const I = Story.inScene; if (!I || !I.e.q || !I.e.q.date) return;
  const plates = new THREE.Group(), food = I.e.q.food || [0xc8783a, 0x6aa84a]; plates.visible = false;
  for (const sd of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.4 })); pl.position.set(I.cx, 0.79, I.cz + sd * 0.25); plates.add(pl);
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), new THREE.MeshStandardMaterial({ color: food[0], roughness: 0.7 })); f1.scale.set(1.2, 0.45, 0.9); f1.position.set(I.cx - 0.03, 0.81, I.cz + sd * 0.25); plates.add(f1);
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 5), new THREE.MeshStandardMaterial({ color: food[1], roughness: 0.8 })); f2.scale.set(1, 0.6, 1); f2.position.set(I.cx + 0.06, 0.81, I.cz + sd * 0.25 + 0.03); plates.add(f2);
  }
  K.sc.add(plates);
  const a = pedRandomLook(); a.shirt = lc(0xf4f4f0); a.pants = lc(0x141416); const wt = Human.make(pedSpec(a, 6.1)); wt.root.visible = false; K.sc.add(wt.root);
  I.served = false;
  I.fx = function (LT, t, dt) {   /* called by Cut.frameInt before it draws */
    const shot = LT.shot, n = I.npc, P = Int.ped && Int.ped.hu; if (shot === 'serve') I.served = true; plates.visible = I.served;
    wt.root.visible = shot === 'serve'; if (wt.root.visible) { wt.root.position.set(I.cx + 0.75, 0, I.cz + 0.1); wt.root.rotation.set(0, -Math.PI / 2, 0); wt.b.armL.rotation.set(-1.1, 0, -0.1); wt.b.armR.rotation.set(-1.1, 0, 0.1); wt.b.elL.rotation.x = -0.4; wt.b.elR.rotation.x = -0.4; wt.b.head.rotation.x = 0.25; Human.alive(wt, dt, t, 6.1); }
    if (shot === 'toast') for (const h of [n.h, P]) { if (!h) continue; h.b.armR.rotation.set(-1.25, 0, 0.32); h.b.elR.rotation.x = -1.05; h.b.head.rotation.x = -0.05; }   /* glasses up, over the middle of the table */
    else if (I.served && shot !== 'serve' && !(LT.L[0] === 'mara' && Cut.typed < LT.L[1].length + 8)) { n.h.b.elR.rotation.x = -1.3 + 0.25 * Math.max(0, Math.sin(t * 2.2)); }   /* eating, between lines */
  };
};

/* ---------- the dates ---------- */
const DATE_DONE = (id) => { const r = Story.S().sq[id]; return !!(r && r.done); };
const DATE_PICKUP = (lines) => ({ t: 'talk', who: 'mara', at: 'garage', obj: 'Pick Mara up at the garage', lines, done: () => Story.passOn('mara') });
SIDE.push(
  { id: 'mdinner', title: 'Dinner Uptown', who: 'mara', date: true, food: [0x8a4a2a, 0x5a9a3a], desc: 'Mara has never been to the fancy place in the city. You are taking her.', reward: 0, aff: { mara: 1 },
    avail: (S) => S.ch >= 2 && (Story.F().mara | 0) >= 1 && !(S.sq.pier && !S.sq.pier.done && S.sq.pier.st > 0),
    steps: [{ t: 'call', lines: () => [['Mara (phone)', 'Hal says there is a French place in ' + towns[6].name + ' where they bring the bread in a basket. A basket! I have never been.'], ['you (phone)', 'Then I am taking you. Tonight.'], ['Mara (phone)', '…Okay. Pick me up at the garage. I will find something without oil on it.']] },
      DATE_PICKUP(() => [['', '19:30 · THE GARAGE', 'card'], ['mara', 'Do not say anything. I know. I own one dress, and it is this one.', 'npc'],
        ['', 'What do you say?', 'me', [['“You look amazing.”', { mara: 1 }, [['you', 'You look amazing, Mara.', 'me'], ['mara', '…Shut up. Open the door for me, then.', 'npc']]], ['“Is that grease on the hem?”', {}, [['you', 'Is that grease on the hem?', 'me'], ['mara', 'It is a design feature. Drive.', 'npc']]]]]]),
      { t: 'goto', at: 'uptown', with: 'mara', obj: 'Drive Mara to the bistro in the city', r: 18, tod: 19.6, done: () => Story.passOff(),
        chat: ['Do you know what you are going to order? I am going to order the thing I cannot pronounce.', 'You drive differently with someone in the car. Smoother. Is that for me?', 'Eight years and I never once went out in ' + towns[6].name + '. Not once.', 'If they give us the little forks I am using the big ones.'] },
      { t: 'talk', who: 'mara', at: 'uptown', inside: true, obj: 'Join Mara at the table', tod: 20, lines: () => [['', '20:00 · ' + Story.place('uptown').label.split(',')[0].toUpperCase(), 'card'], ['mara', 'They gave us a candle. An actual candle.', 'npc'], ['you', 'Only the best for the island’s worst mechanic.', 'me'], ['mara', 'Best. Mechanic. Say it.', 'npc'],
        ['', 'The waiter sets down two plates and a basket of bread.', 'serve'], ['mara', 'The bread. In a basket. Hal was right.', 'npc'], ['mara', 'Okay. A toast. To you, for coming back.', 'toast'],
        ['', 'What do you toast to?', 'me', [['“To us.”', { mara: 1, maraUs: 1 }, [['you', 'To us.', 'toast'], ['mara', '…To us.', 'npc'], ['', 'The glasses ring. She does not look away first.', 'two']]],
          ['“To the van, may it rest in pieces.”', {}, [['you', 'To the van. May it rest in pieces.', 'toast'], ['mara', 'Ha! To the van.', 'npc']]],
          ['“To eight years.”', { mara: 1 }, [['you', 'To eight years. And to not wasting any more.', 'toast'], ['mara', 'I will drink to that.', 'npc']]]]],
        ['mara', 'Thank you for this. Really. Now eat, or I am having yours.', 'two']] }] },

  { id: 'mboat', title: 'The Boat Ride', who: 'mara', desc: 'Mara wants to see the island from the water. Rent a boat at the marina and take her out at sunset.', reward: 0, aff: { mara: 2 },
    avail: (S) => DATE_DONE('mdinner') && (Story.F().mara | 0) >= 2,
    steps: [{ t: 'call', lines: [['Mara (phone)', 'Do you know how long I have lived on an island and never been on a boat? Eight years.'], ['Mara (phone)', 'The marina rents little ones. Sunset. You steer, I will sit at the front and look romantic. I mean scenic. Look scenic.']] },
      DATE_PICKUP(() => [['', '18:40 · THE GARAGE', 'card'], ['mara', 'I packed sandwiches. Two kinds. Both cheese.', 'npc'], ['you', 'Ready to be seasick?', 'me'], ['mara', 'I fix diesel engines for a living. I fear nothing. Except fish.', 'npc']]),
      { t: 'goto', at: 'marina', with: 'mara', obj: 'Take Mara to the marina', r: 24, tod: 18.9, done: () => Story.passOff(),
        chat: ['What if it sinks? Do the little boats sink?', 'I used to watch the boats from the garage roof and make up where they were going.', 'If I see a shark I am climbing onto you.'] },
      { t: 'cut', scene: 'boat', tod: 19.25, lines: () => { const love = !!Story.F().maraLove; return [['', '19:15 · OUT ON THE WATER', 'card'], ['', 'The marina falls away behind you. Just the motor, the gulls and the sun going down.', 'wide'],
        ['mara', 'Look at it. The whole island, all lit up gold. I fix its cars and I never once looked at it.', 'npc'], ['you', 'Told you it was worth it.', 'me'], ['mara', 'You did. Do not get used to being right.', 'npc'],
        ['mara', love ? 'Can I ask you something? Are you staying? When all this is done?' : 'Can I ask you something? Why did you really come back?', 'npc'],
        ['', 'What do you tell her?', 'me', [[love ? '“I am staying. For you.”' : '“For you.”', { mara: 2, maraLove: 1 }, [['you', love ? 'I am staying, Mara. For you.' : 'Honestly? For you.', 'me'], ['', 'She moves across to sit beside you at the tiller, and leans in.', 'lean'], ['mara', love ? '…Good. Because I already told Hal.' : '…You idiot. You could have just said so eight years ago.', 'lean']]],
          ['“For the island.”', {}, [['you', 'For the island. The roads, the races. You know.', 'me'], ['mara', 'Right. The roads. Of course.', 'npc'], ['', 'She looks back at the sunset for a long time.', 'wide']]],
          ['“I don’t know yet.”', { mara: 1 }, [['you', 'I don’t know yet. But this helps.', 'me'], ['mara', 'Good answer. An honest one.', 'npc']]]]],
        ['', 'You bring the skiff home in the dark, the lights of the marina guiding you in.', 'wide']]; } }] },

  { id: 'mbeach', title: 'Sunset on the Sand', who: 'mara', desc: 'A walk on the beach, nothing else. Mara insists it is not a date.', reward: 0, aff: { mara: 1 },
    avail: (S) => DATE_DONE('mboat') && (Story.F().mara | 0) >= 3,
    steps: [{ t: 'call', lines: () => [['Mara (phone)', 'I closed the garage early. Do not tell Hal. Take me to the beach? Just a walk. Not a date.'], ['you (phone)', 'Definitely not a date.'], ['Mara (phone)', 'Glad we agree. Bring a jumper.']] },
      DATE_PICKUP(() => [['', '18:50 · THE GARAGE', 'card'], ['mara', 'Not a date. I just happen to have brushed my hair.', 'npc'], ['you', 'Noted.', 'me']]),
      { t: 'goto', at: 'sand', with: 'mara', obj: 'Drive Mara to the beach', r: 30, tod: 19.0, done: () => Story.passOff(),
        chat: ['When we were kids you said you would build a boat and sail us out of that town. Remember?', 'Wind the window down. I want to smell the sea.', 'You know this is a date, right? Do not answer that.'] },
      { t: 'cut', scene: 'beach', tod: 19.3, lines: () => [['', '19:20 · ' + ((Surf.beaches[1] || Surf.beaches[0] || {}).name || 'THE BEACH').toUpperCase(), 'card'], ['', 'The sand is still warm. You walk along the edge of the water, shoes in hand.', 'two'],
        ['mara', 'I used to come here when I first arrived. When I missed home. Missed you, I suppose.', 'npc'], ['you', 'You never wrote.', 'me'], ['mara', 'Neither did you.', 'npc'], ['', 'You stop and sit down in the sand to watch the sun go.', 'sit'],
        ['mara', 'Every night it goes down into the sea and every night I think it will not come back up.', 'sit'],
        ['', 'What do you say?', 'me', [['“It always does.”', { mara: 1 }, [['you', 'It always does. Like me.', 'me'], ['mara', 'That was so cheesy. I loved it. Do not do it again.', 'npc']]],
          ['Put your arm round her', { mara: 2, maraLove: 1 }, [['', 'You put your arm round her. She leans her head on your shoulder.', 'sit'], ['mara', '…Okay. Maybe it is a date.', 'sit']]],
          ['Throw a handful of sand at her', {}, [['', 'You flick sand at her. She tackles you into it.', 'wide'], ['mara', 'Eight years and you are still twelve!', 'npc']]]]],
        ['', 'The sun is gone. You sit a while longer anyway.', 'sit']] }] },

  { id: 'mace', title: 'A Night at the Golden Ace', who: 'mara', date: true, food: [0xd8b040, 0xc84a4a], desc: 'Mara has never set foot in a casino. Tonight she wants to see what all the lights are about.', reward: 0, aff: { mara: 1 },
    avail: (S) => DATE_DONE('mbeach') && S.ch >= 3,
    steps: [{ t: 'call', lines: [['Mara (phone)', 'Rico says the Golden Ace has a ceiling made of gold. I need to see this for myself. Strictly for professional reasons.'], ['Mara (phone)', 'You are buying the first drink. And the second.']] },
      DATE_PICKUP(() => [['', '21:10 · THE GARAGE', 'card'], ['mara', 'I have forty dollars and a lucky spanner. Let us go and lose both.', 'npc']]),
      { t: 'goto', at: 'ace', with: 'mara', obj: 'Take Mara to the Golden Ace', r: 18, tod: 21.3, done: () => Story.passOff(),
        chat: ['If I win big I am buying a car lift. A proper one. With hydraulics.', 'Is it bad that I want to bet everything on red because it matches your car?', 'Rico said the slot machines are rigged. Rico says everything is rigged.'] },
      { t: 'talk', who: 'mara', at: 'ace', inside: true, obj: 'Find Mara at a table in the casino', tod: 21.6, lines: () => [['', '21:40 · THE GOLDEN ACE', 'card'], ['mara', 'The ceiling is NOT made of gold. Rico is a liar.', 'npc'], ['mara', 'But the drinks have little umbrellas in them, so I forgive him.', 'npc'],
        ['', 'A waiter brings two drinks with umbrellas and a bowl of nuts.', 'serve'], ['mara', 'I put my forty on number seventeen. Lost it in nine seconds. Best nine seconds of my week.', 'npc'],
        ['', 'What do you say?', 'me', [['“Here. Try again on me.”', { mara: 1 }, [['you', 'Here. Try again, on me.', 'me'], ['mara', 'Seventeen again. Watch.', 'npc'], ['', 'It comes up seventeen. She screams so loud the croupier drops the ball.', 'two'], ['mara', 'I AM A GENIUS.', 'npc']]],
          ['“To lucky spanners.”', { mara: 1 }, [['you', 'To lucky spanners.', 'toast'], ['mara', 'To lucky spanners!', 'toast']]],
          ['“Gambling is for suckers.”', { mara: -1 }, [['you', 'You know gambling is for suckers, right?', 'me'], ['mara', 'Then I am the happiest sucker in here. Lighten up.', 'npc']]]]],
        ['mara', 'Thank you for tonight. I did not know I needed it.', 'two']] }] },

  { id: 'mstars', title: 'Stargazing at the Cape', who: 'mara', desc: 'Mara wants to park up at the cape and look at the stars. Late. Just the two of you and the car.', reward: 0, aff: { mara: 2 },
    avail: (S) => DATE_DONE('mace') && (Story.F().mara | 0) >= 4,
    steps: [{ t: 'call', lines: [['Mara (phone)', 'Are you awake? Of course you are awake. Come and get me. There are no clouds tonight and I want to go and look at the stars from the cape.']] },
      DATE_PICKUP(() => [['', '23:00 · THE GARAGE', 'card'], ['mara', 'I brought a blanket and a flask of the terrible coffee. Drive.', 'npc']]),
      { t: 'goto', at: 'cape', with: 'mara', obj: 'Drive Mara out to the cape', r: 30, tod: 23.1,
        chat: ['Turn the radio off. I like the engine better.', 'Do you remember lying on the roof of your dad’s shed counting satellites?', 'Nearly there. Do not drive into the sea. I just washed this blanket.'] },
      { t: 'cut', tod: 23.5, done: () => Story.passOff(), lines: () => [['', '23:30 · THE CAPE', 'card'], ['', 'You park facing the sea and kill the engine. Above you, more stars than you have ever seen.', 'wide'],
        ['mara', 'Look. That one, moving. A satellite. I win.', 'mecar'], ['you', 'That was a plane.', 'mecar'], ['mara', 'It was a satellite and I win.', 'mecar'],
        ['mara', 'Hey. Whatever happens with Dex and all of it. I am glad you got off that ferry.', 'mecar'],
        ['', 'What do you do?', 'me', [['Take her hand', { mara: 2, maraLove: 1 }, [['', 'You take her hand on the seat between you. Neither of you says anything for a long time.', 'mecar'], ['mara', '…This is nice.', 'mecar']]],
          ['“Me too. Now share the coffee.”', { mara: 1 }, [['you', 'Me too. Now share the coffee.', 'mecar'], ['mara', 'It is terrible. Here.', 'mecar']]]]],
        ['', 'You drive her home as the sky starts to go grey.', 'wide']] }] }
);
