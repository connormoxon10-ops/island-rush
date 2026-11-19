/* ================= THE PHONE =================
   A phone icon at the top left (or O) opens your phone. The game keeps running while it is open; Esc or O puts it away. Apps:
     Contacts  call people. In Story Mode: the people you have met (Mara, Rico, Nina, Sal, Jax, Hal, Dex). What they say depends on where the
               story is and how they feel about you, and a friendly call now and then brings you a little closer. In free roam: a mechanic (fixes
               your car where it stands), roadside assist (puts you back on the nearest road) and a taxi home.
     Messages  everything said on the phone and the radio.       Quests  the story's quest log (Story Mode).
     Map, Garage (the pause menu's), Bank (your money and reputation), Camera (saves a picture of the screen), Music (on / off). */
const Phone = { open: false, app: 'home', el: null, btn: null, call: null, called: {} };
const PHONE_APPS = [['contacts', '📇', 'Contacts'], ['messages', '💬', 'Messages'], ['quests', '📖', 'Quests'], ['map', '🗺️', 'Map'], ['garage', '🚗', 'Garage'], ['bank', '🏦', 'Bank'], ['camera', '📷', 'Camera'], ['music', '🎵', 'Music']];
/* ---------- calls ---------- */
/* what someone says when you call them: the story so far and how they feel about you */
Phone.lines = function (id) {
  const S = Story.S(), f = Story.F(), v = f[id] | 0, ch = S.ch, nm = STORY_CAST[id].name.split(' ')[0] + ' (phone)', L = [];
  const st = Story.step(), what = st && st.obj ? st.obj.charAt(0).toLowerCase() + st.obj.slice(1) : '';
  if (id === 'mara') {
    L.push(v >= 4 && f.maraLove ? 'Hey, you. I was just thinking about you. What’s up?' : v >= 2 ? 'Hey! Everything okay? You never call just to chat.' : v < 0 ? 'What do you want? I’m elbow-deep in a gearbox.' : 'Mara’s garage. Oh, it’s you.');
    if (S.fin) L.push('Garage is busy. Come by later, I saved you the good coffee.');
    else if (ch <= 2) L.push('Don’t forget: ' + what + '. And drive like I’m in the passenger seat.');
    else if (ch <= 5) L.push(f.lie ? 'I’m not asking where you were last night. I’m just not.' : 'Be careful with Dex. I mean it.');
    else L.push('Whatever you’re doing tonight… come home after, okay?');
  } else if (id === 'rico') {
    L.push(f.ricoS === 'shamed' ? 'You’ve got some nerve calling me.' : f.ricoS === 'ally' || f.ricoS === 'even' ? 'Ferry kid! What’s up? Need a wingman?' : 'Who is this? …Oh. You.');
    L.push(f.ricoS === 'ally' || f.ricoS === 'even' ? 'If Dex gives you any trouble, you call me. I know every back road on this island.' : 'Next time it’s my road. Count on it.');
  } else if (id === 'nina') { L.push(v >= 2 ? 'Hi. It’s nice to hear from you when it isn’t about work.' : 'This isn’t a good time. I’m at the counter.'); L.push(f.ninaF && v >= 3 ? 'Mum keeps asking about “the fast one”. I keep changing the subject. Badly.' : 'Look after yourself.'); }
  else if (id === 'sal') { L.push('Sal here. My grandson set this phone up. I hate it.'); L.push(f.salT ? 'I still think about that sunset you told me about. Every evening.' : 'The last train runs at night, if you’re wondering. Mind the timing.'); }
  else if (id === 'jax') L.push(f.jaxA ? 'Not on this line. …Thanks, for before. Watch Dex.' : '…');
  else if (id === 'hal') L.push('Brody Haulage. Oh, the fast one! Gearbox purrs like a kitten. Tell Mara.');
  else if (id === 'dex') L.push(S.fin ? 'The number you have called is not in service.' : 'Busy. I’ll call you.');
  return L.map((t) => [nm, t]);
};
Phone.dial = function (id) {
  if (Phone.call) return; Phone.call = { id, t: 0 }; Phone.render(); Snd.beep(880, 0.05);
  setTimeout(() => {
    Phone.call = null; if (!Story.on || !STORY_CAST[id]) return; Story.say(Phone.lines(id));
    /* a friendly call brings you a little closer, once a chapter */
    const S = Story.S(), k = id + ':' + S.ch, f = Story.F(); if (!Phone.called[k] && (f[id] | 0) >= 0 && id !== 'dex' && id !== 'jax' && !(id === 'rico' && f.ricoS === 'shamed')) { Phone.called[k] = 1; S.calls = S.calls || {}; if (!S.calls[k]) { S.calls[k] = 1; Story.applyEff({ [id]: 1 }); } }
    Phone.render();
  }, 1400);
};
/* free roam services */
Phone.service = function (k) {
  const c = car;
  if (k === 'mech') { const cost = Math.ceil((100 - c.health) * 6); if (c.health >= 99.5) { UI.toast('Mechanic: your car is fine', 'info'); return; } if (save.money < cost) { UI.toast('Mechanic: that will be ' + money(cost) + '. You are short.', 'bad'); return; } save.money -= cost; c.health = 100; writeSave(); UI.toast('Mechanic: patched up · −' + money(cost), 'good'); Snd.beep(700, 0.1); }
  else if (k === 'road') { if (Mi || Foot.on || Fly.on || Boat.on) { UI.toast('Roadside assist: not right now', 'bad'); return; } if (save.money < 150) { UI.toast('Roadside assist: $150, please', 'bad'); return; } save.money -= 150; findNearestRoadPoint(c.x, c.z, _stNp); spawnAt(_stNp.x, _stNp.z, Math.atan2(_stNp.tx, _stNp.tz)); writeSave(); UI.toast('Back on the road · −$150', 'good'); }
  else if (k === 'taxi') { if (Mi) { UI.toast('Finish your run first', 'bad'); return; } if (save.money < 60) { UI.toast('Taxi: $60, please', 'bad'); return; } save.money -= 60; writeSave(); Phone.toggle(false); Home.warp(); }
};
/* ---------- the screen ---------- */
Phone.toggle = function (on) {
  Phone.open = on == null ? !Phone.open : !!on; if (Phone.open) { Phone.app = 'home'; Phone.render(); Snd.beep(1200, 0.03); }
  Phone.el.hidden = !Phone.open;
};
Phone.go = function (app) {
  if (app === 'map' || app === 'garage') { Phone.toggle(false); UI.openMenu(app); return; }
  if (app === 'quests' && !Story.on) { UI.toast('The quest log is for Story Mode', 'info'); return; }
  if (app === 'camera') { try { const u = renderer.domElement.toDataURL('image/jpeg', 0.92), a = document.createElement('a'); a.href = u; a.download = 'island-rush-' + Date.now() + '.jpg'; a.click(); } catch (e) { /* ignore */ } Phone.flash = 1; Snd.beep(1500, 0.04); UI.toast('Photo saved', 'good'); return; }
  if (app === 'music') { save.set.music = !save.set.music; if (App.onSetting) App.onSetting('music'); writeSave(); UI.toast('Music ' + (save.set.music ? 'on' : 'off'), 'info'); Phone.render(); return; }
  Phone.app = app; Phone.render();
};
Phone.render = function () {
  if (!Phone.el || !Phone.open) return; const scr = Phone.el.querySelector('.scr'), a = Phone.app; let h = '';
  const top = (t) => '<div class="ph-top"><button type="button" data-ph="home">‹</button><b>' + t + '</b><span></span></div>';
  if (Phone.call) h = '<div class="ph-call"><div class="ph-av">' + (STORY_CAST[Phone.call.id] ? STORY_CAST[Phone.call.id].name.charAt(0) : '?') + '</div><b>' + (STORY_CAST[Phone.call.id] ? STORY_CAST[Phone.call.id].name : '') + '</b><small>Calling…</small></div>';
  else if (a === 'home') h = '<div class="ph-clock">' + String(Math.floor(App.tod)).padStart(2, '0') + ':' + String(Math.floor((App.tod % 1) * 60)).padStart(2, '0') + '</div><div class="ph-sub">' + (Story.on ? 'Story mode' : 'Free roam') + ' · ' + money(save.money) + '</div><div class="ph-grid">' + PHONE_APPS.filter((p) => p[0] !== 'quests' || Story.on).map((p) => '<button type="button" data-ph="' + p[0] + '"><i>' + p[1] + '</i><small>' + (p[0] === 'music' ? 'Music ' + (save.set.music ? 'on' : 'off') : p[2]) + '</small></button>').join('') + '</div>';
  else if (a === 'contacts') {
    h = top('Contacts');
    if (Story.on) { const S = Story.S(), ids = ['mara', 'rico', 'nina', 'sal', 'jax', 'hal', 'dex'].filter((id) => S.met[id] || id === 'mara'); h += ids.map((id) => '<button type="button" class="ph-row" data-call="' + id + '"><span class="ph-av s">' + STORY_CAST[id].name.charAt(0) + '</span><span><b>' + STORY_CAST[id].name + '</b><small>' + Story.relLabel(id) + '</small></span><i>📞</i></button>').join(''); }
    h += [['mech', 'Mobile mechanic', 'Fixes your car where it stands'], ['road', 'Roadside assist', 'Back on the nearest road · $150'], ['taxi', 'Island Taxi', 'Home to your garage · $60']].map((s) => '<button type="button" class="ph-row" data-svc="' + s[0] + '"><span class="ph-av s">☎</span><span><b>' + s[1] + '</b><small>' + s[2] + '</small></span><i>📞</i></button>').join('');
  } else if (a === 'messages') { const L = Story.comm.log.slice(-30).reverse(); h = top('Messages') + (L.length ? L.map((m) => '<div class="ph-msg"><b>' + (STORY_CAST[m.who] ? STORY_CAST[m.who].name : m.who || '—') + '</b>' + m.text + '</div>').join('') : '<p class="ph-empty">No messages yet.</p>'); }
  else if (a === 'quests') h = top('Quests') + '<div class="ph-log">' + Story.logHtml() + '</div>';
  else if (a === 'bank') h = top('Bank') + '<div class="ph-bank"><small>Balance</small><b>' + money(save.money) + '</b><small>Reputation ' + save.rep + '</small>' + (save.int && save.int.acct ? '<small>Savings ' + money(save.int.acct) + '</small>' : '') + '</div>';
  scr.innerHTML = h;
};
Phone.init = function () {
  if (Phone.el) return;
  const css = document.createElement('style');
  css.textContent = '#phBtn{position:fixed;left:max(16px,env(safe-area-inset-left,0px));top:16px;z-index:34;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(8,12,20,.78);font-size:22px;cursor:pointer;color:#fff}#phBtn:hover{background:rgba(30,40,60,.9)}' +
    '#phone{position:fixed;left:max(16px,env(safe-area-inset-left,0px));top:68px;z-index:36;width:min(290px,82vw);height:min(560px,calc(100vh - 90px));border-radius:30px;background:#0b0e14;border:3px solid #2a2f3a;box-shadow:0 18px 50px rgba(0,0,0,.6);padding:14px 10px;font-family:Rajdhani,system-ui,sans-serif;color:#fff}' +
    '#phone .scr{height:100%;overflow:auto;border-radius:20px;background:linear-gradient(160deg,#1b2a44,#0e1626 60%,#2a1a2a);padding:12px}#phone .ph-clock{font-size:52px;font-weight:600;text-align:center;margin-top:6px}#phone .ph-sub{text-align:center;color:#a8b6cc;font-size:13px;margin-bottom:16px}' +
    '#phone .ph-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}#phone .ph-grid button{background:none;border:0;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}#phone .ph-grid i{font-style:normal;font-size:26px;width:54px;height:54px;display:grid;place-items:center;border-radius:15px;background:rgba(255,255,255,.12)}#phone .ph-grid small{font-size:12px;color:#d8e0ee}' +
    '#phone .ph-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}#phone .ph-top button{background:none;border:0;color:#8fd0ff;font-size:26px;cursor:pointer;width:28px}#phone .ph-top b{font-size:18px}' +
    '#phone .ph-row{display:flex;align-items:center;gap:10px;width:100%;background:rgba(255,255,255,.06);border:0;border-radius:12px;padding:8px;margin-bottom:6px;color:#fff;cursor:pointer;text-align:left}#phone .ph-row span:nth-child(2){flex:1}#phone .ph-row b{display:block;font-size:15px}#phone .ph-row small{color:#a8b6cc}#phone .ph-row i{font-style:normal}' +
    '#phone .ph-av{width:64px;height:64px;border-radius:50%;background:#2f6f78;display:grid;place-items:center;font-size:28px;font-weight:700;margin:40px auto 10px}#phone .ph-av.s{width:34px;height:34px;font-size:15px;margin:0}#phone .ph-call{text-align:center}#phone .ph-call b{display:block;font-size:20px}#phone .ph-call small{color:#8fd0ff}' +
    '#phone .ph-msg{background:rgba(255,255,255,.07);border-radius:10px;padding:6px 9px;margin-bottom:6px;font-size:14px}#phone .ph-msg b{display:block;color:#8fd0ff;font-size:12px}#phone .ph-empty{color:#a8b6cc}#phone .ph-bank{text-align:center;margin-top:30px}#phone .ph-bank b{display:block;font-size:34px;margin:6px 0}#phone .ph-bank small{display:block;color:#a8b6cc}' +
    '#phone .ph-log .sect{color:#ffd34d;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:10px 0 4px}#phone .ph-log .row{display:flex;align-items:center;gap:8px;justify-content:space-between;background:rgba(255,255,255,.06);border-radius:10px;padding:6px 8px;margin-bottom:5px;font-size:14px}#phone .ph-log small{color:#a8b6cc}#phone .ph-log p{margin:4px 0;font-size:13px}';
  document.head.appendChild(css);
  const b = Phone.btn = document.createElement('button'); b.id = 'phBtn'; b.type = 'button'; b.title = 'Phone (O)'; b.textContent = '📱'; b.hidden = true; document.body.appendChild(b);
  b.addEventListener('click', () => Phone.toggle());
  const p = Phone.el = document.createElement('div'); p.id = 'phone'; p.hidden = true; p.innerHTML = '<div class="scr"></div>'; document.body.appendChild(p);
  p.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.ph) Phone.go(t.dataset.ph); else if (t.dataset.call) Phone.dial(t.dataset.call); else if (t.dataset.svc) Phone.service(t.dataset.svc);
    else if (t.dataset.act === 'sqt') { Story.trackSet(t.dataset.id); Phone.render(); }
  });
};
Phone.key = function (code) { if (code === 'KeyO') { Phone.toggle(); return true; } if (Phone.open && code === 'Escape') { Phone.toggle(false); return true; } return false; };
/* every frame: the button shows in play, and moves below the run panel when one is up */
Phone.tick = function () {
  if (!Phone.btn) return; const on = App.mode === 'play'; Phone.btn.hidden = !on; if (!on && Phone.open) Phone.toggle(false);
  const mp = document.getElementById('mp'), r = mp && !mp.hidden && mp.offsetParent ? mp.getBoundingClientRect() : null, top = r && r.left < 80 ? r.bottom + 8 : 16;
  Phone.btn.style.top = top + 'px'; Phone.el.style.top = (top + 52) + 'px';
  if (Phone.open && Phone.app === 'home' && ((Phone.rt = (Phone.rt || 0) + 1) % 60 === 0)) Phone.render();
};
