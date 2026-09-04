# TODO

The two long-horizon jobs, and a running list of what has been done. `ROADMAP.md`
holds the smaller open work; this is the stuff that needs deciding before it can
be built.

---

## 1. The Android build

The wrap itself is small. The game is one self-contained HTML file, storage
already goes through one adapter (`Store` in `00-core.js`), and the simulation
runs on wall-clock time so it survives being closed and reopened. Capacitor
around `dist/paleopal.html` is about a day.

The work that matters is everything else, and none of it shows up in a desktop
browser.

**Do this first.** Wrap it roughly and put it on a real phone before polishing
anything. The list that comes back from ten minutes of actual use will be worth
more than the list below.

### Blocking

- **Battery.** `frame()` runs `requestAnimationFrame` continuously at 60fps.
  For a game where nothing happens most of the time that is a real drain. It
  should drop to a few frames a second when the animal is asleep or a screen is
  open, and stop entirely when the app is backgrounded. The simulation does not
  need the frame loop — it drains `Date.now()` deltas and would catch up
  correctly on resume.
- **The Android back button** must close a screen or a sheet, not quit the app.
  Capacitor exposes it as an event; the handler is the same one `Escape` uses in
  `08-ui.js`.
- **Audio needs a gesture.** `SFX` builds an AudioContext up front. Mobile
  browsers will not start one until the user has tapped something, so the first
  sound is silently dropped and on some versions the context stays suspended for
  the whole session. Resume it on the first pointer event.
- **Local notifications.** This is the actual reason to have a pet game on a
  phone: fire when hunger crosses 25, or when an illness starts. Native plugin,
  not the web API. It is the retention loop and the port is not worth much
  without it.

### Fit and feel

- **Screen shape.** `fitScreen()` picks a whole or half multiple of 224 that
  fits the width. Phones are much taller and narrower than a desktop window, and
  the case has never been checked on one. Notches and the gesture bar need
  `env(safe-area-inset-*)`; there is a `--safe` variable in `style.css` but only
  the bottom is used.
- **Touch targets.** The five keys are fine. The in-screen menus hit-test against
  a 224-pixel-wide canvas, so a list row is about 6mm on a phone and a grid cell
  about 8mm. Under a thumb that is marginal. Worth measuring before deciding.
- **The rename field** opens the on-screen keyboard, which resizes the viewport
  and will move the case under it.
- **Long-press** on the brand plate toggles the dev button. On a touch screen
  that gesture collides with the browser's own text-selection long-press.

### Shipping

- Package name, icon, splash screen, signing key.
- Sideloading the APK needs none of the Play Console; publishing needs an
  account and the usual review. For one phone, sideload.
- `G.dev` still defaults to `true`. Flip it (see `ROADMAP.md`).

---

## 2. Week two

**This is the biggest hole in the game.** An animal reaches adult after about
four hours of well-cared-for time (`GROWTH_GATES`), and then growth stops. After
that the loop is: top up four meters, play a thirty-second game, buy a coat.
There are five habitats and a dozen coats to buy; once they are bought, coins
have nothing to do.

A pet game lives or dies on whether there is a reason to open it on day ten, and
right now there is not one. Nothing below is decided — these are the shapes the
answer could take.

- **More life after adult.** Not more size — something that keeps accumulating.
  Scars, markings that develop, a coat that shifts with the seasons, an animal
  that visibly ages.
- **The dossier as play.** The `checks` list is the most unusual thing in this
  game and nothing makes you open it. "Find the jugal horn on your animal" is a
  real thing to ask someone to do, and it pays out in coins and teaches them
  what they are looking at. It is currently a panel behind a small `i`.
- **Traits made visible.** Spirited, Placid, Bold and Cautious are rolled at the
  egg and then only ever modify numbers the player cannot see. Right now they
  are flavour text.
- **A reason to keep more than one animal.** The nest holds six. Nothing rewards
  it, and nothing happens between them.
- **Breeding or inheritance.** Traits and coats passed on. Gives the nest a
  point and gives week three a shape.
- **Something daily that is not a streak counter.** The streak exists and pays
  nothing interesting.
- **Per-game high scores, a weekly best.** Cheap, and it gives the minigames a
  reason to be replayed once the coins stop mattering.

### Also worth doing before any of that

- **Balance the economy.** Income (digs, the three games, the daily streak)
  against sinks (food, remedies, the vet, headgear, coats, habitats) has never
  been checked over a realistic few days of play. The three games were measured
  against each other in session 10; nothing has been measured against costs.
- **Automated checks.** Everything in this project is verified by driving a
  headless browser and looking at the result. That works, but it means the owner
  cannot confidently change anything alone. A small suite — does it boot, does
  every sprite bake, does every screen open, does every save path load — is an
  hour of work and changes what is possible without help.

---

## Done so far

Newest first. `DEVLOG.md` has the reasoning; this is the index.

**Session 12 — the art editor.** All twenty-nine small sprites (action icons,
meter glyphs, case buttons, headgear, food, mess, heart) converted from
hand-written `fillRect` calls to editable pixel data. Per-species proportions
hoisted out of the draw functions into `TUNE` tables. Everything editable —
pixels, growth columns, proportions, species colours, coats, habitat palettes —
consolidated into `src/00-art.js` behind markers, and `tools/editor.html` built
to edit all of it with live previews and save it back. Then a third layer,
`SPECIES_STAGE`, so a change can be applied to one species at one growth stage
without touching the others.

**Session 11 (later) — the Brachiosaurus growth series.** The long neck and the
sloping back are adult traits and arrive together; a hatchling is level-backed,
short-necked and big-headed.

**Session 11 — clouds, five habitats, growing up.** Cumulus rebuilt with a flat
base and a lobed top, plus cirrus. Five buyable habitats behind a new shop
shelf. The Triceratops' underbite, white beak and hanging jugal fixed. Four new
growth columns so the rex and the Triceratops change shape with age.

**Session 10 — the owner's pass.** Case feet removed and the crown ridge put on
the shell's real curve. Sleep given a wake control and a rule. Ill made to look
different from asleep. Keys latch. The rex's face; the Triceratops rebuilt.
Snack run's moonwalk. Bug hunt replaced with Forage. River leap's water and
foreground. The volcano rebuilt with a live plume.

**Session 9 — mouths, the screen, the case.** Jaw layer, so every animal has a
mouth. Menus moved inside the glass with a 5x7 bitmap font. Case restraint pass.
`tools/sheet.html`.

**Session 8 — coats, the Triceratops, two minigames.** Coats that ride the body.
Frill and horn growth. Bug hunt and River leap rebuilt.

**Session 7 — the case.** The whole interface put inside a moulded egg. Mute
switch. Developer tools.

**Session 6 — documentation and structure.**

**Session 5 — the theropod and ceratopsian rebuilt.**
