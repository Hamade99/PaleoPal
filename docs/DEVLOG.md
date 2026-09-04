# Paleopal development log

A record of what was decided, by whom, and why. Written so that a later session
can pick up without re-deriving the reasoning. Newest session last.

---

## Session 0 — Audit of the original

**Starting point.** A single-file HTML tamagotchi-style dinosaur game generated
by another model. Owner's assessment: the graphics were bad and the game needed
to be good enough to ship on Android.

**Owner's request.** Be grilled on it before anything was rebuilt.

**Defects found by reading the source** (all confirmed in code, not guessed):

| Defect | Cause |
| --- | --- |
| The animal only aged while the tab was closed | `S.ageMs` was incremented in `catchUp()` on load but never in `update()` |
| Hold-to-pet never worked | `pointerdown` walked the `ui` array, hit the dino rect, called `doPet()` and `return`ed before `petHold = true` |
| "Stats drift in the background" was false | Background `requestAnimationFrame` is throttled and `dt` was clamped to 250 ms, so an hour in a background tab advanced the sim by seconds |
| Every dirt speck was 2 px | `rand()` called with no arguments returns `NaN`; `NaN < .5` is always false |
| The Brachiosaurus was a table | 46 columns wide, 58 rows tall, with 25 near-identical leg rows |
| The dossier lied | It claimed "two-finger hands" and "three toes per foot" were verified on a 56 px sprite that could not show either |
| No reason to open it twice | Full growth took 15 minutes of offline time, hats were the only money sink, one minigame, no goals |

**Three questions asked, and the owner's answers:**

1. Where does this ship? → **Web game first, wrap it later**
2. What do we do about the art? → **Redraw sprites properly, bigger and readable**
3. What makes someone open it on day 2? → **Deep care sim: moods, illness, bonding**

Those three answers set the direction for everything below.

---

## Session 1 — Full rebuild

**Acted on:**

- Threw out the hand-typed ASCII sprite arrays. Replaced with a procedural
  pipeline: smooth paths drawn on an offscreen canvas, then hard-quantised
  (alpha threshold, palette snap) with a dilated outline. One source of truth
  for every growth stage and animation frame.
- Phone-first layout. All text moved to the DOM; the canvas draws only the
  world. Bottom sheets instead of tiny in-canvas menus.
- Wall-clock simulation with chunked catch-up, so a focused tab, a backgrounded
  tab and a closed tab all drift identically.
- Care loop with causes rather than dice: bellyache from three treats in an
  hour, chill from being kept up past bedtime, mites from hygiene under 20,
  the blues from joy near zero. Each has a visible symptom and a specific
  remedy; wrong remedies cost coins and trust.
- Bond levels unlocking behaviour, rolled personality traits that change decay
  rates and speed, growth measured in *well-kept* minutes, a vet visit instead
  of permadeath, an away report, a daily streak.
- Storage adapter trying `window.storage` first and falling back to
  `localStorage`, so the same file survives an artifact preview, a local file,
  and a WebView wrap.

---

## Session 2 — "The graphics are still not good enough"

**Owner's feedback.** Improve the graphics a lot, particularly the dinosaur
sprites. Look up real reference material rather than inventing it. Use paleoart
as the basis, but make cuter versions.

**Research done** (summarised in `PALEO-REFERENCES.md`):

- *T. rex*: 2023 work on tooth wear and jaw foramina supports lips covering the
  teeth; gastralia make the torso barrel-shaped; two fingers with palms facing
  inward, not pronated.
- *Triceratops*: keratin sheaths grew with positive allometry, so living horns
  were substantially longer than the bone cores; skin impressions show large
  scales with scattered low nubbins, not spines; jugal horns below the eyes.
- *Brachiosaurus*: forelimbs about 1.2× the hindlimbs; neck near 60° with an
  S-curve; shoulder hump of tall neural spines; nasal crest on a small skull.
- Pixel art technique: hue-shifted ramps (shadows cooler and more saturated,
  highlights warmer and less so), a single consistent light source, and
  selective outlining.

**Acted on:**

- Palettes are now generated ramps from a base hue rather than hand-picked hex.
- Every shape is painted to a *material layer*. The compositor computes a
  distance field **per material region**, so each body part is lit as its own
  form instead of the whole animal reading as one blob with a rim.
- Outlines are selective: lighter on the lit side, darker in shadow.
- Cuteness comes from proportion, not from dropping anatomy: larger skull,
  much larger eye with a catchlight, shorter snout, rounder body.

---

## Session 3 — "He's moonwalking"

**Owner's feedback.** The walk cycle runs backwards in both directions. The
sauropod tail should be longer. The background needs another pass.

**Acted on:**

- **Real bug, not tuning.** The sprite faces −x, so a planted foot must travel
  toward +x while the body advances. Both the stance and swing paths ran the
  wrong way. Stance now starts ahead of the hip and slides back; swing lifts
  from behind and carries forward. Walk went from four frames to six.
- Sauropod tail extended to five spline points, roughly double, held clear of
  the ground.
- World rebuilt: dithered sky (4×4 ordered dither across each band boundary),
  integer-column heightfields instead of antialiased paths, three depth planes,
  treeline, tufted grass edge, watering hole, foreground cycads the animal walks
  behind, a pterosaur crossing every half minute, pollen motes, and a sun and
  moon on an arc keyed to the player's real clock.

---

## Session 4 — Feet, pacing, chrome

**Owner's feedback.** The sauropod feet are wrong: the front should not have a
foot shape because there are no real fingers there, and the back should not be
rounded ovals. Different species should pace at different speeds, with the
brachiosaur slower and its gait matching the ground. Another background pass.
Make the menus, bars and buttons thematic for a tamagotchi dino game.

**Research.** Sauropod metacarpals stand in fully vertical columns with digits
so reduced they would not have been visible in life; the whole manus is a
hoof-like structure, which is why forefoot prints are horseshoe-shaped.
Hind feet are broad and semi-plantigrade with three claws and a fleshy heel pad.

**Acted on:**

- Manus is a vertical hoof column with no toes and only the short brachiosaurid
  thumb claw. Pes is a broad wedge with a heel pad and claws. Ceratopsian feet
  got their own short, blunt-hooved treatment.
- **Gait is now driven by distance travelled, not a frame timer.** One sprite
  stride equals one stride of ground covered, computed from stride length ×
  stage scale × species scale. Changing a speed automatically keeps the legs in
  sync. Brachiosaur dropped to roughly a third of the rex's pace.
- More scenery: a fourth haze plane, boulders, a fallen log, cycads, reeds, and
  a conical volcano with a notched crater.
- Chrome: pixel-art icons drawn on canvas, segmented block meters, a device
  bezel with corner screws and a status lamp, chunky buttons with hard bottom
  edges, a pixel coin in a raised housing.

---

## Session 5 — Rebuild the theropod and ceratopsian, plus features

**Owner's feedback.** The Brachiosaurus hind feet are still weird. The rex and
trike models look very wrong; rebuild them anatomically correctly but in the
same style as the Brachiosaurus, and do that first. Add switching between
multiple pets. Energy management is unclear. Face gear (especially the goggles)
sits in the wrong place. Feeding needs an animation, and the feed sheet covers
the whole screen so nothing can be seen. Add more games.

**Acted on:**

- Rex and trike rebuilt from **named skeletal landmarks into a single closed
  outline**, the same construction that made the brachiosaur work. They had
  been stacks of overlapping tubes, which is why they read as lumpy.
  - Rex: level back, barrel ribcage, deep tail base, drumstick over the femur.
    The keratin row now rides `samplePath()` along the real outline; previously
    it was computed independently and floated off the back.
  - Trike: shoulder hump from tall neural spines, hip bulge so the rear stops
    being one cone, stouter limbs, and epoccipital scallops built into the frill
    outline rather than stuck on as dots.
- Feet became single shapes instead of a tube plus a floating oval.
- **The nest**: up to six animals, all of which age and get hungry whether or
  not they are on screen. Coins are shared across the keeper; everything else is
  per animal.
- **Vitals sheet** (tap the meter row): real per-hour rates including the
  animal's temperament modifiers, the sleep window, hours of wakefulness left,
  and how long a full night takes. Added "tuck it in", available below 70
  energy, so energy finally has a player verb attached to it.
- Gear has slots. Head items ride the skull anchor and scale with head size;
  face items ride the eye anchor and are sized from the eye radius.
- Feeding closes the sheet, arcs the food in over ~600 ms toward the mouth
  anchor, then opens the jaw. Nutrition only lands on the bite.
- Two more games: **Bug hunt** (tap critters crossing the pen) and
  **River leap** (tap to jump scrolling obstacles, speed creeping up).

---

## Session 6 — Documentation, project structure, coats

**Owner's feedback.** Document everything so far, including decisions and
feedback. Restructure out of a single HTML file into a folder so the Claude CLI
can be pointed at specifics. The Triceratops hatchling looks goofy: the head is
far too large and the crest reads as an attached long neck. Add buyable skins
and camouflage to the shop, with icons that preview the actual coat.

**Acted on:**

- **Hatchling fix.** The head multiplier (1.78 at hatchling) was being applied
  to the frill size, the snout length *and* the frill-to-skull distance, and it
  compounded: the baby's skull came out longer than its body, and the long
  forward snout between frill and beak read as a neck. Fixes:
  - New per-stage `snout` multiplier (0.58 → 1.0). Young animals get short
    muzzles, which is both cuter and true to life.
  - Hatchling head bulk reduced 1.78 → 1.62.
  - Frill scaling changed from `(0.6 + 0.4·horn)` to `(0.34 + 0.66·horn)`, so a
    hatchling actually gets a small frill instead of one larger than the adult's
    in local units.
  - Frill moved closer to the shoulders.
- **Coats.** A new `mark` material layer that the compositor masks to body
  pixels only, so a pattern can be laid down as simple full-field shapes without
  floating outside the silhouette. Four coats per species with `none`,
  `stripes`, `spots`, `speckle` and `patches` patterns. Patterns are
  deterministic, so a coat does not crawl between animation frames. Shop rows
  render a live preview of that exact coat on that animal's current stage.
- Project split into `src/` with one file per species, a `build.py` that inlines
  everything into `dist/paleopal.html`, and this `docs/` folder.

---

## Session 7 — The case, a mute switch, developer tools

**Asked for.** A mute button first, because every sound was playing and it had
worn thin. Then a way to hand yourself coins, and a way to grow and shrink an
animal on demand so the sprites could be looked at without playing for four
hours. Then the real request: make the interface nicer — more Android, more
Tamagotchi, more dinosaur — and put the whole thing inside a Tamagotchi-like
object.

**Research.** Bandai's device is an egg because *tama* is egg; the shell is
speckled moulded plastic, the LCD is deeply recessed behind a printed border,
and there are three keys in a row underneath. The Japan House piece on the
30th anniversary makes the point that the icon strip — a food glyph, a heart —
was doing the emotional work, not the pet sprite. That is the part worth
stealing, and it is why the need meters now carry pixel glyphs.

**The case.** One `.shell` wrapping everything: an egg-shaped body in warm
sandstone with a tiled speckle field, a bone `.bezel` with four screws, a
recessed `.screen`, and five moulded jungle-green keys along the bottom. All
CSS. No image assets were added, because there are none in the project and
that was worth keeping.

Two things fell out of it:

- **The status badges moved to the top of the LCD.** They were bottom-left,
  where the foreground cycads draw over them — a rough edge that had been
  sitting in the roadmap. Putting them along the top fixes it *and* reads more
  like the classic icon strip. The speech bubble dropped to `top:34px` so the
  two never collide.
- **`.picks` and `.badge` now sit inside `.lcd`.** They were positioned against
  `.stage`, which has padding, so the egg labels were off by a few pixels from
  the egg hit-boxes they were labelling. They line up exactly now.

**Sound.** The switch was three taps deep in the dossier. It is a key on the
case now, and the dossier row calls the same `toggleSound()`, so there is one
switch with two handles rather than two switches. The glyph is rebuilt only
when the state actually flips — `paintChrome()` runs about once a second.

**Developer tools.** `DEV` in `05-sim.js`, surfaced as a `dev` sheet of chips.
The rule it follows: every method writes the same fields the simulation writes.
Setting a growth stage parks `S.growth` exactly on a `GROWTH_GATES` boundary
and moves `S.stageSeen` with it — miss that second half and the next tick
announces a growth spurt that did not happen. `becomeSpecies` resets the
wardrobe with the skeleton, because coats are per species and `S.skin` would
otherwise point at an id `SKINS[S.sp]` has never heard of.

`G.dev` gates the button and ships **on**. Long-press the brand plate to hide
it. Turning that default off is now the first item in the roadmap.

**Encoding.** `build.py` read and wrote without an explicit encoding, so it was
using the machine's locale — cp1252 on this box. It happened to round-trip,
because reading UTF-8 bytes as cp1252 and writing them back gives the same
bytes, but it is an accident that breaks the moment a source file is edited by
anything that decodes properly. Every read and write is now `encoding="utf-8"`.
The build is still byte-reproducible.

**Verified in a browser**, not just in the editor: console clean, the mute
switch persists to the save and silences `SFX` without throwing, and a contact
sheet of all three species across all four growth stages renders correctly. No
horizontal overflow at 320, 360 or 412 px; the keys come out 46–64 px wide and
66 px tall.

---

## Session 8 — Coats that ride the body, the Triceratops, two minigames

**Asked for.** The case read as a phone rather than an animal. Bug hunt left
the pet standing at the side of its own minigame. Several coats looked wrong,
specifically Slate on the brachiosaur, Ochre on the trike and Ashfall on the
rex. The Triceratops was off across the board — short tail, head and frill
growing at different rates. Hearts appeared above the animal rather than under
the finger. River leap was dull and its obstacles floated. The developer panel
covered the screen. The meters and the bond row did not look like they
belonged next to the pixel scene.

**Coats.** One cause behind all three complaints. `paintPattern` laid its
shapes down in fixed bake-box coordinates — seventeen near-vertical tubes
marching across the canvas whatever the animal underneath was doing. On the
sauropod that is a barcode held up in front of a dinosaur.

The rule the surface detail already followed applies here: ride the body. Each
draw function now returns `spine`, its centreline from nape to tail tip with
the body's half-depth at each station, and every pattern is placed against
that. Bands run perpendicular to the local tangent and are cut short on the
belly side so they fade into the countershading; spots and speckles sit inside
the local half-depth; patches ride high on the flank.

Density is a **distance along the spine**, not a count. A count gave the short
Triceratops the same sixteen bands as the long-necked Brachiosaurus, which on
the trike closed up into a striped mattress. `stripes` was renamed `bands`,
because that is now what it is, and the three coat descriptions that promised
vertical banding were corrected.

The banding shape is also better supported than what it replaced: the
*Sinosauropteryx* melanosome work gives a countershaded animal with a banded
tail, which is what the coats now draw.

**Triceratops.** The frill was scaled off `STAGE.horn`, which runs from 0.14 at
hatchling. So the frill nearly vanished on young animals while the skull, on
the head column, stayed enormous — exactly the "head and crest grow at
different rates" complaint. It has its own `STAGE.frill` column now, because a
baby Triceratops has an obvious deeply scalloped frill and almost no horns.

The frill was also drawn as an upright ellipse centred near the withers, so
its lower half was buried in the shoulder hump and the whole thing read as a
lump of neck. It is built in its own tilted frame now and carried high enough
that the rim stands clear of the body the whole way round. That separation is
the animal's entire silhouette.

Two things from Horner and Goodwin's growth series went in because the sprite
can now honestly draw them, and the dossier gained a line for each:

- `STAGE.hornBend` — the brow horns are straight stubs, curve backward in
  juveniles, straighten in subadults, recurve forward in adults. The horn is a
  three-point tube whose middle control point bows *against* the tip; without
  that a recurve just reads as a bent stick.
- `EPI_DEPTH` — the epoccipitals start as deep deltoid scallops and flatten
  into the rim with age.

Tail lengthened from 34 to 50 units with a deeper base and a smoother taper,
torso from 36 to 42. Horn *width* now tracks the sheath as well as the skull;
scaling thickness on head bulk alone gave hatchlings two fat cones. The jugal
horn was a hanging tusk and is now a cheek point. The hat anchor moved to the
rotated crown — it was still using the untilted top of the arc.

**Bug hunt.** The animal stood at a fixed x playing its idle loop while the
player clicked past it. A tap is now a move order: it runs to where you
pointed and eats whatever comes within snapping distance of its mouth. The
walk cycle, the growth stage and the animal's reach all matter. `drawStomp`
parks the mouth anchor on the game object each frame and `stepStomp` reads it
next frame — one frame of lag, invisible, and it saves baking the frame twice.

**River leap.** Obstacle bases sat one pixel above the grass line, so they
hovered; they are bedded two pixels in with a contact shadow. Drawn as plain
rectangles the log was a wooden crate and the boulder a cardboard box, so both
are built column by column now — the log with rounded ends, cylinder shading
and grain running *along* the trunk, the boulder with an irregular profile. A
water hazard was added, which the game was already named after. And the track
is overdrawn with three scroll rates — scrub, ground, foreground tufts — so
the animal is running through somewhere instead of on the spot.

**Hearts** are seven across instead of five and rise from the point that was
actually touched; `pet()` takes the tap position.

**The developer panel** docks instead of covering: a rail on the right above
860px, the bottom half below it, and no scrim either way, so the game stays
visible and clickable while a sprite is stepped through its stages.

**Meters** were rounded gradient pills. They are ten hard cells behind a black
grid now, square-cornered, with a lit top row and a shaded bottom one. The
bond row was five rotated CSS squares and is five baked pixel hearts.

**The case** is rounder — a proper dome and a full round base — and has a row
of osteoderms over the crown and two three-toed feet under it. The keychain
tab is gone; it was the last part of the case still shaped like a Tamagotchi.
The scute row is placed on the dome's arc and each plate is rotated normal to
it, which is the difference between a dorsal crest and a zip fastener. The
toes are real elements rather than pale circles painted inside a tab, because
they have to break the silhouette to read as toes.

**Verified in the browser**, not in the editor: every sheet renders for every
species at every stage, every coat bakes for every species, stage and
animation, all three games run two hundred frames and end cleanly, headgear
lands correctly on all twelve species-stage combinations, and hearts emit at
the tap point. No console errors, no horizontal overflow.

**Working note.** Chrome served stale scripts from memory cache for the first
visual check of this session, so a contact sheet that looked correct was
reviewing the previous build. Dev serving now goes through a no-store handler
kept in the scratchpad. If a change appears not to have taken, check that
first.

---

## Session 9 — Mouths, the screen, and the case

**Owner's feedback.** A review of the whole project first: what to improve
structurally, in the art, in the mechanics; whether the sprites are
future-proof; whether the UI reads as something a person designed. And one
specific observation — the Tyrannosaurus has no jaw. Just a head, no visible
mouth.

**The jaw.** Not a style choice, and not missing. `drawRex` had always built a
hinged mandible and rotated it on the `jaw` pose channel. It was painted onto
`M.head`, and the compositor only draws an internal edge where two *different*
materials meet, so the mandible and the cranium merged into one region with
nothing between them. Correct geometry, correct rig, invisible. The
Triceratops and Brachiosaurus had no mandible at all, which is why their eat
animation was identical to idle.

The rotation was the wrong sign as well. The sprite faces −x, so a positive
rotation about the jaw hinge swings the snout end *up*. Nobody had noticed,
because there was nothing to see.

**Acted on, art:**

- A `jaw` layer below `head`, so the skull's oral margin is the lip line, on
  all three species. A dark oral margin is drawn on `mouth` when the jaw is
  shut; lips still cover the teeth, so that line is all a closed mouth shows.
- The gape is the wedge between the two oral margins, anchored at the hinge.
  As a slab carried around by the mandible it put mouth lining outside the
  head; run through `blob` the curves bowed outward and swallowed the face. It
  is a straight-edged polygon, because the two margins it spans are straight.
- Teeth moved to the maxilla, which is where the big ones are. They were also
  invisible: `mouth` sat above `horn`, so the gape painted over every tooth in
  it. Those two layers are swapped.
- Triceratops rebuilt around the beak: a rostral above and a predentary below,
  riding the jaw. The brow horns were emerging behind and above the eye on a
  narrow base with a long shaft, which read as rabbit ears; they are wider at
  the base, shorter, and swing forward as well as up.
- The frill moved to a `shield` layer with its own colour. On the body ramp it
  was separated from the neck by nothing but the outline, and that shield is
  most of this animal's silhouette. The rim scallops went from sixteen to
  eight: at sprite scale sixteen is a one-pixel sawtooth that reads as fur.
- Countershading is painted from the spine by `paintBelly`, the way the coats
  already were, instead of a hand-placed ellipse per species that was
  invisible at this size. Two wrong turns on the way: at full strength it read
  as a painted stripe, and a step down its own ramp put it in the dark
  saturated end and inverted the shading outright. It is mixed a third of the
  way back toward the flank hue.
- A shut eye is a line now. The lid was as wide as the pupil with round caps,
  which at this size was a black smudge across the face.

**Acted on, animation.** The IK is right and stays. The stiffness was never the
IK — it was that only the legs move, that poses are discrete keyframes, and
that every pose is a baked bitmap costing 8.7 ms, which is why walk was six
frames and idle was two at 900 ms each. So the bake got cheaper instead:

- The bake box was 232×210 and the largest frame any species and stage produces
  is 143×94. It is 168×112 now, the measured union of everything drawn plus a
  margin.
- The distance field, lighting and outline passes run over the bounding box the
  flatten pass records, rather than over the whole canvas.
- Together: 8.7 ms down to 2.9 ms. Spent on twelve walk frames and a four-frame
  breathing idle, both generated rather than typed out.
- `anim.t += 16` hardcoded sixty frames a second, so eat and cheer ran at
  double speed on a 120 Hz phone. It takes real elapsed time now.
- The frame cache is LRU with a cap of 180, and `warmFrames` bakes two frames a
  tick so a twelve-frame walk does not hitch twelve times on first use.

**Acted on, interface.** The menus were web bottom sheets that slid up over the
whole device, which made the case a costume the app was wearing. They are
screens drawn inside the 224×168 glass now, opened by the five keys and picked
by tapping. That needed a font — 5×7, a bit table, baked to a strip per colour,
still no image assets. Long prose stays in the DOM: at six pixels a character
the screen cannot carry the dossier's field notes.

**Acted on, the case.** One grid (`--px`, and the screen snaps to whole or half
multiples of 224), one palette with a real neutral to sit against, one
typeface. Gradients, inset highlights, drop shadows, a glare sheet and a page
vignette were all running at once at similar strength; each surface is a flat
fill with one hard edge and at most one highlight now. And nothing decorative
is evenly spaced any more — the osteoderms are irregular, the brand sits
against the mould seam rather than centred, and the four screws are four
different fixings. Even spacing and stacked effects are most of what made it
read as rendered rather than moulded.

**Acted on, structure.**

- `tools/sheet.html`: every species, stage and animation frame on one page. The
  missing jaw survived eight sessions because the only way to look at a sprite
  was to play the game and watch one adult in one pose.
- `build.py` had its own copy of the load order and `index.html` had another.
  It reads the script tags out of `index.html` now. Its regex replacement was
  a template as well, so the font table's arrow glyph broke the build with a
  bad escape; the replacement is a function.
- `S.tally.meals` was written on every meal, never initialised, never read.
  Gone.

**Not done.** The neck and head are still rigid — an animated neck channel
lands on top of the same three draw functions and wants a pass of its own. The
species files still share nothing; that is the thing to fix before a fourth
animal, not after.

---

## Standing decisions

- **Web first, wrap later.** No framework, no build step beyond concatenation.
- **The dossier must not lie.** If the field notes claim an anatomical feature,
  the sprite has to draw it. Adding a claim means adding geometry.
- **Illness has causes, not dice.** Every condition traces to something the
  player did or failed to do.
- **No permadeath.** Collapse and a paid vet visit instead.
- **Wall-clock time everywhere.** Never frame time for anything that persists.
- **Cuteness through proportion.** Bigger skull, bigger eye, shorter snout,
  rounder body. Never by removing a diagnostic feature.
- **The screen is the interface.** Menus live inside the glass; the case does
  not change while you play. Long prose is the one exception.
- **One grid, one edge, no symmetry.** In the case, and for the same reason in
  the screens.
