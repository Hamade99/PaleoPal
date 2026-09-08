/* ==========================================================================
   HAND-DRAWN BACKDROPS
   A habitat painted pixel by pixel, in place of the one bakeBg computes.

   This is a second art file, and the only one. "Art is data, in one file"
   exists so that everything the editor owns is somewhere the editor can write,
   and a second file it also writes — same `<data:NAME>` markers, same save
   path — keeps that. What it does not keep is 00-art.js at a readable size: a
   backdrop is 280x210 characters, so five of them would bury the growth
   columns and the proportions under a thousand lines of pixel rows. The built
   dist/paleopal.html is still one file; only the source splits.

   Unlike PART_PIX these are real colours, not materials. Nothing about a
   backdrop goes through composeSprite — there is no lighting pass and no ramp
   to name — so the pixels are simply the picture, in the same palette-and-rows
   format PIX uses. The alphabet is longer because a scene needs more colours
   than an icon: 62 of them, and beyond that the editor snaps to the nearest.

   Keyed by biome, with `biome|phase` for a phase that has a drawing of its
   own. That is the fallback order, and the reason for it: a drawing is fixed
   pixels, and the four times of day are fixed pixels tinted, which is crude
   next to the procedural night that recolours itself from skySpec. If one
   habitat ends up deserving a real night sky, it gets a `valley|night` entry
   and the base one goes on serving the other three.

   `quiet` is the other half of hand-drawing a scene. The plume, the surf, the
   aurora, the grass blades and the rest are drawn live over the backdrop and
   know nothing about it, which is mostly right — they are what makes the place
   move. But a hand-drawn ground will not necessarily agree with the blades
   growing out of it, so a drawing can name the live elements it would rather
   do without.
   ========================================================================== */
/*<data:BG_PIX>*/
const BG_PIX = {
};
/*</data>*/

/* Sixty-two, in the order the editor allocates them. A space is a hole, which
   for a backdrop means the procedural bake still shows through — so a partial
   drawing is a patch over a computed scene rather than a scene with a gap. */
const BG_CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* The drawing for a habitat at a time of day, or nothing. The phase-specific
   entry wins; otherwise the base drawing serves every phase and takes a wash. */
function bgArtFor(bid, phase){
  return BG_PIX[bid + '|' + phase] || BG_PIX[bid] || null;
}
const bgQuiet = (bid, phase) => {
  const a = bgArtFor(bid, phase);
  return a && a.quiet ? a.quiet : [];
};

/* How far a base drawing is pushed toward the phase's own low sky colour when
   it is standing in for a time of day it was not drawn for. Day is the drawing
   as painted. Night is heavy, because a daylit scene shown at night with a
   light touch reads as a bug rather than as evening.

   This is the crude part, and it is crude on purpose: the alternative is four
   drawings per habitat at four times the file size, which is what the
   `biome|phase` key is there for on the day one of them earns it. */
const BG_PHASE_MIX = { day: 0, dawn: .20, dusk: .26, night: .50 };

const bgPixCache = new Map();
function bgPixCanvas(bid, phase){
  const art = bgArtFor(bid, phase);
  if (!art) return null;
  const key = bid + '|' + phase;
  if (bgPixCache.has(key)) return bgPixCache.get(key);
  const w = art.w || BG_W, h = art.h || BG_H;
  const c = makeCv(w, h), g = readCtx(c);
  for (let y = 0; y < h; y++){
    const row = art.rows[y] || '';
    for (let x = 0; x < row.length; x++){
      const i = BG_CH.indexOf(row[x]);           // a space is -1, and left clear
      if (i < 0) continue;
      g.fillStyle = art.pal[i] || '#ff00ff';
      g.fillRect(x, y, 1, 1);
    }
  }
  /* The wash, inside the drawing only. `source-atop` so that a partial drawing
     tints its own pixels and not the transparent ones it is letting through. */
  const mix = BG_PIX[bid + '|' + phase] ? 0 : (BG_PHASE_MIX[phase] || 0);
  if (mix > 0){
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = mix;
    g.fillStyle = skySpec(bid, phase).low;
    g.fillRect(0, 0, w, h);
    g.restore();
  }
  bgPixCache.set(key, c);
  return c;
}
