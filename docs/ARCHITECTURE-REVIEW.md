# Why the sprite pipeline fights you, and the one road out

Written session 15, after the owner said the project had become a mess to
customise. It had. This is an honest account of why, what it costs to fix, and
what each fix buys and loses. Every number here was measured, not estimated.

> **Status.** Roads A, B and C were never built and remain proposals. The
> additive half of **Road D is built and proved** — see *Built, and what it
> found*. The forty-one shapes that already exist have not been converted.

> **Revised, same session.** The first version of this offered two roads and
> recommended one of them. Both were wrong, because both answered a question
> the owner had not asked. The test they gave — *"I could add another horn to
> the T. rex if I wanted to, and stuff would work still"* — is not reachable
> down either road: one can only reshape parts that already exist, and the
> other means drawing that horn a hundred and twenty times. The answer is
> §Road D, and the first two are kept below only because understanding why
> each falls short is most of the argument for it.

---

## 1. The one-sentence problem

**The shape of an animal lives in code, and you can only reach it through
numbers that were invented as go-betweens.**

`triceratops.js` is 319 lines that compute where every point of the animal
goes, from a table of about twenty numbers called `TRI_TUNE`. Those numbers —
`headLen`, `frillH`, `bodyD` — are not the shape. They are dials someone
wired to the shape. When you want the frill two pixels wider at the base and
unchanged at the top, there is no dial for that, because nobody thought of it
when the dials were made.

Everything that follows is a consequence.

## 2. Why it did not feel like a mess before

Because it is a **generator**, and it is a good one. Measured:

| | |
|---|---|
| Poses × frames, per animal per stage | **30** |
| Species × growth stages | **12 sets** |
| Finished pictures, one coat | **360** |
| Finished pictures, all coats | **1,440** |
| Source that produces them | ~900 lines of species code + ~2KB of numbers |
| Cost to bake one | **4.2 ms** |

1,440 lit, animated, anatomically consistent pictures out of two kilobytes of
numbers. Change the walk cycle and all 1,440 follow. That is a genuinely
excellent trade — *as long as you only ever want to turn the dials*.

The moment you want to place a pixel, every one of those savings becomes a
wall.

## 3. What actually went wrong this session

I was asked for hand-drawn parts and I built them **into the middle of the
generator's pipeline** rather than at the end of it. A drawing replaces one
material layer, part-way through a bake, and then the rest of the machine runs
on top of it.

That single decision produced all of this:

| What you hit | Why |
|---|---|
| You paint materials, not colours | The compositor owns colour; layers are masks |
| "Parts" are odd shapes — `body` means neck+ribs+hips+tail as one lump | Parts are material layers, and the body is drawn as one blob |
| Every drawing is per growth stage | A grid of pixels cannot scale |
| Anything that moves needs a drawing per frame | A picture cannot bend |
| Drawings hang off anchors you cannot see | The stamp needs a landmark from the draw function |
| Three coordinate systems at once | Grid, bake box, and the species' own units |
| Drawn parts and computed parts must agree | They are neighbours in one composite |

The frozen foreleg was not bad luck. It was that list, arriving.

**The one-line fix for five of those seven**: a drawing should replace the
*finished frame*, not a layer inside it.

And there is already evidence in the file. `PART_PIX` holds six partial
drawings of two animals and is **17.6 KB — the largest block in `00-art.js`,
larger than `PIX`, which holds all twenty-nine icons and hats at 9.6 KB.**
31% of that file is now rows of pixel characters. The format is fighting.

## 4. The wall behind it

"No image assets, everything drawn from code" and "I want to draw every pixel"
are not compatible at this scale. Measured, for all 360 frames:

| Storage | Size | vs the 399 KB game today |
|---|---|---|
| Character grids, as now | **2.17 MB** | +540% |
| Indexed + run-length | 677 KB raw / 902 KB inline | +170% |
| PNG | ~571 KB raw / 762 KB inline | +140% |

Some notes on those, because they matter:

- Run-length **loses to PNG**. Pixel art with dithering and shading has short
  runs — 338,000 runs over 2.17 M pixels, an average of 6.4 pixels each. The
  obvious compression is the wrong one.
- The whole set uses **83 colours**. That is comfortably indexable, which
  matters for §6.
- One adult frame is 154×80, and only **38% of that box is animal**.

So a fully hand-drawn game is about **1.2 MB as one HTML file**. That is not
the catastrophe I implied earlier in the session — a 1.2 MB page is fine.

But the number that actually decides this is different: **you would be
maintaining 360 pictures instead of 2 KB of numbers,** and every proportion
change would invalidate all of them at once.

---

## Road A — make the shape data, and edit the shape

Stop computing outlines from dials. Store the outline points themselves, per
species per stage, and let the editor drag them.

The Body tab already gestures at this: it puts handles on the animal and drags
them. But each handle writes a `TUNE` number, so you are still moving a dial
by pointing at the thing the dial affects. Road A removes the dial.

**What it buys**

- Direct control of the silhouette. Widen that frill exactly there.
- **Nothing downstream breaks.** Walking, growing, coats, lighting, all four
  stages, all thirty poses — every one still free, still consistent.
- File size barely moves. Points are cheap; a species outline is a few hundred
  numbers, not 12,320 characters a frame.
- The species files get *smaller*. Much of those 900 lines is arithmetic that
  becomes stored points.

**What it costs**

- Rewriting three species draw functions to read points instead of computing
  them. This is the real work, and it is delicate: the growth stages currently
  emerge from multiplying dials, so stored points need a stage story of their
  own — probably points stored per stage, with the generator seeding all four
  from the current maths so nothing is lost on day one.
- You still cannot place a pixel, and you still cannot change the art *style*.
  The shading, the outline weight and the way a face reads all stay as they
  are, because the compositor still paints it.

**Honest verdict:** this fixes "the animals are not the shape I want". It does
nothing at all for "the rendering is not the look I want".

---

## Road B — make the picture data, and draw whole frames

A frame is either generated or hand-drawn. No parts, no material palette, no
anchors, no per-part fallback, no arguing between drawn and computed
neighbours. You press a button, the generator hands you its version of that
frame, and you paint over it.

**What it buys**

- Total control, and a mental model with one rule in it.
- Kills five of the seven frictions in §3 outright. The two that remain — per
  stage, and per frame — stop being penalties and become simply *what a
  picture is*.
- **The cost is proportional to how much you actually draw.** The generator
  covers everything you have not touched. Drawing the three adults' idle and
  walk cycles is 48 frames, about **100 KB** — entirely affordable. You are
  only exposed to the 570 KB figure if you decide to draw all 360.

**What it costs**

- Coats. A hand-drawn frame is one colour scheme, so the twelve free coats
  become twelve drawings — unless §6 applies.
- Any proportion change orphans every frame you have drawn.
- The generator quietly becomes a drafting tool. That is a demotion, and it
  means the anatomical guarantees — the dossier rule — stop being enforced by
  code and become something a person has to keep true by eye.

---

## Road C — A, then B as the escape hatch

The original recommendation, kept for the record and now withdrawn. A first,
because most of "customise everything" is shape and A keeps the generated
benefits; B afterwards for the few frames the renderer cannot make.

It is a reasonable plan for a question nobody asked. **It fails the horn
test**: A cannot add a part that does not exist, and B answers "add a horn"
with "draw it a hundred and twenty times". Superseded by Road D.

---

## Road D — make the skeleton explicit and the parts a list

**This is the answer, and it is the one the pipeline was already most of the
way toward.**

### The two measurements that decide it

**Each animal is a dozen shapes.**

| | shapes | lines | lines that touch the pose |
|---|---|---|---|
| T. rex | 16 | 257 | 5 |
| Triceratops | 15 | 319 | 7 |
| Brachiosaurus | 10 | 150 | 8 |

Forty-one shapes across the whole bestiary. The remaining ~700 lines are
arithmetic computing *where to put them* — and that arithmetic is the
go-between from §1, written out longhand.

**Every shape is an outline, not a bitmap.** `blob`, `tube` and `oval` take
lists of points. The hard pixel edges arrive afterwards, in the compositor,
when everything is quantised and lit in one pass.

That second fact is the important one, and it is easy to walk straight past.
It means a part can be **moved, rotated, scaled and re-lit for nothing**,
because the pixels do not exist yet when the moving happens. An ordinary
pixel-art game cannot rig its sprites; rotating a bitmap tears it. This one
can, and always could.

Which is also the sharpest possible statement of what went wrong this session:
**I introduced pixel grids — the one kind of art that cannot be rigged — into
the only pipeline whose whole strength is that it does not use them.**

### The shape of it

An animal stops being a function and becomes two lists.

```
skeleton   named joints, parented: skull, jawHinge, neck, spine,
           shoulder, hip, tailBase..tailTip, the two leg chains

parts      [ { points, material, joint, order }, ... ]
```

The pose moves joints. Parts hang off joints and are drawn in order. That is
all. The gait solver, the IK, the lighting and the growth columns are
untouched — they already work in exactly these terms, they are simply written
out by hand inside each species today.

### Against the owner's own test

> *"I see dino X. I think his legs are detailed wrong. I go to an editor, make
> my change — the proportion of the leg, a detail I want to draw on, a colour
> I want to fix. I save, go back to the game, and that is it. I could add
> another horn to the T. rex if I wanted to, and stuff would work still."*

| The ask | Under Road D |
|---|---|
| Legs detailed wrong | Drag that part's points, or its joint. It is a part in a list. |
| A detail drawn on | Add a small part. It is shaped, lit and animated like any other. |
| A colour fixed | The part carries its material; a custom colour if no material is honest. |
| **Another horn on the rex** | **Add a part, attach it to `skull`, material `horn`.** It follows the head through all thirty poses, lights correctly, and scales through all four growth stages — because it is one more row in a list that all of that machinery already reads. |
| "and stuff would work still" | Yes. Nothing downstream knows or cares how many parts there are. |

### What it costs

- **Rewriting the species layer.** ~700 lines of positioning arithmetic become
  a skeleton definition plus forty-one point lists. This is the work. It is
  large but it is not deep: every `blob(M.head, [...])` call already *is* a
  part, with its points, on its material. The conversion is largely reading
  them out and naming the joint each was computed against.
- **A stage story.** Today growth emerges from multiplying dials. With parts
  as data, four stages most likely means four point sets, seeded from the
  current maths so nothing is lost on the first day — but a change to the
  adult would then stop flowing down to the hatchling. That is a real loss and
  needs deciding, not hand-waving.
- **The dossier stops being guaranteed by code.** Anyone can now delete the
  jugal horns. The rule survives only as review.

### What it does not cost

- File size. Forty-one point lists are nothing next to 17.6 KB of pixel rows.
- Animation, lighting, coats, growth, poses. All of it keeps working, because
  none of it looks at how the parts were authored.
- A rewrite of the game. This is the species layer only — three files and the
  editor. `04-world.js` through `08-ui.js` never learn about it.

### Built, and what it found

The additive half of Road D exists. `src/02-rig.js` is the runtime, the
Triceratops publishes **eighteen joints**, `RIG_PARTS` in `00-art.js` holds
added parts, and the editor has a **Rig** tab: pick a shape, a material and a
joint, press *+ part*, drag the handles on the animal.

Against the test that started this:

| | |
|---|---|
| Draws at every growth stage | yes — 12, 30, 55, 77 pixels of horn |
| Grows with the animal | yes, and monotonically |
| Turns with a joint that rotates | yes — bound to `frill`, which carries the tilt |
| Moves through the walk and the droop | yes |
| Lit and outlined as its material | yes, by the compositor, which was never told |
| Survives a save | yes, into `00-art.js` |
| Removing it restores the animal | exactly |
| Code written for the horn | **none** |

One thing was got wrong on the way and is worth keeping, because it is the
kind of mistake this design invites. Tube widths were scaled by the joint's y
unit, which on a skull is *head depth* — about twenty pixels on an adult. A
width of 7, meant as seven pixels of horn, came out as a hundred and forty: a
disc that swallowed the animal, grew the bake box to its cap and then vanished
entirely at adult size because it was clipped on every side. A joint's axes say
where things are, not how thick they are. Joints now carry `sw` as well, and
the whole failure is one line in `02-rig.js`.

**The model holds.** Converting the forty-one shapes that already exist is now
mechanical rather than speculative.

### Growing up, settled

§8 asked how growth works once parts are data, and warned that four
independent point sets would break the inheritance that lets a change to an
adult reach a hatchling. It does not have to be four sets, because a part's
points are already in **the bone's own units** and the bone already grows: one
shape is correct at every age, for free. That is the default and it holds for
almost everything.

Two things it cannot say, and both are now in the data:

- **`stages`** — which ages have the part at all. A brow horn that arrives at
  subadult is `stages:[2,3]`; a juvenile coat that goes away is `[0,1]`. This
  is the house rule that growing up changes what an animal *has*, expressed
  once. A list rather than a from/to range, because the editor shows it as four
  buttons and a control should store what it looks like — and because a range
  would forbid an animal that grows a thing, loses it, and grows it back.
- **`at`** — one age with a genuinely different shape, not merely a different
  size. A juvenile's horn curves back where an adult's recurves forward, and no
  scale factor turns one into the other. Same shape `GEAR_FIT` and
  `SPECIES_STAGE` already use, and overriding one field overrides only that
  field.

Measured: a part inherits and grows on all three species; `stages:[2,3]` gives
0, 0, present, present; an adult override changes the adult and leaves the
other three on the shared shape.

### All three species have skeletons

rex **16** joints, Triceratops **18**, brachiosaur **15**, every one finite and
positively scaled. The brachiosaur's neck joints sit on the three stations the
S-curve already runs through, so a part hung on the neck rides the curve rather
than a straight line between its ends.

### What the prototype did not settle

- The existing shapes are still code. Nothing was converted — this proved that
  converting is worth doing, not that it is done. That is the remaining work
  and it is now mechanical.
- Whether a tail wants to be one part or a chain of them. Converting the body
  will answer it.
- Whether the dossier's anatomical claims survive hand-authoring. Nothing but
  review enforces them once shapes are data.

### How to find out cheaply

Convert **one species** — the Triceratops, since it has the most parts and the
owner is already deep in it — and leave the other two procedural behind the
existing interface. If the trike can be given a fourth horn from the editor in
under a minute and it walks, grows and lights correctly, the model is proved
and the other two follow. If it cannot, very little has been spent.

---

## 6. One idea that might make coats survive Road B

Worth writing down, and worth being suspicious of.

The compositor already works internally in *(material, shade step)* before it
looks up any colour. If a hand-drawn frame stored that pair per pixel instead
of storing RGB, then the coat system would still work on drawn frames — the
ramps supply the colour at display time, exactly as now — and the storage
would be one byte per pixel, comfortably inside 83 values.

The editor could still present it as painting colours, snapping each stroke to
the nearest (material, shade) and keeping the handful of custom colours for
details that must be exact.

**The suspicion:** this is clever, and clever is precisely what produced the
current mess. It reintroduces "you are not really painting colours" — the
first friction on the list — in a disguised form. It should only be built if
losing the coats turns out to actually hurt, and not before.

---

## 7. What should come out

Under Road D, most of what was built this session for hand-drawing should be
removed rather than carried. It was solving the right problem in the wrong
place:

- **Per-part pixel grids (`PART_PIX`)** — the whole idea. A part becomes an
  outline you can drag and duplicate, which is strictly better than a grid you
  cannot rig. This also takes the largest block in `00-art.js` back out of it.
- **Per-frame part drawings** — built today to fix the frozen leg. Under Road
  D a leg is a rigged part again, and the gait solver moves it, so the twelve
  drawings stop existing.
- **`PART_MATS`, probably.** The per-species painting colours exist because a
  material could not honestly say "rust-red band". Under Road D a band is a
  part, and a part could carry its own colour directly — same capability,
  without a parallel system. Worth keeping the *idea* and dropping the
  plumbing.

What should stay regardless: the wider world and the stage zoom, the backdrop
painting, the gait solver and IK, and the material/lighting compositor — which
is the thing that makes this game look like one game rather than a pile of
drawings, and which Road D leans on harder, not less.

---

## 8. What is not known

- **How growth stages work once parts are data.** Four independent point sets
  is the simple answer, but it breaks the inheritance that makes a change to
  the adult reach the hatchling. The alternative — one set of points plus
  per-stage multipliers — is what exists now and is exactly the go-between
  this whole document is arguing against. This needs deciding properly and it
  is the one genuinely hard design question in Road D.
- **Whether a part needs its own local pose.** A tail today is a chain that
  curves; as one part hung on `tailBase` it would swing rigidly. Chains of
  small parts may be the answer, or a part may need to be allowed to bend
  along its joint chain. Converting the trike will show which.
- **Whether the dossier's claims survive.** Today the code guarantees the
  jugal horns exist. Under Road D nothing does but review.
- **Whether pixel-level drawing is wanted at all afterwards.** It may simply
  stop being missed once a detail can be added as a part. If it is still
  missed, Road B remains available as a per-frame escape hatch and nothing in
  Road D forecloses it.
