/* The motorcycle and your vitals. The Viper 600: on two wheels with a rider, quick off the line, leans into corners, falls over when you
   jump off. Bailing out at speed (F while moving): you tumble, lose health by how fast you were going, and the bike or car rolls on without
   you; a crash on the bike throws you off. Stamina runs out when you sprint (then no running) and comes back at rest; food and water run
   down and are topped up by buying a sandwich and a bottle of water; beer and whiskey at the bar make you drunk, and drunk your steering
   wanders; going hungry and thirsty costs health; at zero you wake up in hospital with a bill. The HUD shows the five bars, and they are saved.
   usage: node tests/moto.js ; env OUT=dir for pictures */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 5000, owned: { rook: true, moto: true }, set: { quality: 'low', traffic: 'off', cam: 2 } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (n) => { const u = await page.evaluate(() => { const g = window.__game; g.renderer.setRenderTarget(null); window.__run(1); return g.renderer.domElement.toDataURL('image/jpeg', 0.85); }); fs.writeFileSync(path.join(OUT, 'moto_' + n + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    /* a long straight: the stretch of road with the least bend */
    let best = null; for (const r of g.roads) { const P = r.pts; for (let i = 2; i + 12 < P.length; i += 4) { const a = Math.atan2(P[i + 1].x - P[i].x, P[i + 1].z - P[i].z), b = Math.atan2(P[i + 12].x - P[i + 11].x, P[i + 12].z - P[i + 11].z), L = Math.hypot(P[i + 12].x - P[i].x, P[i + 12].z - P[i].z), bend = Math.abs(((a - b + 9 * Math.PI) % (2 * Math.PI)) - Math.PI);
      if (L > 260 && (!best || bend < best.bend)) best = { x: P[i].x, z: P[i].z, yaw: a, bend }; } }
    window.__straight = best;
    window.__go = (kmh) => { const g2 = window.__game, s = window.__straight; g2.loadAround(s.x, s.z, 10); g2.spawnAt(s.x, s.z, s.yaw); window.__run(5); if (kmh) { const v = kmh / 3.6, c = g2.car; c.vx = Math.sin(c.yaw) * v; c.vz = Math.cos(c.yaw) * v; c.speed = v; c.gear = Math.min(4, Math.max(2, Math.round(kmh / 40))); } }; });
  /* ---- the bike ---- */
  const bike = await page.evaluate(() => { const g = window.__game; g.applyCar('moto', true); const e = g.car.ext, S = e.userData.S, P = e.userData.parts || {};
    return { cur: g.save.car, bike: g.isBike(g.CAR_BY_ID.moto), parts: Object.keys(P), xs: S.wheels.map((w) => +w.x.toFixed(3)), cls: g.CAR_BY_ID.moto.cls, price: g.CAR_BY_ID.moto.price }; });
  console.log(JSON.stringify(bike));
  ok(bike.cur === 'moto' && bike.bike && bike.parts.includes('fork') && bike.parts.includes('rider') && bike.xs.every((x) => Math.abs(x) < 0.01), 'the Viper 600 (' + bike.cls + ', ' + bike.price + '): two wheels in line, a fork that steers and a rider');
  const run = await page.evaluate(() => { const g = window.__game, c = g.car; window.__go(0); g.key('KeyW', true); let t100 = 0;
    for (let i = 0; i < 30 * 14; i++) { window.__run(1); if (!t100 && c.kmh >= 100) t100 = i / 30; }
    const top = c.kmh; g.key('KeyW', false); return { t100, top: Math.round(top) }; });
  console.log(JSON.stringify(run));
  ok(run.t100 > 0 && run.t100 < 6 && run.top > 150, 'quick: 0–100 km/h in ' + run.t100.toFixed(1) + ' s, ' + run.top + ' km/h after 14 s');
  await page.evaluate(() => window.__go(70)); await page.evaluate(() => window.__run(4)); await shot('ride');
  const lean = await page.evaluate(() => { const g = window.__game, c = g.car; g.key('KeyA', true); let m = 0, side = 0; for (let i = 0; i < 40; i++) { window.__run(1); if (Math.abs(g.Moto.lean) > Math.abs(m)) { m = g.Moto.lean; side = c.ayL; } } return { lean: m, ay: side, rz: g.car.ext.rotation.z }; });
  await shot('lean'); await page.evaluate(() => window.__game.key('KeyA', false));
  console.log(JSON.stringify(lean));
  ok(Math.abs(lean.lean) > 0.2 && Math.sign(lean.lean) === -Math.sign(lean.ay), 'it leans into the corner (' + Math.round(Math.abs(lean.lean) * 57.3) + '°)');
  /* ---- bailing out ---- */
  const bail = await page.evaluate(() => { const g = window.__game, V = g.Vit, c = g.car; V.hp = 100; window.__go(80); window.__run(2); const v0 = c.kmh; g.key('KeyF', true); g.key('KeyF', false); window.__run(1);
    const r = { on: g.Foot.on, state: g.Foot.state, hp: V.hp, v0: Math.round(v0), fallen: g.Moto.fallen }; window.__run(12); r.bikeV = Math.round(c.kmh); r.down = g.Foot.state; window.__run(6); return r; });
  await shot('bail');
  const after = await page.evaluate(() => { const g = window.__game; window.__run(330); return { state: g.Foot.state, bikeV: Math.round(g.car.kmh), lean: +g.Moto.lean.toFixed(2) }; });
  console.log(JSON.stringify(bail), JSON.stringify(after));
  ok(bail.on && bail.state === 'down' && bail.hp < 70 && bail.hp > 20, 'F at ' + bail.v0 + ' km/h: you throw yourself off and tumble (health ' + Math.round(bail.hp) + ')');
  ok(bail.bikeV > 20 && Math.abs(after.lean) > 1, 'the bike slides on without you (' + bail.bikeV + ' km/h a moment later) and ends up on its side');
  ok(after.state === 'walk' && after.bikeV < 3, 'you get up; the bike has stopped');
  const carBail = await page.evaluate(() => { const g = window.__game, V = g.Vit, c = g.car; g.Foot.board(true); g.applyCar('rook', true); V.hp = 100; window.__go(50); window.__run(2); g.key('KeyF', true); g.key('KeyF', false); window.__run(10);
    const r = { on: g.Foot.on, hp: V.hp, carV: Math.round(c.kmh) }; window.__run(240); r.stopped = c.kmh < 3; return r; });
  console.log(JSON.stringify(carBail));
  ok(carBail.on && carBail.hp < 90 && carBail.hp > 55 && carBail.carV > 10 && carBail.stopped, 'out of a car at 50 km/h: hurt less (health ' + Math.round(carBail.hp) + '), and the car rolls on (' + carBail.carV + ' km/h) and stops');
  const slow = await page.evaluate(() => { const g = window.__game, V = g.Vit; g.Foot.board(true); window.__go(0); window.__run(3); V.hp = 100; g.key('KeyF', true); g.key('KeyF', false); window.__run(3); const r = { on: g.Foot.on, state: g.Foot.state, hp: V.hp }; g.Foot.board(true); return r; });
  ok(slow.on && slow.state === 'walk' && slow.hp === 100, 'stopped, F still just opens the door');
  /* thrown off in a crash */
  const crash = await page.evaluate(() => { const g = window.__game, V = g.Vit, c = g.car; g.applyCar('moto', true); V.hp = 100; window.__go(0); window.__run(2);
    /* face the nearest building and ride into it */
    const T = g.towns[6]; g.loadAround(T.cx, T.cz, 6); const rec = [...g.Bld.lots.values()].find((b) => b.tid === T.id && b.cat === 'mid'); const d = rec.door;
    g.spawnAt(d.x + d.nz * 0, d.z + d.nz * 16, Math.atan2(0, -d.nz)); window.__run(3); const v = 70 / 3.6; c.vx = 0; c.vz = -d.nz * v; c.speed = v; c.gear = 2;
    for (let i = 0; i < 60 && !g.Foot.on; i++) window.__run(1); return { on: g.Foot.on, hp: V.hp }; });
  console.log(JSON.stringify(crash));
  ok(crash.on && crash.hp < 85, 'riding into a wall at 70 km/h throws you off the bike (health ' + Math.round(crash.hp) + ')');
  /* ---- stamina ---- */
  const sta = await page.evaluate(() => { const g = window.__game, V = g.Vit, F = g.Foot; window.__run(150); if (!F.on) { g.key('KeyF', true); g.key('KeyF', false); } window.__run(3); V.st = 100; V.winded = false;
    g.key('ShiftLeft', true); g.key('KeyW', true); let tOut = 0, sp = 0; for (let i = 0; i < 30 * 12; i++) { window.__run(1); if (!tOut && V.winded) tOut = i / 30; if (tOut && i / 30 > tOut + 1 && !sp) sp = F.speed; } g.key('ShiftLeft', false); g.key('KeyW', false); window.__run(30 * 5); return { tOut, sp: +sp.toFixed(2), back: Math.round(V.st), winded: V.winded }; });
  console.log(JSON.stringify(sta));
  ok(sta.tOut > 5 && sta.tOut < 10 && sta.sp < 3, 'sprinting empties stamina in ' + sta.tOut.toFixed(1) + ' s, then you can only walk (' + sta.sp + ' m/s)');
  ok(sta.back > 60 && !sta.winded, 'five seconds standing still and it is back to ' + sta.back);
  /* ---- food, water, drink ---- */
  const eat = await page.evaluate(() => { const g = window.__game, V = g.Vit, I = g.Int, out = {}; V.food = 60; V.water = 60; V.update(60); out.f1 = V.food; out.w1 = V.water;
    const enter = (kind) => { if (g.App.mode === 'int') I.leave(true); const T = g.towns[6]; g.loadAround(T.cx, T.cz, 6); const rec = [...g.Bld.lots.values()].find((b) => b.kind === kind); if (!rec) return false; const d = rec.door;
      g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); window.__run(2); g.key('KeyF', true); g.key('KeyF', false); window.__run(2); g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); window.__run(3); g.key('KeyE', true); g.key('KeyE', false); window.__run(15); return g.App.mode === 'int'; };
    const use = (re) => { const a = I.acts.find((q) => re.test(typeof q.label === 'function' ? q.label() : q.label)); if (!a) return false; a.fn(); return true; };
    out.store = enter('store'); V.food = 20; V.water = 20; const m0 = g.save.money; out.sand = use(/sandwich/); out.wat = use(/bottle of water/); out.f2 = V.food; out.w2 = V.water; out.paid = m0 - g.save.money;
    out.bar = enter('bar'); V.drunk = 0; out.beer = use(/beer/) && use(/beer/) && use(/whiskey/); out.drunk = V.drunk; I.leave(true); window.__run(30); return out; });
  console.log(JSON.stringify(eat));
  ok(eat.f1 < 58.5 && eat.f1 > 57 && eat.w1 < 57 && eat.w1 > 56, 'a minute of play: food ' + eat.f1.toFixed(1) + ', water ' + eat.w1.toFixed(1) + ' (water goes faster)');
  ok(eat.store && eat.sand && eat.wat && eat.f2 > 55 && eat.w2 > 60 && eat.paid === 8, 'the corner shop: a sandwich and a bottle of water ($' + eat.paid + ') bring food to ' + Math.round(eat.f2) + ' and water to ' + Math.round(eat.w2));
  ok(eat.bar && eat.beer && eat.drunk > 55, 'the bar: two beers and a whiskey and you are drunk (' + Math.round(eat.drunk) + ')');
  const drunk = await page.evaluate(() => { const g = window.__game, V = g.Vit, c = g.car; if (g.Foot.on) g.Foot.board(true); V.drunk = 80; window.__go(60); let m = 0; for (let i = 0; i < 90; i++) { window.__run(1); m = Math.max(m, Math.abs(c.steer)); }
    const blur = g.renderer.domElement.style.filter; const r = { m: +m.toFixed(3), blur }; V.drunk = 0; window.__go(60); let m2 = 0; for (let i = 0; i < 90; i++) { window.__run(1); m2 = Math.max(m2, Math.abs(c.steer)); } r.sober = +m2.toFixed(3); return r; });
  console.log(JSON.stringify(drunk));
  ok(drunk.m > 0.05 && drunk.sober < 0.02 && /blur/.test(drunk.blur), 'drunk, hands off the bars: the steering wanders (' + drunk.m + ', sober ' + drunk.sober + ') and the picture blurs');
  /* ---- hunger, blacking out, hospital ---- */
  const starve = await page.evaluate(() => { const g = window.__game, V = g.Vit; V.hp = 100; V.food = 0; V.water = 0; for (let i = 0; i < 10; i++) V.update(1); const r = { hp: V.hp }; V.food = 50; V.water = 50; return r; });
  ok(starve.hp < 94 && starve.hp > 90, 'empty on food and water: health drains (' + starve.hp.toFixed(1) + ' after 10 s)');
  const die = await page.evaluate(() => { const g = window.__game, V = g.Vit, m0 = g.save.money; V.hurt(150, 'Test'); const r = { dead: V.dead, banner: document.getElementById('bk').textContent }; window.__run(30 * 4); Object.assign(r, { after: V.dead, hp: V.hp, paid: m0 - g.save.money, foot: g.Foot.on }); return r; });
  console.log(JSON.stringify(die));
  ok(die.dead && /WASTED/.test(die.banner) && !die.after && die.hp === 70 && die.paid === 250 && !die.foot, 'health at zero: WASTED, then you wake up in hospital (health 70, bill $' + die.paid + ')');
  /* ---- HUD, save ---- */
  const hud = await page.evaluate(() => { const g = window.__game, V = g.Vit; V.hp = 42; V.st = 77; V.food = 33; V.water = 12; V.drunk = 64; V.hud(); g.writeSave ? g.writeSave() : 0; const rows = [...document.querySelectorAll('#vit .vr')].map((r) => r.textContent.replace(/\d+$/, '') + ':' + r.querySelector('em').textContent + (r.classList.contains('low') ? '!' : ''));
    const s = JSON.parse(localStorage.getItem('island-rush-v1')); return { rows, saved: s.vit }; });
  console.log(JSON.stringify(hud));
  ok(hud.rows.join() === 'HEALTH:42,STAMINA:77,FOOD:33,WATER:12!,DRUNK:64!', 'the HUD: five bars with numbers, water and drink flagged');
  ok(hud.saved && hud.saved.hp === 42 && hud.saved.water === 12, 'and they are saved');
  await page.evaluate(() => { const g = window.__game; g.Vit.drunk = 0; g.Vit.hp = 100; g.Vit.water = 80; g.applyCar('moto', true); window.__go(0); g.Cam.view = 2; window.__run(10); }); await shot('hud');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
