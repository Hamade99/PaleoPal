# Open work

Nothing here is started. Ordered roughly by value.

## Before it can ship on Android

- **Turn the developer button off.** `G.dev` defaults to `true` in
  `freshGame()`. Flip that default before a release build; the long-press on
  the brand plate stays as the way back in. Nothing else needs removing — the
  `DEV` object is harmless without a way to reach it.

- **Local notifications.** This is the actual retention mechanism for a pet
  game: fire when hunger crosses 25, or when an illness starts. Native plugin
  call, not a web API, so it lands during the Capacitor wrap.
- **Capacitor wrap.** `Store` in `00-core.js` already falls back through
  `window.storage` → `localStorage`; that is the only line the wrap should need
  to touch.
- **Economy balance pass.** Coin income (digs, mess, three games, daily streak)
  against sinks (food, remedies, vet, headgear, coats) has never been tuned
  against a real play session.

## Game

- More species. Stegosaurus and a small feathered theropod would both exercise
  parts of the sprite engine that nothing currently uses.
- Breeding or trait inheritance between animals in the nest.
- Habitat decoration as a second coin sink.
- Per-game high scores and a weekly best.

## Engineering

- Frame cache growth: keyed by `species|skin|stage|anim|frame|eye`, with four
  coats and four stages the ceiling is now noticeably higher. Add an LRU cap.
- Sound is thin. Three oscillator shapes doing everything. There is a mute
  switch on the case now, which is the short answer, but the mix wants a pass:
  everything is roughly the same loudness.
- No accessibility pass: no keyboard path through the sheets, no reduced-motion
  handling beyond a CSS transition disable, no screen-reader labels on the
  meters.
- No automated tests in the repo. The Playwright scripts used during the
  structure pass (boot and hatch, render every sheet, drive every save path)
  live outside it and should be brought in.

## Known rough edges

- The volcano reads as a cone but is partly hidden by the ridge in front of it.
- `drawStomp` places the animal at a fixed x; on a very small phone it crowds
  the left edge.
- The canvas scales to a non-integer multiple of 224 at most phone widths, so
  the pixel grid is slightly uneven. Snapping the LCD to whole multiples would
  fix it and cost some width.
- Minigames do not scale their difficulty to the animal's growth stage.
