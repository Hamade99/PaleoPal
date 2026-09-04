/* ==========================================================================
   COLOUR + LIGHTING
   Palettes are generated as hue-shifted ramps: shadows drift cooler and more
   saturated, highlights warmer and less saturated. Shading uses one light,
   from the upper left, applied through a distance field so the form reads
   instead of pillowing evenly around the outline.
   ========================================================================== */

function hexToHsl(hex){
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2;
  let h = 0, s = 0;
  if (mx !== mn){
    const d = mx - mn;
    s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
    h = mx === r ? (g-b)/d + (g<b?6:0) : mx === g ? (b-r)/d + 2 : (r-g)/d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToHex(h, s, l){
  h = ((h % 360) + 360) % 360; s = clamp(s,0,1); l = clamp(l,0,1);
  const c = (1 - Math.abs(2*l-1)) * s, x = c * (1 - Math.abs((h/60)%2 - 1)), m = l - c/2;
  let r,g,b;
  if (h<60) [r,g,b]=[c,x,0]; else if (h<120) [r,g,b]=[x,c,0]; else if (h<180) [r,g,b]=[0,c,x];
  else if (h<240) [r,g,b]=[0,x,c]; else if (h<300) [r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
  const q = v => Math.round((v+m)*255).toString(16).padStart(2,'0');
  return '#' + q(r) + q(g) + q(b);
}
/* five steps, darkest first, with the hue rotated along the ramp */
function ramp(base, opts){
  opts = opts || {};
  const [h,s,l] = hexToHsl(base);
  const spread = opts.spread || .19, shift = opts.shift || 22;
  const out = [];
  for (let i=0;i<5;i++){
    const t = (i-2)/2;                                   // -1 shadow … +1 light
    out.push(hslToHex(
      h + (t<0 ? t*shift : t*shift*.55),                 // shadows swing further
      clamp(s + (t<0 ? .10*-t : -.13*t), .05, 1),
      clamp(l + t*spread, .05, .95)
    ));
  }
  return out;
}
function shiftRamp(r, n){ return r.map((_,i) => r[clamp(i+n,0,4)]); }
/* blend two hexes. Used to pull the underside toward the flank hue so that
   countershading reads as light falling off a body rather than as a second
   colour painted onto it. */
function mixCol(a, b, t){
  const A = [1,3,5].map(i => parseInt(a.slice(i,i+2),16));
  const B = [1,3,5].map(i => parseInt(b.slice(i,i+2),16));
  return '#' + A.map((v,i) => Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join('');
}

/* Material keys, in paint order: a later layer wins where two overlap.

   The compositor only draws an internal edge where two *different* materials
   meet, so two shapes sharing a layer merge into one region with nothing
   between them. That is why the mandible has a layer of its own instead of
   sharing `head` — painted onto `head` it was drawn correctly, hinged
   correctly, and completely invisible, which is what left every animal with a
   mouthless face.

   `shield` and `jaw` sit below `head`, so a frill and a lower jaw pass behind
   the skull. `belly` and `mark` sit above the body but are masked to it, so
   both can be painted generously and let the mask trim them to the
   silhouette. `mark` stops below `belly`, which is how a coat pattern fades
   out where the countershading starts rather than running across it.

   `horn` sits above `mouth` because teeth, beaks and claws stand in front of
   the mouth cavity, not behind it. The other way round the gape painted over
   every tooth in it.

   `beak` is a layer and not just a colour on `horn` because a rostral and a
   brow horn are different materials and the compositor only draws an edge
   between different materials. Sharing `horn`, a ceratopsian's beak was two
   near-white blobs stuck on the front of a tan face with nothing dividing
   them from the horn sheaths above. A species that does not set `spec.beak`
   gets its horn colour here and nothing changes for it. */
const LAYERS = ['far','skin','limb','shield','jaw','head','belly','mark','crest','mouth','horn','beak','sclera','pupil','glint'];
const BODY_TOP    = LAYERS.indexOf('head');
const BELLY_LAYER = LAYERS.indexOf('belly');
const MARK_LAYER  = LAYERS.indexOf('mark');
/* Countershading belongs to the trunk, the skull and the jaw. It is kept off
   the limbs — near-side limbs carry their own lit ramp and far-side limbs are
   held back in shade, and letting the belly claim either bleached every leg to
   the same cream as the underside. */
const BELLY_OK = LAYERS.map(n => n === 'skin' || n === 'shield' || n === 'jaw' || n === 'head');

function buildMaterials(spec){
  const skin = ramp(spec.skin), horn = ramp(spec.horn, {spread:.12, shift:14});
  return {
    /* Far-side limbs. Two steps down with the contrast raised turned them
       into a black mass slung under the body that read as shadow rather than
       as legs, which on the four-legged animals is half the sprite. */
    far:    { r: shiftRamp(skin, -1), lit:.55 },
    skin:   { r: skin,                lit:1 },
    limb:   { r: shiftRamp(skin, 0),  lit:1.1 },
    /* display structures: a frill or a plate carries its own colour, which is
       standard in modern reconstructions and is also the only thing that
       stops a shield reading as a lump of neck at this size */
    shield: { r: ramp(spec.shield || spec.crest), lit:.85 },
    /* a shade under the skull, so the lip line reads as a step and not only
       as a seam */
    jaw:    { r: shiftRamp(skin, -1), lit:.85 },
    head:   { r: skin,                lit:.9 },
    /* Pulled a third of the way back toward the flank. Taken neat, the belly
       colours are far enough from the body that the underside read as a
       painted stripe; taken a step down their own ramp they fell into the
       dark, saturated end and inverted the countershading outright. */
    belly:  { r: ramp(mixCol(spec.belly, spec.skin, .38)), lit:.62 },
    mark:   { r: ramp(spec.mark || spec.crest), lit:.85 },
    crest:  { r: ramp(spec.crest),    lit:.7 },
    horn:   { r: horn,                lit:1.15 },
    /* Keratin, but not the same keratin. A beak is duller and darker than a
       horn sheath, and it has to be, or it reads as bone stuck to the face. */
    beak:   { r: ramp(spec.beak || spec.horn, {spread:.10, shift:8}), lit:.95 },
    mouth:  { r: ramp(spec.mouth, {spread:.10}), lit:.35 },
    sclera: { r: ramp('#f6f2e2', {spread:.07}),  lit:.3 },
    pupil:  { r: ramp('#181410', {spread:.05}),  lit:0 },
    glint:  { r: ramp('#fffdf2', {spread:.04}),  lit:0 },
    outline: spec.outline
  };
}

/* ---------- composite the layers, light them, draw a selective outline ----- */
const LIGHT = [-0.66, -0.75];      // upper-left
const RIM = 6;                     // how deep the lit/shadowed band reaches

/* Every pass below is per-pixel, and a sprite occupies well under half the
   box it is drawn in. The flatten pass has to look at all of it — that is how
   it finds out where the animal is — but it records the bounds while it goes,
   and the distance field, the lighting and the outline then run over those
   bounds plus a two-pixel margin for the dilation. Outside them every pixel is
   background, which is the value the arrays already hold. */
function composeSprite(layerCanvases, mats, w, h){
  const n = w*h;
  const id = new Int8Array(n).fill(-1);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  const seen = i => {
    const x = i % w, y = (i - x) / w;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  };
  for (let li=0; li<LAYERS.length; li++){
    const d = readCtx(layerCanvases[li]).getImageData(0,0,w,h).data;
    if (li === MARK_LAYER){
      // a coat rides the body, and stops where the countershading starts
      for (let i=0;i<n;i++) if (d[i*4+3] >= 118 && id[i] >= 0 && id[i] <= BODY_TOP) id[i] = li;
    } else if (li === BELLY_LAYER){
      for (let i=0;i<n;i++) if (d[i*4+3] >= 118 && id[i] >= 0 && BELLY_OK[id[i]]) id[i] = li;
    } else {
      for (let i=0;i<n;i++) if (d[i*4+3] >= 118){ if (id[i] < 0) seen(i); id[i] = li; }
    }
  }
  if (x1 < 0) return makeCv(w,h);                 // nothing was drawn
  x0 = Math.max(0, x0-2); y0 = Math.max(0, y0-2);
  x1 = Math.min(w-1, x1+2); y1 = Math.min(h-1, y1+2);

  // distance from the silhouette edge (two-pass chamfer)
  const dist = new Float32Array(n);
  const BIG = 1e6;
  for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
    const i = y*w+x;
    if (id[i] < 0){ dist[i] = 0; continue; }
    const out = (x===0||id[i-1]<0) || (x===w-1||id[i+1]<0) || (y===0||id[i-w]<0) || (y===h-1||id[i+w]<0);
    const seam = (x>0&&id[i-1]!==id[i]) || (x<w-1&&id[i+1]!==id[i]) ||
                 (y>0&&id[i-w]!==id[i]) || (y<h-1&&id[i+w]!==id[i]);
    dist[i] = out ? 0 : seam ? 2.6 : BIG;
  }
  for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
    const i = y*w+x; if (!dist[i]) continue;
    let v = dist[i];
    if (x>0) v = Math.min(v, dist[i-1]+1);
    if (y>0) v = Math.min(v, dist[i-w]+1);
    if (x>0&&y>0) v = Math.min(v, dist[i-w-1]+1.41);
    if (x<w-1&&y>0) v = Math.min(v, dist[i-w+1]+1.41);
    dist[i] = Math.min(v, BIG);
  }
  for (let y=y1;y>=y0;y--) for (let x=x1;x>=x0;x--){
    const i = y*w+x; if (!dist[i]) continue;
    let v = dist[i];
    if (x<w-1) v = Math.min(v, dist[i+1]+1);
    if (y<h-1) v = Math.min(v, dist[i+w]+1);
    if (x<w-1&&y<h-1) v = Math.min(v, dist[i+w+1]+1.41);
    if (x>0&&y<h-1) v = Math.min(v, dist[i+w-1]+1.41);
    dist[i] = v;
  }

  const out = makeCv(w,h), og = readCtx(out), img = og.createImageData(w,h), D = img.data;
  const rgbCache = new Map();
  const put = (i, hex, a) => {
    let c = rgbCache.get(hex);
    if (!c){ c = [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]; rgbCache.set(hex,c); }
    D[i*4]=c[0]; D[i*4+1]=c[1]; D[i*4+2]=c[2]; D[i*4+3]=a;
  };
  const outRamp = ramp(mats.outline, {spread:.09, shift:10});

  for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
    const i = y*w+x;
    if (id[i] < 0) continue;
    const m = mats[LAYERS[id[i]]];
    const d = dist[i];
    let step = 0;
    if (m.lit > 0 && d < RIM){
      // inward gradient of the distance field points away from the surface
      const gx = (dist[i + (x<w-1?1:0)] - dist[i - (x>0?1:0)]);
      const gy = (dist[i + (y<h-1?w:0)] - dist[i - (y>0?w:0)]);
      const len = Math.hypot(gx,gy) || 1;
      const nx = -gx/len, ny = -gy/len;                   // outward normal
      const lam = nx*LIGHT[0] + ny*LIGHT[1];
      step = Math.round(lam * (1 - d/RIM) * 3.0 * m.lit);
    }
    put(i, m.r[clamp(2 + step, 0, 4)], 255);
  }
  // selective outline: sample the material it hugs, brighten it on the lit side
  for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
    const i = y*w+x;
    if (id[i] >= 0) continue;
    let near = -1, ox = 0, oy = 0;
    if (x>0 && id[i-1]>=0){ near = id[i-1]; ox = 1; }
    else if (x<w-1 && id[i+1]>=0){ near = id[i+1]; ox = -1; }
    if (near < 0){
      if (y>0 && id[i-w]>=0){ near = id[i-w]; oy = 1; }
      else if (y<h-1 && id[i+w]>=0){ near = id[i+w]; oy = -1; }
    }
    if (near < 0) continue;
    const lam = ox*LIGHT[0] + oy*LIGHT[1];
    put(i, outRamp[clamp(1 + Math.round(lam*1.4), 0, 3)], 255);
  }
  og.putImageData(img,0,0);
  return out;
}
