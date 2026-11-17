/* Named beaches, beach roads and the Surf Club. Checks four named beaches round the island, each with its own road down to a car park and a name board
   there, and that they are on the map; then surfs at Pelican Point: E at the surf hut starts a session of three waves, an autopilot carves along the
   face ahead of the break, an air off the lip lands and scores, the white water catches a surfer who stops, and the session pays out and gives the car back.
   usage: node tests/surf.js   (needs dist/test.html: bash build.sh) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const info = await page.evaluate(() => {
    const g = window.__game, U = g.Surf; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now();
    const out = U.beaches.map((b) => { g.terrainHeight(b.px, b.pz); const road = g.NR.seg >= 0 ? g.NR.d - g.NR.halfW : 99; return { name: b.name, surf: !!b.surf, road: +road.toFixed(1), sign: !!b.sign, sea: g.terrainHeight(b.x - b.ix * 40, b.z - b.iz * 40) }; });
    let mapOk = true; try { U.drawFull(document.createElement('canvas').getContext('2d'), 1); } catch (e) { mapOk = String(e); }
    return { beaches: out, mapOk };
  });
  console.log(JSON.stringify(info));
  ok(info.beaches.length === 4 && new Set(info.beaches.map((b) => b.name)).size === 4, 'four named beaches: ' + info.beaches.map((b) => b.name).join(', '));
  ok(info.beaches.every((b) => b.road < 1.5), 'each has a road all the way down to its car park (' + info.beaches.map((b) => b.road).join(', ') + ' m off the asphalt)');
  ok(info.beaches.every((b) => b.sign), 'and a name board there');
  ok(info.beaches.every((b) => b.sea < -0.5), 'every one of them is on the sea');
  ok(info.mapOk === true && info.beaches.filter((b) => b.surf).length === 1, 'they are labelled on the map, with the Surf Club at ' + (info.beaches.find((b) => b.surf) || {}).name);
  const st = await page.evaluate(() => {
    const g = window.__game, U = g.Surf, B = U.beaches.find((b) => b.surf), c = g.car; g.spawnAt(B.ox, B.oz, 0);
    for (let i = 0; i < 10; i++) { c.vx = c.vz = 0; window.__now += 1000 / 30; g.frame(window.__now); }
    const near = U.near, m0 = g.save.money; U.key('KeyE'); for (let i = 0; i < 20; i++) { window.__now += 1000 / 30; g.frame(window.__now); }
    window.__m0 = m0; return { near, on: U.on, phase: U.phase, carHidden: !c.body.visible, shot: g.renderer.domElement.toDataURL('image/jpeg', 0.85) };
  });
  fs.writeFileSync(path.join(OUT, 'surf_start.jpg'), Buffer.from(st.shot.split(',')[1], 'base64')); delete st.shot;
  console.log(JSON.stringify(st));
  ok(st.near && st.on && st.phase === 'ride' && st.carHidden, 'E at the surf hut: out on the first wave');
  /* an air off the lip: up the face fast, no spin, lands straight and scores */
  const air = await page.evaluate(() => {
    const g = window.__game, U = g.Surf, s = U.s; U.in = { st: 0, pump: 0 }; s.v = 0.98; s.phi = -0.7; s.spd = 12; s.u = U.w.bu + 20; const p0 = U.score; let flew = false;
    for (let i = 0; i < 90; i++) { window.__now += 1000 / 30; g.frame(window.__now); if (s.air) flew = true; if (flew && !s.air) break; }
    return { flew, gained: U.score - p0, phase: U.phase };
  });
  console.log(JSON.stringify(air));
  ok(air.flew && air.gained > 250 && air.phase === 'ride', 'hit the lip going up fast: an air, landed straight, ' + Math.round(air.gained) + ' points');
  /* ride the rest on an autopilot (hold the middle of the face, keep pumping); the session ends after three waves and pays out */
  const ride = await page.evaluate(() => {
    const g = window.__game, U = g.Surf, R0 = g.renderer.render; g.renderer.render = function () {}; let frames = 0, pic = null, wipes = 0, last = U.waves, maxSpd = 0;
    while (U.on && frames < 30 * 200) {
      const s = U.s, phiT = U.phase === 'ride' ? clamp((s.v - 0.55) * 2.2 + (s.u - U.w.bu < 10 ? 0.5 : 0), -0.9, 0.9) : 0; U.in = { st: clamp(-(phiT - s.phi) * 2.5, -1, 1), pump: 1 };
      window.__now += 1000 / 30; g.frame(window.__now); frames++; maxSpd = Math.max(maxSpd, s.spd || 0); if (s.wipe && U.phase === 'wait' && !s._c) { s._c = 1; wipes++; }
      if (frames === 200) { g.renderer.render = R0; window.__now += 1000 / 30; g.frame(window.__now); pic = g.renderer.domElement.toDataURL('image/jpeg', 0.85); g.renderer.render = function () {}; }
    }
    g.renderer.render = R0; U.in = null; return { frames, on: U.on, waves: U.waves, score: Math.round(U.score), paid: g.save.money - window.__m0, carBack: g.car.body.visible, wipes, maxSpd: +maxSpd.toFixed(1), pic, last };
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  });
  if (ride.pic) fs.writeFileSync(path.join(OUT, 'surf_ride.jpg'), Buffer.from(ride.pic.split(',')[1], 'base64')); delete ride.pic;
  console.log(JSON.stringify(ride));
  ok(!ride.on && ride.waves === 3, 'three waves ridden, then the session ends (' + ride.frames + ' frames, ' + ride.wipes + ' wipeouts, top speed ' + ride.maxSpd + ' m/s)');
  ok(ride.score > 500 && ride.paid > 0, ride.score + ' points, paid $' + ride.paid);
  ok(ride.carBack, 'the car is back afterwards');
  /* standing still in front of the break: the white water gets you */
  const wipe = await page.evaluate(() => {
    const g = window.__game, U = g.Surf; U.key('KeyE'); if (!U.on) { g.spawnAt(U.B.ox, U.B.oz, 0); for (let i = 0; i < 5; i++) { window.__now += 1000 / 30; g.frame(window.__now); } U.key('KeyE'); }
    const s = U.s; U.in = { st: 0, pump: 0 }; s.u = U.w.bu + 3; s.spd = 0.5; s.v = 0.5; s.phi = 0; let wiped = false;
    for (let i = 0; i < 60; i++) { window.__now += 1000 / 30; g.frame(window.__now); if (s.wipe) { wiped = true; break; } }
    U.in = null; U.end(true); return { wiped };
  });
  ok(wipe.wiped, 'caught by the white water: a wipeout');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
