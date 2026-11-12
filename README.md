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
- **Rally stage:** *Hollow Pines*, a 3.8 km point-to-point forest stage (race office lobby, **Rally stage**). Lent the Ridgeback RS rally car, you drive hard-packed dirt, loose gravel, wet mud and sand through ~40,000 trees with low-sun light shafts, dappled shade and adaptive exposure; crests, big jumps and dips (up to ~60 m of air at speed); six plank walls you smash through in a shower of splinters; **banked, off-camber, crowned and dished road** (bends banked up to 20 degrees with a berm lip to lean on, a few off-camber ones that slide you wide, straights that crown, dish and cross-fall; the car feels the lean as more or less grip and a pull down the slope) and nine **rock cuttings and dry-stone walls** that you can scrape along (they take speed off and throw stone dust); pace notes, splits, medals and four times of day. Three **rival drivers** (Rookie / Pro / Elite, or none) start on the grid beside you: they run the same car on the same physics along a proper racing line (the Elite field finishes in about 2:02-2:04, quicker than the gold medal), brake late, use nitro, pass on the side with room, shove, smash the walls through the outer lanes and are ranked live on a leaderboard, with a finishing position and prize on the results card. A lobby switch turns the **driving assist** on (default: the car follows the wheel and recovers from slides; the handbrake still throws it sideways) or off (raw physics). Code: `js/13_rallycore.js` (stage model), `13_rallywall.js` (breakable walls), `13_rallygfx.js` (rendering), `13_rallyrv.js` (rival drivers), `13_rally.js` (flow, HUD, effects).
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
```

The browser tests drive the built game in headless Chromium with software GL (slow, 1-7 fps), using step lists of `{js}`, `{wait}` and `{shot}`:

```bash
npm install                       # playwright
npx playwright install chromium
bash build.sh
node tests/run3f.js low "$(cat tests/eva3.json)"      # one scenario
bash tests/regression.sh && bash tests/flight.sh      # the two regression suites (12 scenarios each)
```

`tests/rally3.js` drives the whole rally stage with an autopilot on the real car physics (`AY=0.8 node tests/rally3.js` gives a clean ~144 s lap; `NOISE=0.25 LAG=6` makes the driver sloppy; `RIV=0..3` picks the rival level (the log lists each rival's progress, the finishing order and a per-wall map of which planks you and the rivals broke); `TRACE=s0,s1` prints a frame trace) `tests/rally4.js` takes a screenshot tour of it and `tests/rally5.js` a tour of a race against the rivals (grid, pack, wall). `node tests/bench_bank.js` checks that banked road holds more lateral g than flat and off-camber less (raw tyre model, assist off). `node tests/bench_handling.js` is a step-steer benchmark of the rally car (spin-outs, sideslip and settle time at 25/35/45 m/s).

Each suite writes `*.done` and `*.log` files in `tests/` (and `{shot}` steps write PNGs to the current directory); every scenario should exit 0 with no `PAGEERROR` in its log. The harness serves `tests/three.min.js` in place of the CDN copy.

## Known rough edges

The solar system is about 1/10 scale with circular, coplanar orbits and non-rotating planets; there is no re-entry heating, no planet shadows or eclipses, and Jove has no surface. EVA surfaces are flat. The Workshop is keyboard and mouse only.
