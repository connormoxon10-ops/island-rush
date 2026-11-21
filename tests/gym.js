/* Gym workouts. Walks into a gym and plays every machine: bench press, curls, squats, the treadmill, the punch bag and the exercise bike.
   Each is a run of quick-time events (timing bar, mash, key prompts, alternate A/D) played well; you are seen doing the exercise (pictures),
   whoever was on the machine steps off, fitness goes up. Then a bench press with the stuck last rep failed (the spotter), and a wrong punch.
   usage: node tests/gym.js ; env OUT=dir */
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
  const save = (n, u) => { if (u) fs.writeFileSync(path.join(OUT, 'gym_' + n + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  const inside = await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    window.__pic = () => { const g2 = window.__game; g2.renderer.setRenderTarget(null); window.__run(1); return g2.renderer.domElement.toDataURL('image/jpeg', 0.82); };
    g.Bld.prep(); const S = g.Bld.sites.find((s) => s.kind === 'gym' && s.ti === 6) || g.Bld.sites.find((s) => s.kind === 'gym'); g.loadAround(S.x, S.z, 8); const rec = g.Bld.lots.get(S.key), d = rec.door;
    g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); window.__run(2); g.key('KeyF', true); g.key('KeyF', false); window.__run(2); g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); window.__run(3);
    g.key('KeyE', true); g.key('KeyE', false); window.__run(15); const labels = g.Int.acts.map((a) => (typeof a.label === 'function' ? a.label() : a.label)); return { name: rec.name, inside: g.App.mode === 'int', labels };
  });
  console.log(JSON.stringify(inside));
  ok(inside.inside && ['Bench press', 'Dumbbell curls', 'Squats', 'treadmill', 'punch bag', 'exercise bike'].every((w) => inside.labels.some((l) => l.includes(w))), 'in ' + inside.name + ': a workout on every machine');
  /* play a machine well: press in the green, mash to the end, the right key, A D A D */
  const play = async (label, wantPic) => page.evaluate(([label, wantPic]) => {
    const g = window.__game, I = g.Int, G0 = g.Gym, out = { pics: {}, kinds: [], hidden: false }; const a = I.acts.find((q) => (typeof q.label === 'function' ? q.label() : q.label).includes(label)); const f0 = g.save.int ? g.save.int.fit || 0 : 0; a.fn(); window.__run(2);
    let n = 0; while (G0.S && !G0.S.done && n++ < 6000) {
      const G = G0.S, e = G.ev; if (!e) { window.__run(1); continue; } if (!out.kinds.includes(e.k)) out.kinds.push(e.k); if (G.hide && G.hide.hu && !G.hide.hu.root.visible) out.hidden = true;
      if (e.k === 'time') { if (e.u > e.zone[0] + 0.02 && e.u < e.zone[1] - 0.02) { I.key('Space'); window.__run(8); if (wantPic && !out.pics.rep) out.pics.rep = window.__pic(); } else window.__run(1); }
      else if (e.k === 'mash') { I.key('Space'); window.__run(2); if (wantPic && e.n > e.need / 2 && !out.pics.mash) out.pics.mash = window.__pic(); }
      else if (e.k === 'key') { window.__run(3); I.key(e.key); window.__run(4); if (wantPic && !out.pics.key) out.pics.key = window.__pic(); }
      else if (e.k === 'alt') { I.key(e.last === 'KeyA' ? 'KeyD' : 'KeyA'); window.__run(1); if (wantPic && e.n > 8 && !out.pics.alt) out.pics.alt = window.__pic(); }
    }
    const G = G0.S; out.res = G && G.res; out.ok = G && G.ok; out.miss = G && G.miss; out.hud = document.getElementById('intHud').textContent.slice(0, 80); window.__run(80); out.after = !!G0.S; out.fit = +(((g.save.int || {}).fit || 0) - f0).toFixed(2); return out;
  }, [label, wantPic]);
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [label, key] of [['Bench press', 'bench'], ['Dumbbell curls', 'curls'], ['Squats', 'squat'], ['treadmill', 'treadmill'], ['punch bag', 'bag'], ['exercise bike', 'bike']]) {
    if (ONLY && !ONLY.includes(key)) continue;
    const r = await play(label, true); for (const k in r.pics) save(key + '_' + k, r.pics[k]);
    console.log(label, JSON.stringify(Object.assign({}, r, { pics: Object.keys(r.pics) })));
    ok(r.ok > 0 && r.miss === 0 && r.fit > 0 && !r.after && Object.keys(r.pics).length > 0, label + ': ' + r.kinds.join(' + ') + ' · ' + r.ok + ' good · fitness +' + r.fit + (r.hidden ? ' · the regular stepped off' : ''));
  }
  if (process.env.ONLY) { await browser.close(); process.exit(fails ? 1 : 0); }
  /* the bench with a failed last rep, and a wrong punch */
  const fail = await page.evaluate(() => {
    const g = window.__game, I = g.Int, Gm = g.Gym, out = {}; let a = I.acts.find((q) => /Bench press/.test(q.label)); a.fn(); window.__run(2); let n = 0;
    while (Gm.S && !Gm.S.done && n++ < 6000) { const e = Gm.S.ev; if (!e) { window.__run(1); continue; } if (e.k === 'time') { if (e.u > e.zone[0] + 0.02 && e.u < e.zone[1] - 0.02) { I.key('Space'); window.__run(2); } else window.__run(1); } else if (e.k === 'mash') { for (let k = 0; k < 4; k++) { I.key('Space'); window.__run(3); } window.__run(110); out.say = Gm.S.say; } }
    out.bench = { ok: Gm.S.ok, miss: Gm.S.miss }; window.__run(80);
    a = I.acts.find((q) => /punch bag/.test(q.label)); a.fn(); window.__run(2); n = 0; while (!(Gm.S.ev && Gm.S.ev.k === 'key') && n++ < 100) window.__run(1); const e = Gm.S.ev, wrong = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].find((k) => k !== e.key); I.key(wrong); out.wrong = { miss: Gm.S.miss, say: Gm.S.say };
    I.key('Escape'); window.__run(3); out.stopped = !Gm.S && !I.busy; return out; });
  console.log(JSON.stringify(fail));
  ok(fail.bench.miss === 1 && fail.bench.ok === 5 && /spotter/.test(fail.say || ''), 'the bench with the stuck rep not mashed up: the spotter takes it (5 good, 1 failed)');
  ok(fail.wrong.miss === 1 && fail.stopped, 'a wrong key on the bag is a miss; Esc stops the workout');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
