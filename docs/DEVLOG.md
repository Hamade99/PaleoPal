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
