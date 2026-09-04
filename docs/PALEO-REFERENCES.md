# Anatomy notes

What the sprites are based on, and which claims in the dossier they back. All of
this came from research during development rather than from memory.

## Tyrannosaurus rex

- Bite force around 35,000 N, the strongest measured for any land animal.
- Tooth wear and jaw foramina support **lips covering the teeth**. A closed
  mouth shows none of them; teeth are drawn only when the jaw opens.
- **Gastralia** (belly ribs) make the torso barrel-shaped rather than lean.
- Exactly **two fingers** per hand, with palms facing inward, not pronated.
- Forward-facing eyes giving binocular overlap.
- The **premaxilla is squared off and deep** - a near-vertical front edge
  rather than a rounded nub. At sprite scale it is the quickest way to read
  tyrannosaur instead of generic theropod.
- The large teeth are **maxillary**; the dentary shows tips. The sprite draws
  them that way round when the jaw opens, and none at all when it is shut.
- Level spine with the tail as a counterweight.
- A keratin row runs the neck and back — speculative but a common convention.
- The skull is **deep and vaulted through the postorbital**, not flat-roofed.
  The sprite domes the braincase over the orbit for that reason, and because a
  large braincase over a large eye is also what reads as young.
- The **maxillary margin is sinuous**, not level: high at the cheek, bowed down
  through the tooth row, lifting again at the tip. Drawn as a straight line the
  face read as a box with an eye on it.
- **Ontogeny.** Juveniles are gracile and long-legged with a shallow, narrow
  snout; the deep skull, the thick neck and the barrel chest come late. The
  lacrimal and postorbital ornament grows in with them. Juvenile tyrannosaurs
  are reconstructed with substantial filamentous covering that reduces with
  age, an adult keeping a keratin row and little else. All four are STAGE
  columns: `muzzle`, `bulk`, `torso`, `fuzz`.

## Triceratops horridus

- Horn cores grew keratin sheaths with positive allometry, so **living horns
  were substantially longer than the bone**. The sprite scales them with age.
- The frill is **solid bone**, ringed with epoccipitals. Those are separate
  ossifications that fuse to the margin with age, so the sprite draws them as
  pale bone knobs on the rim as well as stepping the outline — a scalloped
  edge alone is invisible at this size.
- In side view the skull-and-frill unit is carried **forward of the shoulder**,
  with a short thick neck under it, and about half the head's length is frill.
  Built around a point in front of the withers instead, the shield sits in the
  shoulder hump and reads as a lump of neck.
- Skin impressions show large scales with scattered **low nubbins**, not the
  spines older reconstructions used.
- A **jugal horn** juts down from each cheek, below the eye — a boss on the
  cheek, not a tusk hanging below the jaw line.
- The beak is **two bones that meet**: the rostral above and the predentary
  below. The mandible reaches the upper beak's tip; short of it the animal has
  a permanent underbite and reads as a shark.
- The beak is **two bones**: a rostral above and a predentary below, with the
  mouth between them. Drawn as one cream mass it reads as a bald face.
- The postorbital horns rise from **directly above the orbit**, on a base
  about as wide as the eye socket, tapering fast. Set further back on a
  narrow base they read as ears.
- *T. horridus* has a long snout and only a small nasal horn.
- Hatchlings emerged nearly hornless with a small frill; both grow in.
- Upright hindlimbs, forelimbs held with the elbows out.
- **Growth series** (Horner and Goodwin, ten skulls from a 38 cm baby to
  two-metre adults, four stages that map onto the game's four):
  - Postorbital horns are **straight stubs** in babies, **curve backward** in
    juveniles, **straighten** in subadults and **recurve forward** in adults.
    The sprite draws this from `STAGE.hornBend`.
  - The baby frill margin is **deeply scalloped**. Juveniles carry 17–19
    deltoid epoccipitals, which flatten to low spindles and fuse into the rim
    with age. The sprite drives scallop depth off the stage.
  - The frill is present and prominent from the start and lengthens with
    positive allometry — it is not a late-appearing structure.
- Tail is roughly a quarter to a third of total length: short for a dinosaur,
  but distinctly longer than the torso and deep at its base.

## Brachiosaurus altithorax

- Forelimbs about **1.2× the hindlimbs**, which is where the sloping back comes
  from and what the animal is named for.
- Neck held near **60°** with a slight S-curve, not vertical.
- The jaw line is **long and close to straight**, running back to below the
  eye, and the muzzle is squared off in front where the spatulate teeth sat.
- At about ten pixels of skull only three things can read: the crest
  silhouette, the eye, and the jaw line.
- A **hump of tall neural spines** over the shoulders anchored the neck muscles.
- Nasal chambers formed a **crest on the roof** of a very small skull.
- Short tail for a sauropod, held clear of the ground.
- **Manus**: metacarpals in fully vertical columns, digits so reduced they would
  not have been visible in life; the whole hand is a hoof, which is why sauropod
  forefoot prints are horseshoe-shaped. Brachiosaurids kept a short thumb claw.
- **Pes**: broad and semi-plantigrade, three large claws on the inner digits,
  with a fleshy heel pad behind them recorded in some trackways.

## Other animals and the landscape

- **Compsognathid theropods** — small, gracile, fast, and known from the same
  kinds of deposit as the animals here. They are the thieves in Forage. About a
  metre long and mostly tail, which at sprite scale is a body three pixels deep
  with a tail as long as the rest of it.
- **Araucaria** were a dominant conifer of the Mesozoic, with a bare trunk and
  a deep domed crown — a completely different silhouette from the tiered
  conifer next to it, which is the reason for drawing one.
- **Tree ferns** fill the storey beneath the canopy. Without them the band
  between the treeline and the grass was open sky.
- **Stratovolcanoes are concave**: steep at the summit, flaring at the foot,
  and truncated at a crater rim rather than coming to a point. A straight-sided
  triangle is a slag heap and a convex one is a butte. Old lava channels run
  from the rim down the flanks, and gullies radiate down the ash slopes.

## The five habitats

- **Fern valley** — the default: open ground under an active stratovolcano.
- **Salt lagoon** — a warm shallow sea behind a sand bar, with sea stacks.
  Stacks are undercut at the waterline, which is what distinguishes one from a
  rock that happens to be in the sea.
- **Ash flats** — the same valley after an eruption. Standing dead snags, ash
  drifts, and bone half-buried in it, which is what an ash fall preserves.
- **Fern gorge** — a cut in a plateau with a fall at its head. Bedded cliff
  faces broken by vertical joints, moss on the wet ledges.
- **Polar dawn** — high-latitude forest under a glacier front. Polar dinosaur
  faunas are well documented (Prince Creek in Alaska, the Otway and Strzelecki
  groups in Australia) and lived through months of darkness. Ice is white on
  top and blue inside, and the blue is the whole difference between ice and
  snow.

## Skin and colour

- **Countershading** — dark above, pale below — is the one pattern with direct
  fossil support, recovered from melanosomes in *Psittacosaurus* (a
  ceratopsian, so it bears on the Triceratops) and *Sinosauropteryx*. The
  `belly` material layer is doing this on every animal, painted from the
  spine so it follows the body rather than sitting in a fixed box.
- *Sinosauropteryx* also preserves a **banded tail** and a bandit mask. Banding
  that resolves into tail rings is therefore the best-supported pattern
  available, and it is what the `bands` coats draw.
- Banding on a living animal runs **perpendicular to the spine and follows the
  body's curvature**, tightening over the tail and fading into the
  countershading on the belly. It does not march across the animal at a fixed
  angle and spacing regardless of anatomy, which is what the first version of
  the coat painter did.
- Countershading pattern varies with habitat lighting, which is why
  *Psittacosaurus* and *Sinosauropteryx* differ despite sharing fossil beds.

## Pixel art technique

- Hue-shifted ramps: shadows cooler and more saturated, highlights warmer and
  less saturated.
- One consistent light source, here upper-left.
- Selective outlining: the outline lightens where light strikes it.
- Ordered dithering across gradient boundaries instead of smooth interpolation.

## The case

The shell is copied from the shape of the thing, not from any one model.

- **The device is an egg on purpose.** *Tama* is egg, *gotchi* from *watch*.
  Every version Bandai has shipped keeps the egg, and the shell is speckled
  moulded plastic — which is also, conveniently, what a dinosaur egg looks
  like. That coincidence is the whole design.
- **The LCD is deeply recessed** behind a printed border, on the Nano a
  droplet-shaped frame. Here it is a bone bezel with four screws.
- **Three keys in a row underneath**, A/B/C left to right. Paleopal needs five
  actions, so it keeps five keys but takes the moulding and the travel.
- **The icon strip did the emotional work.** Japan House's piece on the 30th
  anniversary makes the point that a food glyph and a heart, a few pixels each,
  carried the pet's state across every language barrier — the sprite was not
  doing it alone. That is why each need meter has a glyph rather than only a
  label.
- Palette pulled toward jungle and amber rather than the original slate: ochre
  and sandstone for the shell, bone for the bezel, jungle green for the keys.

Sources: Japan House Los Angeles, *The Hatching of an Icon* (Tamagotchi at 30);
the Tamagotchi wiki entries for the Nano and Connection lines; CCTP-506's
teardown of the device's architecture.
