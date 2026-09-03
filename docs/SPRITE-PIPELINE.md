# Sprite pipeline

There are no image assets. Every animal is drawn from code, so one change to a
skeleton propagates through four growth stages, six animations and every coat.

## 1. Material layers

A species draw function receives `M`, an object of twelve canvas contexts, and
paints flat shapes onto them. Order matters: later layers win where they
overlap.

```
far     limbs on the far side of the body (shaded darker)
skin    the main body mass
belly   pale underside
limb    near-side limbs, so belly shading never bleaches them
head    skull and neck, kept separate so it lights as its own form
mark    coat pattern — masked to body pixels only
crest   keratin rows, nubbins, brow ridges
horn    horns, beaks, claws, teeth
mouth   open mouth interior, nostrils
sclera / pupil / glint   the eye
```

Painting onto separate layers rather than one canvas means material boundaries
stay exact and never blend into each other.

## 2. Composition and lighting (`composeSprite`)

1. Flatten the layers into a material id per pixel. `mark` is special: it only
   claims a pixel if a body layer already holds it.
2. Build a distance field. Seeds are 0 at the silhouette edge and 2.6 at an
   internal seam between two materials, so outer form reads strongly while
   internal joins stay soft.
3. For each pixel within 6 px of an edge, take the gradient of the distance
   field as an outward normal, dot it with a fixed upper-left light, and step up
   or down that material's five-step ramp.
4. Dilate a one-pixel outline outward, brightened on the lit side.

The result is real pixel art with a consistent light source, no antialiasing,
and per-part form.

## 3. Ramps

`ramp(baseHex)` generates five steps with the hue rotated along the ramp:
shadows cooler and more saturated, highlights warmer and less so. This is what
keeps flat colour from looking like clip art.

## 4. Gait

Legs are solved with two-bone inverse kinematics against a stance/swing foot
path. Bone lengths never change and hip height is read off the ground line every
frame, so feet always reach the floor regardless of body bob.

**The sprite faces −x. A planted foot must travel toward +x.** Getting that
backwards is what produced the moonwalk in session 3.

The walk cycle is driven by distance travelled, not a timer:

```
cycle = species.strideBase × stage.limb × stage.s × species.scale
frame = floor(dino.dist / cycle × POSES.walk.length)
```

so one sprite stride equals one stride of ground and speed changes need no
animation retuning.

## 5. Growth stages

`STAGE` holds per-stage multipliers: overall scale, head bulk, **snout length**,
neck, limb, tail, horn growth, **frill**, and **hornBend**. Snout is separate
from head bulk on purpose: young animals have large braincases and short
muzzles. Applying one multiplier to both is what made the Triceratops hatchling
look like it had a neck.

Every feature that grows on its own schedule gets its own column. `frill` is
separate from `horn` for the same reason `snout` is separate from `head`: a
baby Triceratops already has an obvious, deeply scalloped frill and almost no
horns, and driving the frill off the horn column left hatchlings with a huge
skull and no shield behind it.

`hornBend` carries the ontogenetic sequence Horner and Goodwin read off a
growth series of ten skulls — straight stubs, then curving backward, then
straightening, then recurving forward. Negative is backward, positive forward,
and the Triceratops draw function builds the horn as a three-point tube whose
middle control point bows *against* the tip, which is what makes a recurve read
as a recurve rather than as a bent stick.

## 6. Coats

A coat swaps the three body ramps and paints a pattern onto the `mark` layer,
which the compositor masks to body pixels only.

**The pattern rides the body.** Each draw function returns `spine`, its
centreline from nape to tail tip as `[x, y, halfDepth]` stations, and
`paintPattern` places everything against that: bands run perpendicular to the
local tangent and are cut short on the belly side, spots and speckles sit
within the local half-depth, patches ride high on the flank. Density is
specified as a distance along the spine rather than as a count, so a short
Triceratops and a long Brachiosaurus come out with the same coat, not the same
number of marks.

This is the same rule the surface detail follows, and for the same reason.
Patterns used to be a field of shapes in fixed bake-box coordinates —
seventeen near-vertical tubes marching across the canvas regardless of where
the animal sat in it. It read as a barcode painted over a dinosaur.

Everything is a deterministic function of the loop index, so a coat never
crawls between animation frames.

## 7. Anchors

Each draw function returns `{ eye, eyeR, mouth, hat, top }` in local units. The
baker converts them to trimmed-sprite pixel coordinates and adds `hs`, the head
scale. Headgear and the feeding animation use these anchors rather than guessed
offsets, which is why gear stays put across stages and animations.

## Adding a species (numbering continues from above)

1. Copy an existing file in `src/species/`.
2. Lay out skeletal landmarks in local units with the ground at `y = 0` and the
   animal facing −x. Hip height is the anchor; everything hangs off it.
3. Draw the body as **one closed outline** (`blob`) covering neck, ribcage, hips
   and tail. Separate tubes produce lumpy joins.
4. Put the skull on `M.head` so it lights as its own form.
5. Return the anchors.
6. Add a `SPECIES` entry and a `SKINS` list in `registry.js`, including
   `strideBase` (stride fraction × hip height) or the gait will desync, plus
   `eggTint` and `lure` for the egg choice screen.

That is the whole list. The egg row draws itself, hit-tests itself and labels
itself from `SPECIES` via `eggChoices()`, so there is nothing to add in
`06-render.js`, `07-ui.js` or `index.html`. Slots are centred and tighten as
the row grows; past about six species the row will need to become a scroller
rather than a single line.

Every `checks` line in the registry is a promise that the sprite draws that
feature. Do not add one without adding the geometry.
