# Paleopal

A pocket dinosaur care sim. One animal, or up to six, kept alive in real time in
a pixel-art habitat that follows your actual clock.

Everything is drawn from code. There are no image assets.

## Run it

Open `index.html` in a browser. No server, no install, no build step needed for
development.

## Build the shippable file

```
python3 build.py
```

Inlines the stylesheet and all eleven scripts into `dist/paleopal.html`, a
single self-contained file that runs from disk or inside a WebView.

## Layout

```
index.html          development shell, loads src/ individually
build.py            inlines everything into dist/
dist/paleopal.html  the single-file build
src/
  00-core.js          utilities, storage, audio, path primitives
  01-colour.js        ramps, material layers, lighting compositor
  02-sprite-engine.js growth stages, gait, feet, hats, frame baking
  species/            one file per animal, plus the registry
  04-world.js         backdrop, parallax, particles, props
  05-sim.js           needs, illness, bond, the nest, actions
  06-render.js        behaviour, draw loop, feeding, minigames
  07-ui.js            chrome, sheets, input, save/load, main loop
  style.css
docs/
  DEVLOG.md           what was decided and why, session by session
  ARCHITECTURE.md     how the pieces fit, and where to change what
  SPRITE-PIPELINE.md  how an animal becomes pixels
  PALEO-REFERENCES.md the anatomy the sprites are based on
  ROADMAP.md          open work
```

Start with `docs/ARCHITECTURE.md`.
