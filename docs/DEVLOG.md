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

## Session 10 — Owner's pass: the case, sleep, the Triceratops, the games

**Owner's feedback**, in the order it arrived: the two three-toed feet under
the case are weird and out of place; the spines on the crown are not aligned
and not centred; sleep is opaque and there is no way to wake an animal;
opening the Feed menu has no obvious way back out; the Brachiosaurus has its
eyes shut all day and it turns out that means ill rather than asleep, which
was not readable; the rex could be cuter and its face is a bit goofy; the
Triceratops has odd proportions, does not read as a Triceratops, has too short
a tail and a frill that looks like a hump on its neck; in Snack run the animal
moonwalks when it moves right; Bug hunt does not work — ground bugs cannot be
caught at all, and two of the three animals are herbivores; the River leap
water sprite looks wrong and there are green specks scattered in the dirt; and
the volcano looks like a dark hill with a red pool on it.

### The case

**The feet are gone.** They were added last session on the argument that toes
have to break the silhouette to read as toes. They read as toes; the problem is
that a Tamagotchi is a held object and the moment it grows feet it stops being
one.

**The crown ridge was never on the crown.** Every plate carried a hand-typed
`bottom`, fitted by eye at one window size. Three things were wrong at once:
the arc through them dropped 23px where the shell's own crown drops about 8 to
17 depending on the viewport; the row spanned x 0 to 203 inside a 224-wide box,
so the whole ridge sat ten pixels left of the thing it was growing out of; and
none of the sizes were multiples of `--px`.

The arc cannot be written in CSS. `border-radius: 50% 50% … / 20% 20% …` makes
the top of the shell one ellipse with rx = width/2 and ry = 20% of the height,
both of which move with the case, and the stylesheet has no square root and no
way to read its own box. So the plates declare `--x`, `--w` and `--h` and
`fitCrown()` in `08-ui.js` puts them on the real curve, tucked five pixels in
so each is rooted, and rotated to the surface normal so they fan the way a
dorsal ridge does. A `ResizeObserver` on `.shell` refits them, which covers a
resize, the web font landing, and the screen being sized. They are also broader
and lower than they were — parallel-sided at the first pass, they read as a row
of thumbs standing on the case.

### Sleep

`tuckIn()` had been in `05-sim.js` for several sessions with nothing anywhere
that called it, and there was no way to wake an animal at all. So an animal
that put itself to bed hungry and filthy stayed hungry and filthy: `feed()`,
`scrub()` and `startGame()` all refuse while it is asleep, and nothing on the
case answered.

Rest is the last row on the Care screen now, next to the remedies, with the
rule written under it. `wakeUp()` costs a little energy and a little trust, and
after dark it adds to `nightAwake`, which is the field that brings on a chill —
the same one a player who keeps an animal up past bedtime fills. The cost is a
consequence of a decision, which is the rule the whole illness model runs on.

It also needed `WAKE_GRACE`. Waking an animal at night with low energy was
undone by the next tick half a second later, because `simulate()` puts it back
under at `isNight() && energy < 30`. A hand-woken animal now gets twenty
minutes before that rule may reclaim it. Running the tank to six still
overrules the grace: at that point it drops where it stands.

### Ill is not asleep

`POSES.sick` used `eye: 1`, the shut lid from `POSES.sleep`, and `anim.pick()`
returns `sick` for as long as an illness lasts. So an ill animal sat with its
eyes closed all day and looked exactly like a sleeping one, and the answer to
"why will it not open its eyes" was a bellyache that nothing on the glass ever
mentioned.

- `eyeAt` gained state 3: open but sunk under a heavy lid. The white still
  shows, which is the whole of the difference at this size.
- The poses differ too. `sleep` is a deep slow breath on two frames; `sick` is
  a shallow uneven one on four.
- `stateMark` draws the reason above the animal's head: a bone plaque with a
  red cross when ill, a Z when asleep. Illness wins, because an animal that is
  ill *and* asleep still needs a remedy. The Zs also emit on a clock rather
  than a two-percent chance per frame, which at 120Hz produced twice as many
  as at 60 and either way could go seconds without one.

### The keys latch

A key stays pressed in while its screen is up, so pressing it again is the
obvious way to let it out. It was not wired: the only way back was the close
tab in the corner of the glass, which on a case with five physical keys under
it is the last place anyone looks. `toggleScreen()` closes the screen its own
key opened; a different key still jumps straight across.

### The Tyrannosaurus

Cuter, and the goofiness was three straight lines and a right angle: a flat
roof from nape to muzzle, a ruler-straight oral margin under it, and a squared
premaxilla at the end. Three curves replace them and none costs a claim in the
dossier. The braincase vaults over the orbit and falls away behind it, which is
both what a tyrannosaur skull does through the postorbital and what makes an
animal read as young. The oral margin is sinuous — high at the cheek, bowed
down through the tooth row, lifting at the tip — which is the shape the maxilla
has and, read as a face, a slight smile. The muzzle keeps its square front but
is shorter and deeper. The mandible carries a rounded chin instead of a flat
slab, the eye is larger and set lower and further forward, and the brow over it
is a rounded hood rather than a flat plate.

### The Triceratops, rebuilt

The frill was built around a point just in front of the withers, tipped back
forty degrees, and the body outline was run forward to meet it. So its lower
half was buried in the shoulder hump, its rim never cleared the back line, and
the skull appeared to be extruded out of the front of a lump. In side view a
ceratopsian is a head with an animal behind it.

- The frill is anchored to the back of the skull now, and the skull is carried
  forward of the shoulder. The body's nape stops at the base of the neck
  instead of running into the frill, so the neck is a column with sky either
  side of it.
- The epoccipitals are drawn as pale bone knobs on the rim, not only as a step
  in the outline. They are separate ossifications that fuse to the margin, so
  they are the colour of the horns; a scalloped edge on its own is invisible at
  this size. They shrink with age on the existing `EPI_DEPTH` schedule.
- The skull is deep and boxy rather than a long thin wedge. About half of this
  animal's head is frill, and giving the skull the other half made it a snout
  on a stalk. The rostral is the tip of the upper beak now instead of a cream
  mass across the whole muzzle, which had the face reading as a bird skull.
- Tail out from 50 units to 62, deep at the base the whole way.
- The shield colour is pulled further from the body ramp, and the eye is
  larger. A ceratopsian orbit is small for its skull, but the skull is most of
  the sprite, and a pinhole in it reads as blank rather than as an eye.

### Snack run

`flip` came from `tx < x`, which is inverted — the sprite is drawn facing −x,
so flipping it is what points it right — and which the arrow keys never touched
at all, because they drive `vx` and leave `tx` where it was. Together: the
animal moonwalked to the right, and under keyboard control faced one way for
the whole round. Facing comes off actual velocity now.

### Bug hunt is gone; Forage replaces it

Two faults, and only one was a bug.

The bug: critters spawned in two bands, one in the air and one on the ground
*below* the grass line, and catching one meant bringing the mouth anchor within
eleven pixels in both axes. An adult's mouth sits about thirty pixels above the
ground line, so nothing walking on the floor of the pen was reachable by any
player at any skill — half the quarry in the game.

The design fault, which mattered more: the quarry was insects, and two of the
three animals are obligate herbivores.

So the quarry is food, and which food comes from the species' own `likes` —
ferns and cycad cones for the ceratopsian, berries and cones for the sauropod,
river fish and carrion for the tyrannosaur. Everything sits on the ground line
where the animal's own feet are, so reach is a horizontal distance and nothing
can spawn somewhere unreachable by construction. What makes it a game rather
than a queue is the compsognathids: they come in from the edges, go for
whatever has been down longest, and are faster than any of the three animals
you can raise. Every few seconds there is a choice between the close find and
the one about to be taken.

Playtested headless: thirty-second rounds for every species at the hatchling
and adult stages, against a nearest-first player, an oldest-first player and a
player who does nothing.

| | idle | hatchling | adult |
| --- | --- | --- | --- |
| points | 2–7 | 19–33 | 35–43 |

Doing nothing scores about a tenth of playing. Growth is worth about a third.
For calibration the same harness scores Snack run at 47 and River leap at 25,
which at their pay rates is 94 and 75 coins against Forage's 70–86. Which
policy wins varies by species, which is the sign there is a decision in it.

The finds needed help to be seen: the item is stamped four times in near-black
a pixel out in each direction, giving it the same hard outline every animal
here has. A green fern frond on a green grass line is otherwise invisible, and
the item is the thing the player is aiming at. A bounding rectangle will not do
it — that comes out as a black plaque.

### River leap

- **The water.** A cosine lens of flat blue starting a pixel under the grass
  line, so it read as a dish resting on the dirt: nothing was cut, nothing had
  a bank, and the hazard the game is named for looked like spilled paint. It is
  a channel now — the grass stops at a lip, the earth under the lip is exposed,
  the water sits down inside it in the sky phase's own water colour, and
  ripples ride the surface with the track. Depth is what makes a hazard read as
  something to jump.
- **The green specks.** Fourteen one-pixel tufts scattered at random heights
  across the whole dirt band. Grass grows in a mat, and a foreground is a band
  along the bottom edge that the animal runs behind. It is one unbroken fringe
  now, every blade a different height, scrolling fastest of the three layers —
  which is the layer that sells the speed.
- **The scrub** behind the runner was a rectangle with a wider rectangle across
  it in a colour a third of the way to the sky, which read as broken masonry.
  It is a clump of fronds off a stem, in a colour that stays on the vegetation
  side of the palette.

### The volcano

A cone of one flat colour with a two-pixel orange bar across the top and a
translucent rectangle standing over it. Four things make a volcano read and it
had none of them.

1. **A concave profile.** It used `H0 × (1 − t^1.55)`, whose slope is zero on
   the axis and steepest at the base: flat on top with sheer sides, which is a
   butte. Raising `(1 − t)` to a power above one gives the opposite and correct
   shape — steep at the summit, flaring at the foot.
2. **A truncated summit.** The crater is cut into the profile rather than
   painted on afterwards, and it has to be cut deeper than the cone falls
   across its own width or there is no notch at all. Painting a bowl under a
   pointed apex, which was the first attempt, reads as a wok.
3. **Two faces with a hard edge**, lit from the upper left like everything else
   in this game, with gullies radiating down the flanks so the slope has a
   direction.
4. **A plume that moves.** The backdrop is baked per sky phase and redrawn
   perhaps four times a day, so anything in it is a painting on a wall — the
   old smoke had never moved in the history of the project. Fourteen puffs
   share one rising cycle, widening and fading as they climb and leaning
   downwind with height. By night the smoke is a dark body against the sky, lit
   warm only at the vent, and the crater is the one warm light in the frame.

Three false starts worth recording, all of them the same mistake — drawing a
feature with geometry of its own instead of asking the mountain where it is.
The plume was anchored on `VOLC.top`, the apex a pointed cone of this profile
would reach, which the truncated summit never gets to: the smoke and the glow
floated nine pixels above the mountain, the glow reading as two arcs bridging
the summit. The lava pool bowed the wrong way and put its deepest colour
against the lips, drawing an orange arch over the notch. And the lava runnels
stepped a fixed distance sideways per row, so on a flank far steeper than that
they walked straight off the silhouette and came out as guy-ropes staked into
the sky. All three now read the profile: `volcHeight` for a height and
`volcSpan` for a width.

### The rest of the backdrop

- A fourth and furthest ridge, nearly the colour of the haze it stands against.
  Without one that close to the sky the range began at a hard edge and the
  distance behind it read as painted card.
- A river on the valley floor between the far range and the near one. One flat
  band of sky colour lying down is the cheapest depth cue there is. It has to
  be painted before the mountain, or it runs straight across its flank — which
  it did, as a bright horizontal stripe.
- Araucaria and tree ferns in the treeline. Eight identical conifers in two
  clumps is a hedge. The araucaria took two attempts: a one-pixel trunk under a
  shallow cap is a street lamp, and a crown widest a quarter of the way down is
  a mushroom. Two thirds crown, one third trunk, widest where it meets the
  trunk.
- A live rank of grass along the ground line, leaning on a slow breeze. The
  boundary the animal stands on was the one hard line in the scene that never
  did anything.

**Not done.** The species files still share nothing, which is still the thing
to fix before a fourth animal. Forage's ceiling is the spawn rate rather than
the player's skill, which is fine for thirty seconds and would not be for
longer. At twenty-odd pixels the araucaria and the tree fern differ from a
conifer by two or three pixels of crown; they read as variety rather than as
species.

---

## Session 11 — Clouds, five habitats, growing up

**Owner's feedback.** The clouds are all the same shape at different sizes and
want real reference. There should be four or five backgrounds in the same
style, bought in the shop. The Triceratops is much better but the snout and
mouth are odd, the white tips on the front look wrong, and the lower jaw is so
much shorter than the snout that it reads as a shark. The T. rex's juvenile,
subadult and adult are the same animal scaled up — only the hatchling is
distinct — and the same goes for the Triceratops, whose hatchling is also too
skinny. The Brachiosaurus is fine at every stage; leave it. The river leap fix
was good.

### Clouds

Three stacked rectangles is a wedding cake, and all four clouds were the same
wedding cake at four sizes. Fair-weather cumulus has three properties and none
of them is a rectangle:

1. **A flat base.** The condensation level is an altitude, so every cloud in a
   field has its bottom on the same line and that line is straight and sharp.
   It is the most recognisable thing about a cumulus and the thing a stack of
   centred rectangles destroys.
2. **A cauliflower top** of overlapping lobes at different radii, with one
   dominant tower that is never in the middle.
3. **Strong side lighting.** Sunward lobes near-white, undersides grey, and the
   base the darkest part — and at dawn and dusk the warmest, because a sun near
   the horizon lights it from underneath.

So a cumulus is drawn column by column against the union of its lobes, the way
the ridges and the volcano are, and the lobes come off the cloud's seed rather
than being stored. Cirrus is a different cloud — ice sheared into fibrous
streaks with no body and no base — and having one kind of each is most of what
stops the sky reading as four copies of one thing.

Two corrections on the way. The lobes were seated at 0.58 of a radius above the
base, which put the tallest cloud thirty pixels off its bottom and ran it off
the top of the sky, where it was clipped square. And the underside was first
mixed toward the ground colour, which gave every cloud a field reflected in it,
then toward the sky's top, which turned the bases purple at dawn: keeping the
horizon's own hue and only taking light out of it is what leaves a grey base by
day and a warm one at dawn and dusk.

### Five habitats

`G.biome` and `G.biomesOwned` sit on the keeper next to the purse, because a
habitat is the enclosure and not the pet. Fern valley is free and is what the
game already had; Salt lagoon, Ash flats, Fern gorge and Polar dawn cost 130 to
260.

The structure is a shared bake with three holes in it. Sky, four depth planes,
the grass edge and the dirt band are the same everywhere — every habitat needs
a horizon and a ground line, and one copy of them is what stops five backdrops
drifting apart by two pixels each. A biome supplies its sky colours, its **day**
ground palette, a tint, and three painters: `landmark`, `treeline`, `floor`,
plus an optional `live`.

Dawn, dusk and night are mixed from the day palette by one rule per phase. The
check on that rule is that it reproduces the hand-tuned valley palette this game
shipped with to within a couple of values on every entry — it is the rule the
eye was already applying, written down. The alternative was a hundred and
eighty hex values that all had to agree with each other, and they would not.

Two exceptions needed keys of their own, both of them the near ridge:

- `nearRidge` replaces the near hill. The lagoon uses a low sand bar, because
  the point of a coast is that there is nothing between you and the water — at
  base 100 the hill buried the sea and every stack standing in it.
- `landmarkFront` paints the landmark after the near ridge rather than before.
  The gorge's cliff is the near side of the gorge; painted behind the hill the
  fall vanished half way down and its spray was drawn over the treeline in
  front of the wall.

Anything that moves is in `live`, because the backdrop is cached per biome and
phase: surf running up the lagoon's sand and back down it, ash falling on the
flats under a doubled plume, the fall and its spray in the gorge, and an aurora
over the polar habitat at night and dusk.

**The barcode, three times.** The glacier came out as a striped circus tent, the
cliff as courses of masonry with pilasters on it, and the volcano's gullies as
corduroy. All three placed a feature by thresholding a sine, and a sine over a
threshold is periodic — the eye reads periodic as manufactured. There is a
`hash1()` in the world module now and a house rule pointing at it. The second
half of that lesson cost another pass: sampled per column, a hash is not
irregularity, it is hatching. A feature has to be a block a few pixels wide, so
the input is quantised.

The shop needed a third shelf and would not take one — two stacked grids
already ran the caption into the action bar. It has tabs now, one shelf at a
time, which is also how a shop with a counter works. A habitat is shown as the
view itself, for the same reason a coat is shown as the animal wearing it: the
thing being sold is what you will be looking at. The price tags got a strip to
sit on, because a habitat thumbnail is the whole frame scaled down and the
price was being written across the sky.

### The Triceratops' face

Three faults and all of them at the front of the head.

- **The underbite.** The mandible was built as a fixed fraction of the snout
  measured from the jaw joint, which left its tip twenty units short of the
  upper beak at every scale. A ceratopsian's two beaks meet, so the mandible is
  built against the upper beak's own tip now — `beakL` is where that tip falls
  in hinge-local coordinates, so the jaw closes on it however the skull is
  scaled and at every growth stage.
- **The white tips.** The rostral and the predentary were drawn on `horn`,
  which is the near-white keratin the brow horns are made of, so the front of
  the face was two blobs of bone with no edge between them and the horns above.
  A beak is duller and darker than a horn sheath and it is a different
  material, so it has a layer: `beak`, which a species that does not ask for it
  inherits from `horn` unchanged. The rostral is also the tip of the beak now
  rather than a third of the muzzle.
- **The tusk.** The jugal horn ran down past the mandible's ventral line, which
  stops being a cheek boss and becomes a pale fang hanging under the jaw. It
  stays on the cheek.

The mandible is also deep at the back where the coronoid process is and tapers
to the beak. Carried at one depth it was a slab, and the face came out as three
stacked bands: skull, jaw, beak.

### Growing up

The complaint was exact: only the hatchling read as its own animal. `s` scaled
everything and the ratios that varied — head, snout, neck, limb, tail — were
too gentle to change a silhouette. Growing up changes what an animal *has*.

Four new columns in `STAGE`, used by the rex and the Triceratops:

- **`muzzle`**, snout depth, separate from `snout`, which is length. A young
  tyrannosaur has a shallow muzzle in front of a large braincase and the deep
  boxy skull arrives late; the skull now carries two depths and tapers between
  them.
- **`bulk`**, how deep the trunk and neck are for a given length.
- **`torso`**, trunk length. This is what fixed the skinny Triceratops
  hatchling: built on adult proportions it was a scale model of an adult, which
  reads as underfed rather than as young.
- **`fuzz`**, protofeather coverage on the rex. Juvenile tyrannosaurs are
  reconstructed with a substantial coat that thins with age, and it is the
  single most visible thing that can differ between two stages of one animal.

The rex's brow boss now rides `STAGE.horn`, which it was not using, so the
lacrimal ridge grows in over the four stages and a postorbital boss appears at
subadult. The keratin row is sparse and low when young and a full row on an
adult.

`fuzz` had to be spaced by distance along the topline rather than by count —
the lesson the coat painter learned in session 8, relearned here. Thirty-seven
filaments over a hatchling's short back overlap into one solid band, which is a
thicker animal, not a coat.

The Brachiosaurus reads none of the four columns. It was the one the owner was
happy with, and a column only exists where a species asks for it.

**Since.** The Brachiosaurus was brought in line the same way. Its growth is
the clearest of the three, because the two things everyone recognises about a
brachiosaur — the very long neck and the back sloping down from the shoulders
— are both adult traits and they arrive together. The forelimb-to-hindlimb
ratio is 1.00 at hatching and 1.22 at adult, so a baby is a level-backed,
short-necked, big-headed thing and only the adult is the silhouette on the
poster. It also reads `bulk`, `torso` and `muzzle`, and the nasal arch grows
on the horn column the other two use for ornament — at ten pixels of skull the
crest, the eye and the jaw line are the only three things that can say
anything, so it is worth one of them changing. No `fuzz`: sauropods are the
one group here with no filament evidence.

**Not done.** All five habitats share one ridge profile
and one ground line — the palettes, landmarks and dressing carry the
difference, and at a glance they do, but the skyline behind all five is the
same three hills. And the species files still share nothing.

---

## Session 12 — an art editor, and the data behind it

**Asked for.** A way to change the art without going through me — "if I want to
change a part of the Brachiosaurus tail, or make the neck longer, there is no
easy way for me to do this currently" — covering all of it: animals,
backgrounds, food, shop items, buttons. Plus notes kept somewhere for the
Android port and for what happens after an animal reaches adult.

**The trade, stated plainly.** Moving to hand-drawn sprite sheets would give
total control and cost the game most of its content: 624 baked frames come out
of about 200 numbers per species, coats repaint any of them for free, and a
fourth animal costs one file rather than several thousand images. The engine is
not the limitation. What was missing was that the numbers were *inside* the
code. So: keep the engine, extract the data, build the editor.

### The pixel art

Twenty-nine sprites — fourteen icons, six hats, seven food items, the mess and
the heart — were a hundred and forty lines of hand-written `g.fillRect(3,4,2,1)`
spread across three modules, changeable only by someone who could read them as a
picture in their head. They are rows of characters in `PIX` now, editable by eye
in a text editor and by hand in the editor.

Converted by **extraction, not transcription**: a probe ran the old draw
functions into a canvas, read the pixels back and emitted the palette and rows.
Then the same probe rendered all twenty-nine both ways and compared them pixel
for pixel against the committed build. Zero differences. Transcribing a hundred
and forty `fillRect` calls by hand would have introduced errors that nobody
would find for months.

The outline every icon and hat wears is deliberately *not* stored. It is a pass
over the finished grid in `pixCanvas`, so an edit cannot leave a sprite with a
half-drawn border — and it deleted two private copies of the same dilation loop.
The bond pips turned out to be a second hand-written copy of the heart the
particles already use; they draw the same sprite twice now, once flat grey.

### The proportions

Each draw function had its skeleton as literals scattered through fifty lines of
control points. They are `REX_TUNE`, `TRI_TUNE` and `BRA_TUNE` now — hip height,
torso length, neck length, head length and depth, tail length, and whatever else
that species has, in local units at adult size.

Where a draw function needs two stations at a fixed ratio — the four points down
a tail — they are written as exact fractions of the length (`TL*23/72`), not as
rounded decimals. The first pass used `TL*.32`, which is 23.04, and **239 of 312
frames moved**. A refactor that claims to be structural has to prove it: all 312
frames are byte-identical to the committed build now, and that check ran after
every step.

### One file

Everything the editor can change — `PIX`, `STAGE`, the three `TUNE` tables, the
three `SPEC` colour sets, `SKINS`, and the habitat palettes as `BIOME_ART` — was
consolidated into `src/00-art.js`, each declaration wrapped in
`/*<data:NAME>*/ … /*</data>*/`.

That is the whole reason for the consolidation. An editor that has to patch a
value out of the middle of six working source files is an editor that will
eventually corrupt one. This one replaces the text between markers and leaves
everything else, so the prose survives a save.

The markers themselves cost a mistake worth recording: they were placed by
matching `^};$`, and the three `SPEC` declarations end mid-line
(`outline:'#26190f' };`). The regex sailed past them and stacked four closing
markers seventy lines further down. They are placed by a brace scanner that
skips strings and comments now. Two comments that lived *inside* `TRI_SPEC` were
lifted above it in the same pass, because the serialiser writes a plain object
and a comment between the braces would not survive a save.

### The editor

`tools/editor.html`, five tabs:

- **Pixels** — a paint grid over every `PIX` sprite, with its palette editable
  and the result shown at 1x, 2x, 4x and outlined as the game draws it.
- **Species** — a slider per proportion and a picker per material colour, over
  a live strip of all four growth stages.
- **Growth** — the `STAGE` table as a spreadsheet, with every species at every
  stage underneath it.
- **Coats** — colours and pattern per coat, on the animal wearing it.
- **Habitats** — sky, ground and tint per biome, over all four sky phases baked.

Every change mutates the live object, calls `artChanged()` and redraws. That one
call drops five independent caches — frames, materials, pixels, backdrops, sky
palettes — because a preview showing a stale bake is how an editor teaches you
the wrong thing about your own edit.

It runs from a local server rather than `file://`, for two reasons that are the
same reason: it reads `00-art.js` in order to save it, and the browser will only
hand out a writable file handle on a secure origin. `python -m http.server`.
(Half of that turned out to be wrong, and the whole requirement went away in
session 13 — see below.)

Two faults found by driving it headlessly. `const $` at the top of the editor's
script collided with `00-core.js`'s, which is a redeclaration that kills the
whole file before a line of it runs — and leaves no error anywhere, because the
error handler was in the file that did not load. And the serialiser looked its
tables up on `window`, which never works for a top-level `const` in a classic
script: they go into the global lexical scope and never become window
properties. Both are silent failures that look like nothing happening.

**Proved, not assumed:** a save with nothing changed produces a file that
reloads to identical data for all ten blocks, and rewriting the rewritten file
is a fixed point.

### Written down rather than built

`docs/TODO.md` now holds the two long jobs. The **Android port**: the Capacitor
wrap is a day, and the work that matters is the frame loop draining the battery,
the back button, audio needing a gesture, notifications, and the case on a tall
narrow screen — with a note to wrap it roughly and put it on a real phone before
polishing anything. **Week two**: an animal reaches adult in about four hours
and then the loop is four meters and a thirty-second game, with nothing for
coins to do once the coats are bought. That is the biggest hole in the game and
nothing about it is decided yet.

### Per species, per stage

**Asked for straight after:** the same changes, applicable to one species at
one growth stage.

That is a third layer, and the gap it fills is real. `STAGE` says what every
animal does with age. A species' `TUNE` table says what that animal is at adult
size. Between them they cover "all tyrannosaurs have a shallow muzzle when
young" and "this tyrannosaur has a long tail". Neither covers "this species, at
this age, is not like either" — which, looking at the three animals here, is
most of what growth actually is.

`SPECIES_STAGE` is one row per stage per species. Any key in a row **replaces**
the value it names, whether that is a `STAGE` column or a `TUNE` key; an absent
key is inherited. Replacement rather than a multiplier, because several of these
values are legitimately zero or negative — `hornBend` is 0 on a hatchling and
−1 on a juvenile, and no multiplier moves either of those.

Every draw function resolves through `artFor(species, stage)` now instead of
reading `STAGE` and its `TUNE` table directly.

The mechanism paid for itself immediately: `EPI_DEPTH`, the Triceratops'
per-stage epoccipital depth, was a hand-kept four-element array sitting beside
the growth system because it had nowhere to belong. It is `epi` in `TRI_TUNE`
with three overrides in `SPECIES_STAGE.trike`, which is what it always was.

In the editor the Species tab gained a stage selector. At the base it edits the
species' own proportions as before. At a stage it shows the growth columns as
well — "the trike's frill at hatchling" is a growth column, and is exactly the
kind of thing this is for — with every row displaying its inherited value until
you pin it. Pinned rows are marked and carry a × back to inherited, because an
override that only ever accumulates is a fork.

Checked by pinning `frillW` on the Triceratops hatchling and re-hashing all
twelve species-and-stage combinations: exactly one moved. Clearing it put every
one of them back.

### Two faults in the editor, reported and fixed

**The sliders looked broken.** The number moved and the slider did not. Every
`input` event called the tab's redraw, which rebuilt the whole panel — removing
the very element the pointer was dragging and replacing it with a fresh one.
The drag died after a single step; the number still updated, because that first
event had landed. So the symptom pointed at the slider and the cause was the
redraw.

`BUILD` and `PAINT` are separate now. Moving a control paints the previews and
leaves the controls alone; only choosing a different thing to edit builds them.
The one case that genuinely changes a control mid-drag — the first edit at a
stage, which turns an inherited row into a pinned one — applies that decoration
to the row in place instead.

**The tail was being cut off.** Wind the rex's `tailLen` far enough and the tip
ran off the bake box and was clipped square. `BAKE_W` and the rest were fitted
to the animals as they stood, which was fine while proportions only changed
when someone edited a draw function; on sliders they change all the time, and a
bake has no way of complaining about its own box.

A bake checks whether it touched the edge of its box now, and if it did, the
box grows and everything re-bakes. Winding the rex's tail from 72 to 140 takes
the box from 168×112 to 296×208 and the tip survives; the brachiosaur's neck at
120 does the same vertically. It costs a couple of wasted bakes the first time
a sprite outgrows the box and nothing after that, and the box starts small
again on reload.

**Not done.** The editor turns numbers; it does not yet let you drag a control
point on the outline. That needs the species outlines themselves extracted to
data, which is the same job again one level deeper, and is worth doing once the
`TUNE` sliders have shown which numbers people actually reach for.

---

## Session 13 — saving, and making it work in Firefox

Reported as a bug: modify a sprite, click Save, get *NetworkError when
attempting to fetch resource* in the corner. Nothing was broken. The editor had
been opened by double-clicking it, and session 12's note above says it has to be
served over http instead.

That note was half wrong, and the wrong half was the whole requirement.

Saving keeps everything outside the `<data:NAME>` markers, so it has to read the
current text of `00-art.js` before it can write. It did that with `fetch`, and a
`file://` page is not allowed to fetch a sibling file — hence the error, which
is Firefox's wording for any failed fetch and says nothing useful about why.

The second reason given, that a writable file handle needs a secure origin, is
true and does not imply a server: `file://` **is** a secure context. Writing was
never the problem. Only the read was.

So the read now goes through the handle that already does the writing. One
`showSaveFilePicker` call, asked for on the first Save, and `getFile()` on that
same handle supplies the template. No fetch, no server, and one dialog instead
of a server plus a dialog.

Three things fell out of it:

- **A save re-reads the file rather than trusting the copy taken at load.** Edit
  the prose in `00-art.js` by hand with the editor still open and the edit
  survives the next Save, where before it was silently overwritten with text
  read minutes earlier.
- **The handle is kept in IndexedDB,** which structured clone can store, so
  after a reload the second save is a one-click permission prompt rather than
  another trip through the file dialog. All of it is wrapped: a browser that
  refuses storage to a `file://` page just gets the dialog again.
- **The template is no longer warmed at load on `file://`.** It was a `fetch` at
  startup; making that path ask for a file would have put a dialog in your face
  before the editor had been looked at. On `file://` it waits for Save.

**Firefox was the one that lost.** It has no writable-file API at all, so no
amount of serving fixes it: Save could only ever read through an `<input>` and
hand back a download to be moved into `src/`. The server never bought Firefox
anything.

So the writing left the browser. `tools/edit.py` serves the folder on a free
port, opens the editor, and answers `POST /save` by writing `src/00-art.js`
itself — which is a server again, but one you double-click and close, that
never appears in a URL bar and never asks you anything. Firefox saves with no
dialog at all now, and so does everything else; `tools/edit.cmd` is the
double-clickable front of it.

Two details worth keeping.

The endpoint refuses a body that does not carry the `<data:...>` markers. The
one thing a tool that overwrites its own source file must never do is truncate
it, and an empty or half-formed POST is exactly how that happens.

It writes `encoding="utf-8", newline=""` explicitly, for the same reason
`build.py` does: the default encoding on this machine is cp1252 and the default
newline is CRLF, and either one silently rewrites all 29 KB.

### The save that reverted a source change

Caught within the hour, by the fix for it not being in the file any more.

`loadTemplate` cached the text of `00-art.js` from page load and every save
rewrote *that*. The editor had been open since before `pixCanvas` was changed,
so pressing Save wrote back a copy of the file from before the change and undid
it — silently, and with a cheerful "Saved" in the corner. Nothing about the art
was wrong; the eight hundred lines around it were simply old.

The writable-handle path never had this, because it reads through the handle at
save time. The launcher path did, because a fetch looked cheap enough to do
once. It is now done on every save, with `cache: 'no-store'`, since a
200-from-cache is precisely the stale copy being guarded against.

The general form: the marked blocks come from the editor, everything around
them comes from the file **as it is at the moment of saving**. An editor that
holds a whole source file in memory and writes it back later is not an editor,
it is a very slow undo.

Saving now has three paths, tried best first — the launcher, then a writable
handle, then a download — and nothing has to detect which. A static server
answers 501 to a POST and a `file://` page cannot POST at all, so a failure
falls through on its own.

Verified without a browser: the launcher serves the page and the file, a POST
carrying a real edit lands byte-identical on disk with LF and its `·` and `—`
intact, the saved file still parses, and both a junk body and a wrong path are
refused with the file untouched.

### The outline had nowhere to go

Found while checking a redrawn `icon.play`. `pixCanvas` cut the canvas to the
sprite's exact `w`x`h` and then dilated the outline **outward**, so any art
pixel touching the edge lost its outline on that side, silently. Eleven of the
twenty-nine sprites were affected — `icon.feed` on two sides, `heart` on three,
and the new `icon.play`, which fills its box, on all four, leaving it with no
outline anywhere.

It had been invisible for twelve sessions because the icons that touched an
edge mostly touched one, and a missing outline on one side reads as a slightly
odd sprite rather than as a bug.

The canvas is now a pixel larger on every side and the art is drawn at `+1,+1`.
A sprite is art, not a box; it should not have to keep a spare row clear to be
drawn correctly. The pad is published as `canvas.pad`, because headgear places
itself from the canvas size: horizontally it cancels, since a hat is centred
and the margin is on both sides, but a hat is hung by its bottom edge and would
otherwise ride one scaled pixel high. The face mask takes its scale from the
art's width and not the canvas's, or every mask would shrink.

Checked by running the real `pixCanvas` against a stub 2D context and asking
the only question that matters — is any solid pixel still touching
transparency? Twenty-nine sprites, none.

### The icon slot handled one axis at a time

The same redraw turned up the other half, and it took two goes to get right.

`.act .ico canvas` set `width` and `height` both to `--px * 6`. That costs
nothing while every icon is 12x12 and squashes a 15x19 one to four fifths of
its height the moment somebody draws a taller one. Driving the height alone
fixes exactly that case and no other: a sprite drawn *wider* then grows
sideways out of the button instead, and the grid columns stop being equal.

Both versions were the same mistake, which is picking an axis. The slot is now
a fixed square with `object-fit:contain`, so the sprite is scaled by whichever
axis runs out first and centred in what is left. 24x12, 12x24, 20x20 and 30x8
all land inside the same box, centred, with their proportions intact. An icon
can be drawn any size and any shape.

The shop rows had the literal version of the bug: `.row .art` is a fixed box
with `overflow:hidden` and nobody had ever sized the canvas inside it, so
`mountArt`'s 30px canvas was quietly clipped to 28. Same fix.

Seven `--px` rather than six, because the canvas is two pixels bigger than the
art now: 14 into 28 is a clean doubling and 14 into 24 is not, and `.act` has
the room — its `min-height` is 16 and its contents come to about 14. The
need-meter icons went from 3 to 3.5 and the coin from 13px to 14px for the same
reason: below 1:1 a pixel sprite starts dropping rows.

One thing the code cannot fix. A 19-row sprite in a slot sized for 12-row art
lands on a scale of 1.333, so its pixels come out alternating one and two
screen pixels wide. Crisp heights in that slot are 12 rows (2x) or 26 (1x). A
play icon that wants to read as taller is better drawn *narrower* — 9x12 renders
22x28 against the others' 28x28, which is taller in proportion and exact.

Checked by round-tripping the real `src/00-art.js` through `rewrite()` outside a
browser: all eleven blocks come back byte-for-byte equal as data, and a second
save changes nothing further. The first save does reflow the marked regions and
drops comments written *inside* them — four section headings in `PIX` — which is
what "the text between the markers is replaced" has always meant, and is
unchanged here.

---

## Session 14 - Simulation, progression and reference-backed pose checks

The owner approved the architecture/gameplay review and requested particular
care with incorrect faces and poses. This pass kept the plain-script runtime.

- Shared historical catch-up uses explicit pet arguments and equal growth
  rates across the roster. Exposure-based illness and per-pet mess RNG no
  longer depend on cosmetic random draws.
- Save validation covers nested fields, versions, species and equipment.
  Failures are visible; read failures protect the existing save. Import,
  export and downloadable recovery copies have isolated browser tests.
- Presentation and world updates moved out of draw functions. Payment and
  nutrition are applied together before the feeding animation.
- Field journals recover prior growth studies, unlock two non-coin rewards,
  and record favourite meals, trust, completed games and habitat exploration.
  Shy low-bond greetings use a wary pose; trusted greetings close the mouth.
- Minigames now declare a common lifecycle and have separate seeded RNG,
  species/stage profiles, weekly challenges and personal bests. Full rounds
  cover three seeds, every species and hatchling/adult players, including idle
  controls. Aggregate growth differences are tested. Payouts were reduced to
  keep the higher-scoring Forage pace from doubling income unchecked.
- Rex and brachiosaur jaw lengths had omitted the offset behind the snout.
  Their corrected endpoints, restrained gapes, distributed neck droop and
  rex muzzle growth were checked against skull references and all-stage
  sheets. Uncertain feather and neck-posture claims were qualified.
- Resolved `artFor()` limb values drive stride timing. Habitat skyline and
  interaction placement are data; each habitat visit has a persistent
  thirty-minute cooldown and a journal entry.
- Added Node regressions and Playwright browser/art checks. Generated browser
  artifacts live outside OneDrive after it locked a test-output directory.

The browser tests are not substitutes for human difficulty testing, a complete
long-term economy study, or peer review of anatomical reconstructions.

---

## Session 15 — drawing by hand, and a world wider than the screen

**Owner's request.** Three things: let body parts be drawn by hand in the
editor rather than only the small icons; let backdrops be drawn the same way;
and make the world bigger than the 224x168 screen so it opens out as the animal
grows, reaching full size at adult.

**The plan was written twice.** The first draft was written from the request
and was wrong in four load-bearing places, each of which would have cost a
rebuild. They are recorded here rather than dropped, because each is a trap that
is cheap to fall into twice:

| It assumed | The code says |
| --- | --- |
| A material layer is a picture in colours | `composeSprite` reads it as a binary mask at alpha 118 and takes every colour from the ramp |
| A static part is fine because "the animation handles poses" | Poses are consumed *inside* `sp.draw()`; a replaced eye layer makes ill and asleep the same picture again |
| Centre the crop in the bigger backdrop | The ground line then sits at 76.7% of the height where the screen needs 83.3%, floating the animal 11px above the grass at adult |
| Fall back to `ctx.scale()` on the world | `W`, `H` and `GROUND` are `const`, and the painters are per-pixel `fillRect(x,y,1,1)` loops that a fractional scale turns to mush |

**Hand-drawn parts.** `PART_PIX`, keyed `species|unit|stage`, one character per
pixel naming a *material* rather than a colour. A unit is one material layer's
worth of geometry, because that is the granularity the layer canvases already
have — `body` is the whole trunk, since the house rule says draw neck, ribcage,
hips and tail as one blob and there is no way to lift the hip out of the middle
of it. Drawings are stamped at device resolution onto the anchor the draw
function returns, which is the same trick that keeps a hat on a skull: the
anchor has already been moved by the pose, so a stamped part breathes and
walks. A unit with no drawing stays procedural, and that absence is the whole
animation strategy — draw the head, let the gait solver keep the legs.

The load-bearing test is that a drawing traced off the procedural shape bakes
back to a byte-identical picture. It is only true if the anchor, the origin and
the grid alignment are all exact, and while it was off by one the symptom on
screen was simply a part that looked slightly wrongly drawn.

**A wider world.** 280x210, and an *extension* rather than a magnification:
today's picture sits inside it unmoved at its old coordinates. One
`g.translate(28, 35)` at the top of `bakeBg()` and every literal in
`04-world.js` goes on meaning what it meant — the volcano, the falls, all 81
references to `GROUND`. Only the loops that run the full width had to widen,
and since they are functions of x, including their `hash1` detail, the extra
scenery generates itself and matches. Skylines gained points at -28 and 252;
about four new boulders, plants or trees went into each margin by hand.

The view is four crops of that one canvas, one per growth stage, anchored on
the ground line rather than centred so the grass stays under the animal's feet.
The widths were chosen so every number is a whole pixel: `sh` divisible by six
makes `sy` integral and by three makes `sw` integral. The hatchling crop is
scale 1.0 over the old picture, so a newly hatched animal sees exactly what the
game drew before any of this existed, and the egg and the minigames take that
crop unconditionally.

**What the zoom costs, having looked at it.** Three of the four views are a
non-integer reduction, which with smoothing off drops rows and columns. The
prediction that the sky dither would suffer was right and understated: a 4x4
Bayer pattern reduced by 0.8 is not banded, it is largely *erased*, because the
set pixels land on dropped columns. The upper sky goes flat and the dither
survives as a clumpy band lower down. At 4x it is obvious; at 1x, behind clouds
and a speech bubble, it reads as a cleaner sky, and it was left alone. If it
ever needs fixing, the honest options are a 2x2 dither cell (which changes
today's picture too) or painting the sky in screen space under a world baked
with a transparent sky, where nothing can reduce it.

**Hand-drawn backdrops, and the first second art file.** `BG_PIX` in
`src/00-bg-art.js`. These are real colours — nothing about a backdrop goes
through the compositor — at 280x210, which is 59,000 characters each, about a
sixth of the built game per habitat. Owner accepted that cost for the control.
"Art is data, in one file" exists so the editor can reach everything it owns; a
second file it also writes, with the same markers and the same save path, keeps
that while leaving the growth columns readable instead of buried under a
thousand lines of pixel rows. `tools/edit.py` now takes `?file=` and looks the
name up in a table rather than joining it onto a path, so nothing outside those
two can be written.

A drawing composites *over* the computed habitat rather than instead of it, so
anywhere left blank the generated scene still shows and a patch and a whole
backdrop are the same feature. One base drawing serves all four times of day,
washed toward each one's sky — crude next to a procedural night, which is what
the `biome|phase` key is for on the day one earns it. `quiet` lets a drawing
switch off the live elements its own ground disagrees with.

**Both editors trace before they draw.** Nobody paints a torso, let alone
59,000 pixels, from an empty grid. Both tabs seed from the computed version and
let you push it around; the backdrop trace quantises to 62 colours and moves
1.8% of pixels doing it.

**Painting with a colour, after the fact.** Owner pushed back on materials
being the only palette, with the right example: a detail on a Triceratops
frill. No material on that animal is rust-red, and inventing one would be a lie
about what the frill is made of — the dossier rule, applied to the sprite. So a
species can now carry up to eight colours of its own, in `ink0`..`ink7`, which
sit just above the coat because a marking covers the surface and passes behind
the horns, the teeth and the eye. They are ordinary materials in every other
respect: each takes a ramp and the lighting pass, so a painted band is lit by
the same sun. `lit: 0` gives the flat sticker, for the few things that really
are flat, and is the same mechanism the pupil and the glint already used.

The cost had to be nothing for a species that uses none, because the
compositor's every pass is per-pixel over the whole box and eight idle layers
would have been half as much again on every bake in the game. `drawLayers`
leaves a hole in the canvas array for an undefined colour and `composeSprite`
skips it, so an animal with no colours of its own allocates the same fifteen
canvases it always did. That is asserted rather than assumed.

**A frozen foreleg, and what it was.** Owner reported the Triceratops walking
with its front leg still, and suspected the zoom or the colour work. It was
neither. Every baked frame in the game was hashed against the pre-change build:
the only differences were the six parts the owner had themselves drawn and
saved, and their own earlier retune of `headLen` and `frillH`. The cause was
`trike|limb|3` — the near legs, drawn as one picture. Measured, the drawn legs
travelled 0px across the walk where the solved ones travel 11, and since the
far legs were never overridden they kept stepping, which is what made it read
as one leg rather than both.

This was documented behaviour and it was still wrong. A part that only
translates is the truth for a skull or a frill and a lie for a leg. So a key
may now carry a pose and a frame — `trike|limb|3|walk|7` — and beats the plain
key where it exists. Only `walk` needs them, because every other pose leaves
`legPhase` at zero, so thirteen drawings cover a species rather than the
twenty-six a naive reading would demand.

The button is the feature. "Trace every frame of walk" measures one grid off
the widest reach of the whole cycle, so a swing cannot run off the edge of a
frame's box, and fills all twelve from the gait solver. What comes out is
twelve legs that already step correctly, to be edited rather than invented —
which is the difference between a minute and an afternoon, and therefore the
difference between the feature existing and not.

Worth recording about the diagnosis: two different attempts to measure the
fault in a number both said nothing was wrong, because both measured the
finished sprite, where the far legs go on stepping whatever the near ones do.
A side-by-side picture of the walk cycle showed it immediately. The test now
measures the near-leg layer after stamping, which is the only place the fault
is visible as a quantity.

**Not done.** The middle two crops may be too close together to notice while
the step into adult is too large — that wants playing, not measuring. A
hand-drawn `body` only translates, it does not flex, and whether that reads as
alive is unknown until someone draws one. The eye is deliberately not drawable:
five pose states, and the difference between a shut lid and a hooded one is the
only thing separating asleep from ill.

---

## Session 16 — cutting the editor back, and the case as data

**Owner's verdict, carried over from session 15.** *"this whole designer
realistically needs a complete redesign."* Session 15 had answered a complaint
about "a million dropdowns" by tidying the same tool, which did not help; it
also left three planning documents — `ARCHITECTURE-REVIEW.md`,
`EDITOR-REDESIGN.md` and `PLAN-DRAW-AND-ZOOM.md` — describing a direction that
has now been taken out. They are deleted. What was worth keeping out of them is
here.

### The editor, cut from ten tabs to five

Kept: Pixels, Species, Growth, Coats, Headgear. Removed with all their
machinery: Body, Draw, Rig, Habitats, Backdrop.

Gone with them: `src/02-rig.js` and `src/00-bg-art.js` deleted, and `PART_PIX`,
`PART_UNITS`, `PART_MATS`, `RIG_PARTS`, `BG_PIX` and the eight `ink0..ink7`
layers. `LAYERS` went back to fifteen real materials from twenty-three, and
`drawLayers` folded into `bakeOnce` once nothing outside the baker needed a
half-built sprite. Editor 2,676 lines to 1,077; built game 411KB to 355KB.

**What the architecture review had got right, and is worth not re-deriving.**
The shape of an animal lives in code and is only reachable through numbers
invented as go-betweens — `headLen`, `frillH` — which are dials somebody wired
to the shape rather than the shape itself. That diagnosis stands. Its proposed
answer was to make each animal a published skeleton plus a flat list of parts,
and the additive half of that was built and did work: a horn added from the
editor grew, turned, walked and lit correctly with no code written for it.

It was removed anyway, because the owner's problem was the tool and not the
model, and a rig nobody could drive is a rig that costs maintenance and returns
nothing. If direct authorship is picked up again, start from that result rather
than from the tool: the shapes are outlines, not bitmaps, which is why they can
be rigged at all — and the mistake session 15 made was introducing pixel grids,
the one kind of art that cannot be, into the only pipeline whose strength is
that it does not use them.

**BIOME_ART stayed.** Only the Habitats *tab* went; the data still draws the
five habitats and is still editable by hand behind its marker.

### The case became data, and then became two things

The case was CSS: a border-radius silhouette, a cast speckle, seven crown plates
placed by `fitCrown()`, four screw heads, five painted keys. None of it could be
drawn by hand and none of it could be replaced.

It is a fixed 96x155 grid now, one cell per `--px`, with everything live placed
on it as a *fraction* of the case. That is what lets a drawn or imported
faceplate line up, and it had to come first: the case had no fixed aspect at all
— its height was whatever its contents came to, and the ratio ran .60 to .70
across viewports, so no single picture could fit it.

**Then the part that took several attempts.** Redrawing the case as a 96x155
sprite lands close and never identical, and after three rounds of it the reason
was clear rather than a matter of more care: the moulding has 2px borders, a 1px
seam and a silhouette the browser renders as a curve at device resolution, and
at 96 cells across one cell is four screen pixels. A grid fine enough would be
384x620 — a quarter of a megabyte of pixel rows in a source file.

So the case has **two faces and one box**. The face is either the moulding, in
CSS, exactly as it always was, or a picture — `PIX.case` from the Pixels tab, or
an imported file. `data-case="art"` on the root switches. The default is the
moulding, so it is the case this game has always had by construction rather than
by anybody's eye.

An imported case lives in `Store` on the machine that imported it, so the
project still ships no image assets; promoting one into `src/00-art.js` is a
separate press in the editor because it is a separate decision.

### What else shipped

- **Top-down forage**, with PIX sprites for the three species and the compy —
  drawn facing +x and rotated to the heading, which is the one projection that
  can be rotated honestly. Three grounds from the round's seed, a burst pickup.
- **Two games.** Tug of war is the competitive one: a rival of the same species
  and age, and a grip window rather than a mash. Nest guard reuses the top-down
  view for triage rather than routing, and runs on `runSpeed` — the pen speed
  falls with age while reach rises and the two cancelled exactly, which had a
  hatchling and an adult scoring the same round.
- **An age counter**, wall clock from `S.born`, per animal, on the glass.
- **Habitats moved onto the pet.** Buying opens a place to the nest; moving
  moves the animal you are looking at.
- **Feet are flat underneath.** Every one was an oval, so all three animals
  stood balanced on a ball, and the rex's claws were placed by a typed offset
  that landed them seven pixels in front of the foot they grow from. Claws are
  wedges drawn by `drawFoot` itself now.
- **Messages go where the player is looking** — a screen's title bar, a strip
  under a game's clock, or the habitat bubble. The DOM bubble floats over the
  middle of the glass, and the glass, when a menu is open, *is* the menu.
- **Mobile.** 48px targets on the head keys; nothing DOM over the glass may take
  a tap; the glass climbs in eighths so the leftover between one scale step and
  the next stops being a band of dead panel.

### Two bugs worth remembering

**`getComputedStyle` does not resolve custom properties.** `fitCrown` read plate
sizes out of `--h`, got back the `calc()` as written, and `parseFloat` of
`"calc(4.16px*5)"` is `NaN` — which fell through to a height of zero and buried
the whole crown ridge inside the shell. Measure the box; it is already resolved
and cannot lie about itself.

**A constant that mirrors the stylesheet will drift from it.** `fitScreen`
computed the glass opening from `RECESS_W`/`RECESS_H` instead of looking at it,
and sized the canvas for a box it did not have: 364 into 358, where `max-width`
clamped it to a scale of 1.598 and put the world's pixel grid on a fraction —
the one thing the discrete steps exist to prevent.

## Session 17 — habitats that hold together as the view widens

**Owner's report.** Three things. The fern valley and the ash flats shared one
volcano. As an animal grew and the view widened, the crater rim with its lava and
smoke came away from the cone and floated in the sky: attached at hatchling,
clear of the mountain by adult. And the top of the gorge's fall looked wrong,
most of all at adult.

**The floating rim was never the volcano.** The backdrop is baked into the
280x210 world and shown through `BG_CROP`, but `drawScene` called the biome's
`live` painter straight onto the screen at the landmark's own coordinates.
Those only agree while the crop is scale 1 at offset (28, 35), which is the
hatchling crop. From juvenile on, the cone shrank and moved down under a crater
glow and plume that stayed put. The same fault ran the fall's spray streaks up
past its top into open sky, put the pond's ripples off the pond, and kept surf,
ash and aurora to the old 224-wide strip. It went unseen because session 15
checked the zoom against baked backdrops, and nothing baked moves.

`drawHabitatLive()` paints `live` and the pond ripples onto a transparent
world-sized canvas, with the bake's translate, and blits it through the same
crop with nearest-neighbour sampling. A baked pixel and a live pixel at one world
coordinate now land on one screen pixel at every stage. The widened painters
loop `BG_L`..`BG_R`, the plume climbs to `BG_T`, and ash falls from there.

**One volcano, one habitat.** The ash flats had been drawing the valley's
mountain at a different seat, on the story that the two were one valley either
side of an afternoon. On screen that read as two habitats with the same
landmark, which is what a landmark exists to prevent. The volcano is the ash
flats' alone now, seated at x 120 with no borrowing. The valley's landmark, the
owner's pick from four, is an old-growth araucaria (`drawGiantTree`). It is a
long bare trunk with lost-limb stubs and a flared foot under a few overlapping
ragged tiers, and it stands on the near ridge (`landmarkFront`), rooted at
`ridgeY(NEAR_RIDGE, x)`. The treeline's small araucaria scaled up was not an
option: at three times the height that shape is a lollipop.

**The fall is cut into the lip.** The old fall was a dark box from row 24 to the
pool, and row 24 is above the cliff's own edge. The water came out of a
flat-topped chimney standing proud of the wall, against the sky. Now
`gorgeTop()` takes a notch out of `gorgeLip()`: flat under the water, rising on
a parabola of fixed depth to the untouched edge. The depth is fixed rather than
read off each column, or the lip's hash comes through as steps. The brink sits
below every column of lip across the notch, so the notch is never a step up. The
water shows a bright crest a pixel proud of the floor and two glassy rows, then
a sheet that spreads with the square root of the drop. Its edges break in
four-row blocks off `hash1`, and the rock beside it is dark where the spray
keeps it wet. The right wall of the notch catches the light and the left does
not. The spray streaks hold a fraction of the sheet's width, so none runs off
its edge. The fall moved from x 150 to 158. At 150 the notch's left shoulder
began while the cliff was still climbing, and the two slopes met in a spike
beside the water.

**Not done.** `drawWater`'s ripples are centred on x 177 in every habitat, but
only the valley has a pond there. The polar dawn's is at 192, and the other
three habitats have none, so the ripples lie on bare ash, sand and dirt. That
predates this session, and it is more visible now that the ripples sit where
the world puts them.

### The second half: a world twice the screen

**Owner's request.** The valley's tree could be far larger and more
impressive, and it stood on top of its hill without following the hill's
curve. And the zoom should be bigger for every habitat, now and in future, with
bigger steps between stages. That meant painting a larger picture and more
detail, not stretching the old one out.

**Numbers.** The world is 448x336, twice the screen each way. The crops are
224, 280, 352 and 448 wide, about 1.26 a step; they were 1.06 to 1.1. The ground
line fixes the rest: it sits at 280 in world rows, so the padding is 112 columns
a side, 140 rows of sky above and 28 of ground below. The crop test no longer
hard-codes the old padding, and it now asserts that each stage pulls back at
least a fifth.

**Halving the view breaks two ordered dithers.** Nearest-neighbour at 0.5
keeps one pixel in four of a 4x4 Bayer pattern. The sky's gradient came out as
horizontal stripes, and at 0.8 and 0.64 the dirt beat against the sampling grid
into a waffle. Two different fixes:

- The **sky** is no longer baked. `skyView(biome, phase, stage)` paints it into
  a screen-sized canvas: each screen row asks which world row it shows, and the
  dither is laid at screen pixels. Every stage gets a crisp gradient. Above the
  old top of the sky it carries on for four more bands toward a deeper zenith,
  because a hundred and forty rows of one colour read as a wall. At hatchling
  the rows are exactly the bands they always were. `drawHabitatView()` draws the
  sky and then the crop, and the renderer, the editor's glass preview and the
  shop's thumbnails all go through it.
- The **dirt** uses hashed noise instead of the Bayer pattern, because reduced
  noise is still noise.

**A far side.** Under a sky that tall, the three skyline planes sat along the
bottom of a blue wall. Each habitat now has a `range` in `HABITAT_ART`, its own
high silhouette drawn by `farRange()`. The valley gets soft ridges, the ash
flats jagged old cones, and the gorge the flat tops of more plateau. The
lagoon's is a single island on the horizon, and the polar dawn's is a massif
with snow caps. Two first attempts failed:

- Mixed toward the horizon colour alone, a range came out paler than its sky,
  which reads as snow or a wall. It now takes the sky's own blue too.
- Lit faces run full height from ridge to horizon drew a hard seam at every
  change of slope, like organ pipes. The lit face is now a band under the
  ridgeline, in blocks of three columns. Snow is a cap whose depth follows the
  peak, never a band with a ruled bottom edge.

Every skyline now runs from -112 to 336 with new points on both sides.

**The giant.** It is redrawn at the scale of the new world: a crown from the
adult's sky down to the top of the hatchling's view, about 260 wide. A newly
hatched animal sees a trunk and the lowest sprays hanging in, and the whole
tree only appears as it grows. What didn't work on the way:

- Narrow foliage tiers spaced up the trunk made a stack of slabs with sky
  between them. The crown is now broad, overlapping masses (`giantClump`,
  unions of lobes drawn column by column like a cumulus). The back masses are
  shaded rather than hazed, because hazed they read as clouds caught in the
  branches.
- Each mass's underside curls up at both ends. Flat to the last column, the
  masses were hedges cut square.
- Limbs (`giantLimb`) leave from the trunk's edge. Started on its axis, each
  limb's lit top edge crossed the trunk and the trunk had rungs.
- Roots drawn one by one with their own lifts stood up in spikes where they
  crossed near the trunk. They are now a buttress skirt, whose height falls off
  smoothly with distance and is measured up from `ridgeY()` at every column.
  Root ridges run down the skirt and out along the slope, filled to the ground
  so they lie on the hill.

The rest is detail: a furrowed bark whose fissures follow the lean, a hollow, moss
on the shaded side, grey moss and lianas hanging from the crown, and tree ferns
among the roots for scale.

**The margins, one habitat at a time.** Each got something that belongs to
that place, found only as the view widens:

- The **valley** has a fallen giant on the left: a trunk of the same kind down
  on its side, with its root plate torn up on end and ferns growing on it.
- The **lagoon** has a sea arch hazed out in the right-hand water and smaller
  stacks at different distances. Open sea, not a row of teeth.
- The **ash flats** have a parasitic cone out on the left, cold except for a
  warm lip. At a height of 56 only its tip cleared the near ridge, so it
  stands 92. The plume went from fourteen puffs to thirty over a slower
  cycle, because fourteen spread up the new sky were a string of bubbles.
- The **gorge** has its far wall on the left, hazed and falling away toward
  the middle. Past the hatchling's view the plateau steps up into a higher
  tier. A cliff on one side with open country on the other had been an
  escarpment.
- The **polar dawn** has a nunatak on the left, a dark spur standing up
  through the ice with snow on its ledges.

**Cost.** Bakes got cheaper, not dearer, because the sky left the bake: 6 to
40ms per habitat and phase, against 25 to 48 before. The live layer is 0.7ms a
frame on the bigger canvas.

### Third pass: the sun, the ash, the gorge floor, a mountain, the shop

**Owner's report.** At subadult and adult the sun sat in the middle of the
valley's tree. The valley becomes the Mystical valley. The ash flats were
boring. The gorge's floor and pool looked poor, especially at hatchling. The
polar dawn wanted a huge mountain on the left, twice the size of the spur that
was there, seen whole at adult and only just at subadult. And the shop should
open each shelf on what is in use, not on its first item.

**The sky is behind the land.** Stars, sun, moon and clouds were drawn over
the finished backdrop, so the sun hung in front of the crown and clouds crossed
the faces of mountains. `drawHabitatView()` takes a callback, run between the
sky and the bake, and `drawScene` draws the sky's contents there. The crown now
covers the sun and it shows through the gaps between masses.

**Ripples only where there is a pond.** `pond:[x0, x1]` on a habitat in
`BIOME_PAINT` places `drawWater()`'s ripples; a habitat without one gets none.

**The ash flats have things happening.** Geometry shared by the bake and the
live layer, computed once: `ashCracks()`, `ashFlow()` and `ashVents()`.
- Two **lava crust fields** on the flats, black plates with red cracks. The
  cracks lie where a pixel's two nearest plate centres are nearly equally far,
  as cooling crust splits; a thresholded sine would lay them in rows. Each plate
  breathes on its own phase, so the glow moves across the field.
- A **lava channel** down the volcano's right flank, holding a fraction of the
  cone's width, with a hot knot travelling down it.
- **Fumaroles** on the near ridge, with sulphur crusts and steam.
- **Columnar basalt** at both edges of the view.
- **Bombs** thrown from the crater on parabolas, and **lightning** in the ash
  column a few times a minute. The lightning's flash was first one translucent
  disc, and it read as a moon rising out of the plume; it is three faint soft
  layers now.

**The gorge floor.** The old plunge pool was drawn in `drawFalls` before the
grass, and only its bright top row showed above the tufts — a pale plate on
the lawn. The floor owns the pool now:
- It is sunk into the ground, darkest at the near edge, with glints in short
  dashes and foam only where the fall lands, and grey mossy stones on the rim.
- An **outflow channel** runs from the pool down through the soil to the
  stream, instead of the stream appearing from nowhere.
- The **stream** has a near bank of lit wet gravel over a dark cut edge, water
  going from shallows to deep, and stones with foam wakes. Flecks move along it
  and down the channel in the live layer.
- **Moss** lies in clumps of different sizes nudged off their cells. On a fixed
  3x2 grid it lined up into floor tiles.

**The polar dawn's peak** (`drawPolarPeak`, `PEAK`) replaces the spur. A
subadult sees only a slope at the edge of the view, and a juvenile none of it.
Three things went wrong on the way:
- At a profile exponent of .42 the summit was a cusp and the mountain read as
  a needle. It is .62 with a rounded cap.
- With a left flank as steep as the right, the frame cut it off a few columns
  past the summit and the peak stood against the edge as a sliver. The left
  flank is a long high shoulder running out of the world.
- Rock in per-pixel blocks of four was a checkerboard. It is sheared blocks nine
  by seven along the slope. Spindrift off the summit came out as a row of dots
  and reached into the subadult's view, so there is none.

**The shop** opens each shelf on what the animal has in use: the coat it
wears, the headgear on its head, the habitat it is in. `layout()` picks it
only when the shelf changes, so a tap elsewhere sticks.

### Fourth pass: the case, the play screen, wash

**Owner's report.** The mood line under the glass ("Norbert is fast asleep")
was cut off at the right. The word "Bond" beside the hearts should go. The
nameplate on the case, with its grilles, sat too close to the green keys. On
the play screen a game's record and description ran on underneath the WEEKLY
CHALLENGE bar and were unreadable, for every game but the trick. Wash should
clean one mess at a time. And, on the polar dawn: take the trade and make the
peak a massif.

**The mood line fits itself.** It stays one line, since an absolutely placed
box that grows eventually grows over something. `fitMood()` steps the type
down a quarter of a cell at a time, measuring the laid-out box at each step.
The name holds its place down to 2.5 cells. Below that the name gives way to
"It", and the type can go down to 2. The name is written in full in the header
just above the glass, so it is the one word that can go. Shrinking alone was
not enough: "is too weak to stand. Take it to the vet." and the illness lines
after a fourteen-letter name fit a 360-wide phone at no size. Every real line
was checked at 360, 375 and 1280 wide. Only past all of that does the
stylesheet's ellipsis take over. It runs
after every `refresh()` and on resize. The hearts no longer carry a label, which
gives the line that room back.

**The nameplate** sits 3.5 cells under the keys' shadow instead of 1.

**The play screen.** Six rows at fifteen high left two lines between the list
and the bar, and a game needed five: the record, then a three- or four-line
blurb. The rows are eleven high now, with `listRow` centring its text in
whatever height it is given. The record moves onto the caption's own line:
Best on the left, This week on the right. `caption()` takes a `maxY` and drops
any line that would reach it rather than draw under the bar. Every game's last
line now ends at least twelve rows above the bar.

**Wash, one at a time.** Each press cleans the mess nearest the animal, for a
coin and ten hygiene. The last one adds the rinse, 22 hygiene and 4 joy, so a
full clean pays exactly what the old scrub-everything did. With nothing left to
clean, a press is the rinse on its own. Checked through the key on the case.

**The peak.** Seated at x -84 with flanks of 180 and 140 and a profile exponent
of .82 under a wider rounded cap. A subadult sees its right shoulder and a
juvenile a corner of its foot: the owner's trade.

### Fifth pass: an open mouth is open

**Owner's report.** When the rex eats, the whole gap between its jaws is flesh
coloured, which is anatomically wrong and looks goofy. Only a small section
where the jaws meet should show skin.

**Nothing is drawn in the gape.** Seen from the side, the space between the
jaws is open, and whatever is behind the head shows through it. `mouth` keeps
only a small triangle at the hinge, a quarter of the way along each margin:
the corner of the mouth, where the lips fold in. The teeth are still `horn` on
the margins.

A dark cavity was tried first, as a material of its own (`maw`) under `mouth`.
It read as a hole the side view could see into, and the owner preferred the gap
empty, so the material was taken back out rather than left costing an idle
canvas on every bake. The triceratops and the brachiosaurus drew the same
flesh-coloured wedge and take the same change. The shut lip line is still
`mouth`.

### Sixth pass: the developer panel, reorganised and tunable

**Owner's request.** Reorganise the developer ("god mode") panel and make it
nicer. Allow day and night to be changed, the sleep times, the hunger and
energy meters — everything should be tunable.

**Built once, repainted.** `refresh()` runs every second, and it rebuilt
whatever panel was open. That was harmless while the panel was all chips, but
a slider rebuilt mid-drag loses the pointer after one step. That is the trap
the editor already records, so the dev panel is exempt: `refresh()` calls
`paintDev()`, which rewrites the status strip and moves every slider that is
not being dragged to its live value. A click on a chip still rebuilds through
`DEV.done()`, which is fine, because the click has finished. The scroll
position and which sections are open survive the rebuild.

**Layout.** A status strip (stage, sky clock and phase, sleep state, health,
growth, coins), then folding sections: Time and sleep, Meters, Growth, Rates,
Illness, Pen and habitat, Species, Purse and keeper. Time and Meters start
open. Habitats had a `DEV.setBiome` and no control; they have chips now. Mess
is set as a count rather than one press at a time.

**Two knobs that are not fields**, both off the nest's save:
- **`SIM`**: the per-hour rates for hunger, hygiene, joy, energy awake and
  asleep, the sleep window, and a growth multiplier. The tick and the Care
  screen's copy read it; the literals it replaced are gone. Only values that
  differ from `SIM_DEFAULTS` are stored, under `SIM_KEY`, and read back field by
  field. A sleep window tuned not to wrap midnight is now handled: 1 to 9 means
  after 1 and before 9.
- **`devHour`**: the clock the sky, sun and moon are drawn at, through
  `viewDate()`. It is a view only. The simulation, ages and sleep keep reading
  real time, because anything that persists runs on wall time. A reload clears
  it. To see an animal put itself to bed, move the bedtime slider to now.

Slider writes (`setNeed`, `setHealth`, `setBondTo`, `setGrowth`, `setTune`,
`setClock`) touch the same fields the simulation writes and nothing else.
`commit()` saves when a drag lets go.

### Seventh pass: the rex's teeth, and illness that a good keeper rarely sees

**Owner's report.** The rex's teeth were not placed in the jaws, and the front
ones looked yellowed. Diseases happen too often: what is the current rate?

**Teeth ride the margins.** They were ovals on the straight chord from the
hinge to each jaw tip. The upper oral margin bows down through the tooth row,
so the upper teeth hung loose under the lip, and the lower ones floated in the
open gape. Each is now a pointed tooth sampled with `samplePath()` along the
same points the skull and mandible are drawn through. The base sits just inside
its jaw and the tip points into the gape, raked back. The upper row has small
premaxillary teeth, a big maxillary run, and a taper toward the cheek; the
lower row is carried through the mandible's own transform. The first size came
out as two-pixel ticks at adult and was enlarged.

They are on `sclera`, not `horn`. A tooth is a pixel or two wide, so every
pixel of it is edge, and horn's full lighting ramp turned the front ones tan.
Enamel and the white of the eye are the same flat ivory at this size, and the
two never touch.

**Measuring the rate.** Rather than read it off the code, a week was run
through the real tick in the test harness. A keeper visits at set hours,
feeding, washing, playing and treating, and never wakes the animal. Before:

| Keeping | Illnesses in 7 days |
| --- | --- |
| 08:00, 13:00 and 19:00 | 30 (10 chill, 11 mites, 9 blues) |
| 08:00 and 19:00 | 33 (9 chill, 13 mites, 11 blues) |
| 19:00 only | 22, and a collapse |

Left alone, mites came at 8.5 hours and the blues at about 21. An animal left
at 20:00 caught a chill in four hours.

**The chills were a bug.** An animal only settled after dark once energy was
under 30, and it woke itself at 99 even at three in the morning. So a rested
animal stayed up past bedtime on its own, and staying up past bedtime is the
chill's cause. That was an illness with no cause the player could see, against
"illness has causes, not dice". It now goes down at bedtime whatever its
energy, and never wakes on its own before morning. The late-hours count only
fills while someone keeps it up.

**Onset moved into `SIM`**, with a slider for each in the developer panel's
Rates section. Mites need clean under 15 for four hours (was under 20 for
two). The blues need joy under 10 for four hours (was under 15 for two and a
half). Chill and bellyache keep their thresholds, since both follow straight
from something the player did. The Care screen's copy reads the live values.

After:

| Keeping | Illnesses in 7 days |
| --- | --- |
| 08:00, 13:00 and 19:00 | 0 |
| 08:00 and 19:00 | 4 (all blues) |
| 19:00 only | 14, and a collapse |

Left alone, mites come at about 12 hours and the blues at about 28. Neglect
still makes an animal ill; looking after it now mostly does not.

## Session 18 — the rex's hands, a pixel editor you can work in, and developer mode

**The rex's arms.** The arm lay against the chest in the chest's own ramp, so
on a speckled coat like Canopy it disappeared. There is a `rim` material now,
under `limb` in `LAYERS`: the arm tube is drawn one screen pixel fatter on it,
and the compositor keeps it to pixels already on the body, so the border shows
where the arm crosses the chest and nowhere else. Its colour is the coat's crest
mixed toward the outline, so it reads as the arm's shadow rather than a black
line. The coat pattern is masked off it. The hand had two copies of the foot
claw, flat wedges pointing forward, close enough to merge into one spur.
`handClaw()` replaces `toes()`: two short claws that hang from the underside of
the hand and hook back a pixel at the tip. Claw length and rim width are in
screen pixels (`px = 1 / (st.s * scale)`), because at a hatchling's scale a
sprite unit is a third of a pixel and a claw sized in units was not drawn.

**The pixel editor.** Asked for in four rounds, each tried headless before it
was called done.

- *Undo.* Whole-sprite snapshots, one per gesture: a stroke from mouse down to
  mouse up, a slider or colour picker from its first `input` to `change`. One
  stack across every sprite; undoing a sprite that is not open opens it.
- *Two panes.* Open beside puts a second sprite next to the first at a shared
  zoom, so a cell is the same size in both. The partner of `.a` is `.b`. The
  preview column flips between them on their origins at a chosen frame rate.
  Onion skin shows the other frame faintly underneath.
- *Tools.* Pencil (joined up, however fast the drag), eraser, fill, line, box,
  pick, origin, and select; the right button always erases and Alt-click picks.
  Per pane: clear, flips, wrapping shifts, copy from the other pane matched by
  colour, a palette with cell counts, and one editor for the selected colour.
- *Selection.* Drag to select, drag inside to move, Alt-drag for a copy, arrows
  to nudge, Ctrl+C/X/V across panes. A selection keeps its lifted cells in
  `pixSel.float` until it is let go, so cells dragged past the edge come back
  when dragged in. The first version restamped at every release and lost them.
  A paste is centred on the pointer and pulled inside the grid.
- *Edges.* Add or remove a row or column on any side. A sprite with an origin
  has it moved with the art, so the game draws it where it did.
- *The layout.* Species, Growth, Coats and Pixels keep controls on the left and
  the preview pinned on the right under a measured header. At a high browser
  zoom the preview used to wrap under the sliders.

**A grid is resolution, not size.** The owner redrew the fern on a 14x23 grid,
and the Feed menu, the shop and the ground drew it at a fixed scale, twice the
height of its cell. `PIX_BOX` in `00-art.js` records the box each kind of boxed
sprite was laid out for: 12x10 for items, 8x7 for the heart, 10x9 for the mess.
`pixDrawBoxed()` draws anything that fits exactly as before and shrinks anything
bigger into the box, hard-edged. For cells and rows, `pixDrawFit()` goes further:
it measures the painted cells (`pixInk()`) and centres those, sized to the space
in whole steps up to 3x. The Feed menu had placed every item by its origin as if
it were a 12x10 grid with the origin at 2,4, which put the fish and the new fern
well off the middle of their cells. Love and dislike are a corner sprite now,
`badge.love` and `badge.no`, instead of a word across the bottom of the cell.

**Developer mode.** At 21:11 the owner woke the rex from the developer panel and
it was asleep again within a second. `DEV.toggleSleep` flipped `asleep` without
writing `wokeAt`, so the next tick saw bedtime and no recent wake. And the wake
from Care only buys `WAKE_GRACE`. The owner also asked that testing stop
changing the real nest.

The tools now only work in developer mode, which plays a copy. Entering saves
the nest, copies it to `DEV_SAVE_KEY`, sets `DEV_MODE_KEY` and reloads;
`saveKey()` sends every save to the copy. Leaving deletes both and reloads onto
the real save, which catches up like any absence. Import and wipe refuse
while it is on, and the case carries a DEV tag. Inside it, and only there:

- tuned `SIM` rates apply, and the real nest runs on `SIM_DEFAULTS`;
- a pinned `devHour` decides bedtime for the live tick;
- a wake or a tuck-in, from the panel or from Care, sets `devSleepHold`, which
  sets the night rule, the grace and the energy floor aside until "Let the rules
  decide". Tuck-in skips its energy refusal. Waking still costs what it costs.

`devSleepHold` is a knob like `SIM` and `devHour`: never saved, cleared by a
reload. Outside developer mode the sleep rules are unchanged.

---

## Session 19 — animals that lie down, and a tug of war you can read

**Owner's request.** Three things. Sleeping animals should be in a *realistic*
sleeping position, researched first and then translated so it reads on the
glass, and whatever is decided has to hold for species not written yet. Tug of
war is not intuitive — "I get that you tap when the slider is in the green bar,
but it doesn't translate to the actual game". And two full-grown animals in that
game take up a huge amount of the screen and look clunky: smaller, more in
frame, possibly a different backdrop, and the opponent should always be in a
different coat.

### What a sleeping dinosaur actually looks like

Four sources, and they do not all say the same thing, which is the point:

- ***Mei long*** and ***Sinornithoides***, both preserved curled up: hindlimbs
  folded beneath the body, forelimbs tucked in, neck curved round so the snout
  lies beside a forelimb. This is the "tuck-in" posture of a roosting bird, and
  a second *Mei* specimen (DNHM D2154) has it too, so it is the species'
  habitual sleeping position and not one animal's death pose.
- **SGDS.18.T1**, an Early Jurassic theropod resting trace from the Moenave
  Formation: both pedes with long metatarsal impressions, both hands palms
  medial, a tail drag, and an ischial callosity mark. A big theropod squats —
  heels down, sitting on the root of the tail — and gets up again with a normal
  *Eubrontes* step.
- **Ceratopsians** rest on the brisket. The wide pelvis, the broad chest and the
  gastralia are what a sternally recumbent animal needs, and the posture is the
  one a heavy quadruped can get out of in a hurry.
- **Sauropods** have nothing like either. No specimen is preserved curled or
  recumbent, and nothing that size could fold itself and stand back up; most
  large animals can sleep on their feet, and the honest reading is that these
  did. **They doze standing here** — see the owner's rejection below, which
  arrived at the same answer from the other direction.

**So there is no one sleeping pose, and the pose table cannot carry one.**
`POSES.sleep` was `body: -2.5` and a droop: a crouch with the eyes shut, which
is why it read as "standing, sulking" rather than as asleep. It is authored art
now, in `POSE_ART` next to eat and cheer, and it carries two knobs the other
poses leave at zero:

- **`fold`** — how far the animal has settled onto the ground.
- **`curl`** — how far the neck has come back and the head down.

Each species reads them itself, because what a resting theropod does with its
legs is not what a resting sauropod does with its neck. A fourth species gets to
answer both questions its own way, and if it answers neither it simply stands
there with its eyes shut, which is where this started.

**The legs needed a second solver.** `legStep` takes the hip height *as* the leg
length, so dropping the body shortens the bones: the old sleep pose was an
animal standing on stumps. `legFold` takes the standing length separately, keeps
the bones, and plants the ankle behind the hip at a distance that leaves the leg
folded — the knee swings out, the shank comes back down, and the metatarsus lies
flat. The heel coming down is the whole difference between a bird standing and a
bird sitting.

**What each species does with it:**

| | `fold` | `curl` |
| --- | --- | --- |
| rex | hip to 38% of standing, tail laid out, belly low but clear | neck shortened, chin down near the soil |
| trike | hip to wherever the belly touches — a *fraction* buried the brisket at one stage and left it hovering at another, because `bulk` deepens the belly faster than `limb` lengthens the leg | head lowered only. The frill and two brow horns are a metre of bone in front of the shoulder and there is nowhere to put them |
| brachio | *not* down — the weight settles a tenth onto slightly bent legs, and it stays on its feet | neck out of its sixty degrees, arcing forward, head hanging at about knee height |

**The tuck was tried on the rex and rejected.** That skull is forty-odd units
long against a thirty-four unit trunk; tucking it laid a tyrannosaur's face
across its own ribs. The tuck belongs to small maniraptorans and the sprite
should not claim otherwise — the dossier rule applies to posture as much as to
geometry. The crouch is what the trace fossil actually shows.

The tail lays down with the square of the distance out it, plus a flat third,
because SGDS.18.T1 has that ischial mark between the two heels: a tail that only
touches at the tip leaves the whole animal hovering on two toes.

### Owner's rejection: two animals with no legs

First pass shipped all three lying down. Owner: the rex's legs "look a bit off
... they are not visible, only the front thighs", and the brachiosaur "looks
extremely silly, you cant see any of the legs on him, he looks like an amputee".

**Both were true, and the second one was a design error rather than a bug.**

**`legFold` was solving the joint instead of placing it,** and that was the rex.
Handing `limbIK` an ankle behind the hip and letting `bend` find the knee is the
obvious thing to write and it is wrong: with the hip barely a bone's length off
the ground, the perpendicular `bend` swings the knee along points *downward*, so
the knee came out on the soil under the belly and the whole leg stacked up
inside the drumstick. What reached the glass was a haunch with two claws under
it.

The joint is placed now. A folded leg lies flat — the femur forward and almost
level, because it has nowhere else to go; the shank back down to the soil; the
metatarsus forward again from the heel. That last stretch is the one that
matters: it is the only part that clears the body, and a sitting bird is a body
with its toes out in front of it. Two more things had to move with it:

- the drumstick over the femur rides **high beside the body** when folded
  (`haunch`), because the femur is lying level and the muscle on it goes with
  it. Left at its standing depth it covered the shank and the foot in front of
  it, which is the whole of what there was to see.
- the squat is shallower — the hip settles to half of standing height rather
  than 38% — because the belly has to clear the foot. At 38% there was nothing
  between the soil and the belly for a leg to be drawn in.

The same fix gave the Triceratops two visible folded legs, which it did not have
before either; nobody had complained, because on that animal the failure looked
like a low-slung body rather than a missing limb.

**The rex's arm** was a second casualty of the same area: `curl` lays the head
down over the chest and the arm rides between the two. It swings down now — the
whole chain rotates about the shoulder, so the wrist, hand, rim and claws all
follow — until the hand is on the soil, which is also the posture SGDS.18.T1
preserves.

**The sauropod could not be drawn lying down at all.** Its body is a closed tube
from shoulder to tail resting on its own radius, so a folded limb finishes up
*inside* the silhouette with nothing below the belly to break out into. Raising
the body until a knee showed put about two pixels of knee below the belly on an
adult, which is not a fix.

*Curling it up like a cat was tried at the owner's suggestion and rejected.* The
theory was sound — a curled cat has no visible legs either and nobody reads it
as an amputee, because the tail coming round and the head coming back say what
the shape is. Both ends were turned inward: the tail swept up and over the rump,
the neck laid back along the body with the head resting on it. It came out an
unreadable lump with a hook on it. At this size you could not tell which end was
the head, and the tail arc read as a separate object rather than as part of the
animal. Two things defeated it: the tail is too short relative to the barrel to
come round the front, where a cat's goes, and anything that *does* come to rest
on the body is on `skin` like the body, so it merges into it and simply makes
the animal fatter.

So the brachiosaur dozes on its feet, which is where the research pointed before
the first pass overrode it for the sake of a consistent "everybody lies down".
It is a better answer than either thing it replaced: the three species now rest
in three genuinely different ways, which is the whole premise. And a standing
sauropod with its neck hanging at knee height is still the largest silhouette
change any of them makes, because idle carries that head three body-depths in
the air.

The neck stops at knee height and not on the ground. A sauropod with its head on
the soil is drinking.

The tail comes down with it, on a second pass — the first droop was five units
and the owner rightly called the tail still "erect". It aims the tip at a
quarter of the hip's height now, rather than dropping it by a fixed number of
units: the tail stations are literal offsets from the hip and do *not* scale
with `limb`, so a drop tuned on an adult put a hatchling's tip in the soil. It
stays clear of the ground at every stage, because a sauropod's tail is stiffened
and does not lie on it.

### Tug of war

**The timing had no connection to the fiction.** A green window and a sweeping
cursor in a bar along the bottom of the glass, with two animals pulling a rope
above it and nothing saying the two were about the same thing.

**The track is the vine now.** The window is a stretch of it whipped with cord —
where there is something to hold — and the cursor is your animal's grip running
the rope looking for it. Tap when the grip reaches the binding. That is one
sentence about a rope rather than two facts to be matched up.

Three things sit on that rope and they get three hues, because the first pass
drew the grip and the knot both bone-white at the same size and they were
impossible to tell apart: the **grip** is what moves (white), the **binding** is
where to tap (gold when a pull would land), the **knot** is the score (rust
red — the centre flag a real tug-of-war rope carries). The rope is a three-pixel
dark cord with one lit pixel, because a two-pixel brown cord vanished wherever
it crossed the araucaria's roots.

The animal braces too, on the frame the tap would land in. That is the tell
that survives at any size — but the two `wary` frames differ by half a local
unit of body height, which is no pixels at all, so the brace is three pixels of
lean away from the rope. It is the same three pixels the lurch of a landed pull
uses, so it reads as the wind-up for it. Both outcomes now throw dirt: a good
pull kicks soil back under the animal's own feet, a slip kicks it forward from
under them.

**The end is drawn on the ground.** A scratch from one line to the other, a
notch at the centre, and the knot's shadow sliding along it.

*Second pass, on the owner's note that the markers were too heavy for the rope
and the ground marks did not say what they were for.* Three things came out of
it, and the middle one was a plain mistake:

- **The grip and the knot were sized for a bar, not a cord.** The grip was
  5x9 and the knot 8x7 with a tail, against three pixels of rope. They are a
  3x5 bead and a 4-wide band now — things sitting on a rope rather than over it.
- **The two ends of the scratch mean opposite things and were drawn
  identically,** both in the same dark red. Drag the knot to the near line and
  the end is yours; let it reach the far one and the rival takes it. The near
  post is green and the far one red, and the near one is painted in the *bright*
  of its ramp because it stands on grass that is also green.
- **The knot takes the colour of the ground under it** — the same green or red
  the furrow between the centre notch and the knot is lit in, rope-coloured at
  dead even. Fixed red said "bad" in the moment the player was winning, which
  is the opposite of what the only moving score on the screen should do.

The lit stretch of furrow is the part that answers "how is this going" without
being read: it is ground gained, shown as ground.

**Two bugs found on the way:**

- **The slide was inverted.** `myX = 46 - pull*18`, and `pull` rises as you are
  being *beaten* — so both animals moved toward your own end when you were
  losing. The picture said you were winning while the score said you were not,
  in the one game whose whole appeal is that you are up against somebody.
- **The rival could wear your coat.** It took `coats[1]`, which is not the same
  thing as "not yours". A player who had bought the second coat and was wearing
  it met a rival in it, which is the one case where telling the two animals
  apart matters most.

**Framing.** Both animals are capped on height *and* width — the constraint here
is horizontal, two animals nose to nose with their tails at the bezels, and
capped on height alone an adult tyrannosaur came out seventy-six pixels long.
Where they stand is measured off the baked frame rather than typed, so the
longest tail stays on the glass whichever species is playing. The habitat behind
them takes the subadult crop instead of the closest one, through a `crop` key on
the game: minigames had always taken the tightest view, which for this one put
the grass as big as the animals standing on it.

The knot slides further than the animals do, and that is not a cheat — the rope
pays out through the losing animal's teeth, which is the same thing a slip is.
It buys a knot that swings eighty pixels across the scratch without dragging a
tail off the edge.

**One thing that had to be fixed twice.** Drawing the rope as two spans meeting
at the knot put the knot exactly over its ground mark, which is the whole
scoreboard — but the two spans are different lengths and the *difference is the
score*, so parameterised by the curve's own `t` the grip crawled up the long
side and shot across the short one, and the window changed width on the glass
depending on who was winning. In a game that is nothing but timing, that is the
timing moving with the score. Everything on the rope is placed by arc length
now.

**Also:** `tugFit()` measures a baked frame, so only the draw may call it. The
node harness that plays whole thirty-second rounds headless has the simulation
modules loaded and not the sprite engine, and the dust a pull throws is a thing
the *step* does — so the draw publishes where the animal is standing on `game`
and the step reads that.

---

## Session 20 — the state you could not play out of

**Owner's question.** "I think the game can get stuck. If you have no money to
go to the vet, but your dino is asleep/sick, you can't play games to get more
coins — is that correct?"

**Correct, and worse.** The state was driven in the real page and every action
tried. All seven refuse:

| | |
| --- | --- |
| play a game | *Rex is asleep.* |
| scrub the pen | *Rex is asleep.* |
| wake it | *It has collapsed, and needs a vet.* |
| feed it | *Not enough coins.* |
| pet it, visit the habitat | no effect |
| call the vet | *The vet costs 30 coins.* |
| six hours of simulation, four minutes of frames | 0 coins, 0 mess |

The mechanism is that collapse sets **two** fields at once, `vet` *and*
`asleep`, and the gates are written against those two and nothing else. Digging
and the minigames check `vet`; scrubbing and feeding check `asleep`; waking it
— the obvious escape — explicitly refuses while `vet` is set, and should,
because the animal has not fallen asleep. And a collapsed animal makes no new
mess, so the one source that never asks permission has nothing left to pay for.

Not a permanent softlock. The daily bonus pays 8, then 11, then 14 — **three
consecutive real days** of opening a game that cannot be played, and a missed
day resets the streak and the count. The other exit is that `newEgg()` is free,
so a player who worked it out could hatch a spare and raise it to pay for the
first. Neither is a design.

**Owner's call, and it is the right one:** *"You should just be able to play
games to earn money, that should be the default. Coins are mostly for
accessories and food, and every now and then for medicine."*

So the minigames are the earner and nothing gates them but sleep. Illness never
gated them and still does not; collapse no longer does either. Sleep still
refuses, because waking is free and is the player's call to make. A round heals
nothing, so the vet is still what puts the animal right — it is just payable
now. One round of four of the five games covers the fee from zero; tug takes two.

Two consequences that had to follow:

- **"Too weak to stand" is no longer true**, so the mood line and the Care
  screen say *worn out and down* instead. Every state has to be readable, and
  it also has to be true.
- **The Care screen tells you how to fill the purse** when it is short, because
  from that screen that is the only thing the player can act on.

There is a test now — a collapsed animal with an empty purse plays a full
thirty-second round and must finish able to afford the vet. It also asserts
sleep still refuses, so nobody re-closes that door from the other side.

### Saying which medicine

Second half of the same note: the illness descriptions should hint at what they
need. The Care screen named the illness and then offered four equal answers to
it, which is a guess the first few times.

Both halves fixed. Each symptom now names what the animal wants **in the words
its remedy is described in** — sharp/settle, hot/warm, grit/grit, no shelf/no
bottle — held to the length it had, because the screen reserves room for
exactly the lines the text wraps to and two illnesses have to fit above five
rows. And only the remedies that treat something the animal actually has are
lit; the rest go dim, cost included. That last part says it with no words at
all, and it is the half that works at a glance.

**And the fault that comment warns about, committed again.** The collapsed
branch of the Care screen typed its own sentence at the top of `draw`, while
`layout` measured `careStatus()` — which returns the *asleep* line, because
collapse sets `asleep` too. Lengthening that sentence drew the first row
straight through it. The line lives in `careStatus()` now and both read it,
which is what the comment asked for in the first place.

## Session 21 — sleep stopped gating the minigames, and a list for later

**Owner's call.** Session 20 settled that the minigames are the earner and
nothing gates them but sleep, and left sleep refusing on the theory that
waking the animal is the player's call to make. The owner reversed that call:
*"I want to be able to play the minigames regardless of whether the dino
sleeps or not."*

The `S.asleep` check in `startGame()` (`06-render.js`) is gone. A round now
plays out over a sleeping pet the same as an awake one, and does not wake it
— only `wakeUp()` does that, same as before. The energy-12 "too tired" gate
is untouched; it was never about sleep. The Care screen's status line
(`07-screens.js`, `careStatus()`) said a sleeping animal "will not eat, wash
or play until it wakes" — trimmed to "eat or wash," since play no longer
applies. The test that asserted sleep refused a round (`simulation.test.cjs`)
now asserts the opposite. "Nothing gates them but sleep" in `CLAUDE.md`'s
house rules and in the standing decision below both became "nothing gates
them," full stop.

### A list for whenever this gets picked back up

A long back-and-forth on what the minigame roster could grow into, benchmarked
against Neopets — Kass Basher, Symol Hole, Test Your Strength, Turmac Roll,
Shenkuu Warrior, Snowager's Lair and Petpetsitter among the reference points —
plus the owner's own ideas: a whack-a-mole with heads that should and should
not be hit, a sprite memory-match on dino terms, a crowd-counting game against
a criss-crossing stampede with a multiple-choice answer, a Frogger reskin, a
freeze-when-it-turns stealth game modeled on *Squid Game*'s red-light-green-
light, sorting incoming sprites by diet, a stretch idea for an arrow-key
rhythm game, and a non-minigame idea — sending the active pet out on a
twelve-hour hunt that returns coins and, rarely, cosmetics. None of it built;
all of it written down in `docs/GAME-IDEAS.md` so it does not have to be
re-argued from scratch. The owner also intends to send hand-drawn sketches for
some of these, to work from as layout and mechanic reference.

Also discussed, not yet decided or built: relaxing "no image assets" for
*future* tools and features. The existing dino and case art stays procedural
— that is where growth, coats and countershading actually live — but the
owner wants the option to bring in real image assets, potentially animated,
for new work, and is fine with the distributed build no longer being a single
HTML file as long as one entry file is still what gets opened to run it.
Nothing in the source changed for this; it is a direction, not a rule change,
until a concrete use case forces `build.py` and this file's "No image assets,
still" line to be rewritten together.

## Standing decisions

- **Web first, wrap later.** No framework, no build step beyond concatenation.
- **The dossier must not lie.** If the field notes claim an anatomical feature,
  the sprite has to draw it. Adding a claim means adding geometry.
- **Illness has causes, not dice.** Every condition traces to something the
  player did or failed to do.
- **No permadeath.** Collapse and a paid vet visit instead.
- **No state the nest cannot be played out of.** Anything priced in coins needs
  an earner that state does not close. The minigames are that earner, and as
  of session 21 nothing gates them at all — not illness, not collapse, not
  sleep.
- **Wall-clock time everywhere.** Never frame time for anything that persists.
- **Cuteness through proportion.** Bigger skull, bigger eye, shorter snout,
  rounder body. Never by removing a diagnostic feature.
- **Posture is a claim, like anatomy.** How an animal rests is as much a thing
  the sprite asserts as how many fingers it has, and the evidence for it is
  different per clade — a bird-style tuck for small maniraptorans, a
  heels-down squat for big theropods, sternal recumbency for ceratopsians,
  and nothing at all for sauropods, which stay on their feet. So `fold` and
  `curl` are knobs each species answers for itself, not one pose the table
  imposes on all of them. A species is allowed to answer "I don't".
- **The screen is the interface.** Menus live inside the glass; the case does
  not change while you play. Long prose is the one exception.
- **One grid, one edge, no symmetry.** In the case, and for the same reason in
  the screens. One exception, added in session 16 on the owner's call: the crown
  ridge is mirrored and evenly spaced, because a dorsal ridge down the spine of
  an animal is the one thing on this case with a centre line of its own.
- **The case has two faces and one box.** A fixed 96x155 grid with everything
  live placed on it as a fraction; the face is the CSS moulding by default, or a
  picture — `PIX.case`, or an imported file. Keep both: no pixel grid that fits
  in a source file can match a vector curve rendered at device resolution.
- **No image assets, still.** An imported case lives in `Store` on the machine
  that imported it. Promoting one into the project is a separate, deliberate
  press.
