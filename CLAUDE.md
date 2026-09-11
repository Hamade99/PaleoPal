# Working on Paleopal

Read `docs/ARCHITECTURE.md` before changing anything. `docs/DEVLOG.md` explains
why things are the way they are, and several of them are the way they are
because the obvious alternative was tried and failed.

## Build and check

```
python3 build.py        # inlines src/ into dist/paleopal.html
python build.py         # same thing on Windows, where there is no python3
```

The build is byte-reproducible: rebuilding with no source change must leave
`dist/paleopal.html` untouched. If `git status` shows it dirty after a no-op
build, something has reintroduced CRLF — check `newline` in `build.py` and
`.gitattributes`.

Every source file is UTF-8 and `build.py` says so explicitly. If you patch a
file with a script, pass `encoding="utf-8"` on both the read and the write:
the default is the machine's locale, which is cp1252 on Windows, and it will
quietly turn every `·` and `—` into mojibake.

Open `index.html` for development, `dist/paleopal.html` to check the build.
There is a test suite, added in session 14. `npm test` runs sixteen Node
checks over the simulation — growth parity between the active pet and the
roster, overnight catch-up, save validation and version handling, that each
`<data:NAME>` marker in `src/00-art.js` still matches the declaration it owns,
and that every background crop is 4:3 and lands on the ground line. `npm run
test:browser` runs ten Playwright specs in Chromium that load the real page:
console cleanliness at desktop and mobile sizes, every species and stage and
coat and pose baking without clipping, the import and export paths, and each
minigame drawing and taking input. `npm run check` runs both.
Browsers come from `npx playwright install`, and results are written to the
system temp directory because OneDrive locked an in-repo output directory.

None of that replaces looking at the thing. After a change, open the page and
confirm the console is clean; sprite changes need a visual check across all
four growth stages, not just the adult, and the bake test only proves a sprite
fits its box, not that it looks right.

A minigame change needs playing, not reading. Drive it headless for full
thirty-second rounds against a competent player and against a player who does
nothing, for every species and at both ends of the growth range: if those two
scores are close the game has no skill in it, and if the stages score the same
then growth does not matter. That harness is what found that half of Bug hunt's
quarry could not be caught by anyone. It is a test now — "seeded games
distinguish active and idle players for every species and age" — so run it
rather than writing it again.

## House rules

- **No frameworks, no bundler.** Plain scripts concatenated in the order listed
  in `build.py`. That order is the dependency graph.
- **Wall-clock time for anything that persists.** `Date.now()` deltas, never
  frame time. Frame time is only for particles, walking and minigames.
- **The dossier must not lie.** Every line in a species' `checks` array is a
  promise that the sprite draws that feature. Adding a claim means adding
  geometry.
- **Illness has causes, not dice.** Every condition traces to a player action or
  omission, and the Care screen explains the cause. That applies to anything
  new that can make an animal unwell: waking one after dark adds to
  `nightAwake`, the same field a late night fills, rather than rolling for a
  chill of its own.
- **Every state the animal can be in has to be readable on the glass.** Ill and
  asleep were the same picture for eight sessions — shut eyes and a droop —
  and the only thing naming the difference was a badge above the screen. A new
  state needs the sprite to differ *and* a mark, or it does not exist.
- **Cuteness through proportion**, never by dropping a diagnostic feature.
  Bigger skull, bigger eye, shorter snout, rounder body.
- **Growing up changes what an animal has, not only how big it is.** A scale
  column and a set of ratios gives four sizes of one animal. `muzzle`, `bulk`,
  `torso` and `fuzz` in `STAGE` are for features that arrive or go; use them,
  and add another column rather than overloading one that exists.
- **Three layers, and pick the right one.** `STAGE` is what every animal does
  with age. A species' `TUNE` table is what that animal is at adult size.
  `SPECIES_STAGE` is where one species at one age departs from both — put a
  per-species per-stage number there rather than in a table of its own, and
  read all three through `artFor()`.
- **Nothing fractured is drawn with a sine.** Thresholding `sin(x)` to place
  gullies, joints, crevasses or scallops gives an evenly spaced row, and the
  eye reads evenly spaced as manufactured — it has produced a barcode on the
  volcano, the cliff and the glacier in turn. Use `hash1()` in `04-world.js`,
  and quantise the input so a feature is a block a few pixels wide: sampled
  per column, random placement is just hatching.
- **One grid, one edge, no symmetry.** Every size in the case is a multiple of
  `--px`; each surface is a flat fill with one hard edge and at most one
  highlight; nothing decorative is evenly spaced or mirrored. Stacking effects
  and spacing things perfectly is what made the first case look rendered
  rather than moulded.
- **Anything that sits on the shell's curve is placed by `fitCrown()`,** not by
  a typed offset. That curve is an ellipse whose radii are fractions of the
  rendered width and height, so it moves with the viewport and CSS cannot
  compute it. Hand-fitted offsets are how the crown ridge ended up ten pixels
  left of the crown, on an arc twice as steep as the real one.
- **The screen is the interface.** Menus are drawn inside the 224x168 canvas
  and opened by the five keys on the case; the case never changes while you
  play. Screen text uses the bitmap font in `03-font.js`, not the DOM. The
  exception is long prose — the dossier's field notes — which stays a DOM
  panel, because six pixels a character cannot carry three paragraphs.
- **No `localStorage` directly.** Go through `Store` in `00-core.js`.
- **No image assets.** The case, the icons, the animals and the screen font
  are all drawn from code. Keep it that way.
- **An editor control must not rebuild itself while it is being used.**
  Dragging a slider fires `input` on every pixel of travel; rebuilding the
  panel there removes the element under the pointer and the drag dies after one
  step, while the number still updates — so it looks like the slider is broken
  rather than the code. `tools/edit-ui.js` keeps `BUILD` and `PAINT` apart:
  moving a control paints, only choosing a different thing to edit builds.
- **Art is data, in one file.** Anything that can change without changing
  behaviour — pixel sprites, growth columns, proportions, every colour that is
  not the case — belongs in `src/00-art.js` behind its `<data:NAME>` markers,
  because that file is what `tools/editor.html` writes. Adding a hand-written
  `fillRect` sprite somewhere else puts it out of the owner's reach. Every
  block must be claimed by a file in `DATA_FILES` in `tools/edit-core.js` — a
  block nothing claims is silently dropped on save, so that is checked at
  load. After changing any of it, call `artChanged()`: seven caches hold baked
  results and forgetting one shows a stale sprite.
- **The world is wider than the screen, by extension and not by scale.**
  `bakeBg` translates by `BG_PAD_X`/`BG_PAD_Y` once, so every literal
  coordinate in `04-world.js` still means what it meant and today's picture
  sits unmoved in the middle of a 280x210 world. Widen a full-width loop to
  `BG_L`..`BG_R` rather than scaling anything: the painters are per-pixel
  `fillRect(x, y, 1, 1)` loops and a fractional scale turns them to mush.
  `BG_CROP` is four views of that one canvas, anchored on the ground line so
  the animal's feet never leave the grass; change a number there and check it
  still lands on whole pixels.
- **A message goes where the player is looking.** `say()` picks the surface:
  the screen's title bar if a screen is open, a strip under the clock if a game
  is running, the DOM bubble over the habitat otherwise. It used to be the
  bubble always — which floats over the middle of the glass, and the glass,
  when a menu is open, *is* the menu. Telling someone their animal is full by
  covering the row of food they are choosing from reads as broken rather than
  as busy. Nothing may reflow to make room: the title bar is always thirteen
  pixels and gives up the title, which is the least useful text on the screen.
  `refuse()` passes `bad`, and a refusal is red on all three surfaces.
- **The developer tools are a harness, not a cheat menu.** Anything added to
  `DEV` must write the same fields the simulation writes.
- **Check a player-facing change along the player's path.** Setting state from
  the console proves the renderer works and nothing else. All five head hats
  could be bought, were charged for and showed as owned, and not one of them
  ever reached the animal: the shop calls its slots `head` and `face`, a pet
  stores them as `hat` and `face`, and `buyHat()` wrote `S[slot]`, so a cap
  went into `S.head` — a field nothing draws, `save()` does not persist and the
  save validator has never heard of. The goggles worked, because `face` is the
  one slot whose two names happen to match, and that is precisely why the bug
  lasted. A slot name is not a field name: go through `GEAR_FIELD`.

## Sprite work

The whole pipeline is in `docs/SPRITE-PIPELINE.md`. Three traps that have
already cost time:

1. **The sprite faces −x.** A planted foot travels toward +x while the body
   advances. Getting the sign wrong makes the animal moonwalk in both
   directions.
2. **Surface detail must ride the outline.** Use `samplePath()` against the same
   points the body outline uses. Computing a parallel path independently makes
   the detail float off the body.

3. **An internal edge only appears between two different materials.** Two
   shapes on one layer merge into a single region with nothing between them.
   That is why the mandible has its own layer: painted onto `head` it was
   drawn correctly, hinged correctly, and completely invisible, and every
   animal had a mouthless face until session 9.

Draw the body as one closed `blob` covering neck, ribcage, hips and tail.
Separate tubes produce lumpy joins; that is what the rex and trike looked like
before they were rebuilt.

Countershading and coats are painted from the spine the draw function returns,
not by hand per species. `belly` and `mark` are masked to body pixels, so both
can be drawn generously and let the mask trim them.

Check art in `tools/sheet.html`, not by playing. Every species, stage and
animation frame is on one page — the animals, and only the animals. Headgear,
the meter icons and the case buttons are not on it. Worn gear is `drawGear()`
compositing a hat over a baked frame at anchors the species hands back, and the
one place that composition exists is the running game, so a sheet that looks
right says nothing about whether a hat sits on a head.

Growth stages use separate `head` and `snout` multipliers. Do not merge them:
young animals have large braincases and short muzzles, and applying one number
to both produced a hatchling whose skull was longer than its body.

## State

`G` is the keeper (roster, coins, sound, streak, and which habitats have been
paid for). `S` is the active pet and is always `G.pets[G.active]`. Which
habitat an animal is actually standing in is `S.biome`, not the keeper's:
buying a place opens it to the whole nest, moving moves the one you are looking
at. `biomeId()` reads the pet, and takes one, so the nest and the shop can ask
about an animal that is not the active one; `ageDays()` and `ageLabel()` take
one for the same reason. Age is wall-clock from `S.born`, so it goes on running
while the game is shut, and it is the one number on the glass that only ever
goes up. `simulateAll()` swaps `S` across the roster and
restores it, so per-pet code can be written as if there were one animal. Store
nothing derived: stage, bond level and mood are all computed.

## Before adding a feature

`docs/ROADMAP.md` has the smaller open work; `docs/TODO.md` has the two
long-horizon jobs and is the one to read first.

Android is more than the Capacitor wrap. The frame loop runs at 60fps whatever
is on screen, the back button has to close a screen rather than the app, the
audio context needs a first tap before it will make a sound, local
notifications are the reason to have a pet game on a phone at all, and `G.dev`
still defaults to `true`. The other job is week two: an animal is adult after
about four hours and then nothing accumulates, which is a design problem rather
than an engineering one.
