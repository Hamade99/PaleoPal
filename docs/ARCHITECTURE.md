# Architecture

No framework, no bundler. Eleven plain scripts concatenated in a fixed order,
because that order is the only dependency graph there is.

## Load order

```
src/00-core.js          utilities, storage adapter, audio, path primitives
src/01-colour.js        ramp generation, material layers, the lighting compositor
src/02-sprite-engine.js growth stages, gait/IK, feet, hats, pose table, frame baking
src/species/rex.js      one draw function per species
src/species/triceratops.js
src/species/brachiosaurus.js
src/species/registry.js SPECIES table, field notes, coats, pattern painter
src/04-world.js         backdrop baking, parallax, particles, props
src/05-sim.js           needs, illness, bond, growth, the nest, player actions
src/06-render.js        behaviour, the draw loop, feeding, minigames
src/07-ui.js            DOM chrome, sheets, input, save/load, main loop
```

`build.py` is the only thing that knows this list. `index.html` loads the files
individually for development; `dist/paleopal.html` is the inlined build.

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

## Rendering

`drawScene()` runs every frame:

1. baked backdrop for the current sky phase (cached per phase)
2. stars, sun or moon on a clock-driven arc, parallax clouds, pterosaur, pond
3. mode content — egg choice, hatching, habitat, or a minigame
4. foreground cycads the animal walks behind
5. a time-of-day tint

## Where to change what

| Task | File |
| --- | --- |
| Species anatomy, proportions, growth-stage shape | `src/species/<name>.js` |
| Field notes, coats, likes and dislikes, speed | `src/species/registry.js` |
| Growth stage multipliers, gait, feet, hats, poses | `src/02-sprite-engine.js` |
| Lighting, palettes, material list | `src/01-colour.js` |
| Backdrop, weather, props, particles | `src/04-world.js` |
| Needs, illness, bond, economy, the nest | `src/05-sim.js` |
| Minigames, feeding animation, behaviour | `src/06-render.js` |
| Sheets, chrome, input, save/load | `src/07-ui.js` |
| A new bottom sheet | a key in `SHEETS` in `src/07-ui.js`, nothing else |
| Colours, layout, buttons | `src/style.css` |
