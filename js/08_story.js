/* ================= STORY MODE =================
   A second game beside the sandbox, with its own save (01_core.js: PLAY_MODE). It runs as chapters, one after another, each a list of steps:
     cut      a cutscene: letterbox bars, a camera that cuts between shots and drifts within them, people who gesture and talk, time-and-place cards
              (Space / Enter / click for the next line, Esc skips)
     talk     find someone (a marker over them), get out of the car and press E: the conversation plays as a cutscene
     run      one of the story's own runs (not the sandbox's): drive to its start and press E. Its intro plays first; for a street race that is
              the two of you side by side on the line, your rival leaning out of the window to talk trash. Fail and you can try again
     mission  one of the island's runs (the Eruption Escape)
     bank     rob a bank (08_int_zjob.js)       heist  take the Aurum off its train (08_heist.js)       clean  lose the police
   Each step can set the time of day, so that when somebody says "tonight", it is night. The objective is always on screen and on the GPS, and
   progress is saved after each step.
   The cast: Mara Quinn (your cousin, a mechanic), Dex Calloway (a fixer), Sal Ortega (forty years on the railway), and two rivals: Rico "Viper"
   Vance, the king of the night races, and Jax Kincaid, Dex's own driver. */
const Story = { on: PLAY_MODE === 'story', npcs: {}, tg: null, cur: null, beam: null, near: null, hudEl: null, t: 0, defs: {}, rivalH: null };
const STORY_CAST = {
  mara: { name: 'Mara Quinn', o: () => ({ fem: true, skin: lc(0xc8906a), hair: lc(0x6a2a14), hst: 'pony', shirt: lc(0x2f6f78), pants: lc(0x2a3448), shoe: lc(0x2a2018), sleeve: false }) },
  dex: { name: 'Dex Calloway', o: () => ({ skin: lc(0xe0b090), hair: lc(0x1a1410), hst: 'short', beard: true, suit: true, tie: lc(0x8a1a22), shirt: lc(0x22252c), pants: lc(0x22252c), inner: lc(0xdddddd), glasses: true, sun: true }) },
  sal: { name: 'Sal Ortega', o: () => ({ old: true, skin: lc(0x9a6a4a), hair: lc(0xcfcfcf), hst: 'short', beard: true, coat: true, shirt: lc(0x3a4a5a), pants: lc(0x3a3428), hat: { k: 'cap', c: lc(0x24324a) } }) },
  rico: { name: 'Rico “Viper” Vance', o: () => ({ skin: lc(0xb07850), hair: lc(0x101010), hst: 'short', shirt: lc(0x9be02a), pants: lc(0x202020), glasses: true, sun: true, hat: { k: 'cap', c: lc(0x101010) } }) },
  jax: { name: 'Jax Kincaid', o: () => ({ skin: lc(0xf0c8a8), hair: lc(0xd8c070), hst: 'short', shirt: lc(0x15151a), pants: lc(0x15151a), sleeve: true, coat: true }) }
};
/* ---------- places, worked out from the world ---------- */
Story.place = function (k) {
  const o = {};
  if (k === 'garage') { o.x = GAR.ox + 6; o.z = GAR.oz + 7; o.yaw = Math.PI; o.label = 'Mara’s garage, ' + (GAR.town || towns[0].name); }
  else if (k === 'dex') { Bld.prep(); const S = Bld.sites.find((s) => (s.kind === 'resto' || s.kind === 'club') && REG[s.ti % REG.length].key === 'city') || Bld.sites.find((s) => s.kind === 'resto'); o.x = S.x + 2; o.z = S.z + (S.b ? 3.5 : -3.5); o.yaw = S.b ? 0 : Math.PI; o.label = S.name + ', ' + S.T.name; o.site = S; o.town = S.T.name; }
  else if (k === 'bank') { Bld.prep(); const S = Bld.sites.find((s) => s.kind === 'bank' && BJ_TIER[s.ti] === 0) || Bld.sites.find((s) => s.kind === 'bank'); o.x = S.x; o.z = S.z + (S.b ? 4 : -4); o.label = S.name + ', ' + S.T.name; o.site = S; o.town = S.T.name; }
  else if (k === 'sal') { const S = Heist.sites[0]; o.x = S.sx + S.rz * 9; o.z = S.sz - S.rx * 9; o.yaw = Math.atan2(S.sx - o.x, S.sz - o.z); o.label = 'the old line'; }
  else if (k === 'camp') { const m = missions.find((q) => q.id === 'mvolc'); o.x = m.x + 7; o.z = m.z; o.yaw = -Math.PI / 2; o.label = 'Mount Cinder base camp'; }
  else if (k === 'evac') { const m = missions.find((q) => q.id === 'mvolc'), f = m.cps[m.cps.length - 1]; o.x = f.x + 6; o.z = f.z + 4; o.yaw = 0; o.label = 'Ashfall'; }
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
/* the link out of town ti (the longest), or the longest link between two other towns */
function storyLink(ti, avoid) { let best = -1, bl = 0; links.forEach((l, i) => { const L = roads[l.road].len; const has = l.a === ti || l.b === ti; if ((ti == null ? !avoid.includes(l.a) && !avoid.includes(l.b) && l.a < 7 && l.b < 7 : has) && L > bl && L < 3200) { bl = L; best = i; } }); return best; }
Story.def = function (id) {
  if (Story.defs[id]) return Story.defs[id]; let m = null;
  if (id === 'sm_parts') {
    const G = Story.place('garage'), B = towns[3], tp = townPath(0, 3);
    m = { id, type: 'delivery', story: true, rep: 30, from: towns[0].name, to: B.name, x: G.x - 4, z: G.z + 2, h: G.y, cps: [{ x: B.cx, z: B.cz - B.cell, h: B.baseH, r: 18, finish: true }], limit: (tp.dist + 500) / 26 + 60, reward: 1500, title: 'Parts Run: ' + towns[0].name + ' → ' + B.name, desc: '' };
  } else if (id === 'sm_race1') { const li = storyLink(0); const l = links[li]; m = storyRace(id, li, l.a === 0 ? 1 : -1, { v: 39, reward: 4000, title: 'Night Race', who: 'rico', car: 'muscle', col: 0x9be02a }); }
  else if (id === 'sm_race2') { const li = storyLink(null, [0]); m = storyRace(id, li, 1, { v: 45, reward: 9000, title: 'Sunset Showdown', who: 'jax', car: 'vanta', col: 0x15151a }); }
  return (Story.defs[id] = m);
};

/* ---------- the chapters ---------- */
const T0 = () => towns[0].name;
/* the choices you have made (save.story.f): mara (trust, a number), rico ('ally' | 'shamed'), cut (50 | 70 | 'out'), sal ('careful' | 'asked'),
   aurum ('kept' | 'given'), lie (true when you lied to Mara). They change what people say, what happens next and how it ends */
const F = () => { const S = Story.S(); return S.f || (S.f = {}); };
const raceTo = (id) => { const d = Story.def(id); return d ? d.to : 'the next town'; };
const STORY = [
  { title: 'Off the Ferry', tod: 8.5, steps: [
    { t: 'cut', lines: () => [['', '08:30 · TUESDAY\n' + T0().toUpperCase(), 'card'], ['', 'Six weeks ago you sold everything you owned for a one-way ticket to the island.', 'wide'], ['', 'One car. A full tank. And one person here who still answers your calls.', 'car'],
      ['Mara (phone)', 'You actually came! Okay. Okay! Come find me at the garage, on the edge of town.', 'phone'], ['Mara (phone)', 'Follow the marker, and try not to hit anything. The locals drive like they are being chased.', 'phone'], ['you', 'Maybe they are.', 'mecar']] },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Meet Mara at her garage', lines: () => [['mara', 'Look at you. Still driving that old thing?', 'npc'],
      ['', 'What do you say?', 'me', [
        ['“It got me here. Thanks for having me, Mara.”', { mara: 1 }, [['you', 'It got me here. Thanks for having me, Mara. I mean it.', 'me'], ['mara', '…Don’t make me cry before ten in the morning. Come here.', 'npc']]],
        ['“You’re one to talk. Is that a garage or a scrapyard?”', { mara: -1 }, [['you', 'You’re one to talk. Is that a garage or a scrapyard?', 'me'], ['mara', 'Six weeks off a ferry and already a critic. Lovely.', 'npc']]],
        ['“Don’t start. Have you got work for me or not?”', {}, [['you', 'Don’t start. Have you got work for me or not?', 'me'], ['mara', 'Straight to it. Fine.', 'npc']]]]],
      ['mara', 'Rent is due Friday, the van is in pieces, and a customer in ' + towns[3].name + ' has been waiting a week for his parts.', 'npc'], ['you', 'So I am the van.', 'me'], ['mara', 'You are the van. Morning run, fragile box, no heroics. Do it and the first week is on me.', 'two']] }
  ] },
  { title: 'Parts Run', tod: 10, steps: [
    { t: 'run', id: 'sm_parts', npc: 'mara', at: 'garage', obj: 'Run Mara’s parts across the island', intro: () => [['', '10:00 · THE NEXT MORNING', 'card'], ['mara', 'Box is on the passenger seat. It is a gearbox for a forty-year-old truck and there is not another one on this island.', 'two'],
      ['mara', 'Every bump you hit, I will hear about it.', 'npc'], ['you', 'Relax. I drive like a grandmother.', 'me'], ['mara', 'Grandmothers here do a hundred and sixty on the coast road. Go.', 'npc']] },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Back to Mara', lines: () => [['', '16:40 · THAT AFTERNOON', 'card'], ['mara', 'He called. Not a scratch on the box. ' + (F().mara > 0 ? 'I knew you would come through.' : 'You might be useful after all.'), 'two'],
      ['mara', 'Thing is, nobody here hires a driver they have never seen race. And there is a race tonight.', 'npc'], ['you', 'Who do I have to beat?', 'me'],
      ['mara', 'Rico Vance. They call him Viper. Green muscle car, louder than his mouth, and his mouth is very loud.', 'npc'], ['mara', 'Half past ten, on the highway out of town.', 'two'],
      ['', 'What do you ask?', 'me', [
        ['“What’s Rico like, really?”', {}, [['you', 'What is he like, really? Under the paint.', 'me'], ['mara', 'Honestly? Not the worst. He just has never lost, and nobody has ever been nice to him about anything. Same thing, maybe.', 'npc']]],
        ['“What do I get if I win?”', {}, [['you', 'What do I get if I win?', 'me'], ['mara', 'Four grand, and a name. The name is worth more. Most people only ever get one of those.', 'npc']]],
        ['“Will you come and watch?”', { mara: 1 }, [['you', 'Will you come and watch?', 'me'], ['mara', 'Someone has to drag you home if you wrap it round a lamppost. Yes. I will be there.', 'npc']]]]],
      ['you', 'And if I lose?', 'me'], ['mara', 'Then they will know your name for a different reason.', 'npc']] }
  ] },
  { title: 'Street Cred', tod: 22.5, steps: [
    { t: 'run', id: 'sm_race1', obj: 'Meet Rico on the highway for the night race', intro: () => [['', '22:30 · THE HIGHWAY OUT OF ' + T0().toUpperCase(), 'card'], ['', 'Engines idle. Somebody has parked a pickup across the far lane, headlights on.', 'line'],
      ['rico', 'Well, well. Mara’s little cousin. I heard you came over on the ferry. Hope you kept the ticket.', 'rival'],
      ['', 'Talk back:', 'mecar', [
        ['“Nice paint. Did you lose a bet?”', {}, [['you', 'Nice paint. Did it come with the car, or did you lose a bet?', 'mecar'], ['rico', 'Ha! This colour is the last thing a lot of people saw before my tail-lights.', 'rival']]],
        ['“I didn’t come here to talk.”', {}, [['you', 'I didn’t come here to talk.', 'mecar'], ['rico', 'Good, because I can’t hear you over my engine anyway.', 'rival']]],
        ['“May the best driver win, Rico.”', { rico0: 1 }, [['you', 'May the best driver win, Rico.', 'mecar'], ['rico', '…Huh. Manners. Nobody has wished me luck in years. Doesn’t mean I’ll go easy.', 'rival']]]]],
      ['rico', 'First one to ' + raceTo('sm_race1') + '. Try to keep up, ferry kid.', 'rival'], ['you', 'Keep the engine warm. You will be watching mine.', 'mecar'], ['', 'The headlights flash. Three.', 'line']] },
    { t: 'cut', lines: () => [['', 'Rico pulls up behind you, climbs out, and stands there in the headlights.', 'car'], ['Rico', 'Where did Mara find you?', 'car'],
      ['', 'The whole crowd is watching. What do you do?', 'mecar', [
        ['Shake his hand', { rico: 'ally', mara: 1 }, [['you', 'Good race. Honestly. You nearly had me on the long bend.', 'mecar'], ['Rico', '…Yeah. Yeah, I did. You need anything on this island, ferry kid, you call me. I mean it.', 'car']]],
        ['Rev the engine in his face', { rico: 'shamed' }, [['', 'You rev the engine until the crowd starts laughing. Rico does not laugh.', 'car'], ['Rico', 'Enjoy it. This island has a long memory, and so do I.', 'car']]]]],
      ['', 'Somewhere a phone is ringing. It is yours.', 'car'],
      ['Unknown (phone)', 'That was some driving. The name is Dex. I find people for jobs that pay better than parts runs.', 'phone'], ['Dex (phone)', 'Lunch tomorrow, one o’clock, outside ' + Story.place('dex').label + '. Do not bring your cousin.', 'phone'],
      ['you', 'How did you get this number?', 'mecar'], ['Dex (phone)', 'Everybody gets my number eventually. One o’clock.', 'phone']] }
  ] },
  { title: 'The Fixer', tod: 13, steps: [
    { t: 'talk', who: 'dex', at: 'dex', obj: 'Meet Dex for lunch', lines: () => [['', '13:00 · ' + (Story.town('dex') || '').toUpperCase(), 'card'], ['dex', 'There you are. Sit, sit. You hungry? No? Straight to business. I like that.', 'npc'],
      ['dex', F().rico === 'shamed' ? 'I hear you made Rico cry in front of half the town. Cold. I like cold.' : 'I hear you shook Rico’s hand after. Sweet. Don’t make a habit of sweet.', 'two'],
      ['dex', 'Banks on this island lock the front and forget the back. A staff door, a vault, two old guards walking the same loop since nineteen-ninety.', 'npc'], ['you', 'You want me to rob a bank.', 'me'],
      ['dex', 'I want you to make a withdrawal after hours. Case it in daylight, go back after dark, stay out of the torchlight. You keep half.', 'npc'],
      ['', 'Your answer:', 'me', [
        ['“Half is fair. I’m in.”', { cut: 50 }, [['you', 'Half is fair. I’m in.', 'me'], ['dex', 'A reasonable person. We are going to get along.', 'npc']]],
        ['“Seventy. I take the risk, I take the money.”', { cut: 70, dex: -1 }, [['you', 'Seventy. I am the one in the torchlight. I take the money.', 'me'], ['dex', '…Seventy. Fine. I will remember that you asked.', 'npc']]],
        ['“No. I’m not a thief.”', { cut: 'out', mara: 1 }, [['you', 'No. I came here to fix cars, not to rob banks.', 'me'], ['dex', 'Shame. Your cousin’s garage is all old wood and paint thinner, you know. Terrible fire risk.', 'npc'], ['you', '…Are you threatening her?', 'me'], ['dex', 'I am telling you the bank is easier. Half. Tonight.', 'npc']]]]],
      ['dex', 'Here is the one. ' + Story.place('bank').label + '. Easy money. Well. Easier.', 'npc']] }
  ] },
  { title: 'Night Work', tod: 11, steps: [
    { t: 'bank', at: 'bank', obj: 'Rob the bank: case it by day at the staff door, then go back at night' }
  ] },
  { title: 'Heat', tod: 0.5, steps: [
    { t: 'clean', obj: 'Lose the police', enter: () => { if (F().rico === 'shamed' && Wanted.stars < 3) { Wanted.crime('An anonymous tip-off', 3); UI.banner('TIPPED OFF', 'Someone with a long memory called the police'); } } },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Lie low at Mara’s garage', tod: 6.2, lines: () => [['', '06:10 · THE GARAGE', 'card'], ['mara', 'You are all over the radio. Somebody robbed a bank last night. Tell me that was not you.', 'npc'],
      ['', 'Tell her…', 'me', [
        ['The truth', { mara: 1 }, [['you', 'It was me. Dex set it up. ' + (F().cut === 'out' ? 'He threatened the garage, Mara. I didn’t have a choice.' : 'I needed the money.'), 'me'], ['mara', '…Thank you for not lying to me. Dex always has a good plan. The people who work for him don’t always have a good ending.', 'npc']]],
        ['A lie', { mara: -1, lie: true }, [['you', 'Me? I was here all night, working on the van.', 'me'], ['mara', 'The van that still has no engine in it. Right.', 'npc'], ['mara', 'You know what, forget it. I don’t want to know.', 'npc']]]]],
      ['mara', 'My last mechanic did two jobs for Dex. Then he did three years.', 'npc'], ['mara', 'Just… be careful. Please.', 'npc']] },
    { t: 'cut', tod: 17.5, lines: () => [['', '17:30 · THAT EVENING', 'card'], ['Dex (phone)', (F().cut === 70 ? 'Your seventy percent cleared. Hope it was worth it. ' : 'Clean work. ') + 'Now the big one. There is a train on this island that carries a solid gold car. The Aurum.', 'phone'],
      ['Dex (phone)', 'But one driver gets that job, and I already have one. Jax. You will race him. Sunset. Winner does the train.', 'phone'], ['you', 'And the loser?', 'mecar'], ['Dex (phone)', 'The loser goes home. Or somewhere.', 'phone']] },
    { t: 'run', id: 'sm_race2', obj: 'Race Jax, Dex’s driver, at sunset', tod: 18.6, intro: () => [['', '18:40 · SUNSET', 'card'], ['', 'A black car rolls up beside you. Its engine is so quiet you hear the tyres first.', 'line'],
      ['jax', 'So you are the bank kid. Dex talks about you like a new toy.', 'rival'],
      ['', 'Talk back:', 'mecar', [
        ['“And you’re the old toy.”', {}, [['you', 'And you are the old toy.', 'mecar'], ['jax', 'I have driven for Dex for six years. You know what happened to the last kid who raced me?', 'rival'], ['you', 'He won?', 'mecar'], ['jax', 'He walks to work now.', 'rival']]],
        ['“Why do you work for him?”', { jax: 'asked' }, [['you', 'Why do you work for him? Really.', 'mecar'], ['jax', '…Because the last driver who said no to Dex is in the sea somewhere off ' + T0() + '. Think about that while you watch my tail-lights.', 'rival']]]]],
      ['jax', raceTo('sm_race2') + '. Go when the light turns.', 'rival'], ['', 'The sun touches the sea.', 'line']] },
    { t: 'cut', lines: () => [['', 'Jax gets out. He looks at you for a long time.', 'car'], ['Jax', F().jax === 'asked' ? 'You asked me why. Nobody asks. Watch Dex on the last job. He never pays the last one.' : 'Enjoy it. Dex’s last driver enjoyed it too.', 'car'],
      ['Dex (phone)', 'Well, that settles it. Talk to Sal, by the old line. He drove that train for forty years. Tonight, before the last run.', 'phone']] }
  ] },
  { title: 'Gold Rush', tod: 19.6, steps: [
    { t: 'talk', who: 'sal', at: 'sal', obj: 'Find Sal by the railway', lines: () => [['', '19:35 · THE OLD LINE', 'card'], ['sal', 'Dex sent you? Of course he did. He sends somebody every few years.', 'npc'], ['sal', 'The Aurum rides in the back wagon with the side door open, for the cooling. Daft, but there you go.', 'two'],
      ['sal', 'The line crews left a ramp down here. Hit it flat out as the wagon comes by and you will land right inside.', 'npc'],
      ['', 'Ask Sal…', 'me', [
        ['“What happens if I miss?”', { sal: 'careful' }, [['you', 'And if I miss?', 'me'], ['sal', 'Then you meet the side of a train. I have seen it once. Once was plenty.', 'npc']]],
        ['“What happened to the others Dex sent?”', { sal: 'asked' }, [['you', 'Every few years, you said. What happened to the others?', 'me'], ['sal', '…The job always ends up the mountain. Mount Cinder. He likes to settle up somewhere quiet, with a long drop.', 'npc'], ['sal', 'If he asks you up there, son, you keep the car keys in your pocket.', 'npc']]],
        ['“Why do you help him?”', {}, [['you', 'Why do you help him?', 'me'], ['sal', 'I don’t. I help the kids he sends. The ones who listen come home.', 'npc']]]]],
      ['sal', 'Mind the timing, son. And mind Dex.', 'two']] },
    { t: 'heist', k: 0, obj: 'Steal the Aurum off its train and bring it to your garage' }
  ] },
  { title: 'Double Cross', tod: 9, steps: [
    { t: 'cut', lines: () => { const L = [['', '09:00 · THE NEXT MORNING', 'card'], ['Dex (phone)', 'Ha! You did it. The whole island is talking about a gold car flying through the air.', 'phone'], ['Dex (phone)', 'Come up to Mount Cinder. Base camp, under the observatory. We will settle up there, nice and quiet.', 'phone']];
      if (F().rico === 'ally') L.push(['Rico (phone)', 'Ferry kid. It’s Rico. Word is Dex is cleaning house today. Whatever he says up there, don’t give him anything. I owe you one, remember.', 'phone']);
      L.push(['', 'Mount Cinder has not erupted in eighty years. Everyone says so.', 'wide']); return L; } },
    { t: 'talk', who: 'dex', at: 'camp', obj: 'Meet Dex at Mount Cinder base camp', lines: () => { const warned = F().sal === 'asked' || F().rico === 'ally' || F().jax === 'asked';
      return [['', '09:50 · MOUNT CINDER BASE CAMP', 'card'], ['dex', 'My driver. Look at that view.', 'two'], ['dex', 'Here is the thing. The bank, the Aurum, a face on every police camera on the island. That is all you. I was having lunch.', 'npc'],
        ['dex', 'So. The keys to the Aurum, and we part friends.', 'npc'],
        ['', warned ? 'You were warned about this. What do you do?' : 'What do you do?', 'me', [
          ['Hand him the keys', { aurum: 'given', dex: 1 }, [['you', 'Take them. I am done with you.', 'me'], ['dex', 'There. Was that so hard? The rangers will run you up to the observatory. Enjoy the view.', 'npc']]],
          ['Keep the keys in your pocket', { aurum: 'kept' }, [['you', warned ? 'I heard what happens to your drivers up here. The keys stay with me.' : 'No. I took it off the train. It stays with me.', 'me'], ['dex', '…Then enjoy the mountain. The rangers will run you up to the observatory. I hear it is lovely this time of year.', 'npc']]]]],
        ['', 'The ground starts to shake. Dex is already walking to his car.', 'wide']]; } },
    { t: 'mission', m: () => missions.find((q) => q.id === 'mvolc'), obj: 'Get off the volcano alive' }
  ] },
  { title: 'Ashes', tod: 19, steps: [
    { t: 'talk', who: 'mara', at: 'evac', obj: 'Find Mara in Ashfall', lines: () => { const f = F(), good = (f.mara | 0) >= 2 && !f.lie, L = [['', '19:00 · ASHFALL', 'card'], ['mara', 'I saw the smoke from across the island. I knew. I just knew you would be on that mountain.', 'npc'],
      ['you', 'Dex is gone. ' + (f.aurum === 'given' ? 'So is the Aurum. He drove off in it.' : 'But the Aurum is still in my garage. He never got it.'), 'me']];
      if (f.rico === 'ally') L.push(['mara', 'Rico called me, you know. Said you might need a ride home. Rico. Of all people.', 'npc']);
      if (good) L.push(['mara', 'Then you pay the rest back the slow way. With me. At the garage. Honest work, fast cars, and no more fixers.', 'two'], ['you', 'Deal.', 'me'], ['', 'THE END\nMara’s garage has two names over the door now.', 'card']);
      else L.push(['mara', 'I can’t do this again. Every time the phone rings I think it is the police, or the hospital.', 'npc'], ['mara', 'There is a ferry in the morning. I am going to be on it. Look after the garage. Or don’t.', 'two'], ['', 'THE END\nThe garage is yours now. It is very quiet.', 'card']);
      L.push(['', 'YOUR STORY\n' + [f.rico === 'ally' ? 'Rico: a friend' : 'Rico: an enemy', f.cut === 70 ? 'Dex’s cut: you took seventy' : f.cut === 'out' ? 'Dex’s cut: you tried to walk away' : 'Dex’s cut: half', f.aurum === 'given' ? 'The Aurum: Dex took it' : 'The Aurum: yours', good ? 'Mara: stayed' : 'Mara: left the island'].join('\n'), 'card']); return L; } }
  ] }
];
/* what a choice does the moment you make it, and at the end */
Story.applyEff = function (eff) { const f = F(); for (const k in eff) { const v = eff[k]; if (typeof v === 'number' && k !== 'cut') f[k] = (f[k] | 0) + v; else f[k] = v; } writeSave(); };
Story.consequences = function (st) {
  const f = F();
  if (st && st.t === 'bank' && f.cut === 70 && !f.paid70) { f.paid70 = 1; save.money += 6000; UI.toast('Your seventy percent: +' + money(6000), 'good'); }
};
Story.finish = function () {
  const f = F(), good = (f.mara | 0) >= 2 && !f.lie, A = HEIST_PRIZES[0];
  if (f.aurum === 'given' && A && save.owned[A.id]) { delete save.owned[A.id]; if (save.car === A.id) applyCar('rook', true); GAR.dirty = true; Home.refresh(); }   /* Dex drove off in it: gone for good */
  const pay = good ? 50000 : 20000; save.money += pay; return pay;
};

/* ---------- people standing in the world for the story ---------- */
Story.npc = function (id, P) {
  let n = Story.npcs[id]; if (!n) { const h = Human.make(STORY_CAST[id].o()); n = Story.npcs[id] = { id, h, x: 0, z: 0, y: 0, yaw: 0 }; scene.add(h.root); }
  n.x = P.x; n.z = P.z; n.y = P.y; n.yaw = P.yaw; n.h.root.position.set(P.x, P.y, P.z); n.h.root.rotation.y = P.yaw; n.h.root.visible = true; return n;
};
Story.hideNpcs = function (but) { for (const k in Story.npcs) if (k !== but) Story.npcs[k].h.root.visible = false; };
/* a rival leaning out of the driver's window of their car (a pivot at the hips, tipped out over the sill) */
Story.rival = function (who, mesh, side) {
  Story.dropRival(); const h = Human.make(STORY_CAST[who].o()), pv = new THREE.Group();
  pv.position.set(side * 0.42, 0.52, 0.2); pv.rotation.y = side * Math.PI / 2; pv.rotateX(0.95); h.root.position.y = -0.95; pv.add(h.root); mesh.add(pv);
  Story.rivalH = { who, h, pv, mesh, side }; return Story.rivalH;
};
Story.dropRival = function () { const R = Story.rivalH; if (!R) return; R.pv.parent && R.pv.parent.remove(R.pv); Human.dispose(R.h); Story.rivalH = null; };

/* ---------- running the steps ---------- */
Story.S = () => save.story || (save.story = { ch: 0, st: 0, base: {}, fin: 0 });
Story.step = function () { const S = Story.S(), C = STORY[S.ch]; return C ? C.steps[S.st] : null; };
Story.begin = function () {
  if (!Story.on) return; Story.ui(); const S = Story.S();
  if (S.fin) { UI.toast('Story complete · the island is yours', 'good'); Story.enter(); return; }
  setTimeout(() => { if (S.st === 0) UI.banner('CHAPTER ' + (S.ch + 1), STORY[S.ch].title); Story.enter(true); }, 400);
};
const STORY_LINES = (L) => (typeof L === 'function' ? L() : L);
/* a step starts: the time of day, its marker, its person, and what it starts from */
Story.enter = function (first) {
  const S = Story.S(), st = Story.step(), C = STORY[S.ch]; Story.cur = st; Story.tg = null; Story.near = null;
  if (!st) { Story.hideNpcs(); Story.setBeam(null); return; }
  const tod = st.tod != null ? st.tod : S.st === 0 ? C.tod : null; if (tod != null) App.tod = tod;
  if (st.t === 'talk') { const P = Story.place(st.at); Story.npc(st.who, P); Story.hideNpcs(st.who); Story.tg = { x: P.x, z: P.z, label: STORY_CAST[st.who].name }; }
  else if (st.t === 'run' && st.npc) { const P = Story.place(st.at); Story.npc(st.npc, P); Story.hideNpcs(st.npc); }
  else Story.hideNpcs();
  if (st.t === 'run') { const m = Story.def(st.id); Story.tg = { x: m.x, z: m.z, label: m.title }; }
  if (st.t === 'mission') { const m = st.m(); if (m) Story.tg = { x: m.x, z: m.z, label: m.title }; }
  if (st.t === 'bank') { const P = Story.place('bank'); Story.tg = { x: P.x, z: P.z, label: P.label }; S.base.bank = Object.values(intSave().banks || {}).reduce((s, r) => s + (r.n | 0), 0); }
  if (st.t === 'heist') { const H = Heist.sites[st.k]; if (H) Story.tg = { x: H.sx, z: H.sz, label: 'The ramp by the line' }; }
  if (st.enter) st.enter();
  if (st.t === 'cut') setTimeout(() => Story.playCut(st), first ? 300 : 900);
  Story.setBeam(Story.tg); writeSave(); GPS.t = 0;
};
Story.next = function () {
  const S = Story.S(); Story.consequences(Story.cur); S.st++;
  if (S.st >= STORY[S.ch].steps.length) {
    S.ch++; S.st = 0; S.base = {};
    if (S.ch >= STORY.length) { S.fin = 1; const pay = Story.finish(); writeSave(); Story.enter(); UI.banner('STORY COMPLETE', 'Thanks for playing · +' + money(pay)); Snd.win(); return; }
    UI.banner('CHAPTER ' + (S.ch + 1), STORY[S.ch].title); Snd.win();
  }
  Story.enter();
};
/* is the current step done? */
Story.tick = function (dt) {
  if (!Story.on || App.mode !== 'play') return; const st = Story.cur, S = Story.S(); if (!st || S.fin) return; Story.t += dt;
  if (Story.rivalH && (!Mi || Mi.phase === 'done')) Story.dropRival();
  Story.near = null;
  if (st.t === 'talk') { const n = Story.npcs[st.who]; if (n) { const d = Math.hypot(Pl.x - n.x, Pl.z - n.z); if (d < 3.2 && Foot.on) Story.near = n; else if (d < 12 && !Foot.on) Story.near = 'car'; } }
  else if (st.t === 'run') {
    const m = Story.def(st.id); if (save.done[m.id] && !Mi) { Story.next(); return; }
    if (!Mi && Math.hypot(Pl.x - m.x, Pl.z - m.z) < 16) Story.near = Foot.on ? 'foot' : 'run';
    if (Mi && Mi.def === m) Story.tg = null; else if (!Mi && !Story.tg) { Story.tg = { x: m.x, z: m.z, label: m.title }; Story.setBeam(Story.tg); }
  }
  else if (st.t === 'mission') { const m = st.m(); if (m && save.done[m.id] && !Mi) Story.next(); }
  else if (st.t === 'bank') { const n = Object.values(intSave().banks || {}).reduce((s, r) => s + (r.n | 0), 0); if (n > (S.base.bank | 0)) Story.next(); }
  else if (st.t === 'heist') { const P = HEIST_PRIZES[st.k]; if (P && save.owned[P.id] && Heist.phase === 'idle') Story.next(); }
  else if (st.t === 'clean') { if (Wanted.stars === 0) Story.next(); }
};
Story.key = function (code) {
  if (!Story.on || code !== 'KeyE' || !Story.near || Story.near === 'car' || Story.near === 'foot') return false;
  const st = Story.cur; if (st.t === 'run' && Story.near === 'run') { Story.startRun(st); return true; }
  Story.playCut(st, Story.near); return true;
};
/* a story run: line up at the start, play its intro (the rival in the next lane for a race), then go */
Story.startRun = function (st) {
  const m = Story.def(st.id); if (Mi || Cut.on) return; Story.setBeam(null);
  if (m.type === 'race') {
    routePos(m, m.s0 - 25, _smp); const dx = _smp.tx, dz = _smp.tz, l = Math.hypot(dx, dz) || 1, rx = dz / l, rz = -dx / l;
    spawnAt(_smp.x + rx * 2.2, _smp.z + rz * 2.2, Math.atan2(dx, dz));
  } else spawnAt(m.x, m.z, car.yaw);
  startMission(m); if (!Mi) return; Mi.cd = 1e9;   /* the countdown waits for the intro */
  if (Mi.rival) Story.rival(m.rivalWho, Mi.rival.mesh, 1);
  const npc = st.npc ? Story.npcs[st.npc] : null;
  Cut.play(STORY_LINES(st.intro), npc, () => { if (Mi && Mi.def === m) Mi.cd = 3.4; });
};
/* ---------- cutscenes ---------- */
const Cut = { on: false, lines: null, i: 0, typed: 0, t: 0, npc: null, el: null, done: null, ca: 0, sh: null };
Story.playCut = function (st, npc) {
  if (Cut.on) return; const S = Story.S(), step = S.st, ch = S.ch;
  Cut.play(STORY_LINES(st.lines), npc || null, () => { const S2 = Story.S(); if (S2.ch === ch && S2.st === step) Story.next(); });
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
  Story.applyEff(o[1]); Cut.choosing = false; Cut.opts.hidden = true; Cut.lines = Cut.lines.slice(0, Cut.i + 1).concat(o[2] || [], Cut.lines.slice(Cut.i + 1)); Cut.typed = 1e9; Cut.next();
};
Cut.end = function () { Cut.choosing = false; if (Cut.opts) Cut.opts.hidden = true; Cut.on = false; Cut.el.hidden = true; Cut.el.classList.remove('card'); UI.setMode('play'); const d = Cut.done; Cut.done = null; if (d) d(); };
Cut.key = function (code) {
  if (Cut.choosing && /^Digit[1-9]$/.test(code)) { Cut.choose(+code.slice(5) - 1); return; }
  if (code === 'Escape') { for (let i = Math.max(0, Cut.i); i < Cut.lines.length; i++) if (Cut.lines[i][3] && !(i === Cut.i && !Cut.choosing)) Story.applyEff(Cut.lines[i][3][0][1]); Cut.i = Cut.lines.length; Cut.typed = 0; Cut.end(); return; }   /* skipping takes the first answer to each choice */
  if (code === 'Space' || code === 'Enter' || code === 'KeyE') Cut.next();
};
Cut.whoName = (w) => (w === 'you' ? 'You' : STORY_CAST[w] ? STORY_CAST[w].name : w);
const _cutV = new THREE.Vector3(), _cutH = new THREE.Vector3(), _cutP = new THREE.Vector3();
const ease = (a, b, k) => a + (b - a) * k;
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
  Cut.el.classList.toggle('card', shot === 'card'); Cut.el.classList.toggle('phone', /\(phone\)/.test(L[0]));
  const k = clamp(Cut.t / Math.max(3, auto), 0, 1), t = App.time, me = Foot.on ? { x: Foot.x, y: Foot.y, z: Foot.z } : { x: car.x, y: car.y, z: car.z }, n = Cut.npc, R = Story.rivalH;
  const fw = { x: Math.sin(car.yaw), z: Math.cos(car.yaw) }, rt = { x: Math.cos(car.yaw), z: -Math.sin(car.yaw) };
  /* the people */
  if (n) Cut.gesture(n.h, L[0] === n.id && Cut.typed < L[1].length + 8, t, n.h.id);
  if (R) {
    const b = R.h.b, talk = L[0] === R.who; b.armR.rotation.x = talk ? -2.3 + 0.35 * Math.sin(t * 7) : -1.1; b.elR.rotation.x = talk ? -0.5 : -1.3; b.armL.rotation.x = -0.9; b.elL.rotation.x = -1.2;
    b.head.rotation.x = -0.75 + (talk ? 0.05 * Math.sin(t * 4) : 0); b.head.rotation.y = 0.25 * Math.sin(t * 0.8); b.jaw.rotation.x = talk && Cut.typed < L[1].length ? 0.06 + 0.08 * Math.abs(Math.sin(t * 14)) : 0.02;
    Human.alive(R.h, dt, t, 1.3);
  }
  /* the camera */
  if (shot === 'card') { camera.position.set(me.x, me.y + 60, me.z); _cutV.set(me.x, me.y, me.z + 1); camera.lookAt(_cutV); }
  else if (n && (shot === 'two' || shot === 'npc' || shot === 'me')) {
    const dx = n.x - me.x, dz = n.z - me.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, px = -uz, pz = ux, side = Cut.i % 2 ? 1 : -1, ny = n.y + 1.58, my = me.y + 1.58;
    if (shot === 'two') { camera.position.set((me.x + n.x) / 2 + px * (3.6 - 0.5 * k) * side, (my + ny) / 2 + 0.1, (me.z + n.z) / 2 + pz * (3.6 - 0.5 * k) * side); _cutV.set((me.x + n.x) / 2, (my + ny) / 2 - 0.1, (me.z + n.z) / 2); }
    else if (shot === 'npc') { camera.position.set(me.x - ux * 0.5 + px * 0.55 * side, my + 0.05, me.z - uz * 0.5 + pz * 0.55 * side); camera.position.lerp(_cutP.set(n.x, ny, n.z), 0.12 * k); _cutV.set(n.x, ny, n.z); }
    else { camera.position.set(n.x + ux * 0.5 + px * 0.55 * side, ny + 0.05, n.z + uz * 0.5 + pz * 0.55 * side); camera.position.lerp(_cutP.set(me.x, my, me.z), 0.12 * k); _cutV.set(me.x, my, me.z); }
    camera.lookAt(_cutV);
  } else if (shot === 'rival' && R) {
    R.h.b.head.getWorldPosition(_cutH); const ox = rt.x * R.side, oz = rt.z * R.side;   /* from your window, across the gap, his face */
    camera.position.set(car.x + fw.x * (0.6 + 0.6 * k) - ox * 0.2, _cutH.y + 0.1, car.z + fw.z * (0.6 + 0.6 * k) - oz * 0.2); _cutV.copy(_cutH); camera.lookAt(_cutV);
  } else if (shot === 'line') {   /* low, in front of both cars, sliding back as it watches them */
    const cx = R ? (car.x + R.mesh.position.x) / 2 : car.x, cz = R ? (car.z + R.mesh.position.z) / 2 : car.z, D = 11 + 4 * k;
    camera.position.set(cx + fw.x * D + rt.x * 2.5 * Math.sin(k * 1.5), car.y + 0.7, cz + fw.z * D + rt.z * 2.5 * Math.sin(k * 1.5)); _cutV.set(cx, car.y + 0.9, cz); camera.lookAt(_cutV);
  } else if (shot === 'mecar' || shot === 'phone') {   /* by your window */
    const s = R ? -R.side : 1; placeBody();
    camera.position.set(car.x + rt.x * 2.6 * s + fw.x * (1.4 - 0.6 * k), car.y + 1.25, car.z + rt.z * 2.6 * s + fw.z * (1.4 - 0.6 * k)); _cutV.set(car.x + fw.x * 0.1, car.y + 1.0, car.z + fw.z * 0.1); camera.lookAt(_cutV);
  } else if (shot === 'wide') {   /* high and wide, slowly circling */
    const a = car.yaw + 2.2 + k * 0.5, D = 46; camera.position.set(me.x + Math.sin(a) * D, me.y + 22 - 6 * k, me.z + Math.cos(a) * D); _cutV.set(me.x, me.y + 2, me.z); camera.lookAt(_cutV);
  } else {
    const a = car.yaw + Cut.ca * 0.12 + 0.6, D = 9.5; camera.position.set(me.x + Math.sin(a) * D, me.y + 2.6, me.z + Math.cos(a) * D); _cutV.set(me.x, me.y + 1, me.z); camera.lookAt(_cutV);
  }
  Cut.ca += dt; placeBody(); car.ext.visible = true;
  if (Math.abs(camera.fov - 44) > 0.1) { camera.fov = 44; camera.updateProjectionMatrix(); }
};
/* ---------- what is on screen ---------- */
Story.setBeam = function (tg) {
  if (!Story.beam) { Story.beam = makeBeam('#ffd34d', 2.6, 200); scene.add(Story.beam); }
  Story.beam.visible = !!tg; if (tg) Story.beam.position.set(tg.x, terrainHeight(tg.x, tg.z), tg.z);
};
Story.visual = function (dt) {
  if (!Story.on) return;
  for (const k in Story.npcs) { const n = Story.npcs[k]; if (n.h.root.visible) { Human.alive(n.h, dt, App.time, n.h.id * 0.37); if (!Cut.on) Cut.gesture(n.h, false, App.time, n.h.id); } }
  if (Story.beam && Story.beam.visible) Story.beam.material.opacity = clamp(Math.hypot(Pl.x - Story.beam.position.x, Pl.z - Story.beam.position.z) / 200, 0.08, 0.85);
  const el = Story.hudEl; if (!el) return; const S = Story.S(), st = Story.cur, show = App.mode === 'play' && !!st && !S.fin && !(Mi && Mi.def && !Mi.def.story && st.t !== 'mission');
  el.hidden = !show; if (!show) return;
  const tx = Mi && Mi.def && Mi.def.story ? Mi.def.title : st.obj || ''; let hint = '';
  if (st.t === 'talk' && Story.near === 'car') hint = 'Get out (F) to talk to ' + STORY_CAST[st.who].name.split(' ')[0];
  else if (st.t === 'talk' && Story.near) hint = (TouchIn.on ? 'Tap TALK' : 'E') + ' · Talk to ' + STORY_CAST[st.who].name.split(' ')[0];
  else if (Story.near === 'run') hint = (TouchIn.on ? 'Tap GO' : 'E') + ' · Start';
  else if (Story.near === 'foot') hint = 'Get in your car (F) to start';
  else if (Story.tg) { const d = Math.hypot(Pl.x - Story.tg.x, Pl.z - Story.tg.z); hint = Story.tg.label + ' · ' + (d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'); }
  el.innerHTML = '<small>CHAPTER ' + (S.ch + 1) + ' · ' + STORY[S.ch].title.toUpperCase() + '</small><b>' + tx + '</b>' + (hint ? '<i>' + hint + '</i>' : '');
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
    '#storyObj small{display:block;color:#ffd34d;font-size:11px;letter-spacing:.14em}#storyObj b{display:block;font-size:17px;font-weight:600}#storyObj i{display:block;font-style:normal;font-size:13px;color:#cfd6e4}';
  document.head.appendChild(css);
  const c = Cut.el = document.createElement('div'); c.id = 'cut'; c.hidden = true; c.innerHTML = '<div class="sub"><b></b><p></p></div><div class="skip">Space / click: next · Esc: skip</div>'; document.body.appendChild(c);
  c.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('#cutOpts button'); e.preventDefault(); if (b) Cut.choose(+b.dataset.k); else Cut.next(); });
  const op = Cut.opts = document.createElement('div'); op.id = 'cutOpts'; op.hidden = true; c.appendChild(op);
  const h = Story.hudEl = document.createElement('div'); h.id = 'storyObj'; h.hidden = true; document.body.appendChild(h);
};
/* ---------- the title screen: free roam or the story, each its own save ---------- */
Story.switchTo = function (mode) { try { writeSave(); localStorage.setItem(MODE_KEY, mode); sessionStorage.setItem('island-rush-go', '1'); } catch (e) { /* ignore */ } location.reload(); };
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
Story.autoStart = function () { let go = false; try { go = sessionStorage.getItem('island-rush-go') === '1'; sessionStorage.removeItem('island-rush-go'); } catch (e) { /* ignore */ } if (go) setTimeout(() => App.start(), 60); };
