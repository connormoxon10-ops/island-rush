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
- **Rally stage:** *Hollow Pines*, a 3.8 km point-to-point forest stage (race office lobby, **Rally stage**). Lent the Ridgeback RS rally car, you drive hard-packed dirt, loose gravel, wet mud and sand through ~40,000 trees with low-sun light shafts, dappled shade and adaptive exposure; crests, big jumps and dips (up to ~60 m of air at speed); six plank walls you smash through in a shower of splinters; pace notes, splits, medals and four times of day. Code: `js/13_rallycore.js` (stage model), `13_rallywall.js` (breakable walls), `13_rallygfx.js` (rendering), `13_rally.js` (flow, HUD, effects).
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
node tests/rally1.js   # rally stage model: route, ground, forest, jumps, wall placement
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

`tests/rally3.js` drives the whole rally stage with an autopilot on the real car physics (`AY=0.45 node tests/rally3.js` gives a clean ~163 s lap; `TRACE=s0,s1` prints a frame trace) and `tests/rally4.js` takes a screenshot tour of it.

Each suite writes `*.done` and `*.log` files in `tests/` (and `{shot}` steps write PNGs to the current directory); every scenario should exit 0 with no `PAGEERROR` in its log. The harness serves `tests/three.min.js` in place of the CDN copy.

## Known rough edges

The solar system is about 1/10 scale with circular, coplanar orbits and non-rotating planets; there is no re-entry heating, no planet shadows or eclipses, and Jove has no surface. EVA surfaces are flat. The Workshop is keyboard and mouse only.
