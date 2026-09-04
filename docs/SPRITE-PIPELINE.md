# Sprite pipeline

There are no image assets. Every animal is drawn from code, so one change to a
skeleton propagates through four growth stages, six animations and every coat.

## 1. Material layers

A species draw function receives `M`, an object of fourteen canvas contexts,
and paints flat shapes onto them. Order matters: later layers win where they
overlap.

```
far     limbs on the far side of the body, held back in shade
skin    the main body mass
limb    near-side limbs
shield  display structures that pass behind the skull — the frill
jaw     the mandible, behind the skull, so the boundary is the lip line
head    skull and neck, kept separate so it lights as its own form
belly   countershading  — masked to the trunk, skull and jaw
mark    coat pattern     — masked to body pixels only
crest   keratin rows, nubbins, brow ridges
mouth   the gape, the oral margin, nostrils
horn    horns, beaks, claws, teeth — in front of the mouth, never behind it
sclera / pupil / glint   the eye
```

Painting onto separate layers rather than one canvas means material boundaries
stay exact and never blend into each other.

**An internal edge is only drawn where two different materials meet.** Two
shapes sharing a layer merge into one region with nothing between them. The
mandible used to be painted onto `head`: correctly shaped, correctly hinged,
and invisible, which is why every animal had a smooth face with an eye on it
and no mouth. It has its own layer now, and `head` sits above it, so the skull's
oral margin is the lip line.

`belly` and `mark` are masked to what is already painted, so both can be drawn
generously and let the mask trim them to the silhouette. `mark` stops below
`belly`, which is how a coat fades out where the countershading starts instead
of running across it.

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

The walk cycle is twelve frames, and idle is four. Both are generated rather
than typed out — see `poseCycle` — because the only reason they used to be six
and two was that a bake cost eight milliseconds and every pose is one.

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

## 6. Countershading

Dark above, pale below is the one colour pattern with direct fossil support,
and it is also what stops a flat-coloured animal reading as a cut-out. It used
to be a hand-placed ellipse under the ribcage in each species file, which at
sprite scale was invisible.

`paintBelly` now rides the same spine the coats use. `hi` gives the height the
pale starts at as a fraction of the body's half-depth, in three stops — throat,
mid-body, tail — because countershading reaches highest at the throat and
lowest at the tail. The band is drawn well past the outline and the mask cuts
it.

The belly ramp is mixed a third of the way back toward the flank hue. Taken
neat it read as a painted stripe; taken a step down its own ramp it fell into
the dark saturated end and inverted the shading outright.

## 7. Coats

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

## 8. Anchors

Each draw function returns `{ eye, eyeR, mouth, hat, top }` in local units. The
baker converts them to trimmed-sprite pixel coordinates and adds `hs`, the head
scale. Headgear and the feeding animation use these anchors rather than guessed
offsets, which is why gear stays put across stages and animations.

## 9. Eye states

`eyeAt(M, x, y, r, state)` draws four eyes, and a pose picks one with its `eye`
field:

| state | eye | used by |
| --- | --- | --- |
| 0 | open: sclera, pupil, glint | everything by default |
| 1 | shut: one soft lid line, not a filled shape | `sleep`, and a blink |
| 2 | squinting, pleased | `cheer` |
| 3 | half-lidded: open but sunk under a heavy lid | `sick` |

State 3 exists because `sick` used to borrow state 1 from `sleep`. `anim.pick()`
returns `sick` for as long as an illness lasts, so an ill animal sat with its
eyes shut all day and looked exactly like a sleeping one — the answer to "why
will it not open its eyes" was a bellyache, and nothing on the glass said so.
The white still shows in state 3, which is the whole of the difference at this
size. The poses differ too: `sleep` is a deep slow breath, `sick` is a shallow
uneven one.

The two states also carry a mark above the animal's head, drawn by `stateMark`
in `06-render.js` rather than by the sprite: a bone plaque with a red cross
when ill, a Z when asleep. Illness wins, because an animal that is ill *and*
asleep still needs a remedy.

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
`06-render.js`, `08-ui.js` or `index.html`. Slots are centred and tighten as
the row grows; past about six species the row will need to become a scroller
rather than a single line.

Every `checks` line in the registry is a promise that the sprite draws that
feature. Do not add one without adding the geometry.

## 10. What a frame costs

Every pass in `composeSprite` is per-pixel over the bake box, so the box's area
is the bake cost. Two things brought a cold bake from 8.7 ms to under 3 ms:

- **The box was five sixths empty.** It was 232x210 and the largest frame any
  species and stage produces is 143x94. It is now 168x112, which is the
  measured union of everything drawn plus a margin. Anything that makes an
  animal appreciably bigger has to grow it, and `tools/sheet.html` shows the
  clipping at once.
- **The later passes run over a bounding box.** The flatten pass has to look at
  the whole box — that is how it finds the animal — but it records the bounds
  while it goes, and the distance field, the lighting and the outline then run
  over those bounds plus two pixels.

Frames are cached least-recently-used with a cap of 180, because the key space
is species x coat x stage x animation x frame x eye and every entry is a
canvas. A player has one species, one coat and one stage live, which is about
thirty frames; the rest is shop and nest thumbnails.

`warmFrames` bakes two frames a tick until the current stage and coat are
complete. Without it a twelve-frame walk hitches twelve times the first time an
animal crosses the pen.
