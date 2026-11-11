/* ================= RELATIONSHIPS =================
   Fourteen named locals (two per town) live their lives on the sidewalks. Each one has a fixed look, job, mood and a short life story.
   Being decent to them (chatting, listening, compliments, jokes, a coffee, a lift in your car) earns relationship points that are saved;
   the levels run Stranger -> Acquaintance -> Friendly -> Friend -> Close friend -> Best friend. They greet you by name and wave,
   open up about themselves, and from Friend upward each one does you a standing favour (cheaper garage, a better word in court...).
   Punching them or running them over costs you dearly, and a grudge means they will not speak to you until you make amends. */
const REL_LV = [{ n: 'Stranger', at: 0 }, { n: 'Acquaintance', at: 8 }, { n: 'Friendly', at: 24 }, { n: 'Friend', at: 50 }, { n: 'Close friend', at: 90 }, { n: 'Best friend', at: 150 }];
const REL_MAX = 220, REL_MIN = -40;
const PERK_UNIT = { garage: 0.06, shop: 0.06, reward: 0.04, witness: 0.08, tow: 0.3, tipoff: 0.1, cash: 30 };
const PERK_CAP = { garage: 0.4, shop: 0.4, reward: 0.25, witness: 0.5, tow: 1, tipoff: 0.45, cash: 999 };
const PERK_MUL = [0, 0, 0, 1, 1.6, 2.4];
const pcs = (v) => Math.round(v * 100) + '%';
const PERK_TXT = {
  garage: ["Mechanic's rates", (v) => 'Garage upgrades ' + pcs(v) + ' cheaper', "Tell the garage I sent you. I'll keep your prices honest."],
  shop: ['Friends & family', (v) => 'Customs shop ' + pcs(v) + ' cheaper', 'I can get you a discount at the Customs. Just say my name.'],
  reward: ['Inside tips', (v) => 'Mission payouts ' + pcs(v) + ' higher', "I hear who's paying well before anyone. I'll make sure you get the good end of it."],
  witness: ['Character witness', (v) => 'Court payouts ' + pcs(v) + ' lower', "If you're ever up before a judge, I'll stand up and say you're decent."],
  tow: ['Covers your tow', (v) => 'Tow fee ' + pcs(v) + ' off', "If your car dies, I'll sort the tow. Don't even argue."],
  tipoff: ['Police scanner', (v) => 'Police lose you ' + pcs(v) + ' faster', "I hear things on the radio. When the patrols get close, I'll make some noise."],
  cash: ['Care package', (v) => 'Sends you off with $' + Math.round(v) + ' every few minutes', 'Take this for the road. No, take it. I insist.']
};
const REL_ROSTER = [
  { id: 'mags', name: 'Mags Doyle', age: 58, job: 'ferry hand', mood: 'chatty', town: 0, perk: 'tipoff', treat: 'a hot tea',
    look: { fem: true, hst: 'bun', hair: 0xb8b8b4, skin: 0, shirt: 0x2e5a8a, pants: 0x23262d, shoe: 0x15151a, sleeve: true, coat: true, hat: { k: 'beanie', c: 0xd33a2a }, stout: 1.08, s: 0.92 },
    story: ["I've worked the ferry since I was nineteen. Never been seasick, not once. Don't tell the sea I said so.", "My husband proposed on the 6:40 crossing. He'd forgotten the ring, so he used a bit of rope. I still have it.", "Truth is, I hear the harbour radio all day. If the patrols get twitchy, I know before the gulls do.", "When he passed I nearly sold the house. Then someone honked at me for waving at the boats, and I thought: no. I live here."] },
  { id: 'teo', name: 'Teo Vance', age: 31, job: 'mechanic', mood: 'friendly', town: 0, perk: 'garage', treat: 'a strong coffee',
    look: { hst: 'short', hair: 0x1b1511, skin: 3, shirt: 0x3a4a63, pants: 0x3a4a63, shoe: 0x2a1d14, sleeve: true, beard: true, hat: { k: 'cap', c: 0xd33a2a, bc: 0xd33a2a }, stout: 1.06, s: 1.0 },
    story: ["I rebuild old engines in my garage after hours. The neighbours hate it, until their cars break.", "My dad ran the workshop before me. He said you can tell a driver's character by how they treat a clutch.", "I keep a few parts on the shelf for people I like. Not for sale. For people I like.", "Someday I want to build one car, start to finish, that's mine. Not a client's. Mine. I haven't told anyone that."] },
  { id: 'sol', name: 'Sol Ortega', age: 44, job: 'park ranger', mood: 'sporty', town: 1, perk: 'tipoff', treat: 'a trail sandwich',
    look: { fem: true, hst: 'pony', hair: 0x2e2018, skin: 2, shirt: 0x3d6b3a, pants: 0x5b5348, shoe: 0x2a1d14, sleeve: true, hat: { k: 'cowboy', c: 0x6a4a2c }, stout: 0.98, s: 0.95 },
    story: ["Fourteen years on the Redstone trails. I know every canyon by smell.", "I got lost out there once, a night and half a day. Best thing that ever happened to me. You find out who you are.", "I know the patrol schedules for three counties. A friend gets a heads-up. Everyone else gets a ticket.", "My daughter wants to move to the city. I'm proud and I'm terrified. Don't tell her about the terrified part."] },
  { id: 'hank', name: 'Hank Pruitt', age: 67, job: 'tour guide', mood: 'grumpy', town: 1, perk: 'tow', treat: 'a cold lemonade',
    look: { old: true, hst: 'bald', hair: 0xb8b8b4, skin: 1, shirt: 0xc9a574, pants: 0x7a6a50, shoe: 0x2a1d14, sleeve: false, beard: true, glasses: true, sun: true, hat: { k: 'straw', c: 0xd9c27a }, stout: 1.1, s: 0.96 },
    story: ["Thirty years leading tours around Redstone. Same jokes. Folks still laugh. Tourists are very kind.", "I used to race stock cars, you know. Slid into a cactus once. That cactus is on every postcard.", "I own a flatbed and a good winch. Friends get towed free. Everyone else, a modest and entirely fair fee.", "I act grumpy so nobody notices I'm lonely. You noticed, didn't you? ...Sneaky."] },
  { id: 'dot', name: 'Dot Alder', age: 72, job: 'baker', mood: 'friendly', town: 2, perk: 'cash', treat: 'a slice of lemon cake',
    look: { fem: true, old: true, hst: 'bun', hair: 0xd0d0cc, skin: 0, shirt: 0xece9e0, pants: 0x7a6a50, shoe: 0x3a3f4a, skirt: 1, tights: true, glasses: true, stout: 1.04, s: 0.9 },
    story: ["Up at four, ovens by five. Lemon cake on Fridays, and I'll hear no arguments.", "I've been baking in this kitchen since 1974. Half the town learned to walk holding that counter.", "I don't need much. If you're ever hungry you're family. I mean it. Don't look at me like that.", "My late sister sang while she kneaded. I hum her songs now. The bread comes out better. I think she helps."] },
  { id: 'wes', name: 'Wes Calloway', age: 35, job: 'electrician', mood: 'busy', town: 2, perk: 'garage', treat: 'a black coffee',
    look: { hst: 'short', hair: 0x4a3524, skin: 1, shirt: 0xf08a1c, pants: 0x4a5058, shoe: 0x2a1d14, sleeve: true, hat: { k: 'hard', c: 0xf2f2f2 }, stout: 1.0, s: 1.0 },
    story: ["Half the lights in this valley are on my rounds. Don't ask me why one of them flickers. It's haunted.", "I wanted to be a pilot. Colour-blind, turns out. So now I keep the lights on instead. Still feels like flying sometimes.", "I know a guy for every part. If your car needs work, say I sent you.", "Real talk? I get tired. Nobody ever says thank you. So... thanks for asking."] },
  { id: 'kai', name: 'Kai Nakamura', age: 26, job: 'surfer', mood: 'sporty', town: 3, perk: 'shop', treat: 'a mango smoothie',
    look: { hst: 'long', hair: 0xb08a4a, skin: 2, shirt: 0x2fc4c0, pants: 0xf0e6d0, shoe: 0xe6e6e6, shorts: true, glasses: true, sun: true, stout: 0.96, s: 1.03 },
    story: ["Dawn patrol every day. The ocean's cleanest right before everyone else wakes up.", "I came here for one summer. Seven years ago. No regrets, only sunburn.", "A surf brand sponsors me with free kit. I can get you in on the discount if you're ever at the Customs.", "I used to think I had to be the best in the water. Turns out being happy in it is plenty."] },
  { id: 'luz', name: 'Luz Fernandez', age: 39, job: 'florist', mood: 'dreamy', town: 3, perk: 'cash', treat: 'an iced tea',
    look: { fem: true, hst: 'long', hair: 0x0d0d0d, skin: 3, shirt: 0xd96b8c, pants: 0xd96b8c, shoe: 0xe6e6e6, skirt: 2, hat: { k: 'straw', c: 0xe8d49a }, stout: 0.96, s: 0.93 },
    story: ["I talk to the flowers. They don't listen, but they never interrupt either.", "My grandmother grew marigolds along the road. That's why I do this. Every petal is a little hello.", "I do flowers for the whole waterfront. People I love never leave empty-handed.", "I dreamt I was a lighthouse last night. You were the ship. It was a nice dream."] },
  { id: 'ingrid', name: 'Ingrid Holm', age: 49, job: 'nurse', mood: 'busy', town: 4, perk: 'witness', treat: 'a hot chocolate',
    look: { fem: true, hst: 'bun', hair: 0xb08a4a, skin: 0, shirt: 0x5aa6a6, pants: 0x5aa6a6, shoe: 0xe6e6e6, sleeve: false, stout: 1.0, s: 0.96 },
    story: ["Twelve-hour shifts on the ward. Coffee is a food group.", "I came north to escape the heat and landed in the mountains. The universe has a sense of humour.", "I've seen the paperwork when people get hurt. If you ever end up before a judge, I'll speak up for your character.", "Most people forget the nurse once they're better. You came back. That means more than you think."] },
  { id: 'bear', name: 'Bear Lindqvist', age: 53, job: 'chef', mood: 'friendly', town: 4, perk: 'reward', treat: 'a warm pastry',
    look: { hst: 'buzz', hair: 0x9a9a98, skin: 0, shirt: 0xece9e0, pants: 0x2b2f36, shoe: 0x15151a, sleeve: true, beard: true, hat: { k: 'top', c: 0xf2f2f2 }, stout: 1.18, s: 1.0 },
    story: ["I cook for forty guests every evening and still burn the toast at home.", "Born in the mountains, trained in the city, escaped back up here. Never regretted it once.", "Delivery drivers tell me everything. Which jobs pay, which races are on. I pass it on to the people I trust.", "My restaurant is half empty on weeknights. I keep a table for the ones who matter. It's yours whenever."] },
  { id: 'june', name: 'June Park', age: 22, job: 'barista', mood: 'shy', town: 5, perk: 'shop', treat: 'a lemonade',
    look: { fem: true, hst: 'bun', hair: 0x0d0d0d, skin: 1, shirt: 0xa9a9a0, pants: 0x1d3557, shoe: 0x3a3f4a, glasses: true, bag: true, bagc: 0x7a1f2b, stout: 0.92, s: 0.9 },
    story: ["Um. I make coffee. A lot of coffee. Sorry, that's all I have.", "I paint, a little. Tiny landscapes of the lake. Nobody's seen them. Um. Don't tell anyone.", "The shop next door gives me a staff discount at the Customs. I can... share it. If you want.", "I'm not shy around you any more. That's weird, right? You're easy to talk to. Thank you."] },
  { id: 'milo', name: 'Milo Reyes', age: 28, job: 'dog walker', mood: 'friendly', town: 5, perk: 'reward', treat: 'an ice cream',
    look: { hst: 'curly', hair: 0x2e2018, skin: 3, shirt: 0xe07a2f, pants: 0x55565b, shoe: 0xe6e6e6, shorts: true, hat: { k: 'cap', c: 0x3d8b5b, bc: 0x3d8b5b }, stout: 0.98, s: 1.0 },
    story: ["Dog walking sounds easy. Eleven dogs. All with opinions.", "I sit by the lake after my walks. You hear everything: who's driving where, who's hiding from whom.", "I know which runs are paying before the board does. I'll send the good ones your way.", "My dogs like you. That's the highest compliment I give. They don't lie."] },
  { id: 'vera', name: 'Vera Castellanos', age: 41, job: 'accountant', mood: 'busy', town: 6, perk: 'witness', treat: 'a double espresso',
    look: { fem: true, hst: 'long', hair: 0x1b1511, skin: 2, shirt: 0x1f2430, pants: 0x1f2430, shoe: 0x15151a, sleeve: true, skirt: 1, tights: true, glasses: true, bag: true, bagc: 0x2b2f36, stout: 0.94, s: 0.96 },
    story: ["Numbers don't lie, but they do get shy around the unprepared.", "I audit for the courts, mostly. I know the clerks by name. They know me by my shoes.", "If you ever need a character witness, I'll vouch for you. Facts are facts, and you've been decent.", "I've never told a client this: I like people better than spreadsheets. Please don't tell the firm."] },
  { id: 'dante', name: 'Dante Okafor', age: 29, job: 'courier', mood: 'chatty', town: 6, perk: 'reward', treat: 'an energy drink',
    look: { hst: 'buzz', hair: 0x0d0d0d, skin: 5, shirt: 0xf0a21c, pants: 0x23262d, shoe: 0xe6e6e6, sleeve: false, bag: true, bagc: 0x2b2f36, hat: { k: 'cap', c: 0x2b2f36, bc: 0x2b2f36 }, stout: 1.0, s: 1.03 },
    story: ["I deliver parcels all over the island. I know every shortcut, every pothole, every angry dog.", "Fastest delivery I ever did: eleven minutes across three towns. I've never told my manager.", "I hear about the big runs first. When something pays, I'll pass it your way.", "I wanted to race professionally once. Then I found out how much it costs. Then I found a van. It's a good van."] }
];
const Rel = { by: {}, live: {}, seen: {}, els: [], t: 0, ensureT: 3, lastMake: 0, now: () => Date.now() / 1000 };
for (const R of REL_ROSTER) Rel.by[R.id] = R;
const _rlv = new THREE.Vector3();

/* ---------- records, levels ---------- */
Rel.rec = (id) => save.rel[id] || (save.rel[id] = { pts: 0, met: 0, ch: 0, cd: {}, waved: 0, gift: 0, grudge: 0, last: 0, g4: 0, g5: 0 });
Rel.lv = function (pts) { if (pts <= -25) return -2; if (pts < 0) return -1; let k = 0; for (let i = 1; i < REL_LV.length; i++) if (pts >= REL_LV[i].at) k = i; return k; };
Rel.lvOf = (id) => { const r = save.rel[id]; return r ? Rel.lv(r.pts) : 0; };
Rel.knows = (id) => { const r = save.rel[id]; return !!r && r.pts >= REL_LV[1].at; };
Rel.lvName = (lv) => (lv === -2 ? 'Hostile' : lv === -1 ? 'Wary' : REL_LV[lv].n);
Rel.prog = function (pts) { const lv = Rel.lv(pts); if (lv < 0) return 0; if (lv >= 5) return 1; return (pts - REL_LV[lv].at) / (REL_LV[lv + 1].at - REL_LV[lv].at); };
Rel.hearts = (lv) => '<span class="hf">' + '♥'.repeat(Math.max(0, lv)) + '</span><span class="he">' + '♥'.repeat(5 - Math.max(0, lv)) + '</span>';
Rel.first = (R) => R.name.split(' ')[0];
Rel.grudge = (id) => { const r = save.rel[id]; return r ? Math.max(0, r.grudge - Rel.now()) : 0; };
Rel.app = function (R) {
  if (R._app) return R._app;
  const L = R.look, h = (v) => lc(v);
  return (R._app = { s: L.s || 1, hs: 1, skin: PSKIN[L.skin], hair: h(L.hair), shirt: h(L.shirt), pants: h(L.pants), shoe: h(L.shoe == null ? 0x15151a : L.shoe), sleeve: !!L.sleeve, bag: !!L.bag, bagc: h(L.bagc || 0x2b2f36), kid: false, stout: L.stout || 1,
    fem: !!L.fem, hst: L.hst, beard: !!L.beard, old: !!L.old, skirt: L.skirt || 0, tights: !!L.tights, coat: !!L.coat, shorts: !!L.shorts, glasses: !!L.glasses, glassC: null, sun: !!L.sun,
    hat: L.hat ? { k: L.hat.k, c: h(L.hat.c), bc: L.hat.bc ? h(L.hat.bc) : null } : null });
};
Rel.persona = (R) => R._pers || (R._pers = { name: R.name, age: R.age, job: R.job, mood: R.mood, rapport: 0, noLift: 0, met: 0, reg: R.id });

/* ---------- perks ---------- */
Rel.perkOf = function (R) { const r = save.rel[R.id], lv = r ? Rel.lv(r.pts) : 0; return lv >= 3 ? PERK_UNIT[R.perk] * PERK_MUL[lv] : 0; };
Rel.perk = function (kind) { let t = 0; for (const R of REL_ROSTER) if (R.perk === kind) t += Rel.perkOf(R); return Math.min(PERK_CAP[kind], t); };
Rel.perkLine = (R, v) => PERK_TXT[R.perk][0] + ' · ' + PERK_TXT[R.perk][1](v || PERK_UNIT[R.perk] * PERK_MUL[3]);

/* ---------- gaining / losing ---------- */
Rel.add = function (id, n, why, o) {
  const R = Rel.by[id]; if (!R || !n) return; o = o || {}; const rec = Rel.rec(id), l0 = Rel.lv(rec.pts);
  rec.pts = clamp(rec.pts + n, REL_MIN, REL_MAX); const l1 = Rel.lv(rec.pts); writeSave();
  if (!o.quiet) UI.toast((n > 0 ? '♥ +' + n : '✕ ' + n) + ' · ' + Rel.first(R) + (why ? ' · ' + why : ''), n > 0 ? 'good' : 'bad');
  if (n > 0 && !o.quiet) Snd.beep(1000 + Math.max(0, l1) * 70, 0.08);
  if (l1 > l0 && l1 > 0) Rel.levelUp(R, l1);
  Rel.paintTalk(n);
};
Rel.hurt = function (id, n, why, grudge) {
  const R = Rel.by[id]; if (!R) return; const rec = Rel.rec(id);
  if (grudge) rec.grudge = Math.max(rec.grudge, Rel.now() + grudge);
  Rel.add(id, -Math.abs(n), why);
};
Rel.levelUp = function (R, lv) {
  const rec = Rel.rec(R.id);
  UI.banner('FRIENDSHIP', R.name + ' · ' + REL_LV[lv].n);
  if (lv === 3) setTimeout(() => UI.toast('Perk unlocked · ' + Rel.perkLine(R, Rel.perkOf(R)), 'good'), 900);
  if (lv === 4 && !rec.g4) { rec.g4 = 1; save.money += 150; setTimeout(() => UI.toast(Rel.first(R) + ' slips you an envelope · ' + money(150), 'good'), 1500); }
  if (lv === 5 && !rec.g5) { rec.g5 = 1; save.money += 400; setTimeout(() => UI.toast(Rel.first(R) + ' presses an envelope into your hand · ' + money(400), 'good'), 1500); }
  writeSave();
};
/* the panel under the name while talking */
Rel.paintTalk = function (gain) {
  const el = E.tkRel; if (!el) return;
  if (!Talk.on || !Talk.p || !Talk.p.reg) { el.hidden = true; return; }
  const R = Talk.p.reg, rec = Rel.rec(R.id), lv = Rel.lv(rec.pts), nxt = lv >= 0 && lv < 5 ? REL_LV[lv + 1] : null;
  const gs = Rel.grudge(R.id) > 0 ? ' · holding a grudge' : '';
  el.hidden = false;
  el.innerHTML = '<span class="rl-h">' + Rel.hearts(lv) + '</span><span class="rl-n">' + Rel.lvName(lv) + gs + '</span><i class="rl-b"><b class="' + (lv < 0 ? 'neg' : '') + '" style="width:' + Math.round((lv < 0 ? Math.min(1, -rec.pts / 25) : Rel.prog(rec.pts)) * 100) + '%"></b></i><span class="rl-p">' + (lv < 0 ? 'make amends' : nxt ? (nxt.at - rec.pts) + ' to ' + nxt.n : 'max') + '</span>' +
    (gain ? '<span class="rl-g' + (gain < 0 ? ' neg' : '') + '">' + (gain > 0 ? '+' : '') + gain + '</span>' : '');
};

/* ---------- who is on the street ---------- */
Rel.make = function (p, R) {
  Rel.live[R.id] = p; p.reg = R; p.app = Rel.app(R); p.runner = false; p.pw = false; p.vt = (R.look.old ? 0.95 : 1.2) + Math.random() * 0.25; p.pers = Rel.persona(R); p.gz = p.gp = 0;
  if (p.state === 'stand') p.phone = false; Rel.lastMake = App.time;
};
Rel.adopt = function (p) {
  if (!p.T || p.app.kid) return; const ti = towns.indexOf(p.T); if (ti < 0) return;
  for (const R of REL_ROSTER) { if (R.town !== ti || Rel.live[R.id]) continue; if (Math.random() > 0.1) continue; Rel.make(p, R); return; }
};
Rel.release = function (p) { if (p.reg && Rel.live[p.reg.id] === p) delete Rel.live[p.reg.id]; };
/* make sure the locals of the town you are in are actually out and about (a nearby walker out of sight turns into them) */
Rel.ensure = function () {
  if (!Peds.ready || App.time - Rel.lastMake < 6) return;
  const f = pedFocus(); let T = null, ti = -1;
  for (let i = 0; i < towns.length; i++) { const t = towns[i], d = Math.max(Math.abs(f.x - t.cx), Math.abs(f.z - t.cz)); if (d < t.half + 40) { T = t; ti = i; break; } }
  if (!T) return;
  for (const R of REL_ROSTER) {
    if (R.town !== ti || Rel.live[R.id]) continue;
    let best = null, bd = 1e9;
    for (const p of Peds.list) {
      if (p.reg || p.keep || p.own || p.cop || p.app.kid || p.T !== T || (p.state !== 'walk' && p.state !== 'stand')) continue;
      const d = Math.hypot(p.x - f.x, p.z - f.z); if (d < 22 || d > 115 || d > bd || pedInView(p.x, p.z)) continue; best = p; bd = d;
    }
    if (best) { Rel.make(best, R); return; }
  }
};

/* ---------- per frame: greetings, presence, name tags ---------- */
Rel.tick = function (dt) {
  if (!Peds.ready) return;
  Rel.t += dt; const now = Rel.now();
  for (const id in Rel.live) {
    const p = Rel.live[id], R = p.reg; if (!R) { delete Rel.live[id]; continue; }
    Rel.seen[id] = { x: p.x, z: p.z };
    const rec = save.rel[id];
    if (rec && rec.pts >= REL_LV[1].at && rec.grudge < now && (p.state === 'walk' || p.state === 'stand' || p.state === 'wait') && !p.own && !Talk.on && App.mode === 'play') {
      const d = Math.hypot(p.x - Pl.x, p.z - Pl.z);
      if (d < 15 && d > 2.5 && now - rec.waved > 210) {
        rec.waved = now; p.wave = 1.9;
        if (rec.pts < REL_LV[3].at) { Rel.add(id, 1, 'said hello', { quiet: true }); }
        UI.toast(Rel.first(R) + ' waves at you', 'good');
      }
    }
  }
  Rel.ensureT -= dt; if (Rel.ensureT <= 0) { Rel.ensureT = 2.5; Rel.ensure(); }
  Rel.tags();
};
Rel.tags = function () {
  const host = E.relTags; if (!host) return;
  const show = App.mode === 'play' && !Talk.on && Foot.on && Foot.state === 'walk' && !Bust.on && !Mi, items = [];
  if (show) for (const id in Rel.live) { const p = Rel.live[id]; if (p.state === 'gone' || p.state === 'down' || p.cop) continue; const d = Math.hypot(p.x - Foot.x, p.z - Foot.z); if (d < 26) items.push({ p, d }); }
  items.sort((a, b) => a.d - b.d);
  while (Rel.els.length < 3) { const el = document.createElement('div'); el.className = 'rtag'; host.appendChild(el); Rel.els.push(el); }
  for (let i = 0; i < 3; i++) {
    const el = Rel.els[i], it = items[i]; if (!it) { if (el._v) { el.style.display = 'none'; el._v = 0; } continue; }
    _rlv.set(it.p.x, it.p.y + 2.0 * it.p.app.s, it.p.z).project(camera);
    if (_rlv.z > 1 || Math.abs(_rlv.x) > 1.05 || Math.abs(_rlv.y) > 1.05) { if (el._v) { el.style.display = 'none'; el._v = 0; } continue; }
    const R = it.p.reg, rec = save.rel[R.id], met = rec && rec.met > 0, lv = rec ? Rel.lv(rec.pts) : 0;
    const html = met ? '<b>' + esc(Rel.first(R)) + '</b><i>' + Rel.hearts(lv) + '</i>' : '<b class="new">!</b>';
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    if (!el._v) { el.style.display = ''; el._v = 1; }
    el.style.opacity = it.d > 18 ? String(clamp((26 - it.d) / 8, 0, 1)) : '1';
    el.style.transform = 'translate(' + Math.round((_rlv.x * 0.5 + 0.5) * innerWidth) + 'px,' + Math.round((-_rlv.y * 0.5 + 0.5) * innerHeight) + 'px) translate(-50%,-100%)';
  }
};

/* ---------- the People tab ---------- */
Rel.pane = function () {
  let known = 0, met = 0; for (const R of REL_ROSTER) { const r = save.rel[R.id]; if (r && r.met) met++; if (r && r.pts >= REL_LV[1].at) known++; }
  let h = '<div class="sect">' + met + ' of ' + REL_ROSTER.length + ' locals met · ' + known + ' know you by name<span class="hint">Chat, listen, pay a compliment, buy a coffee or give a lift. Friends do you favours.</span></div><div class="ppl">';
  for (const R of REL_ROSTER) {
    const rec = save.rel[R.id] || { pts: 0, met: 0 }, lv = Rel.lv(rec.pts), seen = rec.met > 0, T = towns[R.town], sk = '#' + PSKIN[R.look.skin].clone().convertLinearToSRGB().getHexString();
    const unlocked = lv >= 3, pv = unlocked ? Rel.perkOf(R) : PERK_UNIT[R.perk] * PERK_MUL[3], nxt = lv >= 0 && lv < 5 ? REL_LV[lv + 1] : null;
    h += '<div class="pcard cham' + (seen ? '' : ' unseen') + '"><div class="pav" style="--sk:' + sk + '">' + (seen ? esc(R.name.split(' ').map((w) => w[0]).join('')) : '?') + '</div><div class="pinf"><h4>' + (seen ? esc(R.name) : 'Someone in ' + esc(T.name)) + '</h4><div class="pjob">' + (seen ? esc(R.age + ' · ' + R.job + ' · ') : '') + esc(T.name) + '</div>' +
      '<div class="prel"><span class="rl-h">' + Rel.hearts(lv) + '</span><span class="rl-n">' + (seen ? Rel.lvName(lv) : 'Not met yet') + '</span></div><i class="rl-b"><b class="' + (lv < 0 ? 'neg' : '') + '" style="width:' + Math.round((lv < 0 ? Math.min(1, -rec.pts / 25) : Rel.prog(rec.pts)) * 100) + '%"></b></i>' +
      '<div class="pperk' + (unlocked ? ' on' : '') + '">' + (unlocked ? '★ ' + esc(Rel.perkLine(R, pv)) : '🔒 At Friend: ' + esc(Rel.perkLine(R, pv))) + '</div>' +
      (nxt && seen ? '<div class="pnext">' + (nxt.at - rec.pts) + ' more for ' + nxt.n + '</div>' : '') + '</div><button class="btn sm" type="button" data-act="rtrack" data-id="' + R.id + '">Track</button></div>';
  }
  return h + '</div>';
};
Rel.track = function (id) {
  const R = Rel.by[id], s = Rel.seen[id], T = towns[R.town]; UI.closeMenu();
  UI.setWaypoint(s ? s.x : T.cx, s ? s.z : T.cz); UI.toast(s ? Rel.first(R) + ' was last seen here' : Rel.first(R) + ' is usually around ' + T.name, 'info');
};
Rel.reset = function () { save.rel = {}; };
/* dev: friendship cheats */
Rel.devMax = function () { for (const R of REL_ROSTER) { const r = Rel.rec(R.id); r.pts = 160; r.met = Math.max(r.met, 1); r.ch = 0; r.grudge = 0; } writeSave(); };
