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
