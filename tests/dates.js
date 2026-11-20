/* Story Mode: dates with Mara. With a story save part way through (chapter 4, Mara keen), plays all five dates in order: her call, picking her
   up at the garage (she sits beside you in the car and talks on the way), driving her there, and the date itself: dinner uptown (the plates come,
   the glasses go up), the boat ride (a skiff out of the marina, the two of you aboard), the beach (walking, then sitting), the casino, and
   stargazing at the cape in the car. Checks each one finishes and moves how she feels; pictures of every scene.   usage: node tests/dates.js ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-mode', 'story');
    localStorage.setItem('island-rush-story-v1', JSON.stringify({ money: 5000, set: { quality: 'low', traffic: 'off', cam: 2 }, story: { ch: 3, st: 0, f: { mara: 3, maraLove: 1 }, met: { mara: 1 }, sq: { pier: { st: 2, done: 1 }, scrap: { st: 5, done: 1 } } } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 400000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const save = (n, u) => { if (u) fs.writeFileSync(path.join(OUT, 'date_' + n + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    window.__pic = () => { const g2 = window.__game; g2.renderer.setRenderTarget(null); window.__run(1); return g2.renderer.domElement.toDataURL('image/jpeg', 0.82); };
    window.__entry = (id) => window.__game.Story.entries().find((e) => e.key === 'sq:' + id);
    /* skip whatever cutscene is up, and any line the comms box is reading */
    window.__skip = () => { const g2 = window.__game; for (let i = 0; i < 400 && (g2.Cut.on || g2.Story.comm.cur || g2.Story.comm.q.length); i++) { if (g2.Cut.on) g2.Cut.key('Escape'); if (g2.Story.comm.cur) g2.Story.comm.t = 1e3; window.__run(1); } };
    /* wait for the step of quest id to be of type t */
    window.__until = (id, t, n) => { for (let i = 0; i < (n || 2400); i++) { const e = window.__entry(id); if (!e || e.st.t === t) return !!e; if (window.__game.Story.comm.cur) window.__game.Story.comm.t = 1e3; window.__run(1); } return false; };
    window.__runFor = (s) => { while (window.__game.Cut.on) window.__game.Cut.key('Escape'); window.__run(Math.round(s * 30)); };
    for (let i = 0; i < 40; i++) { window.__run(1); } while (g.Cut.on) { g.Cut.key('Escape'); window.__run(2); } });
  const quests = await page.evaluate(() => window.__game.SIDE.filter((q) => /^m(dinner|boat|beach|ace|stars)$/.test(q.id)).map((q) => q.title));
  ok(quests.length === 5, 'five dates with Mara: ' + quests.join(', '));
  /* the pick-up: her call, then on foot to her at the garage, talk, and she gets in */
  const pickup = async (id) => page.evaluate((id) => {
    const g = window.__game, S = g.Story; if (!window.__until(id, 'talk')) return { err: 'no pickup step' };
    window.__run(2); const n = S.npcs['n:sq:' + id]; if (!n) return { err: 'no Mara at the garage' };
    g.loadAround(n.x, n.z, 6); g.spawnAt(n.x + 6, n.z + 6, 0); window.__run(3); g.key('KeyF', true); g.key('KeyF', false); window.__run(2); g.Foot.x = n.x + 1.6; g.Foot.z = n.z; window.__run(4);
    g.key('KeyE', true); g.key('KeyE', false); window.__run(3); const talked = g.Cut.on; window.__skip(); window.__run(2);
    g.Foot.board(true); window.__run(4); const D = g.Dates; return { talked, pass: S.S().pass, inCar: !!(D.h && D.h.root.parent === g.car.body), home: !!S.npcs['n:home'] };
  }, id);
  const drive = async (id, nm) => page.evaluate(([id, nm]) => {
    const g = window.__game, S = g.Story, e = window.__entry(id); if (!e || e.st.t !== 'goto') return { err: 'not driving' }; const P = S.place(e.st.at);
    /* a little way out, she chats; then arrive */
    g.loadAround(P.x + 120, P.z, 6); g.spawnAt(P.x + 120, P.z, 0); window.__run(2); g.Dates.chatT = 0; window.__run(3); const said = S.comm.cur ? S.comm.cur.who + ': ' + S.comm.cur.text : '';
    /* a picture of her beside you, from outside the passenger door */
    const c = g.car, T = g.THREE_, cam = new T.PerspectiveCamera(45, 16 / 9, 0.1, 500), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    cam.position.set(c.x + rx * 3.2 + Math.sin(c.yaw) * 1.2, c.y + 1.4, c.z + rz * 3.2 + Math.cos(c.yaw) * 1.2); cam.lookAt(c.x, c.y + 0.9, c.z); g.renderer.setRenderTarget(null); g.renderer.render(g.scene, cam); const pic = g.renderer.domElement.toDataURL('image/jpeg', 0.82);
    g.loadAround(P.x, P.z, 8); g.spawnAt(P.x, P.z, 0); window.__run(4); const e2 = window.__entry(id); return { said, pic, next: e2 ? e2.st.t : 'done', pass: S.S().pass };
  }, [id, nm]);
  /* a cutscene, line by line: the shots it uses, a picture at the ones we want, the first answer to any choice */
  const play = async (id, want) => page.evaluate(([id, want]) => {
    const g = window.__game, C = g.Cut, out = { shots: [], pics: {} };
    for (let i = 0; i < 300 && C.on; i++) {
      const L = C.lines[C.i]; if (!L) break; const shot = L[2] || ''; out.shots.push(shot);
      window.__run(18); if (want.includes(shot) && !out.pics[shot]) out.pics[shot] = window.__pic();
      if (C.choosing) C.choose(0); else { C.typed = 1e9; C.next(); } window.__run(1);
    }
    window.__run(4); const e = window.__entry(id); out.done = !e; out.scene = !!g.Dates.scene; return out;
  }, [id, want]);
  const inside = async (id) => page.evaluate((id) => {
    const g = window.__game, S = g.Story, I = g.Int, e = window.__entry(id); if (!e || !e.st.inside) return { err: 'no inside step' };
    const P = S.place(e.st.at), rec = g.Bld.lots.get(P.site.key) || (g.loadAround(P.site.x, P.site.z, 8), g.Bld.lots.get(P.site.key)); if (!rec) return { err: 'no building' };
    const d = rec.door; g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); window.__run(2); g.key('KeyF', true); g.key('KeyF', false); window.__run(2); g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); window.__run(3);
    g.key('KeyE', true); g.key('KeyE', false); window.__run(15); if (g.App.mode !== 'int') return { err: 'did not get in' };
    const a = I.acts.find((q) => /Sit down with/.test(typeof q.label === 'function' ? q.label() : q.label)); if (!a) return { err: 'no table' }; a.fn(); window.__run(3); return { on: g.Cut.on, fx: !!(S.inScene && S.inScene.fx) };
  }, id);
  const fm = async () => page.evaluate(() => window.__game.Story.F().mara | 0);
  /* ---- dinner uptown ---- */
  let m0 = await fm(); let p = await pickup('mdinner'); console.log(JSON.stringify(p));
  ok(p.talked && p.pass === 'mara' && p.inCar && !p.home, 'Dinner Uptown: the call, then Mara at the garage; she gets in beside you');
  let d = await drive('mdinner'); save('dinner_car', d.pic); console.log(JSON.stringify(Object.assign({}, d, { pic: undefined })));
  ok(/Mara/.test(d.said) && d.next === 'talk' && !d.pass, 'on the way she talks (“' + (d.said || '').slice(0, 60) + '…”); at the bistro she goes in ahead');
  let ins = await inside('mdinner'); console.log(JSON.stringify(ins));
  let pl = await play('mdinner', ['serve', 'toast', 'npc']); save('dinner_serve', pl.pics.serve); save('dinner_toast', pl.pics.toast); save('dinner_mara', pl.pics.npc);
  const plates = await page.evaluate(() => { const g = window.__game; if (g.App.mode === 'int') g.Int.leave(true); window.__run(3); return g.App.mode; });
  ok(ins.on && ins.fx && pl.shots.includes('serve') && pl.shots.includes('toast') && pl.done, 'inside at the table: the waiter brings the plates, a toast, and the date is done (' + plates + ')');
  /* ---- the boat ride ---- */
  p = await pickup('mboat'); ok(p.pass === 'mara' && p.inCar, 'The Boat Ride: picked up at the garage');
  d = await drive('mboat'); ok(d.next === 'cut', 'drove her to the marina');
  await page.evaluate(() => { for (let i = 0; i < 90 && !window.__game.Cut.on; i++) window.__run(1); });
  const boat = await page.evaluate(() => { const g = window.__game, D = g.Dates.scene; return { on: g.Cut.on, scene: !!D, people: D && D.P ? 2 : 0 }; });
  pl = await play('mboat', ['wide', 'npc', 'me', 'lean', 'two']); for (const k in pl.pics) save('boat_' + k, pl.pics[k]);
  console.log(JSON.stringify({ boat, shots: pl.shots.join(','), done: pl.done }));
  ok(boat.on && boat.scene && boat.people === 2 && pl.done && !pl.scene, 'out in the skiff at sunset, the two of you aboard; it finishes and tidies up');
  /* ---- the beach ---- */
  p = await pickup('mbeach'); d = await drive('mbeach'); await page.evaluate(() => { for (let i = 0; i < 90 && !window.__game.Cut.on; i++) window.__run(1); });
  const walk = await page.evaluate(() => { const g = window.__game, D = g.Dates.scene; if (!D) return null; const a0 = D.along; window.__run(45); return { moved: +(D.along - a0).toFixed(2) }; });
  pl = await play('mbeach', ['two', 'sit', 'npc']); for (const k in pl.pics) save('beach_' + k, pl.pics[k]);
  console.log(JSON.stringify({ walk, shots: pl.shots.join(','), done: pl.done }));
  ok(p.pass === 'mara' && d.next === 'cut' && walk && walk.moved > 1 && pl.shots.includes('sit') && pl.done, 'Sunset on the Sand: you walk along the beach (' + (walk && walk.moved) + ' m) and sit down to watch the sun go');
  /* ---- the casino ---- */
  p = await pickup('mace'); d = await drive('mace'); ins = await inside('mace'); pl = await play('mace', ['serve', 'toast']); for (const k in pl.pics) save('ace_' + k, pl.pics[k]);
  await page.evaluate(() => { const g = window.__game; if (g.App.mode === 'int') g.Int.leave(true); window.__run(3); });
  ok(p.pass === 'mara' && d.next === 'talk' && ins.on && pl.done, 'A Night at the Golden Ace: drinks at a table, done');
  /* ---- stargazing ---- */
  p = await pickup('mstars'); d = await drive('mstars');
  await page.evaluate(() => { for (let i = 0; i < 90 && !window.__game.Cut.on; i++) window.__run(1); });
  const star = await page.evaluate(() => { const g = window.__game; return { on: g.Cut.on, inCar: !!(g.Dates.h && g.Dates.h.root.visible) }; });
  pl = await play('mstars', ['mecar', 'wide']); for (const k in pl.pics) save('stars_' + k, pl.pics[k]);
  const after = await page.evaluate(() => ({ pass: window.__game.Story.S().pass, home: window.__game.Story.maraHome() }));
  console.log(JSON.stringify({ star, after }));
  ok(p.pass === 'mara' && star.on && star.inCar && pl.done && !after.pass, 'Stargazing at the Cape: in the car together at night; afterwards she goes home');
  const m1 = await fm(); ok(m1 > m0 + 3, 'all five together raise how Mara feels about you (' + m0 + ' → ' + m1 + ')');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
