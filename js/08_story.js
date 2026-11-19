/* ================= STORY MODE =================
   A second game beside the sandbox, with its own save (01_core.js: PLAY_MODE). The main story runs as chapters of steps, and side quests run beside
   it; both use the same kinds of step:
     cut      a cutscene: letterbox bars, a camera that cuts between shots and drifts within them, people who gesture and talk, time-and-place cards,
              and choices (number keys or click) that are saved and change what happens later (Space / Enter / click for the next line, Esc skips)
     talk     find someone (a marker over them), get out of the car and press E: the conversation plays as a cutscene
     call     a phone call or radio chatter that plays in the comms box while you drive (no cutscene)
     run      one of the story's own runs: drive to its start and press E. Its intro plays first (for a street race, the two of you side by side on the
              line and your rival leaning out of the window talking trash); during the race the rival taunts you on the radio, hits the nitro, and
              sometimes the police join in. Fail and you can try again
     goto     get somewhere          mission  one of the island's runs (the Eruption Escape)
     bank     rob a bank             heist    take the Aurum off its train          clean   lose the police
   People remember: Mara, Rico, Sal, Nina and Jax each have a relationship that your choices and side quests move up or down (Mara's can become
   more than friendship), and it changes what they say, what they offer and how the story ends. The quest log (pause menu → Story, or the phone)
   lists the chapters, side quests and people. Steps can set the time of day, so when somebody says "tonight", it is night. */
const Story = { on: PLAY_MODE === 'story', cutAt: {}, npcs: {}, beams: {}, near: null, hudEl: null, t: 0, defs: {}, rivalH: null, prep: {}, ev: {}, comm: { q: [], cur: null, t: 0, el: null, log: [] }, barkT: 0 };
const STORY_CAST = {
  mara: { name: 'Mara Quinn', role: 'Mechanic · your oldest friend', o: () => ({ fem: true, skin: lc(0xc8906a), hair: lc(0x6a2a14), hst: 'pony', shirt: lc(0x2f6f78), pants: lc(0x2a3448), shoe: lc(0x2a2018), sleeve: false }) },
  dex: { name: 'Dex Calloway', role: 'Fixer', o: () => ({ skin: lc(0xe0b090), hair: lc(0x1a1410), hst: 'short', beard: true, suit: true, tie: lc(0x8a1a22), shirt: lc(0x22252c), pants: lc(0x22252c), inner: lc(0xdddddd), glasses: true, sun: true }) },
  sal: { name: 'Sal Ortega', role: 'Retired train driver', o: () => ({ old: true, skin: lc(0x9a6a4a), hair: lc(0xcfcfcf), hst: 'short', beard: true, coat: true, shirt: lc(0x3a4a5a), pants: lc(0x3a3428), hat: { k: 'cap', c: lc(0x24324a) } }) },
  rico: { name: 'Rico “Viper” Vance', role: 'King of the night races', o: () => ({ skin: lc(0xb07850), hair: lc(0x101010), hst: 'short', shirt: lc(0x9be02a), pants: lc(0x202020), glasses: true, sun: true, hat: { k: 'cap', c: lc(0x101010) } }) },
  jax: { name: 'Jax Kincaid', role: 'Dex’s driver', o: () => ({ skin: lc(0xf0c8a8), hair: lc(0xd8c070), hst: 'short', shirt: lc(0x15151a), pants: lc(0x15151a), sleeve: true, coat: true }) },
  hal: { name: 'Hal Brody', role: 'Trucker · Mara’s customer', o: () => ({ old: true, stout: 1.15, skin: lc(0xd8a888), hair: lc(0x8a7a6a), hst: 'short', beard: true, shirt: lc(0x8a3a2a), pants: lc(0x2a3448), hat: { k: 'cap', c: lc(0xc8a030) } }) },
  nina: { name: 'Nina Park', role: 'Bank teller · Dex’s inside contact', o: () => ({ fem: true, skin: lc(0xe8c0a0), hair: lc(0x141010), hst: 'bun', shirt: lc(0xe8e4dc), pants: lc(0x2a2a36), skirt: 1, coat: true }) }
};
/* ---------- places, worked out from the world ---------- */
const _stNp = {};
/* a spot on the pavement by the road nearest (x, z), facing the road */
function storyCurb(x, z, side) { findNearestRoadPoint(x, z, _stNp); const s = side || 1, l = Math.hypot(_stNp.tx, _stNp.tz) || 1, nx = _stNp.tz / l * s, nz = -_stNp.tx / l * s; return { x: _stNp.x + nx * 7, z: _stNp.z + nz * 7, yaw: Math.atan2(-nx, -nz) }; }
function storySite(pred) { Bld.prep(); return Bld.sites.find(pred); }
Story.place = function (k) {
  let o = {};
  if (k === 'garage') { o.x = GAR.ox + 6; o.z = GAR.oz + 7; o.yaw = Math.PI; o.label = 'Mara’s garage, ' + (GAR.town || towns[0].name); }
  else if (k === 'dex') { const S = storySite((s) => (s.kind === 'resto' || s.kind === 'club') && REG[s.ti % REG.length].key === 'city') || storySite((s) => s.kind === 'resto'); o.x = S.x + 2; o.z = S.z + (S.b ? 3.5 : -3.5); o.yaw = S.b ? 0 : Math.PI; o.label = S.name + ', ' + S.T.name; o.town = S.T.name; }
  else if (k === 'bank') { const S = storySite((s) => s.kind === 'bank' && BJ_TIER[s.ti] === 0) || storySite((s) => s.kind === 'bank'); o.x = S.x; o.z = S.z + (S.b ? 4 : -4); o.label = S.name + ', ' + S.T.name; o.town = S.T.name; o.ti = S.ti; }
  else if (k === 'nina') { const B = Story.place('bank'), S = storySite((s) => s.ti === B.ti && (s.kind === 'clothes' || s.kind === 'resto' || s.kind === 'gym')) || storySite((s) => s.kind === 'clothes'); o.x = S.x - 2; o.z = S.z + (S.b ? 3.5 : -3.5); o.yaw = S.b ? 0 : Math.PI; o.label = 'outside ' + S.name + ', ' + S.T.name; o.town = S.T.name; }
  else if (k === 'pier') { const S = storySite((s) => s.kind === 'resto' && s.ti === 0) || storySite((s) => s.kind === 'resto'); o.x = S.x + 3; o.z = S.z + (S.b ? 3.5 : -3.5); o.yaw = S.b ? 0 : Math.PI; o.label = S.name + ', ' + S.T.name; o.town = S.T.name; }
  else if (k === 'sal') { const S = Heist.sites[0]; o.x = S.sx + S.rz * 9; o.z = S.sz - S.rx * 9; o.yaw = Math.atan2(S.sx - o.x, S.sz - o.z); o.label = 'the old line'; }
  else if (k === 'camp') { const m = missions.find((q) => q.id === 'mvolc'); o.x = m.x + 7; o.z = m.z; o.yaw = -Math.PI / 2; o.label = 'Mount Cinder base camp'; }
  else if (k === 'evac') { const m = missions.find((q) => q.id === 'mvolc'), f = m.cps[m.cps.length - 1]; o.x = f.x + 6; o.z = f.z + 4; o.yaw = 0; o.label = 'Ashfall'; }
  else if (k === 'hal') { const d = Story.def('sm_parts'), c = d.cps[0]; o = storyCurb(c.x, c.z); o.label = 'Hal’s yard, ' + d.to; }
  else if (k === 'race1' || k === 'race2' || k === 'rico2') { const m = Story.def(k === 'race1' ? 'sm_race1' : k === 'race2' ? 'sm_race2' : 'sm_rico2'); o = storyCurb(m.x, m.z); o.label = 'the start line'; }
  else if (k === 'rico') { const T = towns[1]; o = storyCurb(T.cx + T.cell * 0.5, T.cz); o.label = 'Rico’s hangout, ' + T.name; }
  else if (k === 'scrap') { const T = towns[2]; o = storyCurb(T.cx + T.cell * 2, T.cz + T.cell * 2); o.label = 'the scrapyard outside ' + T.name; }
  else if (k === 'sis') { const T = towns[5]; o = storyCurb(T.cx - T.cell, T.cz); o.label = 'Jax’s sister, ' + T.name; }
  else if (k === 'cape') { const B = Surf.beaches[0] || { px: towns[0].cx, pz: towns[0].cz, name: 'the coast' }; o.x = B.px; o.z = B.pz; o.yaw = 0; o.label = B.name || 'the cape'; }
  else if (k === 'ninam') { const T = towns[6]; o = storyCurb(T.cx, T.cz - T.cell); o.label = 'Nina’s mother, ' + T.name; }
  if (o.yaw == null) o.yaw = 0; o.y = terrainHeight(o.x, o.z); return o;
};
Story.town = (k) => { const P = Story.place(k); return P.town || (P.label || '').split(', ').pop(); };

/* ---------- the story's own runs ---------- */
const _smp = {};
/* a street race along one highway link, from town A to town B, against a named rival in their own car */
function storyRace(id, li, dir, o) {
  const l = links[li], r = roads[l.road], A = towns[dir > 0 ? l.a : l.b], B = towns[dir > 0 ? l.b : l.a];
  const m = { id, type: 'race', road: r, dir, from: A.name, to: B.name, cps: [], s0: 50, story: true, rep: 40 };
  const sEnd = r.len - 14, span = sEnd - m.s0; routePos(m, 28, _smp); m.x = _smp.x; m.z = _smp.z; m.h = _smp.h;
  const n = Math.max(3, Math.round(span / 240));
  for (let i = 1; i <= n; i++) { const s = m.s0 + span * i / n; routePos(m, s, _smp); m.cps.push({ x: _smp.x, z: _smp.z, h: _smp.h, r: 18, s, tx: _smp.tx, tz: _smp.tz, finish: i === n }); }
  m.rivalV = o.v; m.limit = span / 26 + 20; m.reward = o.reward; m.title = o.title + ': ' + A.name + ' → ' + B.name; m.desc = ''; m.rivalWho = o.who; m.rivalCar = o.car; m.rivalCol = o.col; m.len = span;
  return m;
}
/* the longest link out of town ti (one not already used), or the longest between two other inner towns */
function storyLink(ti, avoidT, used) {
  let best = -1, bl = 0;
  links.forEach((l, i) => { if (used && used.includes(i)) return; const L = roads[l.road].len, has = l.a === ti || l.b === ti, ok = ti == null ? !avoidT.includes(l.a) && !avoidT.includes(l.b) && l.a < 7 && l.b < 7 : has; if (ok && L > bl && L < 3200) { bl = L; best = i; } });
  return best < 0 ? 0 : best;
}
Story.def = function (id) {
  if (Story.defs[id]) return Story.defs[id]; let m = null;
  if (id === 'sm_parts') {
    const G = Story.place('garage'), B = towns[3], tp = townPath(0, 3);
    m = { id, type: 'delivery', story: true, rep: 30, from: towns[0].name, to: B.name, x: G.x - 4, z: G.z + 2, h: G.y, cps: [{ x: B.cx, z: B.cz - B.cell, h: B.baseH, r: 18, finish: true }], limit: (tp.dist + 500) / 26 + 60, reward: 1500, title: 'Parts Run: ' + towns[0].name + ' → ' + B.name, desc: '' };
  } else if (id === 'sm_nina') {
    const N = Story.place('nina'), D = Story.place('ninam'); const tp = townPath(nearestTownIdx(N.x, N.z), 6);
    m = { id, type: 'delivery', story: true, rep: 20, from: N.town, to: towns[6].name, x: N.x + 3, z: N.z + 3, h: N.y, cps: [{ x: D.x, z: D.z, h: D.y, r: 16, finish: true }], limit: (tp.dist + 400) / 30 + 40, reward: 2500, title: 'Medicine Run: ' + N.town + ' → ' + towns[6].name, desc: '' };
  } else if (id === 'sm_race1') { const li = storyLink(0); const l = links[li]; Story.defs._l1 = li; m = storyRace(id, li, l.a === 0 ? 1 : -1, { v: 39, reward: 4000, title: 'Night Race', who: 'rico', car: 'muscle', col: 0x9be02a }); }
  else if (id === 'sm_race2') { Story.def('sm_race1'); const li = storyLink(null, [0], [Story.defs._l1]); Story.defs._l2 = li; m = storyRace(id, li, 1, { v: 45, reward: 9000, title: 'Sunset Showdown', who: 'jax', car: 'vanta', col: 0x15151a }); }
  else if (id === 'sm_rico2') { Story.def('sm_race2'); const li = storyLink(1, null, [Story.defs._l1, Story.defs._l2]), l = links[li], shamed = Story.F().rico === 'shamed'; m = storyRace(id, li, l.a === 1 ? 1 : -1, { v: shamed ? 46 : 42, reward: shamed ? 6000 : 3000, title: shamed ? 'Viper’s Revenge' : 'Rico’s Rematch', who: 'rico', car: 'muscle', col: 0x9be02a }); }
  return (Story.defs[id] = m);
};
/* things that happen during a race: radio chatter, the rival's nitro, the police joining in */
const stSay = (...L) => () => Story.say(L);
const stBoost = (k, sec, msg) => () => { const r = Mi && Mi.rival; if (r) { r.boost = k; r.boostT = sec; } if (msg) Story.say([['', msg]]); Cam.shake = Math.max(Cam.shake, 0.6); };
const stCops = () => { if (Wanted.stars < 1) Wanted.crime('Street racing', 1); Story.say([['Police scanner', '…all units, street race on the highway. Two cars, headed for the next town. Intercept…']]); };

/* ---------- the story ---------- */
const T0 = () => towns[0].name;
const F = () => Story.F();
const raceTo = (id) => { const d = Story.def(id); return d ? d.to : 'the next town'; };
const STORY = [
  { title: 'Off the Ferry', tod: 8.5, sum: 'You arrived on the island with one car and one friend: Mara.', steps: [
    { t: 'cut', lines: () => [['', '08:30 · TUESDAY\n' + T0().toUpperCase(), 'card'], ['', 'Six weeks ago you sold everything you owned for a one-way ticket to the island.', 'wide'], ['', 'One car. A full tank. And one person here who still answers your calls.', 'car'],
      ['', 'Mara Quinn. You grew up two doors apart. She left for the island eight years ago and never came back.', 'wide'],
      ['Mara (phone)', 'You actually came! Okay. Okay! Come find me at the garage, on the edge of town.', 'phone'], ['Mara (phone)', 'Follow the marker, and try not to hit anything. The locals drive like they are being chased.', 'phone'], ['you', 'Maybe they are.', 'mecar']] },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Meet Mara at her garage', lines: () => [['mara', 'Look at you. Eight years, and you are still driving that old thing?', 'npc'],
      ['', 'What do you say?', 'me', [
        ['“It got me here. It’s good to see you, Mara.”', { mara: 1 }, [['you', 'It got me here. It’s… really good to see you, Mara.', 'me'], ['mara', '…Don’t make me cry before ten in the morning. Come here.', 'npc'], ['', 'She hugs you. She smells of engine oil and oranges, same as she always did.', 'two']]],
        ['“Is that a garage or a scrapyard?”', { mara: -1 }, [['you', 'You’re one to talk. Is that a garage or a scrapyard?', 'me'], ['mara', 'Eight years and five minutes off the ferry, and already a critic. Lovely.', 'npc']]],
        ['“Got any work for me?”', {}, [['you', 'Don’t start. Have you got work for me or not?', 'me'], ['mara', 'Straight to it. Fine. Some things never change.', 'npc']]]]],
      ['mara', 'Rent is due Friday, the van is in pieces, and a customer in ' + towns[3].name + ' has been waiting a week for his parts.', 'npc'], ['you', 'So I am the van.', 'me'],
      ['mara', 'You are the van. Morning run, fragile box, no heroics. Do it and the first week’s rent is on me.', 'two'], ['mara', 'There is a camp bed in the office. Coffee is terrible. Welcome to the island.', 'npc']] }
  ] },
  { title: 'Parts Run', tod: 10, sum: 'You ran a gearbox across the island for Mara’s customer, Hal.', steps: [
    { t: 'run', id: 'sm_parts', npc: 'mara', at: 'garage', obj: 'Run Mara’s parts across the island', intro: () => [['', '10:00 · THE NEXT MORNING', 'card'], ['mara', 'Box is on the passenger seat. It is a gearbox for a forty-year-old truck and there is not another one on this island.', 'two'],
      ['mara', 'Every bump you hit, I will hear about it. Hal calls me about everything.', 'npc'], ['you', 'Relax. I drive like a grandmother.', 'me'], ['mara', 'Grandmothers here do a hundred and sixty on the coast road. Go.', 'npc']],
      events: [[0.3, stSay(['Mara (phone)', 'Just checking you have not hit a goat. There are goats on that road.'])], [0.7, stSay(['Mara (phone)', 'Hal says he can see your dust. Slow down for the last bend, it is a nasty one.'])]] },
    { t: 'talk', who: 'hal', at: 'hal', obj: 'Hand the gearbox to Hal', lines: () => [['hal', 'So you are the new driver. Mara said you would be quick. Did not say you would be this quick.', 'npc'], ['hal', 'Thirty years on these roads. You know what I have learned?', 'two'],
      ['', 'What do you say?', 'me', [
        ['“Tell me.”', { hal: 1 }, [['you', 'Tell me.', 'me'], ['hal', 'Everyone on this island wants something from a fast driver. Most of them are not worth driving for. Mara is. Remember that.', 'npc']]],
        ['“That you talk too much?”', { hal: -1 }, [['you', 'That you talk too much?', 'me'], ['hal', 'Ha! Fair. Go on, then. Tell Mara the box arrived in one piece.', 'npc']]]]],
      ['hal', 'And if a man in a nice suit offers you lunch, eat somewhere else.', 'npc']] },
    { t: 'call', lines: [['Mara (phone)', 'Hal called. Not a scratch on the box! Come back to the garage. There is something tonight you need to hear about.']] }
  ] },
  { title: 'Street Cred', tod: 16.6, sum: 'You beat Rico “Viper” Vance in the night race, and a man called Dex noticed.', steps: [
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Back to Mara', lines: () => [['', '16:40 · THAT AFTERNOON', 'card'], ['mara', 'He called. Not a scratch on the box. ' + (F().mara > 0 ? 'I knew you would come through.' : 'You might be useful after all.'), 'two'],
      ['mara', 'Thing is, nobody here hires a driver they have never seen race. And there is a race tonight.', 'npc'], ['you', 'Who do I have to beat?', 'me'],
      ['mara', 'Rico Vance. They call him Viper. Green muscle car, louder than his mouth, and his mouth is very loud.', 'npc'], ['mara', 'Half past ten, on the highway out of town.', 'two'],
      ['', 'What do you ask?', 'me', [
        ['“What’s Rico like, really?”', {}, [['you', 'What is he like, really? Under the paint.', 'me'], ['mara', 'Honestly? Not the worst. He has never lost, and nobody has ever been nice to him about anything. Same thing, maybe.', 'npc']]],
        ['“What do I get if I win?”', {}, [['you', 'What do I get if I win?', 'me'], ['mara', 'Four grand, and a name. The name is worth more.', 'npc']]],
        ['“Will you come and watch?”', { mara: 1 }, [['you', 'Will you come and watch?', 'me'], ['mara', 'Someone has to drag you home if you wrap it round a lamppost. Yes. I will be there.', 'npc']]]]],
      ['you', 'And if I lose?', 'me'], ['mara', 'Then they will know your name for a different reason.', 'npc']] },
    { t: 'run', id: 'sm_race1', npc: 'mara', at: 'race1', obj: 'Meet Rico on the highway for the night race', tod: 22.5, intro: () => [['', '22:30 · THE HIGHWAY OUT OF ' + T0().toUpperCase(), 'card'], ['', 'Engines idle. Somebody has parked a pickup across the far lane, headlights on. Fifty people line the road.', 'line'],
      ['mara', F().mara > 0 ? 'Hey. You have got this. Brake late on the long bend, he always brakes early.' : 'Do not embarrass me. Brake late on the long bend.', 'two'],
      ['rico', 'Well, well. Mara’s little friend from the ferry. Hope you kept the ticket.', 'rival'],
      ['', 'Talk back:', 'mecar', [
        ['“Nice paint. Did you lose a bet?”', {}, [['you', 'Nice paint. Did it come with the car, or did you lose a bet?', 'mecar'], ['rico', 'Ha! This colour is the last thing a lot of people saw before my tail-lights.', 'rival']]],
        ['“I didn’t come here to talk.”', {}, [['you', 'I didn’t come here to talk.', 'mecar'], ['rico', 'Good, because I can’t hear you over my engine anyway.', 'rival']]],
        ['“May the best driver win, Rico.”', { rico: 1 }, [['you', 'May the best driver win, Rico.', 'mecar'], ['rico', '…Huh. Manners. Nobody has wished me luck in years. Doesn’t mean I’ll go easy.', 'rival']]]]],
      ['rico', 'First one to ' + raceTo('sm_race1') + '. Try to keep up, ferry kid.', 'rival'], ['you', 'Keep the engine warm. You will be watching mine.', 'mecar'], ['', 'The headlights flash. Three.', 'line']],
      events: [[0.02, stSay(['rico', 'Hope you like the taste of exhaust, ferry kid!'])], [0.3, stCops], [0.42, stSay(['rico', 'Cops! Ha! Now it is a race!'])], [0.55, stBoost(0.2, 5, 'Rico hits the nitro!')], [0.7, stSay(['Mara (phone)', 'They are right behind you! Don’t you dare stop now!'])], [0.88, stSay(['rico', 'No. No no no. NO!'])]] },
    { t: 'clean', obj: 'Shake off the police' },
    { t: 'cut', lines: () => [['', 'Rico pulls up behind you, climbs out, and stands there in the headlights.', 'car'], ['Rico', 'Where did Mara find you?', 'car'],
      ['', 'The whole crowd is watching. What do you do?', 'mecar', [
        ['Shake his hand', { rico: 2, ricoS: 'ally', mara: 1 }, [['you', 'Good race. Honestly. You nearly had me on the long bend.', 'mecar'], ['Rico', '…Yeah. Yeah, I did. You need anything on this island, ferry kid, you call me. I mean it.', 'car']]],
        ['Rev the engine in his face', { rico: -3, ricoS: 'shamed' }, [['', 'You rev the engine until the crowd starts laughing. Rico does not laugh.', 'car'], ['Rico', 'Enjoy it. This island has a long memory, and so do I.', 'car']]]]],
      ['', 'Somewhere a phone is ringing. It is yours.', 'car'],
      ['Unknown (phone)', 'That was some driving. The name is Dex. I find people for jobs that pay better than parts runs.', 'phone'], ['Dex (phone)', 'Lunch tomorrow, one o’clock, outside ' + Story.place('dex').label + '. Do not bring Mara.', 'phone'],
      ['you', 'How did you get this number?', 'mecar'], ['Dex (phone)', 'Everybody gets my number eventually. One o’clock.', 'phone']] }
  ] },
  { title: 'The Fixer', tod: 13, sum: 'Dex Calloway offered you a bank job, and introduced you to his inside contact, Nina.', steps: [
    { t: 'talk', who: 'dex', at: 'dex', obj: 'Meet Dex for lunch', lines: () => [['', '13:00 · ' + (Story.town('dex') || '').toUpperCase(), 'card'], ['dex', 'There you are. Sit, sit. You hungry? No? Straight to business. I like that.', 'npc'],
      ['dex', F().ricoS === 'shamed' ? 'I hear you made Rico cry in front of half the town. Cold. I like cold.' : 'I hear you shook Rico’s hand after. Sweet. Don’t make a habit of sweet.', 'two'],
      ['dex', 'Banks on this island lock the front and forget the back. A staff door, a vault, two old guards walking the same loop since nineteen-ninety.', 'npc'], ['you', 'You want me to rob a bank.', 'me'],
      ['dex', 'I want you to make a withdrawal after hours. Case it in daylight, go back after dark, stay out of the torchlight. You keep half.', 'npc'],
      ['', 'Your answer:', 'me', [
        ['“Half is fair. I’m in.”', { cut: 50 }, [['you', 'Half is fair. I’m in.', 'me'], ['dex', 'A reasonable person. We are going to get along.', 'npc']]],
        ['“Seventy. I take the risk, I take the money.”', { cut: 70, dex: -1 }, [['you', 'Seventy. I am the one in the torchlight. I take the money.', 'me'], ['dex', '…Seventy. Fine. I will remember that you asked.', 'npc']]],
        ['“No. I’m not a thief.”', { cut: 'out', mara: 1 }, [['you', 'No. I came here to fix cars, not to rob banks.', 'me'], ['dex', 'Shame. Mara’s garage is all old wood and paint thinner, you know. Terrible fire risk.', 'npc'], ['you', '…Are you threatening her?', 'me'], ['dex', 'I am telling you the bank is easier. Half.', 'npc']]]]],
      ['dex', 'You will need the guard rota. My friend Nina works the counter at ' + Story.place('bank').label + '. She will meet you at three.', 'npc']] },
    { t: 'talk', who: 'nina', at: 'nina', obj: 'Meet Nina, the inside contact', tod: 15, lines: () => [['', '15:00 · ' + (Story.town('nina') || '').toUpperCase(), 'card'], ['nina', 'You’re Dex’s new driver. You look less like a criminal than the last one.', 'npc'],
      ['nina', 'Two guards. Old Pete walks the hall every four minutes, Danny sits by the vault with his radio. Pete has a bad knee. Danny falls asleep after midnight.', 'two'],
      ['', 'What do you say?', 'me', [
        ['“Why are you helping Dex?”', { nina: 1 }, [['you', 'Why are you helping Dex?', 'me'], ['nina', 'My mother needs medicine the island clinic does not stock. Dex pays for the boat that brings it. I do not like him. I like my mother.', 'npc']]],
        ['“You’re much too nice for this.”', { nina: 1, ninaF: 1 }, [['you', 'You are much too nice for this, Nina.', 'me'], ['nina', '…That is either a line or the first kind thing anyone has said to me this month. I will decide later.', 'npc']]],
        ['“Just the rota. Nothing else.”', {}, [['you', 'Just the rota. I don’t need to know anything else.', 'me'], ['nina', 'Good. Neither do I.', 'npc']]]]],
      ['nina', 'The staff door sticks. Lift it as you push. And do not hurt anyone, or I go to the police myself.', 'npc']] }
  ] },
  { title: 'Night Work', tod: 11, sum: 'You robbed the bank, and it went on the news.', steps: [
    { t: 'bank', at: 'bank', obj: 'Rob the bank: case it by day at the staff door, then go back at night' },
    { t: 'call', lines: [['Police scanner', '…break-in at the bank, suspect left on foot, a car seen leaving the area at speed…'], ['Nina (phone)', 'I heard. Nobody was hurt? Good. Then I was never here.']] }
  ] },
  { title: 'Heat', tod: 0.5, sum: 'You lay low at Mara’s, then beat Jax, Dex’s own driver, for the big job.', steps: [
    { t: 'clean', obj: 'Lose the police', enter: () => { if (F().ricoS === 'shamed' && Wanted.stars < 3) { Wanted.crime('An anonymous tip-off', 3); UI.banner('TIPPED OFF', 'Someone with a long memory called the police'); } } },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Lie low at Mara’s garage', tod: 6.2, lines: () => [['', '06:10 · THE GARAGE', 'card'], ['mara', 'You are all over the radio. Somebody robbed a bank last night. Tell me that was not you.', 'npc'],
      ['', 'Tell her…', 'me', [
        ['The truth', { mara: 1 }, [['you', 'It was me. Dex set it up. ' + (F().cut === 'out' ? 'He threatened the garage, Mara. I didn’t have a choice.' : 'I needed the money.'), 'me'], ['mara', '…Thank you for not lying to me. Dex always has a good plan. The people who work for him don’t always have a good ending.', 'npc']]],
        ['A lie', { mara: -2, lie: true }, [['you', 'Me? I was here all night, working on the van.', 'me'], ['mara', 'The van that still has no engine in it. Right.', 'npc'], ['mara', 'You know what, forget it. I don’t want to know.', 'npc']]]]],
      ['mara', 'My last mechanic did two jobs for Dex. Then he did three years.', 'npc'], ['mara', 'Just… be careful. Please. I only just got you back.', 'npc']] },
    { t: 'call', tod: 17.5, lines: () => [['Dex (phone)', (F().cut === 70 ? 'Your seventy percent cleared. Hope it was worth it. ' : 'Clean work. ') + 'Now the big one. There is a train on this island that carries a solid gold car. The Aurum.'],
      ['Dex (phone)', 'One driver gets that job, and I already have one. Jax. You will race him. Sunset. Winner does the train.'], ['Dex (phone)', 'The loser goes home. Or somewhere.']] },
    { t: 'run', id: 'sm_race2', obj: 'Race Jax, Dex’s driver, at sunset', tod: 18.6, intro: () => [['', '18:40 · SUNSET', 'card'], ['', 'A black car rolls up beside you. Its engine is so quiet you hear the tyres first.', 'line'],
      ['jax', 'So you are the bank kid. Dex talks about you like a new toy.', 'rival'],
      ['', 'Talk back:', 'mecar', [
        ['“And you’re the old toy.”', {}, [['you', 'And you are the old toy.', 'mecar'], ['jax', 'I have driven for Dex for six years. You know what happened to the last kid who raced me?', 'rival'], ['you', 'He won?', 'mecar'], ['jax', 'He walks to work now.', 'rival']]],
        ['“Why do you work for him?”', { jax: 2, jaxA: 1 }, [['you', 'Why do you work for him? Really.', 'mecar'], ['jax', '…Because the last driver who said no to Dex is in the sea somewhere off ' + T0() + '. Think about that while you watch my tail-lights.', 'rival']]]]],
      ['jax', raceTo('sm_race2') + '. Go when the light turns.', 'rival'], ['', 'The sun touches the sea.', 'line']],
      events: [[0.02, stSay(['jax', 'Six years undefeated. Let us make it seven.'])], [0.22, stBoost(0.24, 5, 'Jax hits the nitro!')], [0.45, stSay(['jax', 'You are still here? Huh.'])], [0.62, stBoost(0.28, 6, 'Jax hits the nitro again!')], [0.8, stSay(['Dex (radio)', 'Come on, Jax. Do not make me regret you.'])], [0.92, stSay(['jax', '…'])]] },
    { t: 'cut', lines: () => [['', 'Jax gets out. He looks at you for a long time.', 'car'], ['Jax', F().jaxA ? 'You asked me why. Nobody asks. Watch Dex on the last job. He never pays the last one.' : 'Enjoy it. Dex’s last driver enjoyed it too.', 'car'],
      ['Dex (phone)', 'Well, that settles it. Talk to Sal, by the old line. He drove that train for forty years. Tonight, before the last run.', 'phone']] }
  ] },
  { title: 'Gold Rush', tod: 19.6, sum: 'With Sal’s help you took the Aurum off a moving train.', steps: [
    { t: 'talk', who: 'sal', at: 'sal', obj: 'Find Sal by the railway', lines: () => [['', '19:35 · THE OLD LINE', 'card'], ['sal', 'Dex sent you? Of course he did. He sends somebody every few years.', 'npc'], ['sal', 'The Aurum rides in the back wagon with the side door open, for the cooling. Daft, but there you go.', 'two'],
      ['sal', 'The line crews left a ramp down here. Hit it flat out as the wagon comes by and you will land right inside.', 'npc'],
      ['', 'Ask Sal…', 'me', [
        ['“What happens if I miss?”', { sal: 1 }, [['you', 'And if I miss?', 'me'], ['sal', 'Then you meet the side of a train. I have seen it once. Once was plenty.', 'npc']]],
        ['“What happened to the others Dex sent?”', { sal: 2, salA: 1 }, [['you', 'Every few years, you said. What happened to the others?', 'me'], ['sal', '…The job always ends up the mountain. Mount Cinder. He likes to settle up somewhere quiet, with a long drop.', 'npc'], ['sal', 'If he asks you up there, son, you keep the car keys in your pocket.', 'npc']]],
        ['“Why do you help him?”', { sal: 1 }, [['you', 'Why do you help him?', 'me'], ['sal', 'I don’t. I help the kids he sends. The ones who listen come home.', 'npc']]]]],
      ['sal', 'Mind the timing, son. And mind Dex.', 'two']] },
    { t: 'heist', k: 0, obj: 'Steal the Aurum off its train and bring it to your garage' },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Show Mara what is in the garage', lines: () => [['', '23:50 · THE GARAGE', 'card'], ['mara', 'Is that… is that solid gold? In my garage? With the door open?', 'npc'],
      ['', 'What do you tell her?', 'me', [
        ['“It’s for Dex. Tomorrow it’s gone.”', {}, [['you', 'It is for Dex. Tomorrow it is gone, and so is he.', 'me'], ['mara', 'Men like Dex are never gone. They just move to the next driver.', 'npc']]],
        ['“It’s ours. We could leave. Together.”', { mara: 2, maraR: 1 }, [['you', 'It could be ours. We could sell it on the mainland and leave. Together.', 'me'], ['mara', '…Together? You have been here two weeks.', 'npc'], ['mara', 'Ask me again when there is not a stolen car between us.', 'npc']]],
        ['“I’m sorry I dragged you into this.”', { mara: 1 }, [['you', 'I am sorry, Mara. I dragged all this to your door.', 'me'], ['mara', 'You did. And I let you. We will get through it.', 'npc']]]]],
      ['mara', 'Close the door. And sleep. You look like the train hit you.', 'npc']] }
  ] },
  { title: 'Double Cross', tod: 9, sum: 'Dex left you on Mount Cinder as it erupted.', steps: [
    { t: 'cut', lines: () => { const L = [['', '09:00 · THE NEXT MORNING', 'card'], ['Dex (phone)', 'Ha! You did it. The whole island is talking about a gold car flying through the air.', 'phone'], ['Dex (phone)', 'Come up to Mount Cinder. Base camp, under the observatory. We will settle up there, nice and quiet.', 'phone']];
      if (F().ricoS === 'ally') L.push(['Rico (phone)', 'Ferry kid. It’s Rico. Word is Dex is cleaning house today. Whatever he says up there, don’t give him anything. I owe you one, remember.', 'phone']);
      if (F().jaxA) L.push(['Jax (text)', 'He never pays the last one. Keep your keys.', 'phone']);
      L.push(['', 'Mount Cinder has not erupted in eighty years. Everyone says so.', 'wide']); return L; } },
    { t: 'talk', who: 'dex', at: 'camp', obj: 'Meet Dex at Mount Cinder base camp', lines: () => { const warned = F().salA || F().ricoS === 'ally' || F().jaxA;
      return [['', '09:50 · MOUNT CINDER BASE CAMP', 'card'], ['dex', 'My driver. Look at that view.', 'two'], ['dex', 'Here is the thing. The bank, the Aurum, a face on every police camera on the island. That is all you. I was having lunch.', 'npc'],
        ['dex', 'So. The keys to the Aurum, and we part friends.', 'npc'],
        ['', warned ? 'You were warned about this. What do you do?' : 'What do you do?', 'me', [
          ['Hand him the keys', { aurum: 'given', dex: 1 }, [['you', 'Take them. I am done with you.', 'me'], ['dex', 'There. Was that so hard? The rangers will run you up to the observatory. Enjoy the view.', 'npc']]],
          ['Keep the keys in your pocket', { aurum: 'kept' }, [['you', warned ? 'I heard what happens to your drivers up here. The keys stay with me.' : 'No. I took it off the train. It stays with me.', 'me'], ['dex', '…Then enjoy the mountain. The rangers will run you up to the observatory. I hear it is lovely this time of year.', 'npc']]]]],
        ['', 'The ground starts to shake. Dex is already walking to his car.', 'wide']]; } },
    { t: 'mission', m: () => missions.find((q) => q.id === 'mvolc'), obj: 'Get off the volcano alive' }
  ] },
  { title: 'Ashes', tod: 19, sum: 'You came down the mountain alive.', steps: [
    { t: 'talk', who: 'mara', at: 'evac', obj: 'Find Mara in Ashfall', lines: () => { const f = F(), good = (f.mara | 0) >= 3 && !f.lie, love = good && f.maraR && f.maraLove, L = [['', '19:00 · ASHFALL', 'card'], ['mara', 'I saw the smoke from across the island. I knew. I just knew you would be on that mountain.', 'npc'],
      ['you', 'Dex is gone. ' + (f.aurum === 'given' ? 'So is the Aurum. He drove off in it.' : 'But the Aurum is still in the garage. He never got it.'), 'me']];
      if (f.ricoS === 'ally') L.push(['mara', 'Rico called me, you know. Said you might need a ride home. Rico. Of all people.', 'npc']);
      if (f.salT) L.push(['mara', 'And Sal was here an hour ago, asking after you. He brought flowers. For me, he said. I think they were for you.', 'npc']);
      if (love) L.push(['mara', 'You asked me once, with a stolen car between us. There is no car between us now.', 'npc'], ['you', 'Then I am asking again.', 'me'], ['mara', 'Then yes. Stay. With me.', 'two'], ['', 'THE END\nMara’s garage has two names over the door now, and one of them is yours.', 'card']);
      else if (good) L.push(['mara', 'Then you pay the rest back the slow way. With me. At the garage. Honest work, fast cars, and no more fixers.', 'two'], ['you', 'Deal.', 'me'], ['', 'THE END\nMara’s garage has two names over the door now.', 'card']);
      else L.push(['mara', 'I can’t do this again. Every time the phone rings I think it is the police, or the hospital.', 'npc'], ['mara', 'There is a ferry in the morning. I am going to be on it. Look after the garage. Or don’t.', 'two'], ['', 'THE END\nThe garage is yours now. It is very quiet.', 'card']);
      L.push(['', 'YOUR STORY\n' + Story.summary().join('\n'), 'card']); return L; } }
  ] }
];
/* ---------- side quests: offered by phone or in person once the story reaches them ---------- */
const SIDE = [
  { id: 'scrap', title: 'Scrapyard Run', who: 'mara', desc: 'Mara needs a cylinder head from the scrapyard before her customer wakes up.', reward: 800, aff: { mara: 1 }, avail: (S) => S.ch >= 1,
    steps: [{ t: 'call', lines: () => [['Mara (phone)', 'Favour? The scrapyard outside ' + towns[2].name + ' has a cylinder head I need. Grab it for me? I will owe you a beer.']] },
      { t: 'goto', at: 'scrap', obj: 'Pick up the part at the scrapyard' }, { t: 'call', lines: [['Scrapyard owner', 'Mara’s part? Here. Tell her she still owes me for the last one.']] },
      { t: 'goto', at: 'garage', obj: 'Bring the part back to Mara' }, { t: 'call', lines: () => [['Mara (phone)', F().mara > 1 ? 'You are a lifesaver. Beer’s in the fridge. Both of them are yours.' : 'Got it, thanks. Leave it on the bench.']] }] },
  { id: 'rico2', title: 'Rico’s Rematch', who: 'rico', desc: 'Rico wants another go. On his road, this time.', reward: 0, aff: { rico: 2 }, avail: (S) => S.ch >= 3 && !!Story.F().ricoS,
    steps: [{ t: 'talk', who: 'rico', at: 'rico', obj: 'Find Rico at his hangout', lines: () => Story.F().ricoS === 'shamed' ? [['rico', 'Look who it is. The engine-revver.', 'npc'], ['rico', 'My road. My rules. And this time I am not playing nice.', 'two'], ['you', 'You were playing nice before?', 'me'], ['rico', 'Line up. We will see who is laughing.', 'npc']]
      : [['rico', 'Ferry kid! Good. I have been practising.', 'npc'], ['rico', 'One more race, my road, no crowd. Just for the fun of it. Loser buys dinner.', 'two'], ['you', 'You are on.', 'me']] },
      { t: 'run', id: 'sm_rico2', obj: 'Race Rico on his road', intro: () => [['', 'RICO’S ROAD', 'card'], ['rico', Story.F().ricoS === 'shamed' ? 'No crowd tonight. Nobody to see you lose.' : 'No crowd, no cops. Just us and the road.', 'rival'], ['you', 'Try not to blink.', 'mecar'], ['', 'Go.', 'line']],
        events: [[0.05, stSay(['rico', 'I know every bump on this road!'])], [0.4, stBoost(0.22, 6, 'Rico hits the nitro!')], [0.75, stSay(['rico', 'How are you still there?!'])]] },
      { t: 'call', lines: () => Story.F().ricoS === 'shamed' ? [['Rico (phone)', '…Fine. FINE. We are even. Don’t tell anyone I said that.']] : [['Rico (phone)', 'Dinner’s on me. Again. You know you are the only one who ever beat me? Twice now. Jerk. Friend. Same thing.']], done: () => { const f = Story.F(); if (f.ricoS === 'shamed') f.ricoS = 'even'; } }] },
  { id: 'pier', title: 'Dinner at the Pier', who: 'mara', desc: 'Mara has a table booked. Just the two of you.', reward: 0, aff: { mara: 1 }, avail: (S) => (S.ch >= 4 && (Story.F().mara | 0) >= 2) || (S.ch >= 3 && !!Story.F().pierAsk),
    steps: [{ t: 'call', lines: [['Mara (phone)', 'Hey. So. I booked a table. At the pier, eight o’clock. It is not a big deal. Wear a shirt.']] },
      { t: 'talk', who: 'mara', at: 'pier', obj: 'Meet Mara for dinner at eight', tod: 20, lines: () => [['', '20:00 · THE PIER', 'card'], ['mara', 'You wore a shirt. I am impressed.', 'npc'], ['mara', 'I used to watch the ferries from here, my first year. Every one of them, I thought, maybe somebody I know is on it.', 'two'], ['mara', 'Nobody ever was. Until you.', 'npc'],
        ['', 'What do you say?', 'me', [
          ['“I should have come years ago.”', { mara: 2, maraLove: 1 }, [['you', 'I should have come years ago. I thought about it every day.', 'me'], ['mara', '…Every day?', 'npc'], ['you', 'Every day.', 'me'], ['', 'She takes your hand across the table, and neither of you says anything for a long time.', 'two']]],
          ['“I’m glad it was me.”', { mara: 1 }, [['you', 'I am glad it was me.', 'me'], ['mara', 'Me too. Now eat your fish before the gulls do.', 'npc']]],
          ['“You’re the best friend I’ve ever had.”', { mara: 1, maraFriend: 1 }, [['you', 'You are the best friend I have ever had, Mara.', 'me'], ['mara', '…Yeah. You too. Best friends. Eat your fish.', 'npc']]]]]] }] },
  { id: 'nina', title: 'Nina’s Favour', who: 'nina', desc: 'Nina’s mother’s medicine came in on the boat, and the clinic closes in an hour.', reward: 2500, aff: { nina: 2 }, avail: (S) => S.ch >= 5 && (Story.F().nina | 0) >= 1,
    steps: [{ t: 'talk', who: 'nina', at: 'nina', obj: 'Nina wants to see you', lines: () => [['nina', 'I did not think I would ask you for anything. But the medicine came in, and my car will not start, and the clinic in ' + towns[6].name + ' closes at six.', 'npc'], ['you', 'Give me the box.', 'me'], ['nina', 'Thank you. Truly.', 'npc']] },
      { t: 'run', id: 'sm_nina', obj: 'Get the medicine to the clinic before it closes', intro: () => [['nina', 'Keep it upright. And please, do not crash.', 'two']], npc: 'nina', at: 'nina' },
      { t: 'call', lines: () => [['Nina (phone)', 'Mum has it. She says to thank “the fast one”. ' + (Story.F().ninaF ? 'So do I. Dinner some time? Somewhere that is not a bank.' : 'So do I. I owe you one.')]] }] },
  { id: 'jax', title: 'Jax’s Envelope', who: 'jax', desc: 'Jax has an envelope for his sister, and does not trust anyone else with it.', reward: 1500, aff: { jax: 2 }, avail: (S) => S.ch >= 6 && !!Story.F().jaxA,
    steps: [{ t: 'call', lines: () => [['Jax (phone)', 'You asked me why. I am asking you for something. My sister lives in ' + towns[5].name + '. There is an envelope in my glovebox at the start line. Take it to her. Do not open it.']] },
      { t: 'goto', at: 'sis', obj: 'Take Jax’s envelope to his sister' }, { t: 'call', lines: [['Jax’s sister', 'It is from Jax? It is… it is money. And a ferry ticket. He is getting out. Thank you. Thank you.'], ['Jax (text)', 'Thanks. I owe you. Watch Dex.']] }] },
  { id: 'sal', title: 'Sal’s Last Ride', who: 'sal', desc: 'Sal wants to see the sea from the cape one more time.', reward: 0, aff: { sal: 3, salT: 1 }, avail: (S) => S.ch >= 7,
    steps: [{ t: 'talk', who: 'sal', at: 'sal', obj: 'Sal is waiting by the line', lines: () => [['sal', 'Forty years I drove that line past the cape and never once stopped to look.', 'npc'], ['sal', 'My knees do not do cars any more. Go and look for me, son. Tell me what it is like.', 'two'], ['you', 'I will.', 'me']] },
      { t: 'goto', at: 'cape', obj: 'Go to the cape for Sal' }, { t: 'call', tod: 19.4, lines: [['you (phone)', 'Sal. The sun is going down into the sea and the whole sky is orange.'], ['Sal (phone)', '…Thank you, son. That is exactly what I always thought it would be.']] }] }
];
/* the choices you have made and how people feel about you (save.story.f): mara, rico, sal, nina, jax, hal, dex are numbers; the rest are what you chose */
Story.F = () => { const S = Story.S(); return S.f || (S.f = {}); };
Story.applyEff = function (eff) { const f = Story.F(); for (const k in eff) { const v = eff[k]; if (typeof v === 'number' && k !== 'cut' && STORY_CAST[k]) f[k] = (f[k] | 0) + v; else f[k] = v; } writeSave(); };
Story.summary = function () {
  const f = Story.F(), out = [];
  out.push(f.ricoS === 'ally' || f.ricoS === 'even' ? 'Rico: a friend' : f.ricoS === 'shamed' ? 'Rico: an enemy' : 'Rico: a rival');
  out.push(f.cut === 70 ? 'Dex’s cut: you took seventy' : f.cut === 'out' ? 'Dex’s cut: you tried to walk away' : 'Dex’s cut: half');
  out.push(f.aurum === 'given' ? 'The Aurum: Dex took it' : 'The Aurum: yours'); if (f.salT) out.push('Sal: you saw the sea for him'); if ((f.nina | 0) >= 3) out.push('Nina: a friend');
  out.push((f.mara | 0) >= 3 && !f.lie ? (f.maraLove && f.maraR ? 'Mara: together' : 'Mara: stayed') : 'Mara: left the island'); return out;
};
Story.consequences = function (st) { const f = Story.F(); if (st && st.t === 'bank' && f.cut === 70 && !f.paid70) { f.paid70 = 1; save.money += 6000; UI.toast('Your seventy percent: +' + money(6000), 'good'); } };
Story.finish = function () {
  const f = Story.F(), good = (f.mara | 0) >= 3 && !f.lie, A = HEIST_PRIZES[0];
  if (f.aurum === 'given' && A && save.owned[A.id]) { delete save.owned[A.id]; if (save.car === A.id) applyCar('rook', true); GAR.dirty = true; Home.refresh(); }   /* Dex drove off in it: gone for good */
  const pay = good ? 50000 : 20000; save.money += pay; return pay;
};
/* how someone feels about you, as words */
Story.relLabel = function (id) {
  const f = Story.F(), v = f[id] | 0;
  if (id === 'mara' && f.maraLove && v >= 4) return '♥ More than friends';
  if (id === 'rico' && f.ricoS === 'shamed') return 'Holds a grudge';
  return v <= -2 ? 'Cold' : v <= 0 ? 'Acquaintance' : v <= 2 ? 'Friendly' : v <= 4 ? 'Friend' : 'Close friend';
};

/* ---------- people standing in the world for the story ---------- */
Story.npc = function (key, id, P) {
  let n = Story.npcs[key]; if (n && n.id !== id) { Human.dispose(n.h); n = null; }
  if (!n) { const h = Human.make(STORY_CAST[id].o()); n = Story.npcs[key] = { key, id, h, x: 0, z: 0, y: 0, yaw: 0 }; scene.add(h.root); }
  n.x = P.x; n.z = P.z; n.y = P.y; n.yaw = P.yaw; n.h.root.position.set(P.x, P.y, P.z); n.h.root.rotation.y = P.yaw; n.h.root.visible = true; return n;
};
Story.dropNpc = function (key) { const n = Story.npcs[key]; if (n) { Human.dispose(n.h); delete Story.npcs[key]; } };
/* a rival leaning out of the driver's window of their car (a pivot at the hips, tipped out over the sill) */
Story.rival = function (who, mesh, side) {
  Story.dropRival(); const h = Human.make(STORY_CAST[who].o()), pv = new THREE.Group();
  pv.position.set(side * 0.42, 0.52, 0.2); pv.rotation.y = side * Math.PI / 2; pv.rotateX(0.95); h.root.position.y = -0.95; pv.add(h.root); mesh.add(pv);
  Story.rivalH = { who, h, pv, mesh, side }; return Story.rivalH;
};
Story.dropRival = function () { const R = Story.rivalH; if (!R) return; R.pv.parent && R.pv.parent.remove(R.pv); Human.dispose(R.h); Story.rivalH = null; };

/* ---------- the quests: the main story and the side quests, each at a step ---------- */
Story.S = () => { const S = save.story || (save.story = {}); if (S.ch == null) S.ch = 0; if (S.st == null) S.st = 0; if (!S.base) S.base = {}; if (!S.f) S.f = {}; if (!S.sq) S.sq = {}; if (!S.met) S.met = {}; return S; };
Story.step = function () { const S = Story.S(), C = STORY[S.ch]; return C ? C.steps[S.st] : null; };
const STORY_LINES = (L) => (typeof L === 'function' ? L() : L);
/* everything going on now: the main story's step, and each side quest that is on offer or under way */
Story.entries = function () {
  const S = Story.S(), out = []; if (!S.fin && Story.step()) out.push({ key: 'main', st: Story.step(), i: S.ch * 100 + S.st });
  for (const q of SIDE) { const r = S.sq[q.id]; if (r && r.done) continue; if (!r && !q.avail(S)) continue; const i = r ? r.st : 0; out.push({ key: 'sq:' + q.id, q, st: q.steps[i], i }); }
  return out;
};
Story.begin = function () {
  if (!Story.on) return; Story.ui(); App.tab = 'quests'; const S = Story.S();
  if (S.fin) { UI.toast('Story complete · side quests and the island are yours', 'good'); Story.started = true; return; }
  setTimeout(() => { if (S.st === 0 && S.ch === 0) UI.banner('CHAPTER 1', STORY[0].title); Story.started = true; }, 400);
};
/* set a step up the first time it is current: the time of day, its person, its marker, what it starts from */
Story.setup = function (E) {
  const st = E.st, S = Story.S(), main = E.key === 'main', nk = 'n:' + E.key;
  if (main) { const C = STORY[S.ch], tod = st.tod != null ? st.tod : S.st === 0 ? C.tod : null; if (tod != null) App.tod = tod; }
  else if (st.tod != null) App.tod = st.tod;
  if (st.t === 'talk') { const P = Story.place(st.at); Story.npc(nk, st.who, P); S.met[st.who] = 1; }
  else if (st.t === 'run' && st.npc) { const P = Story.place(st.at); Story.npc(nk, st.npc, P); }
  else Story.dropNpc(nk);
  if (main && st.t === 'bank') S.base.bank = Object.values(intSave().banks || {}).reduce((s, r) => s + (r.n | 0), 0);
  if (st.enter) st.enter();
  if (st.t === 'call') Story.say(STORY_LINES(st.lines), () => Story.advance(E.key, E.i));
  if (st.t === 'cut') Story.cutAt[E.key] = App.time + 0.9;   /* plays as soon as nothing else is on screen */
  writeSave();
};
/* where a step wants you to go */
Story.target = function (E) {
  const st = E.st; if (!st) return null;
  if (st.t === 'talk') { const n = Story.npcs['n:' + E.key]; return n ? { x: n.x, z: n.z, label: STORY_CAST[st.who].name } : null; }
  if (st.t === 'run') { if (Mi && Mi.def === Story.def(st.id)) return null; const m = Story.def(st.id); return { x: m.x, z: m.z, label: m.title }; }
  if (st.t === 'goto') { const P = Story.place(st.at); return { x: P.x, z: P.z, label: P.label }; }
  if (st.t === 'mission') { const m = st.m(); return m ? { x: m.x, z: m.z, label: m.title } : null; }
  if (st.t === 'bank') { const P = Story.place('bank'); return { x: P.x, z: P.z, label: P.label }; }
  if (st.t === 'heist') { const H = Heist.sites[st.k]; return H ? { x: H.sx, z: H.sz, label: 'The ramp by the line' } : null; }
  return null;
};
/* a step is done: on to the next one (a side quest that runs out pays and is finished) */
Story.advance = function (key, i) {
  const S = Story.S();
  if (key === 'main') { if (S.ch * 100 + S.st !== i) return; Story.consequences(Story.step()); S.st++;
    if (S.st >= STORY[S.ch].steps.length) {
      S.ch++; S.st = 0; S.base = {};
      if (S.ch >= STORY.length) { S.fin = 1; const pay = Story.finish(); writeSave(); UI.banner('STORY COMPLETE', 'Thanks for playing · +' + money(pay)); Snd.win(); return; }
      UI.banner('CHAPTER ' + (S.ch + 1), STORY[S.ch].title); Snd.win();
    }
  } else {
    const id = key.slice(3), q = SIDE.find((x) => x.id === id), r = S.sq[id] || (S.sq[id] = { st: 0 }); if (r.st !== i || r.done) return;
    const st = q.steps[r.st]; if (st.done) st.done(); r.st++;
    if (r.st >= q.steps.length) { r.done = 1; Story.applyEff(q.aff || {}); if (q.reward) save.money += q.reward; if (S.track === key) S.track = null; UI.banner('SIDE QUEST COMPLETE', q.title + (q.reward ? ' · +' + money(q.reward) : '')); Snd.win(); }
  }
  writeSave(); GPS.t = 0;
};
/* every frame in play: set new steps up, see whether any is done, and who is near */
Story.tick = function (dt) {
  if (!Story.on || App.mode !== 'play' || !Story.started) return; const S = Story.S(); Story.t += dt;
  if (Story.rivalH && (!Mi || Mi.phase === 'done')) Story.dropRival();
  if (Mi && Mi.rival && Mi.rival.boostT > 0) { Mi.rival.boostT -= dt; if (Mi.rival.boostT <= 0) Mi.rival.boost = 0; }
  const E = Story.entries(), keys = new Set(E.map((e) => e.key)); Story.near = null;
  for (const k of Object.keys(Story.prep)) if (!keys.has(k)) { delete Story.prep[k]; Story.dropNpc('n:' + k); Story.setBeam(k, null); }
  for (const e of E) {
    const sig = e.i + ':' + e.st.t; if (Story.prep[e.key] !== sig) { Story.prep[e.key] = sig; Story.setup(e); }
    const st = e.st; Story.setBeam(e.key, Cut.on ? null : Story.target(e));
    if (st.t === 'talk') { const n = Story.npcs['n:' + e.key]; if (n) { const d = Math.hypot(Pl.x - n.x, Pl.z - n.z); if (d < 3.2 && Foot.on) Story.near = Story.near || { e, n }; else if (d < 12 && !Foot.on && !Story.near) Story.near = { e, what: 'car', n }; } }
    else if (st.t === 'run') {
      const m = Story.def(st.id); if (save.done[m.id] && !Mi) { Story.advance(e.key, e.i); continue; }
      if (!Mi && Math.hypot(Pl.x - m.x, Pl.z - m.z) < 16 && !Story.near) Story.near = { e, what: Foot.on ? 'foot' : 'run' };
      if (Mi && Mi.def === m && Mi.phase === 'run' && st.events) { const fr = Mi.idx / Mi.cps.length; st.events.forEach((ev, j) => { const k = m.id + ':' + j; if (!Story.ev[k] && fr >= ev[0]) { Story.ev[k] = 1; ev[1](); } }); }
    }
    else if (st.t === 'cut') { if (!Cut.on && !Mi && Story.cutAt[e.key] != null && App.time > Story.cutAt[e.key]) { Story.cutAt[e.key] = null; Story.playCut(e); } }
    else if (st.t === 'goto') { const P = Story.place(st.at); if (Math.hypot(Pl.x - P.x, Pl.z - P.z) < (st.r || 16)) Story.advance(e.key, e.i); }
    else if (st.t === 'mission') { const m = st.m(); if (m && save.done[m.id] && !Mi) Story.advance(e.key, e.i); }
    else if (st.t === 'bank') { const n = Object.values(intSave().banks || {}).reduce((s, r) => s + (r.n | 0), 0); if (n > (S.base.bank | 0)) Story.advance(e.key, e.i); }
    else if (st.t === 'heist') { const P = HEIST_PRIZES[st.k]; if (P && save.owned[P.id] && Heist.phase === 'idle') Story.advance(e.key, e.i); }
    else if (st.t === 'clean') { if (Wanted.stars === 0) Story.advance(e.key, e.i); }
  }
  /* the GPS follows the quest you are tracking (the main story unless you picked a side quest) */
  const tr = E.find((e) => e.key === S.track) || E.find((e) => e.key === 'main') || E[0]; Story.tg = tr ? Story.target(tr) : null; Story.trk = tr || null;
  /* people you walk or drive past say something now and then */
  Story.barkT -= dt; if (Story.barkT <= 0 && !Mi) { for (const k in Story.npcs) { const n = Story.npcs[k]; if (n.h.root.visible && Math.hypot(Pl.x - n.x, Pl.z - n.z) < 14 && !Story.comm.cur) { const B = STORY_BARK[n.id]; if (B) { Story.say([[n.id, B[Math.floor(Math.random() * B.length)]]]); Story.barkT = 25; } break; } } }
};
const STORY_BARK = { mara: ['Over here! Engine running, brain off, as usual.', 'Get out of the car, I don’t bite. Much.', 'Took your time!'], rico: ['Ferry kid! Over here!', 'You lost? Ha.'], sal: ['Over here, son. My knees don’t walk to you.'], dex: ['Don’t keep me waiting. I hate waiting.'], nina: ['Over here. Quietly.'], hal: ['That my gearbox? Bring it here!'], jax: ['…'] };
Story.key = function (code) {
  if (!Story.on || code !== 'KeyE' || !Story.near || Story.near.what === 'car' || Story.near.what === 'foot') return false;
  const N = Story.near; if (N.what === 'run') { Story.startRun(N.e); return true; }
  Story.playCut(N.e, N.n); return true;
};
/* a story run: line up at the start, play its intro (the rival in the next lane for a race), then go */
Story.startRun = function (E) {
  const st = E.st, m = Story.def(st.id); if (Mi || Cut.on) return; Story.setBeam(E.key, null);
  for (const k of Object.keys(Story.ev)) if (k.indexOf(m.id + ':') === 0) delete Story.ev[k];
  if (m.type === 'race') { routePos(m, m.s0 - 25, _smp); const dx = _smp.tx, dz = _smp.tz, l = Math.hypot(dx, dz) || 1, rx = dz / l, rz = -dx / l; spawnAt(_smp.x + rx * 2.2, _smp.z + rz * 2.2, Math.atan2(dx, dz)); }
  else spawnAt(m.x, m.z, car.yaw);
  startMission(m); if (!Mi) return; Mi.cd = 1e9;   /* the countdown waits for the intro */
  if (Mi.rival) Story.rival(m.rivalWho, Mi.rival.mesh, 1);
  Cut.play(STORY_LINES(st.intro), st.npc ? Story.npcs['n:' + E.key] : null, () => { if (Mi && Mi.def === m) Mi.cd = 3.4; });
};
/* ---------- the comms box: calls and radio chatter while you drive ---------- */
Story.say = function (lines, done) { const C = Story.comm; for (const L of lines) C.q.push({ who: L[0], text: L[1] }); if (done) C.q.push({ done }); };
Story.commTick = function (dt) {
  const C = Story.comm, el = C.el; if (!el) return;
  if (App.mode !== 'play') { el.hidden = true; return; }
  if (!C.cur && C.q.length) { C.cur = C.q.shift(); if (C.cur.done) { const d = C.cur.done; C.cur = null; d(); return; } C.t = 0; C.log.push(C.cur); if (C.log.length > 80) C.log.shift(); Snd.beep(/phone|text/.test(C.cur.who) ? 980 : 640, 0.05); }
  const c = C.cur; if (!c) { el.hidden = true; return; }
  C.t += dt; const n = Math.min(c.text.length, Math.floor(C.t * 50)), who = STORY_CAST[c.who] ? STORY_CAST[c.who].name : c.who;
  /* a phone call or a text comes in on the phone itself (it opens, and shows the conversation); radio, scanner and passers-by stay in the box */
  if (/\((phone|text)\)/.test(c.who) && typeof Phone !== 'undefined' && Phone.el) { el.hidden = true; Phone.incoming(c, n); if (C.t > 2.6 + c.text.length * 0.045) C.cur = null; return; }
  el.hidden = false; el.innerHTML = (who ? '<b>' + (/phone|text/.test(who) ? '📱 ' : /radio|scanner/i.test(who) ? '📻 ' : '') + who + '</b>' : '') + '<span>' + c.text.slice(0, n) + '</span>';
  if (C.t > 2.6 + c.text.length * 0.045) C.cur = null;
};
/* ---------- cutscenes ---------- */
const Cut = { on: false, lines: null, i: 0, typed: 0, t: 0, npc: null, el: null, done: null, ca: 0, choosing: false, opts: null };
Story.playCut = function (E, npc) {
  if (Cut.on) return; const key = E.key, i = E.i;
  Cut.play(STORY_LINES(E.st.lines), npc || null, () => Story.advance(key, i));
};
Cut.play = function (lines, npc, done) {
  Story.ui(); Cut.on = true; Cut.lines = lines; Cut.i = -1; Cut.npc = npc; Cut.done = done; Cut.ca = 0; Cut.choosing = false;
  for (const k in Keys) Keys[k] = false; car.thr = car.brk = 0;
  if (npc && Foot.on) { Foot.yaw = Math.atan2(npc.x - Foot.x, npc.z - Foot.z); npc.h.root.rotation.y = Math.atan2(Foot.x - npc.x, Foot.z - npc.z); }
  UI.setMode('cut'); Cut.el.hidden = false; Cut.next();
};
Cut.next = function () {
  if (Cut.i >= 0 && Cut.typed < Cut.lines[Cut.i][1].length) { Cut.typed = 1e9; return; }   /* the first press finishes the line, the next one moves on */
  if (Cut.choosing) return;   /* a choice waits for you */
  Cut.i++; Cut.t = 0; Cut.typed = 0;
  if (Cut.i >= Cut.lines.length) { Cut.end(); return; }
  Snd.beep(520, 0.03); const L = Cut.lines[Cut.i];
  if (L[3]) { Cut.choosing = true; Cut.opts.innerHTML = L[3].map((o, k) => '<button type="button" data-k="' + k + '"><kbd>' + (k + 1) + '</kbd> ' + o[0] + '</button>').join(''); Cut.opts.hidden = false; }
};
/* a dialogue choice: what it changes, then the lines it leads to */
Cut.choose = function (k) {
  const L = Cut.lines[Cut.i], o = L && L[3] && L[3][k]; if (!o || !Cut.choosing) return; Snd.beep(760, 0.06);
  Story.applyEff(o[1]); (Story.S().said || (Story.S().said = [])).push(o[0]); Cut.choosing = false; Cut.opts.hidden = true; Cut.lines = Cut.lines.slice(0, Cut.i + 1).concat(o[2] || [], Cut.lines.slice(Cut.i + 1)); Cut.typed = 1e9; Cut.next();
};
Cut.end = function () { Cut.choosing = false; if (Cut.opts) Cut.opts.hidden = true; Cut.on = false; Cut.el.hidden = true; Cut.el.classList.remove('card'); UI.setMode('play'); const d = Cut.done; Cut.done = null; if (d) d(); };
Cut.key = function (code) {
  if (Cut.choosing && /^Digit[1-9]$/.test(code)) { Cut.choose(+code.slice(5) - 1); return; }
  if (code === 'Escape') { for (let i = Math.max(0, Cut.i); i < Cut.lines.length; i++) if (Cut.lines[i][3] && !(i === Cut.i && !Cut.choosing)) Story.applyEff(Cut.lines[i][3][0][1]); Cut.i = Cut.lines.length; Cut.typed = 0; Cut.end(); return; }   /* skipping takes the first answer to each choice */
  if (code === 'Space' || code === 'Enter' || code === 'KeyE') Cut.next();
};
Cut.whoName = (w) => (w === 'you' ? 'You' : STORY_CAST[w] ? STORY_CAST[w].name : w);
const _cutV = new THREE.Vector3(), _cutH = new THREE.Vector3(), _cutP = new THREE.Vector3();
/* a person talking or listening: hands that move with the words, a head that turns and nods, a jaw that moves while they speak */
Cut.gesture = function (h, talk, t, seed) {
  const b = h.b, g = Math.sin(t * 2.6 + seed), g2 = Math.sin(t * 1.7 + seed * 2);
  b.armR.rotation.x = talk ? -0.55 - 0.35 * (0.5 + 0.5 * g) : -0.08; b.elR.rotation.x = talk ? -0.9 - 0.3 * g2 : -0.15;
  b.armL.rotation.x = talk ? -0.25 - 0.2 * (0.5 + 0.5 * g2) : -0.05; b.elL.rotation.x = talk ? -0.6 : -0.12;
  b.head.rotation.x = talk ? 0.04 * Math.sin(t * 3.3) : 0.02; b.head.rotation.y = 0.12 * Math.sin(t * 0.6 + seed);
  b.jaw.rotation.x = talk ? 0.06 + 0.07 * Math.abs(Math.sin(t * 13 + seed)) : 0.02;
};
/* where the camera is for each kind of shot; k (0..1) runs over the line so the camera drifts within a shot */
Cut.frame = function (dt) {
  if (!Cut.on) { titleCamera(dt); return; }
  const L = Cut.lines[Cut.i]; if (!L) return; Cut.t += dt; Cut.typed = Math.min(L[1].length, Cut.typed + dt * 46);
  const shot = L[2] || (Cut.npc ? 'two' : 'car'), auto = (shot === 'card' ? 2.2 : 2.6) + L[1].length * 0.055; if (Cut.typed >= L[1].length && Cut.t > auto && !Cut.choosing) Cut.next();
  const sp = Cut.el.querySelector('b'), tx = Cut.el.querySelector('p'); sp.textContent = Cut.whoName(L[0]); sp.hidden = !L[0]; tx.textContent = L[1].slice(0, Math.floor(Cut.typed));
  Cut.el.classList.toggle('card', shot === 'card'); Cut.el.classList.toggle('phone', /\((phone|text)\)/.test(L[0]));
  const k = clamp(Cut.t / Math.max(3, auto), 0, 1), t = App.time, me = Foot.on ? { x: Foot.x, y: Foot.y, z: Foot.z } : { x: car.x, y: car.y, z: car.z }, n = Cut.npc, R = Story.rivalH;
  const fw = { x: Math.sin(car.yaw), z: Math.cos(car.yaw) }, rt = { x: Math.cos(car.yaw), z: -Math.sin(car.yaw) };
  if (n) Cut.gesture(n.h, L[0] === n.id && Cut.typed < L[1].length + 8, t, n.h.id);
  if (R) {
    const b = R.h.b, talk = L[0] === R.who; b.armR.rotation.x = talk ? -2.3 + 0.35 * Math.sin(t * 7) : -1.1; b.elR.rotation.x = talk ? -0.5 : -1.3; b.armL.rotation.x = -0.9; b.elL.rotation.x = -1.2;
    b.head.rotation.x = -0.75 + (talk ? 0.05 * Math.sin(t * 4) : 0); b.head.rotation.y = 0.25 * Math.sin(t * 0.8); b.jaw.rotation.x = talk && Cut.typed < L[1].length ? 0.06 + 0.08 * Math.abs(Math.sin(t * 14)) : 0.02;
    Human.alive(R.h, dt, t, 1.3);
  }
  if (shot === 'card') { camera.position.set(me.x, me.y + 60, me.z); _cutV.set(me.x, me.y, me.z + 1); camera.lookAt(_cutV); }
  else if (n && (shot === 'two' || shot === 'npc' || shot === 'me')) {
    const dx = n.x - me.x, dz = n.z - me.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, px = -uz, pz = ux, side = Cut.i % 2 ? 1 : -1, ny = n.y + 1.58, my = me.y + (Foot.on ? 1.58 : 1.1);
    if (shot === 'two') { camera.position.set((me.x + n.x) / 2 + px * (3.6 - 0.5 * k) * side, (my + ny) / 2 + 0.1, (me.z + n.z) / 2 + pz * (3.6 - 0.5 * k) * side); _cutV.set((me.x + n.x) / 2, (my + ny) / 2 - 0.1, (me.z + n.z) / 2); }
    else if (shot === 'npc') { camera.position.set(me.x - ux * 0.5 + px * 0.55 * side, my + 0.05, me.z - uz * 0.5 + pz * 0.55 * side); camera.position.lerp(_cutP.set(n.x, ny, n.z), 0.12 * k); _cutV.set(n.x, ny, n.z); }
    else { camera.position.set(n.x + ux * 0.5 + px * 0.55 * side, ny + 0.05, n.z + uz * 0.5 + pz * 0.55 * side); camera.position.lerp(_cutP.set(me.x, my, me.z), 0.12 * k); _cutV.set(me.x, my, me.z); }
    camera.lookAt(_cutV);
  } else if (shot === 'rival' && R) {
    R.h.b.head.getWorldPosition(_cutH); const ox = rt.x * R.side, oz = rt.z * R.side;
    camera.position.set(car.x + fw.x * (0.6 + 0.6 * k) - ox * 0.2, _cutH.y + 0.1, car.z + fw.z * (0.6 + 0.6 * k) - oz * 0.2); _cutV.copy(_cutH); camera.lookAt(_cutV);
  } else if (shot === 'line') {
    const cx = R ? (car.x + R.mesh.position.x) / 2 : car.x, cz = R ? (car.z + R.mesh.position.z) / 2 : car.z, D = 11 + 4 * k;
    camera.position.set(cx + fw.x * D + rt.x * 2.5 * Math.sin(k * 1.5), car.y + 0.7, cz + fw.z * D + rt.z * 2.5 * Math.sin(k * 1.5)); _cutV.set(cx, car.y + 0.9, cz); camera.lookAt(_cutV);
  } else if (shot === 'mecar' || shot === 'phone') {
    const s = R ? -R.side : 1;
    camera.position.set(car.x + rt.x * 2.6 * s + fw.x * (1.4 - 0.6 * k), car.y + 1.25, car.z + rt.z * 2.6 * s + fw.z * (1.4 - 0.6 * k)); _cutV.set(car.x + fw.x * 0.1, car.y + 1.0, car.z + fw.z * 0.1); camera.lookAt(_cutV);
  } else if (shot === 'wide') {
    const a = car.yaw + 2.2 + k * 0.5, D = 46; camera.position.set(me.x + Math.sin(a) * D, me.y + 22 - 6 * k, me.z + Math.cos(a) * D); _cutV.set(me.x, me.y + 2, me.z); camera.lookAt(_cutV);
  } else {
    const a = car.yaw + Cut.ca * 0.12 + 0.6, D = 9.5; camera.position.set(me.x + Math.sin(a) * D, me.y + 2.6, me.z + Math.cos(a) * D); _cutV.set(me.x, me.y + 1, me.z); camera.lookAt(_cutV);
  }
  Cut.ca += dt; placeBody(); car.ext.visible = true;
  if (Math.abs(camera.fov - 44) > 0.1) { camera.fov = 44; camera.updateProjectionMatrix(); }
};
/* ---------- what is on screen ---------- */
Story.setBeam = function (key, tg) {
  let b = Story.beams[key]; if (!tg) { if (b) b.visible = false; return; }
  if (!b) { b = Story.beams[key] = makeBeam(key === 'main' ? '#ffd34d' : '#4ab8ff', key === 'main' ? 2.6 : 2.0, 200); scene.add(b); }
  b.visible = true; b.position.set(tg.x, terrainHeight(tg.x, tg.z), tg.z); b.material.opacity = clamp(Math.hypot(Pl.x - tg.x, Pl.z - tg.z) / 200, 0.08, key === 'main' ? 0.85 : 0.6);
};
Story.visual = function (dt) {
  if (!Story.on) return;
  for (const k in Story.npcs) { const n = Story.npcs[k]; if (n.h.root.visible) { Human.alive(n.h, dt, App.time, n.h.id * 0.37); if (!Cut.on) Cut.gesture(n.h, false, App.time, n.h.id); } }
  Story.commTick(dt);
  const el = Story.hudEl; if (!el) return; const S = Story.S(), tr = Story.trk, st = tr && tr.st, show = App.mode === 'play' && !!st && !(Mi && Mi.def && !Mi.def.story && st.t !== 'mission');
  el.hidden = !show; if (!show) return;
  const main = tr.key === 'main', tx = Mi && Mi.def && Mi.def.story ? Mi.def.title : st.obj || (st.t === 'call' ? 'Incoming call…' : st.t === 'talk' ? 'Talk to ' + STORY_CAST[st.who].name : ''); let hint = '';
  const N = Story.near;
  if (N && N.what === 'car') hint = 'Get out (F) to talk to ' + STORY_CAST[N.n.id].name.split(' ')[0];
  else if (N && N.n) hint = (TouchIn.on ? 'Tap TALK' : 'E') + ' · Talk to ' + STORY_CAST[N.n.id].name.split(' ')[0];
  else if (N && N.what === 'run') hint = (TouchIn.on ? 'Tap GO' : 'E') + ' · Start';
  else if (N && N.what === 'foot') hint = 'Get in your car (F) to start';
  else if (Story.tg) { const d = Math.hypot(Pl.x - Story.tg.x, Pl.z - Story.tg.z); hint = Story.tg.label + ' · ' + (d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'); }
  const nSide = Story.entries().filter((e) => e.key !== 'main').length;
  el.innerHTML = '<small>' + (main ? 'CHAPTER ' + (S.ch + 1) + ' · ' + STORY[S.ch].title.toUpperCase() : 'SIDE QUEST · ' + tr.q.title.toUpperCase()) + '</small><b>' + tx + '</b>' + (hint ? '<i>' + hint + '</i>' : '') + (nSide && main ? '<em>' + nSide + ' side quest' + (nSide > 1 ? 's' : '') + ' · quest log in the phone or menu</em>' : '');
};
/* the quest log (pause menu → Story, and the phone): where you are, the chapters, the side quests, the people, your choices */
Story.trackSet = function (key) { Story.S().track = key === 'main' ? null : key; writeSave(); GPS.t = 0; UI.toast('Tracking: ' + (key === 'main' ? 'the main story' : (SIDE.find((q) => 'sq:' + q.id === key) || {}).title), 'info'); };
Story.logHtml = function () {
  const S = Story.S(), f = Story.F(), E = Story.entries(), tk = S.track || 'main', btn = (k) => '<button class="btn sm" type="button" data-act="sqt" data-id="' + k + '"' + (tk === k ? ' disabled' : '') + '>' + (tk === k ? 'Tracking' : 'Track') + '</button>';
  let h = '<div class="sect">Story</div>';
  const m = E.find((e) => e.key === 'main'); h += S.fin ? '<p>The story is complete. ' + Story.summary().join(' · ') + '</p>' : '<div class="row"><div><b>Chapter ' + (S.ch + 1) + ' · ' + STORY[S.ch].title + '</b><br><small>' + ((m && m.st.obj) || '…') + '</small></div>' + btn('main') + '</div>';
  h += '<div class="sect">Chapters</div>' + STORY.map((C, i) => '<div class="row"><div>' + (i < S.ch || S.fin ? '✓ ' : i === S.ch ? '▶ ' : '· ') + '<b>' + (i <= S.ch || S.fin ? C.title : '???') + '</b>' + (i < S.ch || S.fin ? '<br><small>' + C.sum + '</small>' : '') + '</div></div>').join('');
  h += '<div class="sect">Side quests</div>'; let any = 0;
  for (const q of SIDE) { const r = S.sq[q.id], e = E.find((x) => x.key === 'sq:' + q.id); if (!r && !e) continue; any++; h += '<div class="row"><div>' + (r && r.done ? '✓ ' : '') + '<b>' + q.title + '</b> <small>· ' + STORY_CAST[q.who].name + '</small><br><small>' + (r && r.done ? 'Done' : e && e.st.obj ? e.st.obj : q.desc) + (q.reward && !(r && r.done) ? ' · ' + money(q.reward) : '') + '</small></div>' + (e ? btn('sq:' + q.id) : '') + '</div>'; }
  if (!any) h += '<p><small>None yet. People will call you, or ask in person, as the story goes on.</small></p>';
  h += '<div class="sect">People</div>';
  for (const id of ['mara', 'rico', 'nina', 'sal', 'jax', 'hal', 'dex']) { if (!S.met[id]) continue; const v = clamp((f[id] | 0) + 3, 0, 10); h += '<div class="row"><div><b>' + STORY_CAST[id].name + '</b> <small>· ' + STORY_CAST[id].role + '</small><br><small>' + Story.relLabel(id) + '</small></div><div style="min-width:110px;height:8px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden"><i style="display:block;height:100%;width:' + v * 10 + '%;background:' + (id === 'mara' && f.maraLove ? '#ff6a8a' : '#ffd34d') + '"></i></div></div>'; }
  if ((S.said || []).length) h += '<div class="sect">What you said</div>' + S.said.slice(-8).map((s) => '<p><small>' + s + '</small></p>').join('');
  return h;
};
Story.ui = function () {
  if (Cut.el) return;
  const css = document.createElement('style');
  css.textContent = '#cut{position:fixed;inset:0;z-index:60;pointer-events:auto;cursor:pointer}#cut::before,#cut::after{content:"";position:absolute;left:0;right:0;height:11vh;background:#000;transition:height .4s}#cut::before{top:0}#cut::after{bottom:0}' +
    '#cut .sub{position:absolute;left:50%;bottom:14vh;transform:translateX(-50%);width:min(860px,92vw);text-align:center;font:600 20px/1.35 Rajdhani,system-ui,sans-serif;color:#fff;text-shadow:0 2px 6px #000;white-space:pre-line}' +
    '#cut .sub b{display:block;color:#ffd34d;font-size:15px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}#cut .sub p{margin:0;min-height:2.7em}#cut .skip{position:absolute;right:18px;bottom:3.5vh;color:#aaa;font:500 13px Rajdhani,system-ui,sans-serif;z-index:2}' +
    '#cut.phone .sub b::before{content:"📱 "}#cut.card{background:#000}#cut.card .sub{bottom:auto;top:50%;transform:translate(-50%,-50%);font-size:30px;letter-spacing:.18em;color:#f2e6c8}' +
    '#cutOpts{position:absolute;left:50%;bottom:calc(14vh + 72px);transform:translateX(-50%);display:flex;flex-direction:column;gap:7px;width:min(620px,92vw);z-index:3}#cutOpts button{font:600 17px Rajdhani,system-ui,sans-serif;color:#fff;background:rgba(10,14,24,.86);border:1px solid rgba(255,211,77,.5);border-radius:9px;padding:9px 14px;text-align:left;cursor:pointer}#cutOpts button:hover{background:rgba(60,48,12,.9)}#cutOpts kbd{display:inline-block;min-width:1.4em;text-align:center;color:#ffd34d;font:700 14px Rajdhani,system-ui,sans-serif;margin-right:6px}' +
    '#storyObj{position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(8,12,20,.72);border:1px solid rgba(255,211,77,.45);border-radius:10px;padding:7px 16px 8px;text-align:center;font-family:Rajdhani,system-ui,sans-serif;color:#fff;pointer-events:none;max-width:88vw}' +
    '#storyObj small{display:block;color:#ffd34d;font-size:11px;letter-spacing:.14em}#storyObj b{display:block;font-size:17px;font-weight:600}#storyObj i{display:block;font-style:normal;font-size:13px;color:#cfd6e4}#storyObj em{display:block;font-style:normal;font-size:11px;color:#8fb8e0;margin-top:2px}' +
    '#storyComm{position:fixed;left:16px;bottom:180px;z-index:31;max-width:min(420px,80vw);background:rgba(8,12,20,.82);border-left:3px solid #4ab8ff;border-radius:8px;padding:8px 12px;font:500 15px/1.3 Rajdhani,system-ui,sans-serif;color:#fff;pointer-events:none}#storyComm b{display:block;color:#8fd0ff;font-size:12px;letter-spacing:.08em;text-transform:uppercase}';
  document.head.appendChild(css);
  const c = Cut.el = document.createElement('div'); c.id = 'cut'; c.hidden = true; c.innerHTML = '<div class="sub"><b></b><p></p></div><div class="skip">Space / click: next · Esc: skip</div>'; document.body.appendChild(c);
  c.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('#cutOpts button'); e.preventDefault(); if (b) Cut.choose(+b.dataset.k); else Cut.next(); });
  const op = Cut.opts = document.createElement('div'); op.id = 'cutOpts'; op.hidden = true; c.appendChild(op);
  const h = Story.hudEl = document.createElement('div'); h.id = 'storyObj'; h.hidden = true; document.body.appendChild(h);
  const cm = Story.comm.el = document.createElement('div'); cm.id = 'storyComm'; cm.hidden = true; document.body.appendChild(cm);
};
/* ---------- the title screen: free roam or the story, each its own save ---------- */
Story.switchTo = function (mode) { try { writeSave(); localStorage.setItem(MODE_KEY, mode); localStorage.setItem('island-rush-go', String(Date.now())); } catch (e) { /* ignore */ } location.reload(); };
Story.initTitle = function () {
  const b = document.getElementById('btnStart'); if (!b || document.getElementById('btnStory')) return;
  let has = false, ch = 0; try { const o = JSON.parse(localStorage.getItem(STORY_KEY) || 'null'); has = !!(o && o.story); ch = has ? (o.story.ch | 0) : 0; } catch (e) { /* ignore */ }
  b.innerHTML = 'Start engine<small style="display:block;font-size:11px;opacity:.75;font-weight:500">Free roam</small>';
  const s = document.createElement('button'); s.className = 'btn primary'; s.id = 'btnStory'; s.type = 'button';
  s.innerHTML = 'Story mode<small style="display:block;font-size:11px;opacity:.75;font-weight:500">' + (has ? (ch >= STORY.length ? 'Complete · replay from the end' : 'Continue · Chapter ' + (ch + 1)) : 'New story · its own save') + '</small>';
  b.after(s);
  b.onclick = () => { if (PLAY_MODE === 'sandbox') App.start(); else Story.switchTo('sandbox'); };
  s.onclick = () => { if (PLAY_MODE === 'story') App.start(); else Story.switchTo('story'); };
  const mh = document.getElementById('menuHead'); if (mh && !document.getElementById('btnTitle')) { const t = document.createElement('button'); t.className = 'btn sm'; t.id = 'btnTitle'; t.type = 'button'; t.textContent = '⏏ Title screen'; t.title = 'Back to the title: switch between free roam and the story'; t.onclick = () => { writeSave(); location.reload(); }; mh.appendChild(t); }
  if (PLAY_MODE === 'story') { const tg = document.getElementById('tagline'); if (tg) tg.textContent = 'Story mode: ' + (has ? 'chapter ' + Math.min(ch + 1, STORY.length) + ' of ' + STORY.length : 'a new life on the island') + '. Free roam keeps its own save.'; }
};
/* straight into the game after a switch (the page reloads into the other save): a note left just before the reload, good for 20 s */
Story.autoStart = function () { let go = false; try { const t = +localStorage.getItem('island-rush-go') || 0; go = Date.now() - t < 20000; localStorage.removeItem('island-rush-go'); } catch (e) { /* ignore */ } if (go) setTimeout(() => App.start(), 60); };
