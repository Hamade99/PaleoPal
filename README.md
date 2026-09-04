# Paleopal

A pocket dinosaur care sim. One animal, or up to six, kept alive in real time in
a pixel-art habitat that follows your actual clock.

Everything is drawn from code. There are no image assets.

## Run it

Open `index.html` in a browser. No server, no install, no build step needed for
development. Open `tools/sheet.html` the same way to see every sprite at once,
which is the fastest way to check a change to the art.

## Edit the art

```
python -m http.server
```

then open `http://localhost:8000/tools/editor.html`. Pixel sprites, growth
columns, species proportions, coats and habitat palettes, all with live
previews, saved back to `src/00-art.js`. It needs a server rather than
`file://` for two reasons: it reads that file to save it, and the browser will
only hand out a writable file handle on a secure origin — localhost counts,
`file://` does not.

## Build the shippable file

```
python3 build.py
```

Inlines the stylesheet and every script into `dist/paleopal.html`, a single
self-contained file that runs from disk or inside a WebView. The load order is
read from `index.html`, so there is only ever one list to keep straight.

## Layout

```
index.html          development shell, loads src/ individually
build.py            inlines everything into dist/
dist/paleopal.html  the single-file build
src/
  00-core.js          utilities, storage, audio, path primitives
  00-art.js           all the art data: pixel sprites, growth, proportions,
                      species and coat colours, habitat palettes
  01-colour.js        ramps, material layers, lighting compositor
  02-sprite-engine.js growth stages, gait, limbs, hats, frame baking
  03-font.js          the 5x7 screen font, drawn from a bit table
  species/            one file per animal, plus the registry
  04-world.js         backdrop, parallax, particles, props
  05-sim.js           needs, illness, bond, the nest, actions
  06-render.js        behaviour, draw loop, feeding, the three minigames
  07-screens.js       the menus, drawn inside the screen
  08-ui.js            case chrome, prose panels, input, save/load, main loop
  style.css
tools/
  sheet.html          every sprite, every stage, every frame, on one page
  editor.html         edit all of it, with live previews
  edit-core.js        serialising the data back to src/00-art.js
  edit-ui.js          the editor's five tabs
docs/
  DEVLOG.md           what was decided and why, session by session
  ARCHITECTURE.md     how the pieces fit, and where to change what
  SPRITE-PIPELINE.md  how an animal becomes pixels
  PALEO-REFERENCES.md the anatomy the sprites are based on
  ROADMAP.md          open work
  TODO.md             the Android port, the week-two problem, and a changelog
```

Start with `docs/ARCHITECTURE.md`.
