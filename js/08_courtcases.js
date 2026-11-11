/* ================= CASE FILES =================
   A case = a venue (3D scene), a cast, an opening, a list of SLOTS and a way to talk about the verdict. Each slot holds one or more
   alternative rounds; the trial picks one per slot, so the same room plays out differently from run to run. A round is
   { name, max, q: quicktime id, cfg, pre: lines before it, post: { great, ok, bad }: the line after it }.
   Lines are [speaker, text, camera focus, extra hold]; speakers: judge, lawyer, victim, you. Text can use {VIC} {LAW} {J} {car} {kmh} {unit} {claim}.
   Every case's slots add up to 100 points; 70+ clears you, 35-69 is partly liable, under 35 is liable (see Court.script). */
const CASES = {};
const LN = (spk, text, focus, hold) => [spk, text, focus, hold];
const RD = (name, max, q, cfg, pre, post) => ({ name, max, q, cfg: cfg || {}, pre: pre || [], post: post || null });
const money0 = (n) => money(n);

/* ---------- 1. the county courtroom (the original trial) ---------- */
CASES.court = {
  venue: 'court', short: 'County Court', kicker: '⚖ Served', title: "You're being sued", judge: 'Judge Hammerstone', meter: ['Jury', 'Not liable at 70'], titles: ['NOT LIABLE', 'PARTLY LIABLE', 'LIABLE'], vk: 'Verdict',
  blurb: (who, car, v) => '<b>' + who + '</b> says you hit them with your ' + esc(car) + ' at ' + v + '.', plate: (P) => P.name + ' v. You',
  open: [LN('judge', 'Order! Order in the court. The case of {VIC} versus the driver of that {car}.', 'judge'), LN('lawyer', 'Your Honor, my client was crossing lawfully when the defendant came out of nowhere. {kmh} {unit}!', 'lawyer')],
  slots: [
    [RD('Objection', 30, 'timing', { title: 'OBJECTION!' }, [LN('lawyer', 'Members of the jury: this man treats our streets like a racetrack!', 'lawyer', 0.2)],
      { great: LN('judge', 'Sustained. The jury will disregard that remark.', 'judge', 0.2), ok: LN('judge', 'Sustained... barely. Choose your moments, counsel.', 'judge', 0.2), bad: LN('judge', 'Overruled. Sit down, counsel.', 'judge', 0.2) }),
    RD('Hearsay', 30, 'timing', { title: 'HEARSAY!', flash: 'HEARSAY!', speed: 1.1 }, [LN('lawyer', 'And I am told, by a friend of a cousin of a neighbour, that the defendant ALWAYS speeds!', 'lawyer', 0.2)],
      { great: LN('judge', 'Sustained! Hearsay is struck from the record.', 'judge'), ok: LN('judge', 'Sustained, narrowly. Watch it, counsel.', 'judge'), bad: LN('judge', 'Overruled. The court will allow it.', 'judge') })],
    [RD('Cross-exam', 25, 'mash', { title: 'CROSS-EXAMINE!', hint: null }, [LN('lawyer', '{VIC}, tell the court what happened that day.', 'victim'), LN('victim', "I never saw it coming! My neck, my arm... and my cat hasn't spoken to me since!", 'victim')],
      { great: LN('victim', 'Okay, okay! Maybe I was looking at my phone...', 'victim'), ok: LN('victim', 'I... I did look. I think. Mostly.', 'victim'), bad: LN('victim', 'It happened exactly like I said!', 'victim') }),
    RD('Spot the lie', 25, 'spot', { title: 'CATCH THE LIE', exhibit: 'DASHCAM', focus: 'victim' }, [LN('lawyer', '{VIC}, tell the court what happened that day.', 'victim'), LN('victim', "I never saw it coming! My neck, my arm... and my cat hasn't spoken to me since!", 'victim'), LN('judge', 'The defence may cross-examine. The dashcam is Exhibit A.', 'bench')],
      { great: LN('victim', 'Okay, okay! Maybe I got a detail wrong...', 'victim'), ok: LN('victim', 'It was a long time ago. Mostly.', 'victim'), bad: LN('victim', 'Every word is true, and my cat agrees!', 'victim') })],
    [RD('Evidence', 25, 'sequence', { title: 'PRESENT EVIDENCE', focus: 'table' }, [LN('judge', 'The defence may present its evidence.', 'bench')],
      { great: LN('judge', 'Exhibit A is admitted. Dashcam footage, no less.', 'judge'), ok: LN('judge', 'The footage is... partially admitted.', 'judge'), bad: LN('judge', 'Counsel, the court cannot read that code.', 'judge') }),
    RD('Recall', 25, 'simon', { title: 'RECALL THE EXHIBITS', focus: 'table' }, [LN('judge', 'The clerk will display the exhibits. Briefly. Memorise the order.', 'bench')],
      { great: LN('judge', 'The record reflects flawless recall.', 'judge'), ok: LN('judge', 'Mostly accurate. Mostly.', 'judge'), bad: LN('judge', 'Counsel clearly was not paying attention.', 'judge') })],
    [RD('Closing', 20, 'reaction', { title: 'CLOSING ARGUMENT', hint: 'Wait for the gavel, then SLAM!', gavel: true }, [LN('judge', 'We will now hear closing arguments. Counsel, be ready.', 'bench')]),
    RD('Closing', 20, 'charge', { title: 'CLOSING ARGUMENT', hint: null, focus: 'jury', over: 'RAMBLING' }, [LN('judge', 'We will now hear closing arguments. Build your case, counsel.', 'bench')],
      { great: LN('judge', 'A stirring closing. Even the bailiff is moved.', 'judge'), ok: LN('judge', 'Adequate. The jury is awake.', 'judge'), bad: LN('judge', 'Counsel, you have lost the room.', 'judge') })]
  ],
  retire: [LN('judge', 'The jury will now retire to consider its verdict.', 'jury')], wait: 'The jury deliberates…',
  say: { won: 'We find the defendant NOT LIABLE.', part: 'We find the defendant partly liable.', lost: 'We find the defendant liable.' },
  res: { won: (g) => 'Case dismissed. The court awards you ' + money0(g) + ' in costs.', part: (p) => 'You are held partly responsible and must pay ' + money0(p) + '.', lost: (c) => 'The jury found against you. Damages ' + money0(c) + ' plus ' + money0(300) + ' in court costs.' }
};

/* ---------- 2. small claims: brisk, bureaucratic, a magistrate with a dentist appointment ---------- */
CASES.small = {
  venue: 'small', fightLabel: 'Go to the hearing', short: 'Small Claims', kicker: '✉ Summons', title: 'Small claims hearing', judge: 'Magistrate Pruitt', meter: ['Magistrate', 'Dismissed at 70'], titles: ['CLAIM DISMISSED', 'PARTLY UPHELD', 'CLAIM UPHELD'], vk: 'Ruling',
  blurb: (who, car, v) => '<b>' + who + '</b> filed a small-claims case over your ' + esc(car) + ' at ' + v + '. Island County Small Claims, Room 4.', plate: (P) => 'Docket 41 · ' + P.name,
  open: [LN('judge', 'Small claims, docket forty-one. {VIC} versus the driver of a {car}. Let us keep this brisk. I have a dentist appointment.', 'judge'), LN('lawyer', '{LAW} for the plaintiff. My client seeks {claim} for injuries, inconvenience, and one traumatised cat.', 'lawyer')],
  slots: [
    [RD('Swearing in', 20, 'reaction', { title: 'SWEARING IN', hint: 'Answer the clerk the instant she asks!', wait: 'WAIT…', go: 'I DO!', gavel: false, focus: 'bench', sfx: 'go' }, [LN('judge', 'The clerk will swear in the parties.', 'bench')],
      { great: LN('judge', 'Prompt. I like prompt.', 'judge'), ok: LN('judge', 'Fine. Sit.', 'judge'), bad: LN('judge', 'Do try to pay attention.', 'judge') })],
    [RD('The binder', 25, 'tug', { title: 'THE BINDER!', hint: null, focus: 'lawyer', T: 6.5 }, [LN('lawyer', 'Your Honor, I would like to submit Exhibits A through Z.', 'lawyer'), LN('judge', 'Counsel, please. No binders.', 'judge')],
      { great: LN('judge', 'Exhibits B through Z are excluded. Thank you.', 'judge'), ok: LN('judge', 'I will read the first three pages.', 'judge'), bad: LN('judge', 'I will read all of it. Tonight. In my own time.', 'judge') }),
    RD('Paper storm', 25, 'dodge', { title: 'PAPER STORM!', item: 'paper', hint: null, focus: 'bench' }, [LN('judge', 'Please do not touch the fan.', 'judge'), LN('lawyer', 'Objection! The fan has launched my paperwork!', 'lawyer')],
      { great: LN('judge', 'Not a single page touched you. Remarkable.', 'judge'), ok: LN('judge', 'A few papercuts. Moving on.', 'judge'), bad: LN('judge', 'Clerk, bring a stapler. And a first aid kit.', 'judge') })],
    [RD('Spot the fib', 30, 'spot', { title: 'SPOT THE FIB', exhibit: 'RECORD', focus: 'victim' }, [LN('victim', 'I was minding my own business when that car came out of nowhere!', 'victim'), LN('judge', 'Let us check the record against that.', 'judge')],
      { great: LN('judge', 'Aha. The record disagrees with the plaintiff.', 'judge'), ok: LN('judge', 'Noted. Somewhat.', 'judge'), bad: LN('judge', 'I see nothing wrong. Moving on.', 'judge') }),
    RD('Form codes', 30, 'simon', { title: 'THE FORM CODES', hint: null, focus: 'table' }, [LN('judge', 'The clerk will read out the form codes. Once. Memorise them.', 'bench')],
      { great: LN('judge', 'A model litigant. Rare.', 'judge'), ok: LN('judge', 'Close enough for government work.', 'judge'), bad: LN('judge', 'That is not the form. That is not even a form.', 'judge') })],
    [RD('Temper', 25, 'balance', { title: 'KEEP YOUR TEMPER', focus: 'lawyer' }, [LN('lawyer', 'And frankly, the defendant has the manners of a raccoon.', 'lawyer'), LN('judge', 'Defendant, any response? Calmly.', 'judge')],
      { great: LN('judge', 'Composure. Refreshing.', 'judge'), ok: LN('judge', 'A little steam, but fine.', 'judge'), bad: LN('judge', 'Sit DOWN or I will hold you in contempt.', 'judge') }),
    RD('Stamp it', 25, 'timing', { title: 'STAMP IT!', flash: 'STAMPED!', hint: null, speed: 1.15, focus: 'bench', sfx: 'knock' }, [LN('judge', 'The clerk has one stamp and one chance. Hit the pad at the right moment.', 'bench')],
      { great: LN('judge', 'Stamped, filed, forgotten. Lovely.', 'judge'), ok: LN('judge', 'A smudged stamp. It will do.', 'judge'), bad: LN('judge', 'That stamp landed on my sandwich.', 'judge') })]
  ],
  retire: [LN('judge', 'Let me look over my notes.', 'judge')], wait: 'The magistrate shuffles papers…',
  say: { won: 'The claim is dismissed. Next case!', part: 'The claim is upheld in part.', lost: 'Judgment for the plaintiff.' },
  res: { won: (g) => 'Claim dismissed. The plaintiff pays you ' + money0(g) + ' in costs.', part: (p) => 'Upheld in part. You owe the plaintiff ' + money0(p) + ', and please slow down.', lost: (c) => 'Judgment for the plaintiff. ' + money0(c) + ' plus ' + money0(300) + ' in fees. Drive carefully.' }
};

/* ---------- 3. TV: Rapid Justice with Judge Bronco ---------- */
CASES.tv = {
  venue: 'tv', fightLabel: 'Go on air', short: 'Rapid Justice', kicker: '▶ Booked', title: "You're going on TV", judge: 'Judge Bronco', meter: ['Applause', 'Cleared at 70'], titles: ['NOT LIABLE!', 'PARTLY LIABLE', 'LIABLE!'], vk: 'Final score',
  blurb: (who, car, v) => '<b>' + who + '</b> took the case to <b>Rapid Justice</b> over your ' + esc(car) + ' at ' + v + '. Live studio audience, one judge, zero mercy.', plate: (P) => 'Rapid Justice · ' + P.name,
  open: [LN('judge', 'Welcome back to RAPID JUSTICE! Tonight: {VIC} versus the driver of that {car}!', 'judge'), LN('lawyer', '{LAW} for the plaintiff. And yes, my client takes coupons.', 'lawyer')],
  slots: [
    [RD('Tomatoes', 25, 'dodge', { title: 'THE CROWD TURNS!', hint: null, focus: 'jury' }, [LN('judge', 'The audience has... opinions about you, defendant!', 'jury')],
      { great: LN('judge', 'Whoa! Matrix moves! The crowd LOVES it!', 'judge'), ok: LN('judge', 'A few splats. That is showbiz!', 'judge'), bad: LN('judge', 'Somebody get a mop!', 'judge') }),
    RD('Stay cool', 25, 'balance', { title: 'STAY COOL ON CAMERA', focus: 'lawyer' }, [LN('lawyer', 'Look at the defendant! Sweating like a ham in the sun!', 'lawyer')],
      { great: LN('judge', 'Cool as a cucumber! Give it up!', 'judge'), ok: LN('judge', 'A little shiny, but we can fix that in post.', 'judge'), bad: LN('judge', 'Somebody powder this man!', 'judge') })],
    [RD('Clap along', 25, 'rhythm', { title: 'CLAP ALONG!', beats: 8, gap: 0.6, focus: 'jury', beatSfx: 'tick' }, [LN('judge', 'Win over the crowd, defendant. Clap on the beat!', 'judge')],
      { great: LN('judge', 'LISTEN to that applause!', 'judge'), ok: LN('judge', 'Polite clapping. Very polite.', 'judge'), bad: LN('judge', 'I have heard louder crickets.', 'judge') }),
    RD('Hype', 25, 'mash', { title: 'HYPE THE CROWD!', hint: null, labels: ['ROARING!', 'LOUD', 'MEH', 'SILENT'], T: 4.2 }, [LN('judge', 'Pump up the crowd, defendant! Faster, faster!', 'jury')],
      { great: LN('judge', 'The roof is OFF!', 'judge'), ok: LN('judge', 'A solid cheer!', 'judge'), bad: LN('judge', 'Is this thing on?', 'judge') })],
    [RD('Buzzer', 25, 'timing', { title: 'BUZZ IN!', flash: 'BZZZT!', hint: null, speed: 1.25, focus: 'judge', sfx: 'go' }, [LN('judge', 'Speed round! Buzz in with your best excuse!', 'judge')],
      { great: LN('judge', 'DING DING! Correct!', 'judge'), ok: LN('judge', 'Close enough for television!', 'judge'), bad: LN('judge', 'Eeeeh! Wrong answer!', 'judge') })],
    [RD('Arm wrestle', 25, 'tug', { title: 'ARM WRESTLE!', hint: null, focus: 'lawyer', T: 6.5 }, [LN('judge', 'And now, the tiebreaker: ARM WRESTLING!', 'judge')],
      { great: LN('judge', 'And the crowd goes WILD!', 'judge'), ok: LN('judge', 'A draw! We love a draw!', 'judge'), bad: LN('judge', 'Ouch. That is going on the blooper reel.', 'judge') }),
    RD('Final buzzer', 25, 'reaction', { title: 'FINAL BUZZER', hint: 'Wait for the buzzer, then SLAM it!', wait: 'WAIT…', go: 'BUZZ!', gavel: true, sfx: 'go' }, [LN('judge', 'Final question! Hands on buzzers... wait for it...', 'judge')],
      { great: LN('judge', 'FASTEST HAND IN THE WEST!', 'judge'), ok: LN('judge', 'Not bad!', 'judge'), bad: LN('judge', 'Aaand the buzzer is already over.', 'judge') })]
  ],
  retire: [LN('judge', 'Let us see what the audience thinks!', 'jury')], wait: 'The audience votes…',
  say: { won: 'NOT LIABLE! Give it up for our champion!', part: 'PARTLY LIABLE! Pay up, and thanks for watching!', lost: 'LIABLE! The audience boos. We will be right back after these messages.' },
  res: { won: (g) => 'The studio erupts. The network sends you ' + money0(g) + ' in "appearance costs".', part: (p) => 'The audience splits. You owe ' + money0(p) + ' and a signed photo.', lost: (c) => 'The audience boos. Damages ' + money0(c) + ' plus ' + money0(300) + ' in production fees.' }
};

/* ---------- 4. police interview room ---------- */
CASES.station = {
  venue: 'station', fightLabel: 'Take the interview', short: 'Interview Room 2', kicker: '⚑ Summoned', title: 'Police interview', judge: 'Detective Voss', meter: ['Detective', 'Cleared at 70'], titles: ['NO CHARGES', 'LESSER CHARGE', 'CHARGED'], vk: 'Outcome',
  blurb: (who, car, v) => 'Detective Voss wants a word about <b>' + who + '</b> and your ' + esc(car) + ' at ' + v + '. Interview Room 2. Bring a good story.', plate: (P) => 'Interview · ' + P.name,
  open: [LN('judge', 'Sit down. The recorder is on. Interview two, regarding {VIC} and a {car} doing {kmh} {unit}.', 'judge'), LN('lawyer', '{LAW}, representing {VIC}. Do not mind me. I am only here to make you nervous.', 'lawyer')],
  slots: [
    [RD('Nerves', 25, 'balance', { title: 'STAY CALM', focus: 'judge' }, [LN('judge', 'You seem nervous. Why are you nervous?', 'judge')],
      { great: LN('judge', 'Cool as ice. I do not like it.', 'judge'), ok: LN('judge', 'Sweating a little, are we?', 'judge'), bad: LN('judge', 'Your hands are shaking. Tell me about that.', 'judge') }),
    RD('Deep breath', 25, 'charge', { title: 'DEEP BREATH', hint: null, focus: 'judge', over: 'HYPERVENTILATING' }, [LN('judge', 'Take a breath. Take your time. Do not take too long.', 'judge')],
      { great: LN('judge', 'Steady breathing. Suspicious.', 'judge'), ok: LN('judge', 'Fine. Let us continue.', 'judge'), bad: LN('judge', 'Breathe into the bag. There is a bag.', 'judge') })],
    [RD('Contradiction', 25, 'spot', { title: 'FIND THE CONTRADICTION', exhibit: 'DASHCAM', hint: null, focus: 'table' }, [LN('judge', 'Three statements from the scene. One of them does not fit the dashcam.', 'judge')],
      { great: LN('judge', 'Sharp. That statement does not add up.', 'judge'), ok: LN('judge', 'Fair enough.', 'judge'), bad: LN('judge', 'You missed it. Exactly what he said you would do.', 'judge') })],
    [RD('Timeline', 25, 'simon', { title: 'RECALL THE ORDER', hint: null, focus: 'judge' }, [LN('judge', 'Walk me through the timeline. In order. Slowly.', 'judge')],
      { great: LN('judge', 'Every detail. Suspiciously every detail.', 'judge'), ok: LN('judge', 'Mostly. Mostly.', 'judge'), bad: LN('judge', 'That is not how it happened.', 'judge') }),
    RD('Locker code', 25, 'sequence', { title: 'EVIDENCE LOCKER', hint: 'Enter the locker code', focus: 'table' }, [LN('judge', 'The evidence locker code is on that sticky note. Punch it in.', 'judge')],
      { great: LN('judge', 'The locker opens. Your footage clears you.', 'judge'), ok: LN('judge', 'The locker opens halfway. Typical.', 'judge'), bad: LN('judge', 'Locked out. Alarm is going to go off.', 'judge') })],
    [RD('Polygraph', 25, 'rhythm', { title: 'POLYGRAPH', hint: 'Tap in time with the pulse', beats: 7, gap: 0.8, beatSfx: 'beat', focus: 'table' }, [LN('judge', 'Now we will see what the machine thinks.', 'judge')],
      { great: LN('judge', 'The needle barely moves. Huh.', 'judge'), ok: LN('judge', 'Some jitter. Inconclusive.', 'judge'), bad: LN('judge', 'The needle is going wild.', 'judge') }),
    RD('Stonewall', 25, 'mash', { title: 'STONEWALL!', hint: null, labels: ['UNBREAKABLE', 'HOLDING', 'CRACKING', 'CRACKED'], T: 4.2, focus: 'judge' }, [LN('judge', 'Come on. Everybody talks eventually.', 'judge')],
      { great: LN('judge', 'You are not saying anything. That is annoying.', 'judge'), ok: LN('judge', 'We will get there.', 'judge'), bad: LN('judge', 'And there it is. The confession voice.', 'judge') })]
  ],
  retire: [LN('judge', 'Wait here. I need to make a call.', 'judge')], wait: 'The detective leaves to make a call…',
  say: { won: 'You are free to go. No charges.', part: 'We are charging you with a lesser count.', lost: 'You are charged in full.' },
  res: { won: (g) => 'No charges. The department refunds ' + money0(g) + ' for your impounded time.', part: (p) => 'A lesser charge sticks. The fine and settlement come to ' + money0(p) + '.', lost: (c) => 'Charged in full. The plaintiff is owed ' + money0(c) + ', plus ' + money0(300) + ' in court costs.' }
};

/* ---------- 5. hospital ward bedside hearing ---------- */
CASES.hosp = {
  venue: 'hosp', fightLabel: 'Attend the hearing', short: 'Ward 3', kicker: '✚ Hearing', title: 'Bedside hearing', judge: 'Mediator Okonkwo', meter: ['Mediator', 'No fault at 70'], titles: ['NO FAULT', 'SHARED FAULT', 'AT FAULT'], vk: 'Findings',
  blurb: (who, car, v) => '<b>' + who + '</b> cannot leave Ward 3, so the hearing comes to them. St. Marlow General, about your ' + esc(car) + ' at ' + v + '. Quietly, please.', plate: (P) => 'Ward 3 · ' + P.name,
  open: [LN('judge', 'Good afternoon, everyone. Quietly, please: this is a hospital. We are here for {VIC} and the matter of the {car}.', 'judge'), LN('lawyer', '{LAW} for the patient. {VIC} would like it noted that the grapes were not free.', 'lawyer')],
  slots: [
    [RD('Heartbeat', 25, 'rhythm', { title: 'MATCH THE HEARTBEAT', hint: 'Tap in time with the monitor', beats: 7, gap: 0.85, beatSfx: 'beat', pulse: true, focus: 'victim' }, [LN('victim', 'My heart rate shoots up every time I think about that {car}...', 'victim'), LN('judge', 'Try to match the monitor. Help calm the room.', 'judge')],
      { great: LN('judge', 'The monitor is calm. Thank you.', 'judge'), ok: LN('judge', 'Almost in sync.', 'judge'), bad: LN('victim', 'Beep beep beep... that is not good, is it?', 'victim') })],
    [RD('Soft voice', 25, 'balance', { title: 'SOFT VOICE', hint: null, focus: 'victim' }, [LN('lawyer', 'The defendant has shown NO remorse whatsoever!', 'lawyer'), LN('judge', 'Gently, counsel. Defendant, please respond gently.', 'judge')],
      { great: LN('judge', 'Gentle and sincere. Noted.', 'judge'), ok: LN('judge', 'A little loud, but fine.', 'judge'), bad: LN('judge', 'Shhh! This is a hospital!', 'judge') }),
    RD('Blow-up', 25, 'charge', { title: 'INFLATE THE BALLOON', hint: null, focus: 'victim', over: 'POPPED!' }, [LN('victim', 'Could you blow up this get-well balloon for me? My ribs are...', 'victim')],
      { great: LN('victim', 'Perfect. It is a lovely balloon.', 'victim'), ok: LN('victim', 'It is a bit saggy, but thank you.', 'victim'), bad: LN('victim', 'My ears! My ribs! My ears!', 'victim') })],
    [RD('Cards', 25, 'simon', { title: 'THE GET-WELL CARDS', hint: null, focus: 'victim' }, [LN('victim', 'Do you see the cards on the cabinet? Remember which order they came in.', 'victim')],
      { great: LN('victim', 'You remembered them all. That is sweet.', 'victim'), ok: LN('victim', 'Most of them. Thank you.', 'victim'), bad: LN('victim', 'You forgot Grandma. How could you forget Grandma?', 'victim') }),
    RD('Patient story', 25, 'spot', { title: 'SPOT THE INCONSISTENCY', exhibit: 'CHART', hint: null, focus: 'victim' }, [LN('judge', 'The patient chart has the details. Check the statements against it.', 'judge')],
      { great: LN('judge', 'A sharp eye. The chart does not lie.', 'judge'), ok: LN('judge', 'Fair. Perhaps a small slip.', 'judge'), bad: LN('judge', 'The chart says otherwise.', 'judge') })],
    [RD('The tray', 25, 'reaction', { title: 'WATCH THE TRAY', hint: 'Wait for it, then CATCH the cup!', wait: 'WAIT…', go: 'CATCH!', gavel: false, focus: 'victim', sfx: 'go' }, [LN('victim', 'Oh no, my tray is slipping. My water!', 'victim')],
      { great: LN('victim', 'You caught it! Great reflexes!', 'victim'), ok: LN('victim', 'You caught most of it.', 'victim'), bad: LN('victim', 'And that is a mop job.', 'victim') })]
  ],
  retire: [LN('judge', 'Allow me a moment with the nurse.', 'judge')], wait: 'The mediator confers quietly…',
  say: { won: 'We find no fault with the driver.', part: 'We find fault is shared.', lost: 'We find the driver at fault.' },
  res: { won: (g) => 'No fault found. The patient sends their best wishes, and ' + money0(g) + ' for your trouble.', part: (p) => 'Shared fault. A settlement of ' + money0(p) + ' is due.', lost: (c) => 'At fault. Damages ' + money0(c) + ' plus ' + money0(300) + ' in costs. Get well soon, everyone.' }
};
