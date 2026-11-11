/* ================= TALKING TO PEDESTRIANS + TAXI FARES =================
   Every pedestrian gets a stable persona the first time you look at them (name, age, job, mood). Walk up and press E: they stop, face you and a
   menu opens: chat about their job, ask directions (sets your GPS), hear news (real missions, tips, gossip), tip them, or offer them a lift.
   A lift is a taxi fare: they walk to your car, you drive them to another town and the fare depends on time and how gently you drove. */
const Talk = { on: false, p: null, text: '', typed: 0, opts: [], menu: 'root', t: 0 };
const Fare = { reg: null, phase: 'idle', p: null, dest: null, reward: 0, t: 0, limit: 0, hp0: 100, walkT: 0, name: '' };
const TJOBS = ['baker', 'mechanic', 'nurse', 'courier', 'barista', 'fisher', 'teacher', 'electrician', 'surfer', 'dog walker', 'accountant', 'taxi driver', 'chef', 'ferry hand', 'lighthouse keeper', 'park ranger', 'street musician', 'florist', 'postie', 'tour guide'];
const TJOB_TALK = {
  baker: "Up at four every single morning. The smell of fresh bread never gets old, but the alarm clock does.",
  mechanic: "I can tell most of a car's life story from the sound of its idle. Keep the tyres up and the oil fresh and it will outlive us both.",
  nurse: "Twelve-hour shifts. Drive like a maniac round here and we will probably meet professionally.",
  courier: "Everything has to be somewhere by five. Back roads beat the highway once the traffic bunches up.",
  barista: "Oat flat white, extra hot, no foam. That is the order of the entire island, apparently.",
  fisher: "Best bite is at dawn off the cape. The sea is calmer than the roads, I promise you.",
  teacher: "Thirty kids, one whiteboard marker. I teach physics, so yes, I have opinions about your cornering.",
  electrician: "Half the streetlights here are on my rounds. The other half are somebody else's problem.",
  surfer: "Offshore wind, glassy faces, nobody out. If you are ever at the coast at dawn you will see.",
  'dog walker': "Six dogs, two leads, one bad idea. They know the route better than I do.",
  accountant: "People say numbers are dull. Those people have never watched a spreadsheet catch fire.",
  'taxi driver': "Eighteen years behind the wheel. Rule one: the quiet roads are never actually quiet.",
  chef: "Service starts at six, which means I am out here breathing before the storm.",
  'ferry hand': "I tie knots and wave at boats. Honestly, the best job on the island.",
  'lighthouse keeper': "It runs itself these days, but nobody told the gulls. I keep them company.",
  'park ranger': "Stay on the trails and off the dunes and the hills will look after you. Rally drivers, mostly.",
  'street musician': "I play for loose change and stray compliments. Neither pays rent, but the acoustics are lovely.",
  florist: "Tulips in the front, gossip in the back. Come by if you ever need to apologise to someone.",
  postie: "Same route for nine years. I know every dog by name and every gate by its squeak.",
  'tour guide': "Seven towns, a dozen viewpoints and one very patient flag on a stick.",
  student: "School is okay. Lunch is the best bit. And the bus. And the bit where it ends."
};
const TGREET = {
  friendly: ["Hey there! Lovely {tod} for a walk.", "Hi! Is that your {car} over there? Nice ride.", "Hello! Not many people out walking round here."],
  chatty: ["Oh, hello! You would not believe the {tod} I have had. Where do I even start?", "Well hi! Stand still, I have got three stories and one of them involves a goat."],
  busy: ["Sorry, in a bit of a hurry. What is it?", "Make it quick, I have a {job} thing in ten minutes."],
  grumpy: ["What.", "Mm. What do you want?", "If this is about the parking, it was not me."],
  shy: ["Oh! Um. Hi.", "H-hello. Sorry, I was not looking."],
  sporty: ["Yo! Just doing my laps. What is up?", "Hey! Walk with me. Or run, if you can keep up."],
  dreamy: ["Hm? Oh, sorry. I was watching the clouds.", "Have you noticed how the light goes gold around now?"],
  kid: ["Are you a racer? You look like a racer!", "My mum says I am not allowed to talk to strangers. ...Hi.", "Is that your car? Can it go a thousand miles an hour?"]
};
const TBYE = { friendly: "Take care out there!", chatty: "Oh, and one more thing... no, it will come to me. Bye!", busy: "Right, gotta go.", grumpy: "Finally.", shy: "Bye... um... bye.", sporty: "See you on the track!", dreamy: "Mm. The clouds are moving. Bye.", kid: "Bye bye! Go fast!" };
const TTHANKS = { friendly: "Oh, that is really kind. Thank you!", chatty: "Well, that is very generous! I will tell everyone about this. Everyone.", busy: "Oh. Thanks. Appreciated.", grumpy: "...Huh. Thanks.", shy: "Oh! Um, thank you so much.", sporty: "Nice one! That is a protein shake sorted.", dreamy: "How lovely. The universe provides.", kid: "WOW! Sweets!" };
const TIPS = [
  "Drift through corners and your nitro tank fills up several times faster than it does on a straight.",
  "If you ever flip over or get stuck, press R and you will be put back on the road.",
  "Grass, sand and dirt slow you right down. Stay on the asphalt if you want speed.",
  "Every garage upgrade stacks: engine, tyres, nitro, armour. Spend what you earn.",
  "Press M for the big map. Click anywhere on it and your GPS will lead the way.",
  "Do not run people over around here. The lawyers are scary. A steady hand in court wins, but settling is cheaper if you panic.",
  "Traffic thins out a lot after dark. Night is the time to open it up.",
  "Hop out of your car with F and look around. A lot of folks never do, and they miss the best views."
];
const TMOODS = [['friendly', 25], ['chatty', 15], ['busy', 14], ['grumpy', 12], ['shy', 10], ['sporty', 10], ['dreamy', 8]];
const todWord = () => (App.tod < 5 || App.tod >= 21 ? 'night' : App.tod < 12 ? 'morning' : App.tod < 17 ? 'afternoon' : 'evening');
const bearingWord = (dx, dz) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360) / 45) % 8];
const distWord = (d) => (d < 120 ? 'right around the corner' : d < 900 ? 'about ' + (Math.round(d / 50) * 50) + ' metres' : 'about ' + (d / 1000).toFixed(1) + ' km');
const fill = (s, P) => s.replace('{tod}', todWord()).replace('{job}', P.job).replace('{car}', CUR.name);

Talk.persona = function (p) {
  if (p.pers) return p.pers;
  const kid = p.app.kid; let mood = 'friendly';
  if (kid) mood = 'kid'; else { let r = Math.random() * 104; for (const [m, w] of TMOODS) { r -= w; if (r <= 0) { mood = m; break; } } }
  p.pers = { name: pickOf(CT_FIRST) + ' ' + pickOf(CT_LAST), age: kid ? 7 + ((Math.random() * 6) | 0) : 19 + ((Math.random() * 60) | 0), job: kid ? 'student' : pickOf(TJOBS), mood, rapport: 0, noLift: 0, met: 0 };
  return p.pers;
};

/* ---------- opening / closing ---------- */
const REL_INTRO = { friendly: "Hi there! I'm {n}. I don't think we've met.", chatty: "Oh, a new face! I'm {n}. Stay a while, I talk a lot.", busy: "{n}. I'm in a rush, but go on.", grumpy: "...{n}. What do you want?", shy: "Um. H-hi. I'm {n}.", sporty: "Hey! {n}. Nice to meet you!", dreamy: "Hm? Oh, hello. I'm {n}. I had a feeling someone would stop by." };
const REL_GREET = [null, ["Oh, hello again.", "Back around town, I see."], ["Hey! Good to see you again.", "There you are!"], ["My friend! How are you?", "I was hoping you'd stop by."], ["Look who it is! Come, tell me everything.", "Always a good day when you turn up."], ["My best friend in the whole world!", "I saved you a spot. I always do."]];
const REL_WARY = ["...You. What do you want?", "Keep your hands where I can see them.", "Oh. It's you."];
const REL_COLD = ["I have nothing to say to you.", "After what you did? Walk away.", "Not now. Maybe not ever."];
const CHAT_ASK = { friendly: "Sure! What's on your mind?", chatty: "Oh, I love a chat! Go on, go on.", busy: "A minute. Make it count.", grumpy: "...Go on, then.", shy: "Oh. Um. Sure.", sporty: "Sure, I'm cooling down anyway.", dreamy: "Mm. Yes. Let's talk.", kid: "Okay! About what?" };
const BACK_SAY = { friendly: "Anything else?", chatty: "What else? I've got hours. Well, minutes.", busy: "Yes?", grumpy: "Hm.", shy: "Um... yes?", sporty: "What's next?", dreamy: "Mm?", kid: "What else?" };
const REPEAT_SAY = ["We just covered that. Give me a minute!", "Ha, you already asked. Come back to it later.", "Mm, I think we've exhausted that topic for now."];
const PRAISE = { friendly: "Aw, you're sweet! That really made my day.", chatty: "Oh stop it! ...No, keep going.", busy: "Hm. Thanks. I'll take it.", grumpy: "...Flattery. It's working a bit. Don't tell anyone.", shy: "O-oh! Um. Thank you. That's really kind.", sporty: "Ha, thanks! I train for compliments like that.", dreamy: "How lovely. The universe agrees with you.", kid: "Really?! I'm gonna tell my mum!" };
const PRAISE_GAIN = { friendly: 2, chatty: 2, busy: 1, grumpy: 1, shy: 3, sporty: 2, dreamy: 3, kid: 2 };
const JOKES = ["I'd tell you a joke about speed bumps, but it'd only slow you down.", "My GPS and I broke up. It kept saying I'd made a wrong turn in life.", "I used to hate roundabouts. Then I came full circle.", "Why don't traffic lights ever win arguments? They always change their mind at the last second.", "A mechanic's favourite music? Heavy medal... no, heavy metal. I'll see myself out.", "I told my car a joke. It didn't laugh. Said it was running out of gas. Of humour."];
const LAUGH = { friendly: "Ha! That's terrible. Do another.", chatty: "Oh! I'm stealing that. Everyone will hear it by lunchtime.", busy: "Hah. Okay. That actually helped.", grumpy: "...Hm. *snort* Fine. That was almost funny.", shy: "Hehe. Oh, sorry, that was a snort.", sporty: "Ha! Good one. You'd make a decent warm-up act.", dreamy: "Ahh... that's rather lovely. In a ridiculous way.", kid: "HAHAHA! Again again!" };
const GROAN = { friendly: "Aww. Nice try!", chatty: "Hm. You tried. I'll tell people you tried.", busy: "Mm. I've got to go soon.", grumpy: "No.", shy: "Um... I think I missed the... sorry.", sporty: "Ooh. That one hurt. In a bad way.", dreamy: "Mm. Funny word. Keep it.", kid: "I don't get it." };
const JOKE_P = { friendly: 0.75, chatty: 0.8, busy: 0.4, grumpy: 0.3, shy: 0.55, sporty: 0.7, dreamy: 0.6, kid: 0.85 };
const TOPIC_CD = { work: 150, life: 240, praise: 240, joke: 200, treat: 300 };
const TOPIC_MEM = { work: 'work', life: 'life', praise: 'praise', joke: 'joke', treat: 'treat' };

Talk.cdMap = (p) => (p.reg ? Rel.rec(p.reg.id).cd : (p.pers.cd = p.pers.cd || {}));
Talk.onCd = (p, k) => { const m = Talk.cdMap(p); return !!m[k] && m[k] > Rel.now(); };
Talk.open = function (p) {
  if (Talk.on || !Foot.on || Foot.state !== 'walk' || !p) return;
  const P = Talk.persona(p), R = p.reg; Talk.on = true; Talk.p = p; p.state = 'talk'; p.v = 0; p.wave = 0; p.spk = 0; P.met++;
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  E.talk.hidden = false; document.body.classList.add('talking'); E.tkWho.textContent = P.name;
  if (!R) {
    E.tkJob.textContent = P.age + ' · ' + P.job + (P.met > 1 ? ' · met before' : ''); E.tkRel.hidden = true;
    Talk.say(fill(P.met > 1 && P.mood !== 'kid' ? pickOf(["Oh, you again.", "Back already?", "Hello again!"]) : pickOf(TGREET[P.mood]), P));
    Foot.wave(); return;
  }
  const rec = Rel.rec(R.id), lv = Rel.lv(rec.pts), now = Rel.now(); rec.met++; P.met = rec.met;
  E.tkJob.textContent = P.age + ' · ' + P.job + ' · ' + towns[R.town].name; Rel.paintTalk(0);
  if (Rel.grudge(R.id) > 0) { Talk.say(pickOf(REL_COLD), 'cold'); return; }
  if (rec.met === 1) { Talk.say(REL_INTRO[P.mood].replace('{n}', Rel.first(R))); Rel.add(R.id, 2, 'introduced yourself'); }
  else {
    Talk.say(lv < 0 ? pickOf(REL_WARY) : lv === 0 ? fill(pickOf(["Oh, you again.", "Back already?", "Hello again!"]), P) : fill(pickOf(REL_GREET[lv]), P));
    if (now - rec.last > 900 && lv >= 0) Rel.add(R.id, 1, 'good to see you');
  }
  rec.last = now; Foot.wave();
};
Talk.close = function (silent) {
  if (!Talk.on) return; const p = Talk.p, P = p && p.pers; Talk.on = false; Talk.p = null; E.talk.hidden = true; E.tkRel.hidden = true; document.body.classList.remove('talking');
  if (p) p.spk = 0;
  if (p && p.state === 'talk') { p.wave = silent ? 0 : 1.6; if (Fare.p === p && Fare.phase === 'walk') p.state = 'follow'; else { p.state = 'walk'; pedReattach(p); } }
  if (!silent && P) UI.toast(TBYE[P.mood], 'info');
};

/* ---------- menus ---------- */
Talk.say = function (text, menu) {
  Talk.text = text; Talk.typed = 0; Talk.menu = menu || 'root'; const p = Talk.p, P = p.pers, R = p.reg, M = Talk.menu, O = [];
  const lv = R ? Rel.lv(Rel.rec(R.id).pts) : 0;
  if (M === 'root') {
    O.push({ k: 'Have a chat…', fn: () => Talk.say(CHAT_ASK[P.mood] || 'Sure.', 'chat') });
    O.push({ k: 'Ask for directions', fn: () => Talk.say(P.mood === 'busy' ? "Quickly, then. Where to?" : "Sure. Where are you headed?", 'dir') });
    O.push({ k: 'Any news around here?', fn: Talk.news });
    const car_d = Math.hypot(car.x - p.x, car.z - p.z), blocked = Fare.phase !== 'idle' ? 'busy' : Mi ? 'run' : car_d > 80 ? 'far' : '';
    O.push({ k: 'Offer a lift', note: blocked === 'far' ? 'car too far' : blocked === 'busy' ? 'already a fare' : blocked === 'run' ? 'finish your run' : '', dis: !!blocked, fn: Talk.lift });
    if (R && lv >= 3) O.push({ k: 'Ask about a favour', note: '★', fn: Talk.favour });
    O.push({ k: 'Goodbye', fn: () => Talk.close() });
  } else if (M === 'chat') {
    const t = (k, label) => ({ k: label, note: Talk.onCd(p, k) ? 'later' : '', fn: () => Talk.topic(k) });
    O.push(t('work', 'Chat about their work'));
    O.push(t('life', R ? 'Ask about their life' : 'Ask how their day is going'));
    O.push(t('praise', 'Pay them a compliment'));
    O.push(t('joke', 'Tell a joke'));
    if (R) O.push({ k: 'Treat them to ' + R.treat, note: '$15', dis: save.money < 15 || Talk.onCd(p, 'treat'), fn: () => Talk.topic('treat') });
    else O.push({ k: 'Tip them $20', dis: save.money < 20, fn: Talk.tip });
    O.push({ k: 'Back', fn: () => Talk.say(BACK_SAY[P.mood] || 'Anything else?') });
  } else if (M === 'cold') {
    O.push({ k: 'Apologise and make amends', note: '$60', dis: save.money < 60, fn: Talk.apologise });
    O.push({ k: 'Goodbye', fn: () => Talk.close() });
  } else if (M === 'favour') {
    if (R.perk === 'cash') O.push({ k: 'Accept a care package', note: Rel.now() - Rel.rec(R.id).gift < 480 ? 'later' : '', fn: Talk.claim });
    O.push({ k: 'Thank them', fn: () => { Talk.say(pickOf(["Don't mention it. Really.", "That's what friends are for.", "Just stay out of trouble, yeah?"])); } });
    O.push({ k: 'Back', fn: () => Talk.say(BACK_SAY[P.mood] || 'Anything else?') });
  } else if (M === 'lift') {
    O.push({ k: 'See you at the car', fn: () => Talk.close(true) });
  } else if (M === 'dir') {
    const tw = towns.map((t) => ({ t, d: Math.hypot(t.cx - Foot.x, t.cz - Foot.z) })).filter((o) => o.d > o.t.half + 30).sort((a, b) => a.d - b.d).slice(0, 3);
    for (const o of tw) O.push({ k: 'Where is ' + o.t.name + '?', fn: () => Talk.point(o.t.name, o.t.cx, o.t.cz) });
    const open = missions.filter((m) => !save.done[m.id] && Math.hypot(m.x - Foot.x, m.z - Foot.z) > 60).sort((a, b) => Math.hypot(a.x - Foot.x, a.z - Foot.z) - Math.hypot(b.x - Foot.x, b.z - Foot.z))[0];
    if (open) O.push({ k: 'Anywhere good to race?', fn: () => Talk.point(MT[open.type].name + ': ' + open.title.replace(/^[^:]+: /, ''), open.x, open.z, true) });
    O.push({ k: 'Never mind', fn: () => Talk.say("No problem.") });
  }
  Talk.opts = O; Talk.paint();
};
Talk.paint = function () {
  E.tkOpts.innerHTML = Talk.opts.map((o, i) => '<button type="button" data-i="' + i + '"' + (o.dis ? ' disabled' : '') + '><kbd>' + (i + 1) + '</kbd>' + esc(o.k) + (o.note ? ' <small>' + o.note + '</small>' : '') + '</button>').join('');
};
Talk.pick = function (i) { const o = Talk.opts[i]; if (!o || o.dis || !Talk.on) return; Snd.beep(700 + i * 40, 0.05); o.fn(); };
Talk.key = function (code) {
  if (code === 'Escape' || code === 'KeyF') { Talk.close(); return; }
  const m = /^Digit([1-9])$/.exec(code) || /^Numpad([1-9])$/.exec(code); if (m) Talk.pick(+m[1] - 1);
  else if (code === 'KeyE' || code === 'Enter' || code === 'Space') { if (Talk.typed < Talk.text.length) Talk.typed = Talk.text.length; }
};
Talk.tick = function (dt) {
  if (!Talk.on) return; const p = Talk.p;
  if (!p || p.state !== 'talk' || Foot.state !== 'walk' || Math.hypot(p.x - Foot.x, p.z - Foot.z) > 6) { Talk.close(true); return; }
  if (Talk.typed < Talk.text.length) { Talk.typed = Math.min(Talk.text.length, Talk.typed + dt * 70); const s = Talk.text.slice(0, Math.floor(Talk.typed)); if (E.tkTxt.textContent !== s) E.tkTxt.textContent = s; }
  p.wait = 0; p.spk = (p.spk || 0) + ((Talk.typed < Talk.text.length ? 1 : 0) - (p.spk || 0)) * Math.min(1, dt * 6);
};

/* ---------- what they say ---------- */
Talk.point = function (name, x, z, race) {
  const P = Talk.p.pers, dx = x - Foot.x, dz = z - Foot.z, d = Math.hypot(dx, dz), pre = { friendly: 'Sure! ', grumpy: 'Ugh. ', shy: 'Um, I think... ', kid: 'Hmm... that way! ', sporty: 'Easy! ', dreamy: 'Ooh. ', busy: 'Quickly: ', chatty: 'Oh, I know exactly where that is! ' }[P.mood];
  UI.setWaypoint(x, z);
  Talk.say(pre + (race ? 'Try ' + name + '. ' : name + ' is ') + (race ? "It's " : '') + distWord(d) + ' to the ' + bearingWord(dx, dz) + ". I have put it on your GPS.");
};
Talk.rumor = function () {
  const c = [];
  const ms = missions.filter((m) => !save.done[m.id]); if (ms.length) { const m = pickOf(ms); c.push({ t: 'Word is the ' + MT[m.type].name + ', ' + m.title.replace(/^[^:]+: /, '') + ', is paying ' + money(m.reward) + '. Folks say you need steady hands.', wp: m }); }
  const t = pickOf(towns); c.push({ t: t.name + " has the best view on the island, if you can find the road up.", wp: null });
  c.push({ t: pickOf(TIPS), wp: null }, { t: pickOf(TIPS), wp: null });
  const cars = CARS.filter((d) => d.price > 0); if (cars.length) { const d = pickOf(cars); c.push({ t: 'Saw a ' + d.name + ' on the road yesterday. Sounded incredible. ' + money(d.price) + ' at the garage, apparently.', wp: null }); }
  return pickOf(c);
};
Talk.news = function () {
  const P = Talk.p.pers, r = Talk.rumor();
  if (P.mood === 'grumpy') { Talk.say("I do not gossip. ...Fine. " + r.t); return; }
  Talk.say((P.mood === 'chatty' ? "Oh, do I have news! " : P.mood === 'shy' ? "Um, I heard... " : P.mood === 'kid' ? "My mum said... " : '') + r.t);
  if (r.wp) UI.setWaypoint(r.wp.x, r.wp.z);
};
Talk.tip = function () {
  const p = Talk.p, P = p.pers; if (save.money < 20) return; save.money -= 20; writeSave(); P.rapport += 2; Snd.beep(990, 0.12);
  let t = TTHANKS[P.mood];
  if (Math.random() < 0.4 + P.rapport * 0.05 && P.mood !== 'kid') { const r = Talk.rumor(); t += ' Here, something I overheard: ' + r.t; if (r.wp) UI.setWaypoint(r.wp.x, r.wp.z); }
  Talk.say(t); p.wave = 1.2;
};
/* a topic of conversation: for the locals it earns relationship points (each topic needs a rest before it counts again) */
Talk.topic = function (k) {
  const p = Talk.p, P = p.pers, R = p.reg, m = Talk.cdMap(p), now = Rel.now();
  if (m[k] && m[k] > now) { Talk.say(pickOf(REPEAT_SAY), 'chat'); return; }
  const gain = (n, why) => { if (R) Rel.add(R.id, n, why); else P.rapport += n * 0.4; };
  if (k === 'work') {
    m[k] = now + TOPIC_CD[k]; Talk.say(P.mood === 'grumpy' ? "Work is work. Next question." : TJOB_TALK[P.job], 'chat'); gain(P.mood === 'chatty' || P.mood === 'sporty' ? 3 : 2, 'chatted about their work');
  } else if (k === 'life') {
    m[k] = now + TOPIC_CD[k];
    if (R) {
      const rec = Rel.rec(R.id), lv = Rel.lv(rec.pts), avail = Math.min(R.story.length, Math.max(0, lv));
      if (lv < 1) { Talk.say(pickOf(["Ha, we've barely met. Ask me once we know each other a little.", "That's a bit personal for a stranger, isn't it?"]), 'chat'); gain(1, 'small talk'); }
      else if (rec.ch < avail) { Talk.say(R.story[rec.ch], 'chat'); rec.ch++; gain(4, 'they opened up'); }
      else { Talk.say(pickOf(["You've heard most of it. Ask again when we know each other better.", "I've told you plenty. The rest is for closer friends.", "Mm, let's just enjoy the day."]), 'chat'); gain(1, 'good company'); }
    } else Talk.say({ friendly: "Pretty good, thanks! Can't complain.", chatty: "Oh, where do I start? ...Actually, you'd better not get me started.", busy: "Busy. As always.", grumpy: "Fine. Why?", shy: "Um. Okay, I think. You?", sporty: "Great! Legs feel good today.", dreamy: "Floating along, honestly.", kid: "Good! I got a sticker today." }[P.mood], 'chat');
  } else if (k === 'praise') {
    m[k] = now + TOPIC_CD[k]; Talk.say(PRAISE[P.mood], 'chat'); gain(PRAISE_GAIN[P.mood], 'a kind word'); p.wave = 0.9;
  } else if (k === 'joke') {
    m[k] = now + TOPIC_CD[k]; const ok = Math.random() < JOKE_P[P.mood] + (R ? Math.max(0, Rel.lv(Rel.rec(R.id).pts)) * 0.04 : 0);
    Talk.say('"' + pickOf(JOKES) + '"  ' + (ok ? LAUGH[P.mood] : GROAN[P.mood]), 'chat'); gain(ok ? 3 : 0, 'made them laugh'); if (ok) p.wave = 0.7;
  } else if (k === 'treat') {
    if (!R || save.money < 15) return; save.money -= 15; writeSave(); m[k] = now + TOPIC_CD[k]; Snd.beep(990, 0.12);
    let t = pickOf(["Is that " + R.treat + "? Exactly what I needed. Thank you!", "You got me " + R.treat + "? You remembered! Thank you.", "Oh, " + R.treat + "! That's so thoughtful."]);
    if (Math.random() < 0.35) { const r = Talk.rumor(); t += ' Here, something I overheard: ' + r.t; if (r.wp) UI.setWaypoint(r.wp.x, r.wp.z); }
    Talk.say(t, 'chat'); Rel.add(R.id, 4, 'bought them ' + R.treat); p.wave = 1.0;
  }
};
Talk.favour = function () {
  const R = Talk.p.reg, v = Rel.perkOf(R);
  Talk.say(PERK_TXT[R.perk][2] + '  [' + PERK_TXT[R.perk][0] + ' · ' + PERK_TXT[R.perk][1](v) + ']', 'favour');
};
Talk.claim = function () {
  const R = Talk.p.reg, rec = Rel.rec(R.id), now = Rel.now();
  if (now - rec.gift < 480) { Talk.say(pickOf(["I gave you something not long ago. Let me save a little.", "Come back in a few minutes, love. I'm not a bank."]), 'favour'); return; }
  const amt = Math.round(Rel.perkOf(R)); save.money += amt; rec.gift = now; writeSave(); Snd.win();
  Talk.say("Take this for the road: " + money(amt) + ". Don't spend it all in one place.", 'favour'); UI.toast(Rel.first(R) + ' gave you ' + money(amt), 'good');
};
Talk.apologise = function () {
  const R = Talk.p.reg; if (!R || save.money < 60) return; save.money -= 60; const rec = Rel.rec(R.id); rec.grudge = 0; writeSave();
  Rel.add(R.id, 12, 'you made amends'); Talk.say("...Fine. I accept. Don't make me regret it.");
};
Talk.lift = function () {
  const p = Talk.p, P = p.pers, chance = { friendly: 0.9, chatty: 0.9, busy: 1, grumpy: 0.25, shy: 0.55, sporty: 0.4, dreamy: 0.8, kid: 0 }[P.mood] + Math.min(0.3, P.rapport * 0.1) + (p.reg ? Math.max(0, Rel.lv(Rel.rec(p.reg.id).pts)) * 0.08 : 0);
  if (App.time < P.noLift) { Talk.say("I already said no."); return; }
  if (Math.random() > chance) {
    P.noLift = App.time + 40;
    Talk.say({ kid: "Mum says never get in a car with a stranger. Even a fast one.", grumpy: "I have got legs. They work.", sporty: "Thanks, but I run everywhere. It is basically a personality.", shy: "Oh, um... no. Sorry. Thank you though.", friendly: "Ah, thanks, but I am nearly there!", dreamy: "I would rather float, thanks.", chatty: "Oh bless you, but I have got to stop and pick up three things first.", busy: "No time!" }[P.mood]);
    return;
  }
  const from = { x: car.x, z: car.z }, cand = towns.map((t) => ({ t, d: Math.hypot(t.cx - from.x, t.cz - from.z) })).filter((o) => o.d > 500).sort(() => Math.random() - 0.5);
  const pick = cand[0] || towns.map((t) => ({ t, d: Math.hypot(t.cx - from.x, t.cz - from.z) })).sort((a, b) => b.d - a.d)[0], dist = pick.d;
  Fare.start(p, { x: pick.t.cx, z: pick.t.cz, name: pick.t.name }, dist);
  p.wave = 1.2;
  Talk.say("Oh, would you? " + (P.mood === 'busy' ? "Perfect, I am late. " : '') + "Take me to " + pick.t.name + ". I will meet you at the car. The fare is " + money(Fare.reward) + ", faster is better.", 'lift');
};

/* ---------- fares ---------- */
Fare.start = function (p, dest, dist) {
  Fare.phase = 'walk'; Fare.p = p; Fare.dest = dest; Fare.reward = Math.round((140 + dist * 0.2) / 10) * 10; Fare.limit = dist / 11 + 45; Fare.t = 0; Fare.walkT = 0; Fare.name = p.pers ? p.pers.name : 'Passenger'; Fare.reg = p.reg ? p.reg.id : null;
  UI.toast(Fare.name + ' is heading to your car', 'info');
};
Fare.cancel = function (msg) { if (Fare.p && Fare.p.state === 'follow') { Fare.p.state = 'walk'; pedReattach(Fare.p); } Fare.phase = 'idle'; Fare.p = null; if (Waypoint.on && Fare.dest && Waypoint.x === Fare.dest.x) { Waypoint.on = false; GPS.t = 0; } if (msg) UI.toast(msg, 'bad'); };
Fare.onBoard = function () { if (Fare.phase === 'ride') UI.toast('Passenger on board · ' + Fare.dest.name, 'info'); };
Fare.tick = function (dt) {
  if (Fare.phase === 'idle') return;
  const c = car;
  if (Fare.phase === 'walk') {
    const p = Fare.p; if (Talk.on && Talk.p === p) return; Fare.walkT += dt;
    if (!p || p.state !== 'follow') { Fare.cancel('Passenger changed their mind'); return; }
    if (Fare.walkT > 50 || c.wrecked > 0) { Fare.cancel('Passenger gave up waiting'); return; }
    if (Math.hypot(p.x - c.x, p.z - c.z) < 2.9) {
      p.state = 'gone'; Fare.phase = 'ride'; Fare.t = 0; Fare.hp0 = c.health; Snd.door(); UI.setWaypoint(Fare.dest.x, Fare.dest.z);
      UI.toast(Fare.name + ' is in · ' + Fare.dest.name + ' · ' + money(Fare.reward), 'good'); if (Foot.on) UI.toast('Press F to get in and drive', 'info');
    }
  } else if (Fare.phase === 'ride') {
    Fare.t += dt;
    if (c.wrecked > 0) { Fare.phase = 'idle'; Fare.p = null; UI.toast('Passenger bailed out', 'bad'); return; }
    if (Fare.t > Fare.limit * 3 + 90) { Fare.phase = 'idle'; Fare.p = null; Waypoint.on = false; UI.toast('Passenger got out and walked', 'bad'); return; }
    if (!Foot.on && Math.hypot(c.x - Fare.dest.x, c.z - Fare.dest.z) < 34 && Math.abs(c.speed) < 9) {
      const f = Fare.t / Fare.limit, tf = f < 0.6 ? 1.25 : f < 1 ? 1 : f < 1.5 ? 0.75 : 0.5, lost = Math.max(0, Fare.hp0 - c.health), df = clamp(1 - lost / 100 * 0.8, 0.2, 1);
      const pay = Math.round(Fare.reward * tf * df / 5) * 5; save.money += pay; save.rep = (save.rep || 0) + 1; writeSave(); Snd.win();
      UI.banner('FARE COMPLETE', Fare.name + ' · +' + money(pay)); UI.toast((tf > 1 ? 'Speedy' : tf < 1 ? 'Late' : 'On time') + (df < 0.95 ? ' · rough ride' : ' · smooth ride'), tf >= 1 && df >= 0.95 ? 'good' : 'info');
      Waypoint.on = false; GPS.t = 0; Fare.phase = 'idle'; Fare.p = null;
      if (Fare.reg) { const sm = df >= 0.95; Rel.add(Fare.reg, sm ? (tf >= 1 ? 9 : 7) : 3, sm ? 'enjoyed the ride' : 'a rough ride'); Fare.reg = null; }
    }
  }
};
