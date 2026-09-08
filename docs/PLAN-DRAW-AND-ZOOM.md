# Plan: hand-drawn sprites, hand-drawn backdrops, and a world wider than the screen

> **Status:** built, session 15. All three parts are in and covered by tests;
> `docs/DEVLOG.md` has the session's account of it. This document stays as the
> reasoning behind the shapes the code took, and as the record of what the
> first draft got wrong — it was written from the request rather than from the
> source and was wrong in four load-bearing places, each a trap that would
> otherwise be walked into twice. Two further claims were disproved by
> building it, and are corrected in place: the backdrop cache does not gain a
> stage dimension, and the sky dither does not band, it is erased.

## The request

1. Expand the editor beyond the small icons in the Pixels tab, so the parts of
   every dinosaur can be drawn by hand.
2. Allow hand-drawing backdrops the same way.
3. Make the world bigger than the 224x168 screen and pull the view back as the
   animal grows, reaching the full width at adult. Aspect ratio stays correct.

Point 3 is *extension*, not magnification: the world gets more scenery drawn
around the outside of what exists now, and growing up reveals it. Today's
picture is not moved, rescaled or redrawn — it ends up sitting in the middle
of a larger one.

---

## Part 1 — hand-drawn parts

### What the compositor actually wants

This is the thing to understand before anything else, because it decides the
data format.

`sp.draw(M, P)` paints onto fifteen material-layer canvases. `composeSprite()`
in `01-colour.js:146` then reads each of them as a **binary mask** — anything
with `alpha >= 118` claims that pixel for that layer — and builds an
`Int8Array` of layer ids. Every colour in the finished sprite comes from the
material ramp for that id, run through the distance-field lighting pass and
the selective outline. Nothing reads a colour off a layer canvas, ever.

So a hand-drawn part is **not a picture in colours**. It is a statement about
which material each pixel is. The palette in the Draw tab is the layer list —
`skin`, `head`, `jaw`, `horn`, `mouth`, `sclera` — not a set of hexes. Draw
with materials and the lighting, the internal edges and the outline all come
back for free, exactly as they do for the procedural shapes.

This is also why hand-drawn art cannot dodge the pipeline's rules. Two
adjacent pixels of the same material merge into one region with no edge
between them, the same way a mandible painted onto `head` was invisible until
session 9.

### What a "part" can be

`anchors.parts` (`src/species/rex.js:241`) lists ten landmarks — `snout`,
`jaw`, `head`, `shoulder`, `back`, `hip`, `belly`, `arm`, `tailBase`, `tail`.
It is tempting to read that as ten drawable pieces. It is not. Six of them are
landmarks *on one shape*: the house rule says to draw the body as a single
closed `blob` covering neck, ribcage, hips and tail, and that is what the
species do. `back`, `hip`, `belly`, `tailBase`, `tail` and `shoulder` are
points on that one blob, and there is no way to replace "the hip" without
replacing the whole trunk.

What *is* separable is a material layer, because those are already separate
canvases. So the drawable unit is one layer's geometry:

| Unit | Layer | Separable? |
|---|---|---|
| `body` | `skin` | the whole trunk: neck, ribcage, hips, tail, as one piece |
| `head` | `head` | yes |
| `jaw` | `jaw` | yes |
| `shield` | `shield` | frill or plate |
| `crest` | `crest` | yes |
| `horn` | `horn` | horns, claws, teeth |
| `beak` | `beak` | yes |
| `mouth` | `mouth` | the gape |
| `limb` | `limb` | near-side legs and arms, as one piece |
| `far` | `far` | far-side legs, as one piece |

`belly` and `mark` are excluded: they are not drawn, they are masks painted
from the spine by `paintBelly()` and `paintPattern()`. `sclera`, `pupil` and
`glint` are excluded because the eye has five pose states and a static grid
would collapse them (see *Poses* below).

Suppressing the procedural version of an overridden unit needs **no changes to
any species file**. The layers are already separate canvases, so `bakeOnce()`
clears the canvas for an overridden layer after `sp.draw()` returns and stamps
the grid onto it instead.

### The data

`PART_PIX` in `src/00-art.js` behind a `<data:PART_PIX>` marker, keyed
`species|unit|stage`:

```js
'rex|head|3': { w:38, h:26, ox:19, oy:13, rows:[ ... ] }
```

One character per pixel. A space is empty; `0`–`9` and `a`–`e` index into
`LAYERS`, so a single drawing can span materials — a head with its own teeth
and eye in one grid. `ox`/`oy` mark where the anchor sits inside the grid, the
same convention `PIX` already uses.

Stage is in the key because a grid is stamped at device resolution — one grid
pixel is one baked pixel — so it does not scale with `k`. That is deliberate:
scaling hand-drawn pixels would destroy the grid, and the house rule already
says growing up changes what an animal has, not only how big it is. Four
stages means four drawings, which is the honest cost.

### Stamping

In `bakeOnce()`, after `sp.draw(M, P)` and before `paintBelly`:

1. For each unit with a grid for this species and stage, clear that unit's
   layer canvas.
2. Take the anchor from `anchors.parts`, still in sprite-local units.
3. Convert to device: `BAKE_CX + a[0]*k`, `BAKE_G + a[1]*k`, rounded.
4. Reset the layer context's transform — the canvases arrive pre-transformed
   with `translate(BAKE_CX, BAKE_G); scale(k, k)` (`02-sprite-engine.js:353`),
   and stamping through that would scale and blur the grid.
5. Walk the grid; each non-space character fills one device pixel on the
   canvas for *its own* layer id, which may not be the unit's own layer.

Because the anchor comes from `anchors.parts`, and the parts are computed
after the pose has been applied, **a stamped part moves with the animal**. The
head rises and falls with the breath, the jaw swings when it opens, the whole
drawing tracks the walk. This is the same mechanism `drawGear()` already uses
to keep a hat on a skull rather than at a guessed offset, and it is the reason
this design works at all.

### Per-unit fallback

A unit with no grid stays procedural. That is the whole animation strategy:
draw the head and the frill by hand, leave the legs to `legStep()` and
`limbIK()`, and the animal still walks. Mixing is per species, per unit, per
stage, with no flag to set — the absence of a grid *is* the fallback.

### Poses

The pose is not applied to a finished sprite. `P.body`, `P.legPhase`, `P.jaw`,
`P.tail`, `P.droop` and `P.eye` are consumed *inside* `sp.draw()`, which is
why a static grid animates only to the extent that its anchor moves. Anchored
parts translate correctly and do not deform.

The consequences, stated plainly:

- **The eye is not drawable.** `eyeAt()` has five states and the difference
  between asleep (state 1, a lid line) and ill (state 3, open but hooded) is
  the only thing on the sprite that separates those two conditions. A static
  eye grid makes ill and asleep the same picture again, which breaks "every
  state the animal can be in has to be readable on the glass". If hand-drawn
  eyes are wanted later, the key needs an eye-state dimension: five grids.
- **A drawn `limb` cannot walk.** The gait solves new joint positions every
  frame. Overriding `limb` gives a rigid leg sliding along the ground —
  moonwalking, the first trap in the sprite pipeline doc. Leave `limb` and
  `far` procedural unless the animal is meant to be static.
- **A drawn `body` does not breathe or swing its tail.** It translates with
  the `body` rise but does not flex. Acceptable, and visible; worth looking at
  before drawing all four stages.

### Belly and coat

`paintBelly()` and `paintPattern()` read `anchors.spine`, which the draw
function computes from the TUNE numbers rather than from what it painted. So
they still return a sensible spine when the body is overridden, and since both
are masked to body pixels they will trim to the hand-drawn silhouette.

That works as long as the drawing roughly follows the procedural body. If it
departs far from it the countershading will sit in the wrong place, so each
entry gets an optional `noShade: true` that skips both painters for that
species and stage. Do not add it until something actually looks wrong.

### The Draw tab

New tab in `tools/editor.html` and `tools/edit-ui.js`, respecting the
`BUILD`/`PAINT` split — choosing a different species, stage or unit rebuilds;
painting only paints, or the drag dies after one pixel.

- Species, stage and unit pickers
- Palette = the layer list, each swatch showing that material's mid ramp
  colour for the current species so the choice is legible, plus erase
- A grid canvas sized to the unit's bounding box, at 4x, with the procedural
  version of that unit behind it at 30% as a trace guide
- A live composite preview at 1x, 2x, 4x, and the four stages side by side
- "Clear unit", which deletes the entry and returns that unit to procedural

`artChanged()` after every edit. `PART_PIX` joins `LIVE` and `BLOCKS` in
`tools/edit-core.js:76` with a `jsPART_PIX()` printer alongside `jsPIX()`.

### Files

| File | What |
|---|---|
| `src/00-art.js` | `PART_PIX = {}` behind `<data:PART_PIX>` markers |
| `src/02-sprite-engine.js` | clear-and-stamp in `bakeOnce()` after `sp.draw()` |
| `tools/editor.html` | the Draw tab markup |
| `tools/edit-ui.js` | `BUILD.draw` and `PAINT.draw` |
| `tools/edit-core.js` | `PART_PIX` in `LIVE`, a `jsPART_PIX()` printer |

No species file changes. No `01-colour.js` changes.

### Traps

- **The bake box grows.** `growBake()` moves `BAKE_CX` and `BAKE_G`. Anchors
  are computed from them at stamp time, so a growth does not shift the art —
  but only because step 3 above reads them live rather than caching them.
- **A stamped pixel sits at `alpha 255`**, well over the 118 threshold. Do not
  stamp with any alpha below it or the pixel silently does not exist.
- **`touchedEdge()` runs on the composite**, so a drawing that runs off the
  box still triggers a re-bake at a larger box. Nothing extra needed.

---

## Part 3 — a world wider than the screen

Taken second in this document and second in the build, because it is smaller
than Part 1 and larger than the first draft claimed.

### The size, and where today's picture sits

```
BG_W = 280, BG_H = 210      (4:3, same as 224x168)
BG_G = 175                  the ground line in world space
```

The ground line has to land at the same fraction of the height as it does on
screen — `140/168` is `175/210` — or the animal's feet would leave the grass
as the view pulled back. That single constraint fixes everything else:

```
world 280 x 210
  +28 columns of new scenery on the left
  +28 columns on the right
  +35 rows of extra sky above
  +7  rows of extra ground below
  = today's 224x168 picture, unmoved, in the middle
```

### How the painters change: they don't

One `g.translate(28, 35)` at the top of `bakeBg()` puts local coordinate
`(0,0)` at world `(28,35)`, and **every literal coordinate in `04-world.js`
stays exactly as it is** — all 81 references to `GROUND`, every
`boulder(g, 68, GROUND+2, ...)`, every skyline point, the river, the dirt
band, `VOLC`, `FALLS`. Nothing moves.

This is why extension beats magnification. `ctx.scale()` was the first draft's
idea and it does not survive contact with this file: the sky dither, the
grass, the dirt and the cliffs are per-pixel `fillRect(x, y, 1, 1)` loops, and
at a fractional scale those become fractional rects that antialias into mush.
At `translate` they are untouched.

What does change:

- **Band loops widen.** The sky dither, the ridge painter, the river and the
  dirt band iterate `for (let x=0; x<W; x++)`. They become `-28` to `W+28`.
  They are functions of `x`, including the `hash1()` detail, so the extra
  width generates itself and matches what is already there.
- **`horizon` and the sky fill** extend upward to local `-35`.
- **Skylines gain points.** `HABITAT_ART[id].skyline` currently runs `[0,…]`
  to `[224,…]` in every biome. Each needs a point at or before `-28` and one
  at or after `252`. Roughly three new points per habitat, five habitats.
- **Scattered objects get placed in the new margins.** Boulders, logs, cycads,
  reeds, snags and trees are literal calls in each biome's floor function.
  Roughly four new ones per habitat.

`W` and `H` are `const` in `00-core.js:7` and are not touched. The bake canvas
is `BG_W x BG_H`; nothing else changes size.

### The view

Four crops, one per growth stage, anchored on the ground line rather than
centred vertically. The crop widths were chosen so that every number below is
a whole pixel — `sh` divisible by six makes `sy` integral, and by three makes
`sw` integral:

| Stage | sw | sh | sx | sy | scale |
|---|---|---|---|---|---|
| Hatchling | 224 | 168 | 28 | 35 | 1.000 — today's picture exactly |
| Juvenile | 248 | 186 | 16 | 20 | 0.903 |
| Subadult | 264 | 198 | 8 | 10 | 0.848 |
| Adult | 280 | 210 | 0 | 0 | 0.800 |

```js
ctx.drawImage(bakeBg(phase), sx, sy, sw, sh, 0, 0, W, H);
```

Every crop is 4:3, so nothing stretches, and the ground line lands on screen
`y = 140` at all four. The hatchling view is bit-identical to what the game
draws today.

### The cost, accepted

Three of the four views are a non-integer reduction into a 224-wide backing
store shown with `image-rendering: pixelated` (`style.css:264`). Rows and
columns are dropped: about one in ten at juvenile, one in five at adult. The
things that suffer are the one-pixel details — the lit top edge of the grass,
the specular on the river, the 4x4 ordered dither in the sky, the outlines on
the floor objects. They dash rather than vanish at these ratios, and this was
weighed and accepted against seeing the whole world.

Two consequences worth watching for on the glass:

- **The sky dither is the most exposed thing in the frame, and it is the one
  prediction here that came true.** Built and looked at, a 4x4 Bayer pattern
  reduced by 0.8 does not band — it is largely *erased*. Where the pattern's
  set pixels fall on dropped columns they vanish outright, so the upper sky
  goes flat and the dither survives only as an irregular clumpy band lower
  down, with a soft edge between the two. At 4x it is obvious. At 1x, in the
  frame, behind clouds and a speech bubble, it reads as a cleaner sky rather
  than as a fault, and it was left alone. If it ever needs fixing the options
  are, in order of cost: quantise the dither into 2x2 blocks so a reduction
  cannot erase a whole cell (which changes today's picture too), or stop
  baking the sky into the world at all and paint the gradient in screen space
  under a world baked with a transparent sky, where it can never be reduced.
- **The live foreground does not scale.** `drawGrassLine()`, `drawFronds()`,
  `drawWater()`, the motes, the mess, the food and the habitat item are all
  drawn in screen space at 1:1 after the backdrop. At adult, grass blades at
  full size grow from a dirt band at 80%. Leave them at 1:1 for now — they are
  stylised and sit right on the ground line, which is pinned — and look at it
  before deciding to do anything.

### The animal does not shrink

The sprite is drawn at screen scale and is unaffected by the crop. So the
adult is both bigger in itself and standing in a world drawn smaller, and the
two compound: the animal comes to dominate a valley it used to be lost in.
That reads as outgrowing the place rather than as the camera pulling back, and
it is the right feeling for a pet that has finished growing. It is also the
only option that keeps the sprite crisp, since shrinking it would resample the
focal point of the screen.

### Modes other than the habitat

`drawScene()` also runs `choose`, `egg` and `game`. All three are laid out in
screen space against `GROUND` and the minigames are tuned to it. They use the
hatchling crop unconditionally — which, being scale 1.0 with today's content
in it, is today's picture. Nothing about the minigames or the egg changes.

### Files

| File | What |
|---|---|
| `src/00-core.js` | `BG_W`, `BG_H`, `BG_G`, and the `BG_L`/`BG_R`/`BG_T`/`BG_B` painter bounds |
| `src/04-world.js` | `translate(28,35)` in `bakeBg()`, widened band loops, scenery in the new margins |
| `src/00-art.js` | extended `skyline` arrays, five habitats |
| `src/06-render.js` | `BG_CROP`, `bgStage()` and the nine-argument `drawImage` |

`bgCache` keeps its `biome|phase` key. The stage does not enter the bake at
all: there is one world per habitat and phase, and the four stages are four
crops of that one canvas taken at draw time. An earlier draft of this plan had
the cache key growing a stage dimension, which would have baked the same world
four times to no purpose.

---

## Part 2 — hand-drawn backdrops

Third, because it depends on the 280x210 world existing and on the grid editor
from Part 1.

### The data, and where it lives

A backdrop is a full 280x210 grid of actual colours against a palette — the
`PIX` format, not the `PART_PIX` layer-id format. Nothing about a backdrop
goes through `composeSprite`, so there are no materials to name; the pixels
are the picture.

That is about 59,000 characters each, roughly a sixth of the 352KB built game
per habitat, and five of them would be most of the file. This was weighed and
accepted for the control it buys.

They live in a **new `src/00-bg-art.js`** behind `<data:BG_PIX>` markers,
listed in `build.py` and written by the editor exactly as `00-art.js` is. The
"art is data, in one file" rule exists so the editor can reach everything it
owns; a second file it also writes keeps that intact, while leaving the growth
columns and proportions in `00-art.js` readable instead of buried in a
thousand lines of pixel rows. The built `dist/paleopal.html` is still one
file.

### Times of day

The procedural bake gets dawn, day, dusk and night for free because every
colour comes from `skySpec()`. Hand-drawn pixels are fixed, so a backdrop is
**one drawing, tinted** — the existing per-phase `tint` applied over it, plus
a phase-appropriate darkening. This is crude next to a procedural night, and
it is the real price of hand-drawing: no lit windows, no separately drawn
night sky, no aurora behind hand-drawn hills unless the live element still
draws over it.

If one habitat ends up wanting a genuine night drawing, the key already has
room: `valley|night` alongside `valley`, with the base drawing used for any
phase that has no entry of its own.

### What still draws on top

The live elements — plume, surf, aurora, ashfall, spray, clouds, stars,
flyers, water, grass, motes — are drawn per frame in `drawScene()` and are
independent of the bake. They will continue to draw over a hand-drawn
backdrop, which is mostly right, since they are what make the scene move. But
a hand-drawn ground will not necessarily agree with `drawGrassLine()`'s
blades, so each backdrop entry gets a `quiet: []` list naming live elements to
suppress for that habitat. Default empty.

### Editor

A separate **Backdrop** tab, not a mode inside Draw. It is a different editor:
a colour palette rather than a material list, a 280x210 canvas rather than a
part-sized one, and biome and phase pickers rather than species and stage.
Sharing a tab would mean one panel that rebuilds into two shapes, which is
exactly the thing `BUILD`/`PAINT` exists to avoid.

- Biome and phase pickers
- Editable palette, seeded from that biome's own sky and ground colours
- The procedural bake behind the grid as a trace guide, toggleable
- The screen crop rectangles for all four stages drawn as guides, so it is
  visible while drawing which parts only the adult will ever see
- Fill, and a colour picker, or 58,800 pixels is not drawable by hand

### Files

| File | What |
|---|---|
| `src/00-bg-art.js` | new; `BG_PIX` behind `<data:BG_PIX>` markers |
| `build.py` | the new file in the concatenation order |
| `src/04-world.js` | `bakeBg()` returns the drawn backdrop where one exists |
| `src/06-render.js` | honour `quiet` when drawing live elements |
| `tools/editor.html`, `edit-ui.js`, `edit-core.js` | the Backdrop tab and its printer |

---

## Order

1. **Part 1, the Draw tab.** The main event, and it does not depend on the
   others.
2. **Part 3, the wider world.** Self-contained, and visible immediately.
3. **Part 2, backdrops.** Needs the 280x210 world and the grid editor.

## What the first draft got wrong

Kept because each of these is cheap to make twice.

- **It treated a material layer as a picture in colours.** It is a binary mask
  and every colour comes from the ramp. The Draw tab's palette is the layer
  list.
- **It called static parts "fine for v1" because "the procedural animation
  handles poses".** There is no such stage: poses are consumed inside
  `sp.draw()`. A replaced layer is a dead layer, and a replaced eye layer
  makes ill and asleep the same picture, which is the thing session 9 fixed.
- **It centred the crop.** A 224x168 bake centred in 280x210 puts the ground
  line at 76.7% of the height where the screen needs 83.3%, so at the adult
  crop the grass would draw about 11 pixels below the animal's feet.
- **It offered `ctx.scale()` as a fallback.** `W`, `H` and `GROUND` are
  `const`, and the world painters are per-pixel `fillRect(x, y, 1, 1)` loops
  that a fractional scale turns to mush. Extension and `translate` avoid both.

## Still guesses

- The four crop sizes. The arithmetic is exact but the *feel* is not tested,
  and the step from juvenile to subadult may be too small to notice while the
  step into adult is too large.
- How bad the reduced sky dither looks. This is the one thing most likely to
  send Part 3 back for another pass.
- Whether a hand-drawn `body` that only translates reads as alive. Draw one
  stage of one species and look at it before drawing eleven more.
- Whether a tinted backdrop survives night. If it does not, the fallback is
  per-phase drawings, at four times the file cost.
