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
  const spread = opts.spread || .17, shift = opts.shift || 22;
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

/* material keys: each shape is painted onto its own layer with a flat key
   colour, so material boundaries stay exact and never blend into each other */
const LAYERS = ['far','skin','belly','limb','head','mark','crest','horn','mouth','sclera','pupil','glint'];
const MARK_LAYER = LAYERS.indexOf('mark');   // only paints where a body layer already is
const BODY_TOP   = LAYERS.indexOf('head');

function buildMaterials(spec){
  const skin = ramp(spec.skin), horn = ramp(spec.horn, {spread:.12, shift:14});
  return {
    far:    { r: shiftRamp(skin, -2), lit:.45 },
    skin:   { r: skin,                lit:1 },
    belly:  { r: ramp(spec.belly),    lit:.65 },
    limb:   { r: shiftRamp(skin, 0),  lit:1.1 },
    head:   { r: skin,                lit:.9 },
    mark:   { r: ramp(spec.mark || spec.crest), lit:.85 },
    crest:  { r: ramp(spec.crest),    lit:.7 },
    horn:   { r: horn,                lit:1.15 },
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

function composeSprite(layerCanvases, mats, w, h){
  const n = w*h;
  const id = new Int8Array(n).fill(-1);
  for (let li=0; li<LAYERS.length; li++){
    const d = readCtx(layerCanvases[li]).getImageData(0,0,w,h).data;
    if (li === MARK_LAYER){
      for (let i=0;i<n;i++) if (d[i*4+3] >= 118 && id[i] >= 0 && id[i] <= BODY_TOP) id[i] = li;
    } else {
      for (let i=0;i<n;i++) if (d[i*4+3] >= 118) id[i] = li;
    }
  }
  // distance from the silhouette edge (two-pass chamfer)
  const dist = new Float32Array(n);
  const BIG = 1e6;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i = y*w+x;
    if (id[i] < 0){ dist[i] = 0; continue; }
    const out = (x===0||id[i-1]<0) || (x===w-1||id[i+1]<0) || (y===0||id[i-w]<0) || (y===h-1||id[i+w]<0);
    const seam = (x>0&&id[i-1]!==id[i]) || (x<w-1&&id[i+1]!==id[i]) ||
                 (y>0&&id[i-w]!==id[i]) || (y<h-1&&id[i+w]!==id[i]);
    dist[i] = out ? 0 : seam ? 2.6 : BIG;
  }
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i = y*w+x; if (!dist[i]) continue;
    let v = dist[i];
    if (x>0) v = Math.min(v, dist[i-1]+1);
    if (y>0) v = Math.min(v, dist[i-w]+1);
    if (x>0&&y>0) v = Math.min(v, dist[i-w-1]+1.41);
    if (x<w-1&&y>0) v = Math.min(v, dist[i-w+1]+1.41);
    dist[i] = Math.min(v, BIG);
  }
  for (let y=h-1;y>=0;y--) for (let x=w-1;x>=0;x--){
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

  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
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
      step = Math.round(lam * (1 - d/RIM) * 2.6 * m.lit);
    }
    put(i, m.r[clamp(2 + step, 0, 4)], 255);
  }
  // selective outline: sample the material it hugs, brighten it on the lit side
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
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
