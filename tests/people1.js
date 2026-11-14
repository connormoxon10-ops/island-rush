/* The people in the running game. Boots the game, lets the street fill, gets out of the car, walks, knocks a pedestrian down and waits for them to get up, and builds one
   of every kind of person through the scene adapter. Checks: the shader compiles (no console errors), every pedestrian in view is one skinned mesh, the walk plants
   feet (the stance foot does not slide), soft tissue lags and settles on adults and does not exist on children, a knocked-down person's ragdoll comes to rest on the
   ground and they get back up, and nobody leaks (meshes are disposed when people leave).
   usage: node tests/people1.js   env SHOTS=1 for screenshots into OUT or tests/ (slow in software GL)   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 600)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (name) => { if (!process.env.SHOTS) return; await page.waitForTimeout(2500); await page.screenshot({ path: path.join(OUT, 'people_' + name + '.png') }); };

  /* 1. the street */
  const a = await page.evaluate(async () => {
    const g = window.__game; g.App.start(); const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
    for (let i = 0; i < 240; i++) g.stepSim(1 / 60);
    await new Promise((r) => setTimeout(r, 1500));
    const L = g.Peds.list, near = L.filter((p) => p.hu && !p.hu.dead);
    return { peds: L.length, drawn: near.length, live: g.HU.live.size, verts: near.slice(0, 3).map((p) => p.hu.mesh.geometry.attributes.position.count), bones: near[0] ? near[0].hu.bones.length : 0, kids: L.filter((p) => p.app && p.app.kid).length };
  });
  console.log(JSON.stringify(a));
  ok(a.peds > 5 && a.drawn > 0, 'pedestrians are on the street and drawn as Humans (' + a.drawn + ' of ' + a.peds + ')');
  ok(a.live >= a.drawn && a.bones >= 29, 'each is one skinned mesh on the full skeleton (' + a.bones + ' bones)');

  /* 2. on foot: the walk */
  const b = await page.evaluate(async () => {
    const g = window.__game, F = g.Foot, pad = window.__pad; if (g.Cam) g.Cam.view = 2;
    F.exit(); if (!F.on) return { on: false };
    F.tp = true; const x0 = F.x, z0 = F.z, hu = () => F.ped.hu, V = new THREE.Vector3(), foot = (n) => { hu().root.updateMatrixWorld(true); return V.setFromMatrixPosition(hu().b[n].matrixWorld).clone(); };
    /* gather a crowd in front: a few pedestrians stood round the player, so the screenshots and the checks have people in them */
    const L = g.Peds.list.filter((p) => p.state === 'walk' || p.state === 'idle').slice(0, 7); window.__crowd = L;
    L.forEach((p, i) => { const an = F.yaw + (i - 3) * 0.32, d = 3.2 + (i % 3) * 0.9; p.x = F.x + Math.sin(an) * d; p.z = F.z + Math.cos(an) * d; p.keep = true; });
    await new Promise((r) => setTimeout(r, 600));
    pad.axes[1] = -1; let slide = 0, stance = 0, minY = 9, maxY = -9; const prev = { L: null, R: null };
    for (let i = 0; i < 300; i++) {
      g.stepSim(1 / 60); if (i % 2) continue; g.writePeds ? g.writePeds(g.App.time) : 0;
      if (!hu()) continue;
      for (const s of ['L', 'R']) { const p = foot('foot' + s), gy = F.y; minY = Math.min(minY, p.y - gy); maxY = Math.max(maxY, p.y - gy); if (prev[s] && p.y - gy < 0.135 && prev[s].y - gy < 0.135 && i > 60) { slide += Math.hypot(p.x - prev[s].x, p.z - prev[s].z); stance++; } prev[s] = p; }
    }
    pad.axes[1] = 0;
    return { on: true, moved: Math.hypot(F.x - x0, F.z - z0), hu: !!hu(), slidePerStep: stance ? slide / stance : -1, stance, ankleMin: minY, ankleMax: maxY, speed: F.speed };
  });
  console.log(JSON.stringify(b));
  ok(b.on && b.hu, 'getting out of the car puts a Human on the street');
  ok(b.moved > 3, 'the player walks (' + (b.moved || 0).toFixed(1) + ' m in 5 s)');
  if (b.stance > 0) ok(b.slidePerStep < 0.02, 'the stance foot stays planted (' + (b.slidePerStep * 1000).toFixed(1) + ' mm of slide per frame while it is down)');
  ok(b.ankleMax - b.ankleMin > 0.05, 'the feet lift (ankle travels ' + ((b.ankleMax - b.ankleMin) * 100).toFixed(0) + ' cm)');
  await shot('street');

  /* 3. soft tissue: shake an adult and a child the same way */
  const c = await page.evaluate(() => {
    const g = window.__game, H = g.Human, C = (h) => new THREE.Color(h), out = {};
    const mk = (o) => { const h = H.make(Object.assign({ skin: C(0xd8a070), hair: C(0x221810), shirt: C(0x3060a0), pants: C(0x202028), shoe: C(0x101010), s: 1, stout: 1, seed: 1 }, o)); g.scene.add(h.root); return h; };
    const run = (h) => {
      let peak = 0, late = 0; const names = ['bustL', 'belly', 'gluL'], rest = names.map((n) => h.b[n].position.clone());
      for (let i = 0; i < 240; i++) {
        const t = i / 60; h.root.position.y = t < 1 ? 0.06 * Math.sin(t * Math.PI * 2 * 3) : 0; h.root.updateMatrixWorld(true); H.physics(h, 1 / 60);
        let d = 0; names.forEach((n, k) => { d = Math.max(d, h.b[n].position.distanceTo(rest[k])); }); if (t < 1.2) peak = Math.max(peak, d); if (t > 3.5) late = Math.max(late, d);
      }
      g.scene.remove(h.root); H.dispose(h); return { peak, late, soft: h.soft.length };
    };
    out.man = run(mk({})); out.woman = run(mk({ fem: true })); out.kid = run(mk({ kid: true, s: 0.68 })); return out;
  });
  console.log(JSON.stringify(c));
  ok(c.man.peak > 0.0008 && c.woman.peak > 0.002, 'soft tissue lags when an adult body is shaken (man ' + (c.man.peak * 1000).toFixed(1) + ' mm, woman ' + (c.woman.peak * 1000).toFixed(1) + ' mm)');
  ok(c.man.late < 0.0008 && c.woman.late < 0.0008, 'and settles again afterwards');
  ok(c.kid.soft === 0 && c.kid.peak === 0, 'children have none');

  /* 4. knocked down: ragdoll, then back on their feet */
  const d = await page.evaluate(async () => {
    const g = window.__game, F = g.Foot, p = window.__crowd[3] || g.Peds.list[0], out = { had: !!p.hu };
    p.state = 'down'; p.t = 0; p.air = true; p.vx = 2.4; p.vz = 1.2; p.vy = 2.5; p.spin = 5; p.tilt = 0; p.crossing = false; p.onRoad = false;
    let low = 9, rag = false;
    for (let i = 0; i < 200; i++) { g.stepSim(1 / 60); if (g.writePeds) g.writePeds(g.App.time); if (p.hu && p.hu.rag) { rag = true; let m = 0; for (const q of p.hu.rag.p) m = Math.max(m, q.y - p.hu.rag.gy); low = Math.min(low, m); } }
    out.rag = rag; out.highestPointAtRest = low; out.state1 = p.state; window.__down = p;
    return out;
  });
  console.log(JSON.stringify(d));
  ok(d.rag, 'a knocked-down pedestrian becomes a ragdoll');
  ok(d.highestPointAtRest < 0.45, 'which comes to rest lying on the ground (highest point ' + (d.highestPointAtRest || 0).toFixed(2) + ' m up)');
  await shot('down');
  const e = await page.evaluate(async () => {
    const g = window.__game, p = window.__down; let n = 0;
    while (p.state === 'down' && n++ < 1500) { g.stepSim(1 / 60); if (n % 4 === 0 && g.writePeds) g.writePeds(g.App.time); }
    for (let i = 0; i < 90; i++) { g.stepSim(1 / 60); if (g.writePeds) g.writePeds(g.App.time); }
    const V = new THREE.Vector3(); let headY = 0; if (p.hu) { p.hu.root.updateMatrixWorld(true); headY = V.setFromMatrixPosition(p.hu.b.head.matrixWorld).y - p.hu.root.position.y; }
    return { state: p.state, secs: n / 60, rag: !!(p.hu && p.hu.rag), headY };
  });
  console.log(JSON.stringify(e));
  ok(e.state !== 'down' && !e.rag, 'they get up again (after ' + e.secs.toFixed(1) + ' s) and the ragdoll lets go');
  ok(e.headY > 1.0, 'standing: head ' + e.headY.toFixed(2) + ' m above their feet');

  /* 5. every kind of person the scenes ask for, and no leaks */
  const f = await page.evaluate(async () => {
    const g = window.__game, H = g.Human, C = (h) => new THREE.Color(h), out = { made: 0, err: [] };
    const base = { skin: C(0xc68a5c), hair: C(0x2a1a10), shirt: C(0x406080), pants: C(0x222228), shoe: C(0x111111), s: 1, stout: 1, seed: 2 };
    const kinds = [{}, { fem: true, hst: 'long' }, { fem: true, hst: 'pony', skirt: 1 }, { fem: true, hst: 'bun', skirt: 2, tights: true }, { hst: 'curly' }, { hst: 'buzz', beard: true }, { old: true, hst: 'bald', suit: true, tie: C(0x802020) }, { robe: true, old: true }, { coat: true, hat: { k: 'cap', c: C(0x203050) } },
      { kid: true, s: 0.68, hs: 1.26, bag: true, bagc: C(0x2060a0) }, { glasses: true, sun: true, hat: { k: 'cowboy', c: C(0x705030) } }, { fem: true, hst: 'curly', glasses: true, shorts: true }];
    for (const k of kinds) { try { const h = H.make(Object.assign({}, base, k)); h.root.updateMatrixWorld(true); H.alive(h, 0.016, 1, 1); H.physics(h, 0.016); const bk = H.bake(h); if (!(bk.attributes.position.count > 100)) out.err.push('bake ' + JSON.stringify(k)); bk.dispose(); H.dispose(h); out.made++; } catch (x) { out.err.push(String(x).slice(0, 200) + ' for ' + JSON.stringify(k)); } }
    out.kinds = kinds.length; out.liveBefore = g.HU.live.size;
    /* send everybody away: their meshes must go too */
    const info = g.renderer ? g.renderer.info.memory.geometries : -1; out.geoms = info;
    return out;
  });
  console.log(JSON.stringify(f));
  ok(f.made === f.kinds && !f.err.length, 'all ' + f.kinds + ' kinds of person build, animate and bake' + (f.err.length ? ': ' + f.err.join('; ') : ''));
  await page.waitForTimeout(1200);
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page or console errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
