# Island Rush

## Local development quick start

Now developed locally from the command line (not the Claude web session). To build and test after making changes:

```bash
bash build.sh                 # rebuild dist/island-rush.html from js/ sources (needs node)
open dist/island-rush.html    # launch the game in your default browser (macOS)
```

The game loads three.js from a CDN, so you need an internet connection. You can also serve it (useful if your browser restricts `file://` pages):

```bash
python3 -m http.server 8000   # then visit http://localhost:8000/dist/island-rush.html
```

Quick checks before committing:

```bash
node tests/vac1.js && node tests/sys4.js              # fast physics unit tests (no browser)
bash tests/regression.sh && bash tests/flight.sh      # full headless-browser suites (needs: npm install && npx playwright install chromium)
```

Always edit the files in `js/` (never `dist/`, which is generated) and re-run `bash build.sh`. See [CONTEXT.md](CONTEXT.md) for a full summary of the project architecture and state.

An open-world racing, flying and boating game that runs in a single HTML file, plus a **Workshop** where you build rockets and planes with a real 6-degree-of-freedom physics engine and fly them around a small solar system. Everything is plain JavaScript on [three.js](https://threejs.org) r128; there are no other runtime dependencies and no assets, because all geometry, textures and sound are generated in code.

## Play it

Open `dist/island-rush.html` in a desktop browser. It loads three.js r128 from cdnjs, so it needs an internet connection. The in-game **Controls** tab lists every key; turn on **Settings → Developer mode** for cheats, a free camera and teleports.

## What's in it

- **The island:** a procedurally generated island with towns, highways, biomes, day/night and weather, traffic, pedestrians and a coastal marina.
- **Driving:** a roster of cars with a garage, upgrades and cosmetics, damage and explosions, a race track with bot drivers that get faster than you.
- **Basilisk DR:** an original drag-built twin-turbo all-wheel-drive coupe ($32,000) on tall rally tyres with wheelie bars and a parachute pack. 8.3 s quarter mile and about 445 km/h flat out, against 9.6 s and 325 km/h for the Phantom R; it holds about half the Rook GT's cornering grip. `node tests/car_basilisk.js` measures all three.
- **Sandviper:** an original lifted dune buggy ($9,500): an open painted tube frame with a roll cage, bucket seats, a flat-four out back with upswept pipes, long-travel coilovers, a roof light bar and a spare tyre, on knobby tyres and beadlock wheels. 0-100 km/h in about 6 s. Pick it as your car in the rally lobby (**Car** row) to drive any stage in it.
- **Hand-built cars:** three more original designs, each built from its own parts rather than a body shell. **Goliath** ($24,000), a monster truck: a pickup shell two metres up on a tube chassis, four-link solid axles with two shocks a corner, exhaust stacks and 1.7 m knobby tyres. **Ironside** ($18,000), a hot rod: a chopped coupe on exposed rails with a supercharged V8 standing out of the bonnet, zoomie headers, a dropped I-beam front axle, cycle fenders over skinny fronts and fat rears. **Vortex FR** ($48,000), an open-wheel single seater: carbon tub and needle nose, sidepods, airbox, halo, front and rear wings with real downforce, pushrod wishbones; 0-100 km/h in 2.6 s and about 340 km/h, and useless off the tarmac.
- **Tuning:** the pause menu's **Tuning** tab is a setup sheet for the car you are driving, kept per car: gearing (final drive, ratio spread), engine (power band, traction control, nitro jet), aero (splitter, wing), suspension (ride height, front and rear anti-roll bars), alignment (camber and toe, front and rear), tyre pressures, brakes (bias, pressure) and chassis (ballast, steering lock, centre diff on all-wheel-drive cars). Every slider changes numbers the physics really uses, a stock setup is exactly the stock car, and the panel at the top predicts top speed, 0-100, 0-200, quarter mile, cornering grip, braking distance and balance from the same sums the physics runs (within 0.1 s and 1 km/h of real runs in `tests/tuning1.js`). Six presets: Stock, Drag, Grip, Top speed, Drift, Rally. Code: `js/06_tuning.js`.
- **Drag strip:** *Saltmarsh Dragway*, a quarter mile you reach from the race office (**Drag strip**). You bring your own car. Both cars stage, the tree drops three ambers and a green, and leaving early is a red light. The slip shows reaction time, 60 ft, 1/8 and 1/4 mile times and trap speed; the first car across the line wins. The rival runs a copy of your car in one of four brackets (Street, Pro, Outlaw, Legend) with more power, quicker lights and nitro as you go up. Code: `js/14_drag.js`.
- **Rally stage:** *Hollow Pines*, a 3.8 km point-to-point forest stage (race office lobby, **Rally stage**). Lent the Ridgeback RS rally car, you drive hard-packed dirt, loose gravel, wet mud and sand through ~40,000 trees with low-sun light shafts, dappled shade and adaptive exposure; crests, big jumps and dips (up to ~60 m of air at speed); six plank walls you smash through in a shower of splinters; **banked, off-camber, crowned and dished road** (bends banked up to 20 degrees with a berm lip to lean on, a few off-camber ones that slide you wide, straights that crown, dish and cross-fall; the car feels the lean as more or less grip and a pull down the slope) and nine **rock cuttings and dry-stone walls** that you can scrape along (they take speed off and throw stone dust); pace notes, splits, medals and four times of day. Three **rival drivers** (Rookie / Pro / Elite, or none) start on the grid beside you: they run the same car on the same physics along a proper racing line (the Elite field finishes in about 2:02-2:04, quicker than the gold medal), brake late, use nitro, pass on the side with room, shove, smash the walls through the outer lanes and are ranked live on a leaderboard, with a finishing position and prize on the results card. A lobby switch turns the **driving assist** on (default: the car follows the wheel and recovers from slides; the handbrake still throws it sideways) or off (raw physics). Code: `js/13_rallycore.js` (stage model), `13_rallywall.js` (breakable walls), `13_rallygfx.js` (rendering), `13_rallyrv.js` (rival drivers), `13_rally.js` (flow, HUD, effects).
- **More rally stages:** the rally lobby has a **Stage** picker with four more point-to-point stages, each with its own land, surfaces, pace notes, rivals and best time. *Coral Bay* runs along a beach (hard wet sand at the waterline, soft dry sand, tidal shallows, palms and the sea beside you). *Eagle Pass* climbs about 100 m over a mountain on stacked hairpins cut into rock, with snow across the summit. *Sunscorch Dunes* crosses open desert (rolling dunes, deep soft sand, a rock canyon, cactus). *Frostfall* is a snowbound pine forest (packed snow, sheet ice, deep powder).
- **Rally obstacles:** every stage has four to seven **ravine jumps** and **water splashes**, the first within a few hundred metres of the start, each announced by big yellow warning signs and the pace notes. A ravine is a timber kicker ramp, a gap cut across the valley and a landing deck: it takes about 65 km/h to clear, and if you fall in you are fished out before the ramp with +5 s. A splash is a stream across the road that drags the car and throws spray (no streams on steep climbs). Every fast bend has an orange **crash net** on the outside that catches the car without damage, and hairpins have **tyre walls** at the apex.
- **Destruction derby:** the race office's **Derby** button opens the *Scrapyard Bowl*, a walled dirt arena with mud patches, tyre islands, stands and floodlights. You and 5, 7 or 9 AI bangers ram each other until one car is left running. Cars collide as real bodies (a hit off-centre spins a car), damage depends on how hard and where a car is hit (the nose is the weak spot, the boot the strongest, heavier cars take less), and hurt cars smoke, then burn, then die as wreckage. Forty seconds without contact and the officials start taking your health. Prize money by place plus $150 for every car you wreck; drive a lent banger (Rook GT or Hauler 4x4, fixed up for free) or your own car.
- **Flying and boating:** an airport with planes, a jet, a helicopter and a blimp; boats with water physics; vehicle missions and dogfights.
- **On foot:** walk, talk to people and build relationships, carjack, get arrested (and sued), repair vehicles, play venue games (pool, darts, curling, mini-golf, fishing and more), find hidden collectibles.
- **The Workshop** (walk into the hangar): a 3D parts editor with symmetry, snapping and staging, and a flight mode with an ISA atmosphere, aerodynamics, engines, fuel and staging, structural break-up and re-entry.
  - **A solar system:** Helios and the worlds Ember, Home, Luna, Rust, Pebble, Jove and Cinder, with patched-conic spheres of influence, time warp up to 1,000,000x, orbit and solar-system maps with encounter predictions, and landings.
  - **Space-suit EVA:** land on another world and press `H` to step out. Walk, jump and use a jetpack under the world's gravity, and find samples, supply caches, a flag to plant and procedurally placed landmarks (wrecks, outposts, monoliths, lava vents, arches, crystal gardens) with a discovery journal.
  - **Dev tools** (Developer mode): teleport to any world's orbit or surface from the flight view (`K`) or from the Dev tab.

Workshop flight keys: `W/S` pitch, `A/D` roll, `Q/E` yaw, `Shift/X` throttle, `Space` stage, `G` gear, `R` SAS mode, `C` camera, `M` orbit map, `N` solar-system map, `,` `.` time warp, `H` step out (when landed on another world).

## Build

The source is split into numbered files in `js/` (the number is the load order: `01` core, `02` world generation, `03` graphics base, `04` terrain and scenery, `05` sky and weather, `06` vehicles, `07` world features and on-foot, `08` missions, courts, races and venues, `09` Workshop physics (`09_wk*`) and audio, `10` Workshop UI, flight, spaces and EVA (`10_wk*`), `11` menus, `99` startup). `build.sh` concatenates them into one strict-mode IIFE and wraps it with `head.html` (styles and markup):

```bash
bash build.sh        # needs node; writes dist/island-rush.html (+ dist/test.html for the tests)
```

Top-level names must be unique across files, since they all share one scope.

## Tests

The physics files (`js/09_wk*.js`) are pure numbers, so they are unit-tested in node with `tests/wkt.js`:

```bash
node tests/vac1.js     # airless bodies are true vacuum
node tests/sys4.js     # Home-to-Rust transfer optimiser and simulator cross-check
node tests/rally1.js   # rally stage model: route, ground, camber, forest, jumps, plank and rock walls
node tests/rally2.js   # breakable plank walls
node tests/derby1.js   # a full destruction derby: hits, wrecks, a result, staying in the bowl, getting your car back (browser)
node tests/car_buggy.js   # the Sandviper: model, performance, and as the rally car (browser)
node tests/cars_custom.js   # the hand-built cars: models, front/rear tyres, performance, stability (browser)
node tests/cutscenes.js   # every court venue, the arrest and the booking room: their people animate on screen (browser)
node tests/rally_stages.js   # every rally stage as a model: builds, never crosses itself, drivable grades, gates on straights, surfaces
```

The browser tests drive the built game in headless Chromium with software GL (slow, 1-7 fps), using step lists of `{js}`, `{wait}` and `{shot}`:

```bash
npm install                       # playwright
npx playwright install chromium
bash build.sh
node tests/run3f.js low "$(cat tests/eva3.json)"      # one scenario
bash tests/regression.sh && bash tests/flight.sh      # the two regression suites (12 scenarios each)
```

`tests/rally3.js` drives the whole rally stage with an autopilot on the real car physics (`AY=0.8 node tests/rally3.js` gives a clean ~144 s lap; `NOISE=0.25 LAG=6` makes the driver sloppy; `RIV=0..3` picks the rival level (the log lists each rival's progress, the finishing order and a per-wall map of which planks you and the rivals broke); `TRACE=s0,s1` prints a frame trace) `tests/rally4.js` takes a screenshot tour of it and `tests/rally5.js` a tour of a race against the rivals (grid, pack, wall). `node tests/drag1.js` runs the drag strip in every bracket, a jump start and leaving (`SHOTS=1` for screenshots). `node tests/bench_bank.js` checks that banked road holds more lateral g than flat and off-camber less (raw tyre model, assist off). `node tests/bench_handling.js` is a step-steer benchmark of the rally car (spin-outs, sideslip and settle time at 25/35/45 m/s). `STAGE=1..4 node tests/rally3.js` drives one of the other stages; `node tests/rally_tour.js` starts every stage in turn and takes screenshots.

Each suite writes `*.done` and `*.log` files in `tests/` (and `{shot}` steps write PNGs to the current directory); every scenario should exit 0 with no `PAGEERROR` in its log. The harness serves `tests/three.min.js` in place of the CDN copy.

## Known rough edges

The solar system is about 1/10 scale with circular, coplanar orbits and non-rotating planets; there is no re-entry heating, no planet shadows or eclipses, and Jove has no surface. EVA surfaces are flat. The Workshop is keyboard and mouse only.
