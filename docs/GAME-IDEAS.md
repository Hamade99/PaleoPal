# Game ideas

A running list of potential minigames and game-adjacent features, contributed
by the owner. Neopets is the general benchmark. Nothing here is decided or
scheduled — this is a capture list, not a plan. See `ROADMAP.md` for
committed open work and `TODO.md` for the two long-horizon jobs.

## Minigames

- **Dino whack-a-mole.** Dino heads pop up from burrows or foliage; some are
  "good" and should not be hit, some are "bad" and should be. Score comes from
  hitting the right ones and leaving the right ones alone, not just speed.
- **Sprite memory match.** Classic pairs-matching game, with dino terms, body
  parts, or species as the tiles. Educational undertone, but should stay
  light rather than read as a quiz.
- **Dino counter.** A messy, criss-crossing stampede or horde of dinosaurs
  walks across the screen left to right, mixed with noise — other random
  animals, debris, background clutter entering and leaving view. After the
  round, answer "how many of species X did you see?" from a 4-5 option
  multiple choice, all close to the true count.
- **Frogger variant.** Same dodge-and-cross mechanic, reskinned to a
  prehistoric setting with dino sprites.
- **Freeze when it turns.** Squid Game's "Red Light, Green Light": creep
  toward a goal while a large predator periodically turns around; freeze
  motionless while it's watching or lose, win by reaching the goal.
- **Sort by diet.** Incoming sprites or dino names get sorted into three
  buckets — herbivore, carnivore, omnivore — under time pressure.

## Stretch / uncertain

- **Rhythm game.** Arrow-key "just dance" style game. Owner flagged this one
  as a stretch and isn't sure it fits.

## Not a minigame — a feature idea

- **The Hunt.** Send the currently-viewed dino out on a hunt; it's gone for
  12 real-world hours and returns with a haul — usually coins, but rare
  cosmetics (under 2% chance) and more common loot are both worth
  considering. This is a background/idle mechanic rather than a played
  round — closer in shape to the daily streak or a habitat purchase than to
  anything in the `GAMES` table — and it would need wall-clock timing
  (`Date.now()` deltas), the same as everything else that persists across a
  closed game.
