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
There is no test suite. After a change, open the page and confirm the console is
clean; sprite changes need a visual check across all four growth stages, not
just the adult.

A minigame change needs playing, not reading. Drive it headless for full
thirty-second rounds against a competent player and against a player who does
nothing, for every species and at both ends of the growth range: if those two
scores are close the game has no skill in it, and if the stages score the same
then growth does not matter. That harness is what found that half of Bug hunt's
quarry could not be caught by anyone.

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
- **The developer tools are a harness, not a cheat menu.** Anything added to
  `DEV` must write the same fields the simulation writes.

## Sprite work

The whole pipeline is in `docs/SPRITE-PIPELINE.md`. Two traps that have already
cost time:

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
animation frame is on one page.

Growth stages use separate `head` and `snout` multipliers. Do not merge them:
young animals have large braincases and short muzzles, and applying one number
to both produced a hatchling whose skull was longer than its body.

## State

`G` is the keeper (roster, coins, sound, streak). `S` is the active pet and is
always `G.pets[G.active]`. `simulateAll()` swaps `S` across the roster and
restores it, so per-pet code can be written as if there were one animal. Store
nothing derived: stage, bond level and mood are all computed.

## Before adding a feature

Check `docs/ROADMAP.md`. Local notifications and the Capacitor wrap are the two
things standing between this and an Android release; most other work is polish.
