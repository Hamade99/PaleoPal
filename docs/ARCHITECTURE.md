# Architecture

No framework, no bundler. Plain scripts concatenated in a fixed order, because
that order is the only dependency graph there is.

## Load order

```
src/00-core.js          utilities, storage adapter, audio, path primitives
src/00-art.js           art data: pixel sprites, growth columns, per-species
                        proportions and colours, coats, habitat palettes
src/01-colour.js        ramp generation, material layers, the lighting compositor
src/02-sprite-engine.js growth stages, gait/IK, feet, hats, pose table, frame baking
src/03-font.js          the 5x7 screen font and its text drawing
src/species/rex.js      one draw function per species
src/species/triceratops.js
src/species/brachiosaurus.js
src/species/registry.js SPECIES table, field notes, coats, pattern and belly painters
src/04-world.js         backdrop baking, parallax, particles, props
src/05-sim.js           needs, illness, bond, growth, the nest, player actions
src/06-render.js        behaviour, the draw loop, feeding, minigames
src/07-screens.js       the menus, drawn inside the screen
src/08-ui.js            case chrome, prose panels, input, save/load, main loop
```

`index.html` holds this list and `build.py` reads it from there, so there is
one load order rather than two that have to agree. `dist/paleopal.html` is the
inlined build.

## Two globals

- **`G`** — the keeper. `{ v, pets[], active, coins, sound, lastDay, streak,
  lastTick, lastSeen }`. Coins and sound are shared across every animal.
- **`S`** — the *active* pet, always `G.pets[G.active]`. Almost all game code
  reads `S`. Simulation takes an explicit pet argument: `simulateAll()` calls
  `simulate(pet, ms, online, historicalNow)` without swapping the active pet.

Anything that persists lives on `G` and is serialised whole. Nothing derived is
stored: stage, bond level and mood are all computed from raw values.

## Time

The simulation runs on `Date.now()` deltas, never on frame time.
`advanceSimulation()` is shared by boot, resume and the live loop. It advances
to minute boundaries, caps catch-up at three days, and passes the historical
timestamp into sleep, exposure, illness and diary logic. Growth rates are the
same for the active and inactive roster, including while the selected pet is
an egg. Sub-minute live updates can still introduce small threshold-rounding
differences; minute-by-minute and bulk catch-up are regression-tested together.

Illness follows accumulated exposure to its cause. A per-pet seeded generator
controls mess timing and placement; cosmetic randomness cannot change it.

Frame time (`dt` from `requestAnimationFrame`) is used only for things that do
not persist: particles, walking, animation timing, minigames.

## The sprite pipeline

See `SPRITE-PIPELINE.md`. In short: each species draw function paints flat
shapes onto twelve **material layers**; the compositor turns those layers into
lit, outlined pixels. Frames are baked lazily and cached by
`species|skin|stage|anim|frame|eye`.

## The interface

The five keys on the case open **screens**, which are drawn inside the 224x168
canvas by `07-screens.js`. A key is a direct jump; a tap on the glass picks
something within the screen. A screen replaces the view rather than sliding
over it, and the case does not change while one is open — the key that opened
it stays latched down.

Each entry in `SCREENS` has a `layout()` that builds hit boxes, a `draw()` and
a `tap()`. Draw and hit-test read the same boxes, so no rectangle is computed
twice. Screen text is the bitmap font in `03-font.js`.

What is left in the DOM is the printed panel around the screen — the meter
strip, the identity line, the bond row — plus the four panels that are all
prose: the dossier, the developer harness, and the two notices. At six pixels
a character the screen cannot carry a paragraph, which is the only reason
those did not move.

## Rendering

`stepPresentation()` updates blinks, pose clocks and emissions; `stepWorld()`
advances clouds, flyers and motes. Drawing may populate art caches and hit-test
geometry, but does not advance those animations. Feeding applies payment and
nutrition together; the subsequent toss is presentation, so switching screens
cannot lose a purchased meal.

`drawScene()` runs every frame. If a screen is open it draws that and returns.
Otherwise:

1. baked backdrop for the current sky phase (cached per phase)
2. stars, sun or moon on a clock-driven arc, parallax clouds, pterosaur, pond
3. the volcano's plume and crater glow, and a rank of grass on the ground
   line — the three things in the backdrop that move, and therefore the three
   that cannot be baked into it
4. mode content — egg choice, hatching, habitat, or a minigame
5. foreground cycads the animal walks behind
6. a time-of-day tint

## Where to change what

| Task | File |
| --- | --- |
| Species anatomy, proportions, growth-stage shape | `src/species/<name>.js` |
| Coat patterns | `paintPattern` in `src/species/registry.js` |
| Field notes, coats, likes and dislikes, speed | `src/species/registry.js` |
| Growth multipliers, pose data, proportions | `src/00-art.js` |
| Gait, feet, pose generation and frame baking | `src/02-sprite-engine.js` |
| Lighting, palettes, material list | `src/01-colour.js` |
| Backdrop, weather, props, particles | `src/04-world.js` |
| A habitat's palette, landmark, treeline or floor | its entry in `BIOMES`, `src/04-world.js` |
| Needs, illness, bond, economy, the nest | `src/05-sim.js` |
| Minigames, feeding animation, behaviour | `src/06-render.js` |
| Case chrome, prose panels, input, save/load | `src/08-ui.js` |
| A new screen | a key in `SCREENS` in `src/07-screens.js`, and a way to open it |
| A new prose panel | a key in `SHEETS` in `src/08-ui.js`, nothing else |
| A new shop shelf | a key in `SHELVES` and a case in `shelfItems()`, `src/07-screens.js` |
| The screen font | `src/03-font.js` |
| Colours, layout, buttons | `src/style.css` |
| The crown ridge's plates | `--x/--w/--h` in `src/style.css`; the arc in `fitCrown()` |
| The volcano and its plume | `drawVolcano` (baked) and `drawPlume` (live), `src/04-world.js` |
| The case: shell, bezel, keys | `src/style.css`, `index.html` |
| A developer switch | a method on `DEV` in `src/05-sim.js`, a chip in the `dev` sheet |
| Checking any of the art | `tools/sheet.html` |
| Changing any of the art | `tools/editor.html`, served over http |
| A new editable sprite | an entry in `PIX`, and a marker if it is a new block |

## Habitats

Five places to keep an animal, bought on the shop's third shelf. A habitat is
the enclosure and not the pet, so `G.biome` and `G.biomesOwned` live on the
keeper next to the purse, while coats and headgear stay on the animal.

Each entry in `BIOMES` supplies four things and inherits the rest:

- **`sky`** — the two sky colours for each of the four phases. The sky is half
  the screen and it is the one part that cannot be derived.
- **`ground`** — the six ground materials at **day**. Dawn, dusk and night are
  mixed from those by `PHASE_MIX`. Writing four phases by hand for five biomes
  is a hundred and eighty hex values that all have to agree; the mix rule
  reproduces the hand-tuned valley palette this game shipped with to within a
  couple of values, which is the check that it is the same rule the eye was
  already applying.
- **`tint`** — the wash over the finished frame.
- **three painters** — `landmark`, `treeline` and `floor` — called from inside
  the shared bake, plus an optional **`live`** for anything that moves.

`bakeBg(phase, biome)` owns the parts every habitat needs in the same place:
the dithered sky, four depth planes, the grass edge and the dirt band. It
caches per `biome|phase`. Two optional keys handle the exceptions: `nearRidge`
replaces the near hill (the lagoon uses a low sand bar, because a coast has
nothing between you and the water) and `landmarkFront` paints the landmark
after the near ridge instead of before it (the gorge's cliff is the near side
of the gorge).

Anything in a habitat that moves has to be in `live`, because the backdrop is
baked once per biome and phase and then cached — the volcano's smoke sat still
for the whole life of this project for exactly that reason.

`HABITAT_ART` owns distinct skyline points, horizon heights and interaction
slots. Tapping the prop sends the active animal to that slot. On arrival,
`visitHabitat()` records an observation and a small care benefit. Its persisted
`habitatAt` timestamp imposes a shared thirty-minute cooldown per animal, so
switching habitats or reloading cannot farm rewards.

## Progression and games

Each pet stores observation IDs in `journal` and scores in `records`. Growth
studies are recovered through the current stage, so adopting an existing adult
does not permanently miss juvenile entries. Four observations unlock the Fern
sprig; ten unlock the Field cap. These rewards do not create coins.

`GAMES` declares `start`, `update`, `draw`, `input` and `finish` for each game.
A round retains its pet, starting stage, profile, seed and record key. Weekly
seeds change on UTC Monday and use their own RNG. Completed rounds update
personal and weekly bests separately for each game/species/stage. Exiting early
pays earned points but cannot set records. Young animals move faster and jump
higher; adults reach farther, recover faster, and run faster in River leap.
Species add different speed and reach trade-offs.

The three-seed controller checks average about 38-56 coins per competent
thirty-second round after payout tuning. This is a reproducible balancing
baseline, not a claim about human difficulty or long-term economy.

## Save recovery

`Store` propagates failures. The UI serializes saves, warns on write failure,
and blocks automatic saving after read failure. Nested imported fields are
validated; invalid versions/species are rejected with the original text intact.
The dossier exports the current nest, imports validated JSON after confirmation,
and downloads the recovery copy. Import writes the previous nest to the backup
key before replacing the main save. Browser storage is not transactional:
errors are surfaced rather than claiming an atomic multi-key operation.

## The art data

Everything that can be changed without changing behaviour lives in one file,
`src/00-art.js`, and `tools/editor.html` is the thing that changes it.

- **`PIX`** — every small sprite as a palette and one character per pixel: the
  action icons, the meter glyphs, the case buttons, the headgear, the food, the
  mess, the heart. All of it used to be hand-written `fillRect` calls in three
  modules. The outline each icon and hat wears is *not* stored — it is a pass
  over the finished grid in `pixCanvas`, so an edit cannot leave a sprite with a
  half-drawn border.
- **`STAGE`** — the growth columns, shared by every species.
- **`POSE_ART`** — authored eating, greeting, wary and inspection poses.
- **`HABITAT_ART`** — skyline coordinates, horizons and interaction placement.
- **`SPECIES_STAGE`** — one row per stage per species, for where a species at
  a given age departs from both the shared growth curve and its own adult
  proportions. Any key in a row *replaces* the value it names, whether that is
  a `STAGE` column or a `TUNE` key; an absent key is inherited. Replacement and
  not a multiplier, because several of these values are legitimately zero or
  negative — `hornBend` is 0 on a hatchling and −1 on a juvenile, and no
  multiplier moves either.
- **`REX_TUNE` / `TRI_TUNE` / `BRA_TUNE`** — per-species proportions in local
  units at adult size. They were literals scattered through the control points
  inside each draw function, which made "extend the tail" a job for someone
  willing to read the whole function first.
- **`REX_SPEC` / `TRI_SPEC` / `BRA_SPEC`**, **`SKINS`**, **`BIOME_ART`** — every
  colour in the game that is not the case.

Each declaration is wrapped in `/*<data:NAME>*/ … /*</data>*/`. The editor
replaces the text between markers and leaves everything else, so the prose
survives a save and the editor never has to patch a value out of the middle of a
working source file. A no-op save is byte-idempotent and reloads to identical
data; that is checked, not assumed.

Every draw function starts by resolving through **`artFor(species, stage)`**,
which merges those three layers — the shared growth row, the species' own
proportions, and its per-stage overrides — and caches the result.

Anything that changes art has to call **`artChanged()`** afterwards. Five
independent caches hold baked results — frames, materials, pixels, backdrops,
sky palettes — and forgetting one is how an editor ends up showing an old sprite
in a new palette.

## The case

Everything the player sees sits inside one moulded shell — a speckled
dinosaur egg with a bone bezel, a recessed screen and five physical keys. The
look is all CSS: the speckles are a tiled set of radial gradients reused
through the `--speckles` custom property, and the mouldings are layered `inset`
shadows. The project ships no image assets and the case did not change that.

Two pieces of it are sized from JavaScript, and both for the same reason — the
stylesheet cannot read its own box. `fitScreen()` sets `--lcd-w` to a whole or
half multiple of 224 so the canvas grid lands on the case grid. `fitCrown()`
puts each plate of the crown ridge on the shell's real top curve: that curve is
an ellipse whose radii are a fraction of the rendered width and height, so
where the crown is at a given x is not a constant. The plates declare `--x`,
`--w` and `--h` in `style.css` and the function supplies the arc. A
`ResizeObserver` on `.shell` refits them, which covers a resize, the web font
landing, and the screen being sized.

`index.html` carries the structure (`.shell` → `.bezel` → `.screen` → `.lcd`)
and `style.css` carries the look. No element id changed when the case went in,
which is why nothing in the render, world or sim modules had to move: those
three touch the DOM in exactly two places, `$('scene')` and `$('bubble')`.

## Developer tools

`DEV` in `05-sim.js` is a test harness, not a cheat menu. Every method writes
the same fields the simulation writes, so nothing it can do produces a state
the game could not have reached on its own — setting a growth stage parks
`S.growth` on a `GROWTH_GATES` boundary and moves `S.stageSeen` with it, the
way `simulate()` would have.

The `dev` sheet in `08-ui.js` is the only view of it, and `G.dev` gates the
button in the top bar. It ships **on**; long-pressing the brand plate toggles
it. See `ROADMAP.md`.
