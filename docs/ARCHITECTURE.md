# Architecture

No framework, no bundler. Plain scripts concatenated in a fixed order, because
that order is the only dependency graph there is.

## Load order

```
src/00-core.js          utilities, storage adapter, audio, path primitives
src/01-colour.js        ramp generation, material layers, the lighting compositor
src/02-sprite-engine.js growth stages, gait/IK, feet, hats, pose table, frame baking
src/03-font.js          the 5x7 screen font and its text drawing
src/species/rex.js      one draw function per species
src/species/triceratops.js
src/species/brachiosaurus.js
src/species/registry.js SPECIES table, field notes, coats, pattern and belly painters
src/04-world.js         backdrop baking, parallax, particles, props
src/05-sim.js           needs, illness, bond, growth, the nest, player actions
src/06-render.js        behaviour, the draw loop, feeding, minigames
src/07-screens.js       the menus, drawn inside the screen
src/08-ui.js            case chrome, prose panels, input, save/load, main loop
```

`index.html` holds this list and `build.py` reads it from there, so there is
one load order rather than two that have to agree. `dist/paleopal.html` is the
inlined build.

## Two globals

- **`G`** — the keeper. `{ v, pets[], active, coins, sound, lastDay, streak,
  lastTick, lastSeen }`. Coins and sound are shared across every animal.
- **`S`** — the *active* pet, always `G.pets[G.active]`. Almost all game code
  reads `S`. `simulateAll()` swaps `S` across the roster and restores it, which
  is why per-pet functions can be written as if there were only one animal.

Anything that persists lives on `G` and is serialised whole. Nothing derived is
stored: stage, bond level and mood are all computed from raw values.

## Time

The simulation runs on `Date.now()` deltas, never on frame time. Each turn of
the loop drains `real - G.lastTick` in chunks of at most 5 minutes (10 on cold
boot), capped at 12 hours live and 3 days on load. A focused tab, a throttled
background tab and a closed tab therefore all produce the same drift.

Frame time (`dt` from `requestAnimationFrame`) is used only for things that do
not persist: particles, walking, animation timing, minigames.

## The sprite pipeline

See `SPRITE-PIPELINE.md`. In short: each species draw function paints flat
shapes onto twelve **material layers**; the compositor turns those layers into
lit, outlined pixels. Frames are baked lazily and cached by
`species|skin|stage|anim|frame|eye`.

## The interface

The five keys on the case open **screens**, which are drawn inside the 224x168
canvas by `07-screens.js`. A key is a direct jump; a tap on the glass picks
something within the screen. A screen replaces the view rather than sliding
over it, and the case does not change while one is open — the key that opened
it stays latched down.

Each entry in `SCREENS` has a `layout()` that builds hit boxes, a `draw()` and
a `tap()`. Draw and hit-test read the same boxes, so no rectangle is computed
twice. Screen text is the bitmap font in `03-font.js`.

What is left in the DOM is the printed panel around the screen — the meter
strip, the identity line, the bond row — plus the four panels that are all
prose: the dossier, the developer harness, and the two notices. At six pixels
a character the screen cannot carry a paragraph, which is the only reason
those did not move.

## Rendering

`drawScene()` runs every frame. If a screen is open it draws that and returns.
Otherwise:

1. baked backdrop for the current sky phase (cached per phase)
2. stars, sun or moon on a clock-driven arc, parallax clouds, pterosaur, pond
3. the volcano's plume and crater glow, and a rank of grass on the ground
   line — the three things in the backdrop that move, and therefore the three
   that cannot be baked into it
4. mode content — egg choice, hatching, habitat, or a minigame
5. foreground cycads the animal walks behind
6. a time-of-day tint

## Where to change what

| Task | File |
| --- | --- |
| Species anatomy, proportions, growth-stage shape | `src/species/<name>.js` |
| Coat patterns | `paintPattern` in `src/species/registry.js` |
| Field notes, coats, likes and dislikes, speed | `src/species/registry.js` |
| Growth stage multipliers, gait, feet, hats, poses | `src/02-sprite-engine.js` |
| Lighting, palettes, material list | `src/01-colour.js` |
| Backdrop, weather, props, particles | `src/04-world.js` |
| Needs, illness, bond, economy, the nest | `src/05-sim.js` |
| Minigames, feeding animation, behaviour | `src/06-render.js` |
| Case chrome, prose panels, input, save/load | `src/08-ui.js` |
| A new screen | a key in `SCREENS` in `src/07-screens.js`, and a way to open it |
| A new prose panel | a key in `SHEETS` in `src/08-ui.js`, nothing else |
| The screen font | `src/03-font.js` |
| Colours, layout, buttons | `src/style.css` |
| The crown ridge's plates | `--x/--w/--h` in `src/style.css`; the arc in `fitCrown()` |
| The volcano and its plume | `drawVolcano` (baked) and `drawPlume` (live), `src/04-world.js` |
| The case: shell, bezel, keys | `src/style.css`, `index.html` |
| A developer switch | a method on `DEV` in `src/05-sim.js`, a chip in the `dev` sheet |
| Checking any of the art | `tools/sheet.html` |

## The case

Everything the player sees sits inside one moulded shell — a speckled
dinosaur egg with a bone bezel, a recessed screen and five physical keys. The
look is all CSS: the speckles are a tiled set of radial gradients reused
through the `--speckles` custom property, and the mouldings are layered `inset`
shadows. The project ships no image assets and the case did not change that.

Two pieces of it are sized from JavaScript, and both for the same reason — the
stylesheet cannot read its own box. `fitScreen()` sets `--lcd-w` to a whole or
half multiple of 224 so the canvas grid lands on the case grid. `fitCrown()`
puts each plate of the crown ridge on the shell's real top curve: that curve is
an ellipse whose radii are a fraction of the rendered width and height, so
where the crown is at a given x is not a constant. The plates declare `--x`,
`--w` and `--h` in `style.css` and the function supplies the arc. A
`ResizeObserver` on `.shell` refits them, which covers a resize, the web font
landing, and the screen being sized.

`index.html` carries the structure (`.shell` → `.bezel` → `.screen` → `.lcd`)
and `style.css` carries the look. No element id changed when the case went in,
which is why nothing in the render, world or sim modules had to move: those
three touch the DOM in exactly two places, `$('scene')` and `$('bubble')`.

## Developer tools

`DEV` in `05-sim.js` is a test harness, not a cheat menu. Every method writes
the same fields the simulation writes, so nothing it can do produces a state
the game could not have reached on its own — setting a growth stage parks
`S.growth` on a `GROWTH_GATES` boundary and moves `S.stageSeen` with it, the
way `simulate()` would have.

The `dev` sheet in `08-ui.js` is the only view of it, and `G.dev` gates the
button in the top bar. It ships **on**; long-pressing the brand plate toggles
it. See `ROADMAP.md`.
