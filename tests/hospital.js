/* The hospital. Every town has one; you can walk in and see a doctor. When your health hits zero you wake up on the nearest one's ward:
   a medical scene (the blurry first look, the doctor, the nurse at the monitor), then three recovery games (physio timing, reflexes, pill
   sorting) that give health back and take money off the bill; you walk out, pay, and your car is at the kerb.   usage: node tests/hospital.js ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 2000, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 400000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const save = (n, u) => { if (u) fs.writeFileSync(path.join(OUT, 'hosp_' + n + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  const sites = await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    window.__pic = () => { const g2 = window.__game; g2.renderer.setRenderTarget(null); window.__run(1); return g2.renderer.domElement.toDataURL('image/jpeg', 0.82); };
    g.Bld.prep(); const H = g.Bld.sites.filter((s) => s.kind === 'hospital'); return { n: H.length, towns: new Set(H.map((s) => s.T.name)).size, names: H.slice(0, 3).map((s) => s.name), specials: g.Bld.sites.length }; });
  console.log(JSON.stringify(sites));
  ok(sites.n === 14 && sites.towns === 14, 'a hospital in every town (' + sites.n + '): ' + sites.names.join(', ') + '…');
  /* die out on the road near Fairhaven */
  const die = await page.evaluate(() => { const g = window.__game, V = g.Vit, T = g.towns[6]; g.loadAround(T.cx + T.cell * 4, T.cz, 6); g.spawnAt(T.cx + T.cell * 4, T.cz, 0); window.__run(5); const m0 = g.save.money; V.hurt(500, 'A hard crash'); window.__run(30 * 4);
    const I = g.Int, H = g.Hosp; return { m0, mode: g.App.mode, kind: I.rec && I.rec.kind, name: I.rec && I.rec.name, cut: g.Cut.on, adm: !!H.adm, bill: H.adm && H.adm.bill, carToDoor: I.rec ? Math.round(Math.hypot(g.car.x - I.rec.door.x, g.car.z - I.rec.door.z)) : -1, hp: V.hp }; });
  console.log(JSON.stringify(die));
  ok(die.mode === 'int' && die.kind === 'hospital' && die.cut && die.adm, 'health at zero: you wake up on the ward of ' + die.name);
  ok(die.carToDoor < 14, 'your car is waiting at the kerb outside (' + die.carToDoor + ' m from the door)');
  /* the scene, shot by shot */
  const cut = await page.evaluate(() => { const g = window.__game, C = g.Cut, out = { shots: [], pics: {}, lines: [] };
    for (let i = 0; i < 80 && C.on; i++) { const L = C.lines[C.i]; if (!L) break; const s = L[2] || ''; out.shots.push(s); out.lines.push((L[0] ? L[0] + ': ' : '') + L[1].slice(0, 50));
      window.__run(20); if (!out.pics[s]) out.pics[s] = window.__pic(); if (s === 'pov' && !out.blur) out.blur = g.renderer.domElement.style.filter;
      if (C.choosing) C.choose(0); else { C.typed = 1e9; C.next(); } window.__run(1); }
    window.__run(3); out.panel = (document.getElementById('intPan').textContent || '').slice(0, 200); out.hidden = document.getElementById('intPan').hidden; return out; });
  for (const k in cut.pics) save('cut_' + k, cut.pics[k]);
  console.log(cut.lines.join('\n'));
  ok(['pov', 'doc', 'monitor', 'bed'].every((s) => cut.shots.includes(s)) && /blur/.test(cut.blur || '') && cut.lines.some((l) => /crash/i.test(l)), 'the medical scene: through your blurry eyes, the doctor, the nurse at the heart monitor, and what happened (a crash)');
  ok(!cut.hidden && /Physio/.test(cut.panel) && /Reflexes/.test(cut.panel) && /Pills/.test(cut.panel), 'then the recovery tests: physio, reflexes, pills');
  /* physio: press while the marker is in the green */
  const phy = await page.evaluate(() => { const g = window.__game, H = g.Hosp, V = g.Vit, h0 = V.hp; H.start('physio'); window.__run(2); const pic = window.__pic();
    for (let k = 0; k < 6; k++) { let n = 0; while (!(H.game.pos > H.game.zone[0] + 0.01 && H.game.pos < H.game.zone[1] - 0.01) && n++ < 400) window.__run(1); H.hit(); window.__run(1); }
    return { h0, h1: V.hp, res: H.adm.games.physio }; });
  console.log(JSON.stringify(phy));
  ok(phy.res && /6\/6/.test(phy.res) && phy.h1 >= phy.h0 + 29, 'physio: six presses in the green, +' + Math.round(phy.h1 - phy.h0) + ' health (' + phy.res + ')');
  const shotGame = async (n) => { const u = await page.screenshot({ type: 'jpeg', quality: 80, timeout: 30000 }).catch(() => null); if (u) fs.writeFileSync(path.join(OUT, 'hosp_game_' + n + '.jpg'), u); };
  /* reflexes: a false start, then two quick ones */
  const rfx = await page.evaluate(() => { const g = window.__game, H = g.Hosp; window.__run(50); H.start('reflex'); window.__run(2); H.hit(); const log = [];
    for (let k = 0; k < 2; k++) { let n = 0; while (H.game.ph !== 'go' && n++ < 300) window.__run(1); window.__run(6); log.push(H.game.ph); H.hit(); window.__run(1); }
    return { res: H.adm.games.reflex, disc: H.adm.disc, log }; });
  console.log(JSON.stringify(rfx));
  ok(rfx.res && /best \d+ ms/.test(rfx.res) && rfx.disc >= 0.35, 'reflexes: jumping the light counts against you; a quick go takes ' + Math.round(rfx.disc * 100) + '% off the bill (' + rfx.res + ')');
  /* pills: eight right, two wrong */
  await page.evaluate(() => { const g = window.__game, H = g.Hosp; window.__run(50); H.start('pills'); window.__run(2); }); await shotGame('pills');
  const pil = await page.evaluate(() => { const g = window.__game, H = g.Hosp, d0 = H.adm.disc; for (let k = 0; k < 10; k++) { const right = H.game.cur; H.hit(k < 8 ? right : (right + 1) % 3); window.__run(2); } return { res: H.adm.games.pills, d: +(H.adm.disc - d0).toFixed(2), bill: H.bill() }; });
  console.log(JSON.stringify(pil));
  ok(pil.res && /8\/10/.test(pil.res) && pil.d === 0.16, 'pills: 8 of 10 in the right cups (' + pil.res + ')');
  /* walk out: pay the reduced bill, car outside */
  const out = await page.evaluate(() => { const g = window.__game, H = g.Hosp; window.__run(50); const bill = H.bill(), m0 = g.save.money; const menu = document.getElementById('intPan').textContent; g.Int.leave(); window.__run(4);
    return { bill, paid: m0 - g.save.money, mode: g.App.mode, foot: g.Foot.on, toCar: Math.round(Math.hypot(g.Foot.x - g.car.x, g.Foot.z - g.car.z)), adm: !!H.adm, discharge: /Discharge/.test(menu) }; });
  console.log(JSON.stringify(out));
  ok(out.mode === 'play' && out.foot && !out.adm && out.paid === out.bill && out.bill < 250 && out.toCar < 14, 'walking out you pay ' + out.paid + ' (not 250) and your car is ' + out.toCar + ' m away');
  /* walking in any time: see a doctor */
  const visit = await page.evaluate(() => { const g = window.__game, I = g.Int, V = g.Vit, T = g.towns[6]; const S = g.Hosp.site(T.cx, T.cz), rec = g.Bld.lots.get(S.key), d = rec.door; V.hp = 40;
    g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); window.__run(3); g.key('KeyE', true); g.key('KeyE', false); window.__run(15); const inside = g.App.mode === 'int';
    const a = I.acts.find((q) => /See a doctor/.test(typeof q.label === 'function' ? q.label() : q.label)); const m0 = g.save.money; if (a) a.fn(); I.yaw = Math.PI; I.pitch = -0.1; window.__run(5); const pic = window.__pic(); const r = { inside, hp: V.hp, paid: m0 - g.save.money, pic }; I.leave(true); return r; });
  save('ward', visit.pic);
  ok(visit.inside && visit.hp === 100 && visit.paid === 90, 'walk in any time: see a doctor, health back to full for $90');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
