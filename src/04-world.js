/* ==========================================================================
   WORLD
   The habitat is built the same way as the animals: flat colour blocked into
   integer columns, dithered gradients instead of smooth ones, one light from
   the upper left, and depth carried by parallax rather than by blur.
   ========================================================================== */

const SKY_SPECS = {
  night: { top:'#0a1124', low:'#28374f', far:'#1c2942', mid:'#151f2d', tree:'#111d20',
           grass:'#2b4331', dirt:'#382f27', water:'#22405a', tint:'rgba(16,24,54,.44)' },
  dawn:  { top:'#2c3f70', low:'#e39a6c', far:'#5d5b7c', mid:'#44465d', tree:'#2e4038',
           grass:'#5b7949', dirt:'#7b6046', water:'#7d6f86', tint:'rgba(196,124,84,.13)' },
  day:   { top:'#4d9dc9', low:'#c3e2d8', far:'#8fa79d', mid:'#6c8b6f', tree:'#3e5a44',
           grass:'#78a051', dirt:'#a5825a', water:'#6fa6b8', tint:'rgba(0,0,0,0)' },
  dusk:  { top:'#2b2854', low:'#da834b', far:'#504563', mid:'#3a3347', tree:'#2b3934',
           grass:'#597047', dirt:'#6f553f', water:'#6b5570', tint:'rgba(96,62,116,.20)' }
};
function skyPhase(d){
  const h = d.getHours() + d.getMinutes()/60;
  if (h < 5 || h >= 21) return 'night';
  if (h < 7.5) return 'dawn';
  if (h < 18)  return 'day';
  return 'dusk';
}
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const mixHex = (a,b,t) => {
  const A = [1,3,5].map(i=>parseInt(a.slice(i,i+2),16)), B = [1,3,5].map(i=>parseInt(b.slice(i,i+2),16));
  return '#' + A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join('');
};
const STARS = Array.from({length:54}, () => ({x:rnd(2,W-2), y:rnd(3,92), p:rnd(0,6.3), b:rnd(.4,1)}));
const MOTES = Array.from({length:14}, () => ({x:rnd(0,W), y:rnd(40,GROUND-6), vx:rnd(2,7), vy:rnd(-3,3), p:rnd(0,6.3)}));

/* --------------------------- baked backdrop -------------------------------- */
const bgCache = new Map();
function ridge(g, cfg){
  // integer-column heightfield: no antialiasing, so the silhouette stays crisp
  for (let x=0;x<W;x++){
    let h = cfg.base;
    for (const w of cfg.waves) h += Math.sin(x*w[0] + w[1]) * w[2];
    h = Math.round(h);
    g.fillStyle = cfg.col; g.fillRect(x, h, 1, GROUND - h + 2);
    g.fillStyle = cfg.lit; g.fillRect(x, h, 1, 1);
    let hn = cfg.base;
    for (const w of cfg.waves) hn += Math.sin((x+1)*w[0] + w[1]) * w[2];
    if (Math.round(hn) > h) g.fillRect(x, h, 1, 2);          // catch light on left faces
  }
}
function conifer(g, x, base, h, body, litc){
  g.fillStyle = '#2f2822';
  g.fillRect(x, base - Math.round(h*.2), 2, Math.round(h*.2));
  for (let k=0;k<3;k++){                                    // three tiers, each wider than the last
    const topY = Math.round(base - h + k*h*.26);
    const botY = Math.round(base - h + k*h*.26 + h*.40);
    const maxW = Math.round(h*.26 + k*h*.11);
    const rows = Math.max(2, botY - topY);
    for (let r=0;r<rows;r++){
      const wd = Math.max(1, Math.round(maxW * (r+1)/rows));
      g.fillStyle = body; g.fillRect(x - (wd>>1), topY + r, wd, 1);
      g.fillStyle = litc; g.fillRect(x - (wd>>1), topY + r, Math.max(1, wd*.4|0), 1);
    }
  }
}

/* Araucaria: a straight bare trunk carrying a deep domed crown, the
   monkey-puzzle silhouette that says Mesozoic on sight. It is a completely
   different shape from a conifer, which is the point of having it — a skyline
   of one shape repeated is a hedge.

   The first attempt gave it a one-pixel trunk under a crown four pixels deep,
   which is a street lamp. The crown has to be a mass with depth to it, and
   the trunk has to be thick enough to hold it up. */
function araucaria(g, x, base, h, body, litc){
  /* Two thirds crown, one third trunk. At the first proportions — a long thin
     trunk under a shallow cap — twenty-five pixels of tree came out as a
     street lamp. */
  const crownH = Math.round(h*.72), trunkH = h - crownH + 3;
  g.fillStyle = mixHex(body, '#000000', .34);
  g.fillRect(x, base - trunkH, 3, trunkH);
  const maxW = Math.round(h*.62);
  for (let r=0;r<crownH;r++){
    const u = r/Math.max(1, crownH-1);                 // 0 at the top of the crown
    // deep dome: wide through the middle, tucked at the top, ragged underneath
    const wd = Math.max(3, Math.round(maxW * Math.sin(Math.pow(u, .78) * Math.PI * .5)));
    const jag = (r % 3 === 2) ? 1 : 0;                 // the whorls break the edge
    g.fillStyle = body;
    g.fillRect(x + 1 - (wd>>1) - jag, base - h + r, wd + jag*2, 1);
    if (u < .34){ g.fillStyle = litc; g.fillRect(x + 2 - (wd>>1), base - h + r, Math.max(1, wd-3), 1); }
  }
}
/* Tree fern: a fibrous trunk under a full rosette. Fills the storey between
   the treeline and the grass, which was open sky. */
function treeFern(g, x, base, h, body, litc){
  const trunk = Math.round(h*.52);
  g.fillStyle = mixHex(body, '#000000', .35);
  g.fillRect(x, base - trunk, 2, trunk);
  const crown = base - trunk;
  for (let a=0;a<7;a++){
    const ang = .18 + a*.46, len = h*(.62 - Math.abs(a-3)*.05);
    const dir = a < 3 ? -1 : a > 3 ? 1 : 0;
    for (let t=1;t<=7;t++){
      const u = t/7;
      const px2 = Math.round(x + dir*Math.cos(ang)*len*u);
      const py  = Math.round(crown - Math.sin(ang)*len*u + u*u*3);
      const lf  = Math.max(1, Math.round(lerp(2.4, 1, u)));
      g.fillStyle = (t & 1) ? body : mixHex(body, '#000000', .22);
      g.fillRect(px2, py - lf, 2, lf*2);
    }
  }
  g.fillStyle = litc; g.fillRect(x - 1, crown - 2, 4, 2);
}

/* --------------------------------- volcano ---------------------------------
   The old one was a cone of one flat colour with a two-pixel orange bar laid
   across the top and a translucent rectangle standing over it: a dark hill
   with a small red pool on it, which is exactly what it looked like.

   Four things make a volcano read, and it had none of them:

     1. A CONCAVE PROFILE. A straight-sided triangle is a slag heap. A
        stratovolcano is steep at the summit and flares out at the base, and
        that curve is most of the silhouette.
     2. A TRUNCATED SUMMIT WITH A CRATER. It does not come to a point; it
        stops at a rim with a notch bitten out of it, and the two sides of
        the notch are different heights.
     3. TWO FACES WITH A HARD EDGE. Light from the upper left, the same as
        everything else in this game, so the left flank is lit and the right
        is in shade with one crisp ridge between them. Flat fill made it a
        cardboard cutout.
     4. STRUCTURE ON THE FLANKS. Radiating gullies and a couple of old lava
        runnels running down from the rim, so the slope has a direction.

   The plume is not baked with the cone. Smoke that never moves is scenery
   painted on a wall; it is drawn per frame in drawPlume, along with the
   crater glow, which is brightest at night. */
const VOLC = { x:172, half:66, top:20, base:GROUND - 4 };

/* Where the flank stands at horizontal distance |dx| from the axis, as a
   height above the base.

   The profile has to be CONCAVE — steep at the summit, flaring at the foot.
   The first attempt used H0 * (1 - t^1.55), whose slope is zero on the axis
   and steepest at the base: that is a butte, flat on top with sheer sides,
   and it is what the cone looked like. Raising (1 - t) to a power above one
   gives the opposite and correct shape.

   The crater is cut into the profile rather than painted on afterwards, and
   it has to be cut deeper than the cone falls across its own width or there
   is no notch at all, only a slightly rounder summit. */
const CRATER_T = 0.20, CRATER_D = 6;
/* The inverse: how wide the cone is at a given screen row. A runnel drawn as
   a straight diagonal walks off the silhouette within a few pixels, because
   the flank near the summit is far steeper than any fixed step — the two of
   them came out as guy-ropes staked into the sky. Asking the profile where
   the edge is keeps them on the mountain. */
function volcSpan(y){
  const H0 = VOLC.base - VOLC.top, h = VOLC.base - y;
  if (h <= 0) return VOLC.half;
  if (h >= H0) return 0;
  return (1 - Math.pow(h / H0, 1/1.85)) * VOLC.half;
}
function volcHeight(t){
  const H0 = VOLC.base - VOLC.top;
  if (t >= CRATER_T) return H0 * Math.pow(1 - t, 1.85);
  const lip = H0 * Math.pow(1 - CRATER_T, 1.85);
  const u = t / CRATER_T;                       // 1 at the lip, 0 on the axis
  return lip - (1 - u*u) * CRATER_D;
}
function drawVolcano(g, S_){
  const { x:px, half, base } = VOLC;
  const rock     = mixHex(S_.far, '#000000', .36);
  const rockLit  = mixHex(S_.far, S_.low,    .26);
  const rockShd  = mixHex(S_.far, '#000000', .60);
  const ridgeCol = mixHex(S_.far, '#000000', .72);
  const ashLit   = mixHex(S_.far, S_.low,    .44);

  for (let i=-half;i<=half;i++){
    const t = Math.abs(i)/half;
    const y = Math.round(base - volcHeight(t));
    const lit = i < -2;                                   // light from the upper left
    g.fillStyle = lit ? rock : rockShd;
    g.fillRect(px+i, y, 1, base - y + 2);
    g.fillStyle = lit ? rockLit : ridgeCol;               // the crisp top edge
    g.fillRect(px+i, y, 1, 1);
    /* Gullies: radiating streaks that get further apart down the slope, so
       the flank has a direction instead of being a flat field. */
    if (Math.sin(i*1.7) > .78){
      g.fillStyle = lit ? mixHex(S_.far, S_.low, .34) : mixHex(S_.far, '#000000', .52);
      g.fillRect(px+i, y+3, 1, Math.round((base - y) * .42));
    }
  }

  /* The crater floor, three rows deep inside the notch the profile already
     cuts. The left lip is left a pixel lower than the right: a crater that is
     symmetrical is a funnel. */
  const rimY = Math.round(base - volcHeight(0));
  const cw = Math.round(half*CRATER_T);
  for (let i=-cw+1;i<cw;i++){
    const y = Math.round(base - volcHeight(Math.abs(i)/half));
    g.fillStyle = mixHex(S_.far, '#000000', .66);
    g.fillRect(px+i, y, 1, 3);
  }
  /* No hand-drawn lips. Two bars laid across the summit read as girders on a
     mesa; the notch in the profile is the crater, and one pixel of catch
     light on the windward lip is all it needs. */
  g.fillStyle = rockLit;  g.fillRect(px-cw-2, Math.round(base - volcHeight(CRATER_T)) - 1, 2, 1);

  /* Two old lava runnels down the lit flank, cold and dark. The live glow in
     them belongs to drawPlume, because at night it pulses. */
  /* Two old lava channels down the flanks. They hold a fixed fraction of the
     way out from the axis and drift by a fraction of a pixel a row: given a
     wobble of any size they swing across a cone that widens this fast and
     come out as lightning bolts painted on the mountain. */
  const runnel = mixHex(S_.far, '#000000', .58);
  const lipY = Math.round(base - volcHeight(CRATER_T));
  for (const dir of [-1, 1]){
    const seat = dir < 0 ? 0.40 : 0.52;
    for (let k=0;k<38;k++){
      const y = lipY + 2 + k;
      if (y > base - 2) break;
      const rx = px + dir * volcSpan(y) * (seat + 0.05*Math.sin(k*.22));
      g.fillStyle = runnel;
      g.fillRect(Math.round(rx), y, 1, 1);
    }
  }
  // an apron of old ash at the foot, spreading wider than the cone
  g.fillStyle = mixHex(S_.far, '#000000', .18);
  for (let i=-half-9;i<=half+9;i++){
    const t = Math.abs(i)/(half+9);
    const h = Math.round((1 - t*t) * 4);
    if (h > 0) g.fillRect(px+i, base - h + 2, 1, h);
  }
}

function boulder(g, x, base, w, h, col, lit, shd){
  for (let i=0;i<h;i++){
    const t = i/h, wd = Math.round(w * (0.55 + 0.45*Math.sin((1-t)*Math.PI*0.5)));
    g.fillStyle = col; g.fillRect(x - (wd>>1), base - h + i, wd, 1);
    g.fillStyle = shd; g.fillRect(x + (wd>>1) - 2, base - h + i, 2, 1);
    if (i < 2){ g.fillStyle = lit; g.fillRect(x - (wd>>1) + 1, base - h + i, Math.max(1,wd-3), 1); }
  }
}
function fallenLog(g, x, base, len, col, lit, shd){
  g.fillStyle = col; g.fillRect(x, base - 5, len, 5);
  g.fillStyle = lit; g.fillRect(x, base - 5, len, 1);
  g.fillStyle = shd; g.fillRect(x, base - 1, len, 1);
  g.fillStyle = shd; g.fillRect(x + len - 3, base - 5, 3, 5);
  g.fillStyle = lit; g.fillRect(x + len - 2, base - 4, 1, 3);
  for (let i=6;i<len-6;i+=7){ g.fillStyle = shd; g.fillRect(x+i, base-4, 1, 3); }
}
function cycadPlant(g, x, base, h, col, lit, shd){
  g.fillStyle = shd; g.fillRect(x-2, base - h*.35, 5, h*.35);
  g.fillStyle = col; g.fillRect(x-1, base - h*.35, 3, h*.35);
  for (let a=0;a<5;a++){
    const ang = 0.35 + a*0.52, len = h * (0.72 - Math.abs(a-2)*0.08);
    const dir = a < 2 ? -1 : a > 2 ? 1 : 0;
    const dx = dir === 0 ? 0 : dir;
    for (let t=1;t<=7;t++){
      const u = t/7;
      const px = Math.round(x + dx * Math.cos(ang) * len * u * (dir?1:0));
      const py = Math.round(base - h*.35 - Math.sin(ang) * len * u + u*u*3);
      const lf = Math.max(1, Math.round(lerp(3.2, 1, u)));
      g.fillStyle = (t & 1) ? col : shd; g.fillRect(px - 1, py - lf, 2, lf*2);
      if (t < 3){ g.fillStyle = lit; g.fillRect(px - 1, py - lf, 2, 1); }
    }
  }
}
function reeds(g, x, base, n, col, lit){
  for (let i=0;i<n;i++){
    const rx = x + i*3, h = 6 + ((i*7)%5);
    g.fillStyle = col; g.fillRect(rx, base - h, 1, h);
    g.fillStyle = lit; g.fillRect(rx, base - h, 1, 2);
    g.fillStyle = col; g.fillRect(rx + (i&1?1:-1), base - h + 2, 1, 2);
  }
}
function bakeBg(phase){
  if (bgCache.has(phase)) return bgCache.get(phase);
  const S_ = SKY_SPECS[phase], c = makeCv(W,H), g = readCtx(c);
  const horizon = 108;

  // dithered sky: five steps with a 4x4 ordered dither across each boundary
  for (let y=0;y<horizon;y++){
    const f = (y/horizon) * 4, i = Math.floor(f), fr = f - i;
    const a = mixHex(S_.top, S_.low, clamp(i/4,0,1)), b = mixHex(S_.top, S_.low, clamp((i+1)/4,0,1));
    for (let x=0;x<W;x++){ g.fillStyle = (BAYER[y&3][x&3]/16 < fr) ? b : a; g.fillRect(x,y,1,1); }
  }
  g.fillStyle = S_.low; g.fillRect(0, horizon, W, GROUND - horizon + 2);

  /* Four depth planes now, each flatter and lighter than the one in front.
     The furthest is nearly the colour of the sky it stands against: without a
     plane that close to the haze, the range began abruptly at a hard edge and
     the distance behind it read as painted card. */
  ridge(g, { base:66, col: mixHex(S_.far, S_.low, .86), lit: mixHex(S_.far, S_.low, .92),
             waves:[[.013,1.9,15],[.037,.8,7],[.006,3.1,9]] });
  ridge(g, { base:74, col: mixHex(S_.far, S_.low, .68), lit: mixHex(S_.far, S_.low, .78),
             waves:[[.019,.3,13],[.044,2.6,6]] });
  ridge(g, { base:84, col: mixHex(S_.far, S_.low, .42), lit: mixHex(S_.far, S_.low, .62),
             waves:[[.031,1.1,11],[.071,.4,5],[.013,2.2,7]] });
  /* A river out on the valley floor, between the far range and the near one.
     One flat band of sky colour lying down is the cheapest depth cue there
     is: everything above it is read as far away because the water proves
     there is ground between here and there. */
  const riv = mixHex(S_.water, S_.low, .62);
  for (let x=0;x<W;x++){
    const top = 92 + Math.round(Math.sin(x*.021 + 1.4)*2.5 + Math.sin(x*.055)*1.2);
    const dep = 3 + Math.round(Math.sin(x*.03 + 2.2)*1.4);
    g.fillStyle = riv; g.fillRect(x, top, 1, dep);
    g.fillStyle = mixHex(S_.water, '#ffffff', .30); g.fillRect(x, top, 1, 1);
  }
  drawVolcano(g, S_);
  ridge(g, { base:100, col: mixHex(S_.mid, S_.low, .2), lit: mixHex(S_.mid, S_.low, .45),
             waves:[[.048,3.4,8],[.11,1.7,3]] });

  /* Treeline on the middle plane. Eight identical conifers in two clumps was
     a hedge; a Late Cretaceous skyline has araucaria with domed crowns on
     bare trunks and tree ferns under them, and three silhouettes instead of
     one is most of what turns a hedge into a wood. */
  const treeBody = mixHex(S_.tree, S_.low, .18), treeLit = mixHex(S_.tree, S_.low, .38);
  const farBody  = mixHex(S_.tree, S_.low, .32), farLit  = mixHex(S_.tree, S_.low, .46);
  [[52,15],[62,11],[150,13],[162,17],[172,12],[100,10]]
    .forEach(t => conifer(g, t[0], GROUND-4, t[1], farBody, farLit));   // back rank, hazed
  [[14,26],[26,19],[38,23],[196,24],[208,17],[184,20],[120,15],[132,21]]
    .forEach(t => conifer(g, t[0], GROUND-2, t[1], treeBody, treeLit));
  [[8,26],[46,21],[142,23],[216,19]]
    .forEach(t => araucaria(g, t[0], GROUND-2, t[1], treeBody, treeLit));
  [[33,12],[128,10],[203,11],[70,9]]
    .forEach(t => treeFern(g, t[0], GROUND-1, t[1], treeBody, treeLit));

  // ground: lit grass edge, then dithered dirt
  const grassLit = mixHex(S_.grass, S_.low, .40), grassDark = mixHex(S_.grass, '#000000', .32);
  for (let x=0;x<W;x++){                                    // tufted, not a ruled line
    const t = (Math.sin(x*.7) > .3 ? 1 : 0) + (Math.sin(x*.31 + 2) > .55 ? 1 : 0) + (Math.sin(x*1.3+1) > .8 ? 1 : 0);
    g.fillStyle = S_.grass; g.fillRect(x, GROUND-1-t, 1, 5+t);
    g.fillStyle = grassLit; g.fillRect(x, GROUND-1-t, 1, 1);
  }
  g.fillStyle = grassDark; g.fillRect(0, GROUND+3, W, 1);
  const d0 = S_.dirt, d1 = mixHex(S_.dirt,'#000000',.22), d2 = mixHex(S_.dirt,S_.low,.22);
  for (let y=GROUND+4;y<H;y++) for (let x=0;x<W;x++){
    const t = (y-GROUND-4)/(H-GROUND-4);
    g.fillStyle = (BAYER[y&3][x&3]/16 < t*.75) ? d1 : d0; g.fillRect(x,y,1,1);
  }
  for (let i=0;i<26;i++){                                   // pebbles
    const x = (rnd(2,W-4))|0, y = (GROUND+6+rnd(0,H-GROUND-9))|0;
    g.fillStyle = d1; g.fillRect(x,y,2,2); g.fillStyle = d2; g.fillRect(x,y,1,1);
  }
  for (let i=0;i<16;i++){                                   // grass tufts
    const x = (rnd(4,W-4))|0, y = (GROUND+5+rnd(0,H-GROUND-10))|0;
    g.fillStyle = mixHex(S_.grass,'#000000',.15); g.fillRect(x,y,1,3);
    g.fillRect(x-1,y+1,1,2); g.fillRect(x+1,y+1,1,2);
  }
  // scenery on the ground line, behind where the animal walks
  const rockCol = mixHex(S_.mid,'#000000',.12), rockLit = mixHex(S_.mid, S_.low,.42), rockShd = mixHex(S_.mid,'#000000',.38);
  boulder(g, 68, GROUND+2, 17, 10, rockCol, rockLit, rockShd);
  boulder(g, 78, GROUND+2, 9, 6, rockCol, rockLit, rockShd);
  boulder(g, 133, GROUND+1, 12, 7, rockCol, rockLit, rockShd);
  const logCol = mixHex(S_.dirt,'#000000',.18), logLit = mixHex(S_.dirt, S_.low,.34), logShd = mixHex(S_.dirt,'#000000',.44);
  fallenLog(g, 92, GROUND+2, 34, logCol, logLit, logShd);
  const plCol = mixHex(S_.tree, S_.low, .22), plLit = mixHex(S_.tree, S_.low, .5), plShd = mixHex(S_.tree,'#000000',.35);
  cycadPlant(g, 32, GROUND+2, 22, plCol, plLit, plShd);
  cycadPlant(g, 116, GROUND+1, 15, plCol, plLit, plShd);
  cycadPlant(g, 190, GROUND+3, 19, plCol, plLit, plShd);
  // watering hole, cut into the dirt on the right
  const px0 = 142, px1 = 212;
  for (let x=px0;x<px1;x++){
    const t = (x-px0)/(px1-px0), dep = Math.round(Math.sin(t*Math.PI)*11);
    if (dep <= 1) continue;
    g.fillStyle = mixHex(S_.dirt,'#000000',.45); g.fillRect(x, GROUND+6, 1, 2);
    g.fillStyle = mixHex(S_.water,'#000000',.25); g.fillRect(x, GROUND+8, 1, dep);
    g.fillStyle = S_.water; g.fillRect(x, GROUND+8, 1, Math.max(1, dep-3));
    g.fillStyle = mixHex(S_.water,S_.low,.45); g.fillRect(x, GROUND+8, 1, 1);
  }
  reeds(g, 138, GROUND+8, 5, plShd, plLit);
  reeds(g, 205, GROUND+8, 4, plShd, plLit);
  bgCache.set(phase,c);
  return c;
}

/* --------------------------- moving backdrop ------------------------------- */
const CLOUDS = [
  { x:30,  y:16, v:1.9, w:26, h:5, near:1 }, { x:140, y:10, v:2.6, w:34, h:6, near:1 },
  { x:88,  y:32, v:1.1, w:20, h:4, near:0 }, { x:196, y:26, v:1.4, w:24, h:4, near:0 }
];
let flyer = null, flyerAt = 4000;
function drawSkyBody(g, phase, now){
  // the sun and moon ride an arc keyed to the player's actual clock
  const d = new Date(), h = d.getHours() + d.getMinutes()/60;
  const night = phase === 'night';
  const t = clamp(night ? ((h + 3) % 24) / 12 : (h - 6) / 13, 0, 1);
  const cx = 18 + t*(W-36), cy = 62 - Math.sin(clamp(t,0,1)*Math.PI) * 44;
  if (night){
    g.fillStyle = '#e8e6d2'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
    g.fillStyle = SKY_SPECS[phase].top; g.beginPath(); g.arc(cx-3.5, cy-2.5, 6, 0, 7); g.fill();
  } else {
    g.fillStyle = phase === 'day' ? 'rgba(250,238,170,.35)' : 'rgba(250,200,140,.3)';
    g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
    g.fillStyle = phase === 'day' ? '#f7ecac' : '#f6c887';
    g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
  }
}
function drawClouds(g, phase, dt){
  const lit = phase === 'night' ? 'rgba(196,206,232,.30)' : 'rgba(248,246,234,.92)';
  const shd = phase === 'night' ? 'rgba(150,162,192,.26)' : 'rgba(214,214,204,.85)';
  for (const c of CLOUDS){
    c.x += c.v * dt/1000 * 4; if (c.x > W + c.w) c.x = -c.w;
    const x = Math.round(c.x), y = c.y, w = c.near ? c.w : c.w*.7, hh = c.near ? c.h : c.h-1;
    g.fillStyle = lit;
    g.fillRect(x - w/2, y, w, hh);
    g.fillRect(x - w/4, y - 3, w/2, 3);
    g.fillRect(x + w/6, y - 5, w/4, 2);
    g.fillStyle = shd; g.fillRect(x - w/2, y + hh - 1, w, 1);
  }
}
function drawFlyers(g, dt, now){
  if (!flyer && now > flyerAt){ flyer = { x:-14, y: rnd(18,54), v: rnd(26,40), p:0 }; }
  if (!flyer) return;
  flyer.x += flyer.v * dt/1000; flyer.p += dt;
  if (flyer.x > W + 14){ flyer = null; flyerAt = now + rnd(25,60)*1000; return; }
  const up = Math.sin(flyer.p/130) > 0;
  g.fillStyle = 'rgba(40,48,54,.7)';
  const x = Math.round(flyer.x), y = Math.round(flyer.y);
  g.fillRect(x-1, y, 3, 1);
  if (up){ g.fillRect(x-5, y-2, 4, 1); g.fillRect(x+2, y-2, 4, 1); }
  else   { g.fillRect(x-5, y+2, 4, 1); g.fillRect(x+2, y+2, 4, 1); }
}
/* The plume, and the light in the crater.

   Neither is baked with the cone. A backdrop is cached per sky phase and
   redrawn perhaps four times a day, so anything baked into it is a painting
   on a wall — the old smoke was a translucent rectangle that had never moved
   in the history of the game. Smoke is the one thing on a volcano that is
   always moving, and it is most of what says the mountain is alive.

   Eight puffs share one rising cycle, each a third of a turn behind the last.
   A puff widens and fades as it climbs and leans downwind with height, which
   is wind shear and is why a real plume bends. */
const PLUME_N = 14, PLUME_MS = 5600;
function drawPlume(g, phase, now){
  /* The vent, not the apex. VOLC.top is where a pointed cone of this profile
     would come to a point, and the summit is truncated well below it — using
     it here drew the smoke, the lava and the runnel glow in clear sky above
     the mountain, with the glow reading as two arcs bridging the summit. */
  const px = VOLC.x, rimY = Math.round(VOLC.base - volcHeight(0));
  const night = phase === 'night';

  /* The crater. At night it is the only warm light in the scene, so it
     carries a slow pulse; by day it is mostly washed out and reads as heat
     rather than as fire. */
  const pulse = .72 + .28*Math.sin(now/1450) + .08*Math.sin(now/430);
  const glow = night ? .95 : phase === 'day' ? .34 : .62;
  const cw = Math.round(VOLC.half*CRATER_T);
  /* The haze over the vent stays inside the notch. Spread wide enough to
     stand against the sky it read as a pale arch bridging the summit. */
  g.fillStyle = 'rgba(226,104,44,' + (0.16*glow*pulse).toFixed(3) + ')';
  g.beginPath(); g.ellipse(px, rimY + 4, cw + 1, 5, 0, 0, 7); g.fill();
  /* The lava lies on the crater floor, which means asking the profile where
     the floor is rather than inventing a second curve for it — the first
     version bowed the pool the wrong way and put the deepest lava against
     the lips, which drew an orange arch over the notch. */
  for (let i=-cw+2;i<=cw-2;i++){
    const t = Math.abs(i)/cw;
    const y = Math.round(VOLC.base - volcHeight(Math.abs(i)/VOLC.half));
    g.fillStyle = 'rgba(206,66,28,' + (0.92*glow).toFixed(3) + ')';
    g.fillRect(px+i, y, 1, 2);
    if (t < .66){
      g.fillStyle = 'rgba(240,150,54,' + (0.92*glow*pulse).toFixed(3) + ')';
      g.fillRect(px+i, y, 1, 1);
    }
    if (t < .30){
      g.fillStyle = 'rgba(252,226,150,' + (0.88*glow*pulse).toFixed(3) + ')';
      g.fillRect(px+i, y, 1, 1);
    }
  }

  // the runnels, lit from inside the mountain
  /* The upper reach of each channel, lit from inside the mountain. Barely
     there by day; at night it is the only other warm thing in the frame. */
  g.fillStyle = 'rgba(200,74,30,' + ((night ? .70 : .30)*glow*pulse).toFixed(3) + ')';
  const lipY = Math.round(VOLC.base - volcHeight(CRATER_T));
  for (const dir of [-1, 1]){
    const seat = dir < 0 ? 0.40 : 0.52;
    for (let k=0;k<12;k++){
      const y = lipY + 2 + k;
      const rx = px + dir * volcSpan(y) * (seat + 0.05*Math.sin(k*.22));
      g.fillRect(Math.round(rx), y, 1, 1);
    }
  }

  // the column
  for (let i=0;i<PLUME_N;i++){
    const u = ((now/PLUME_MS + i/PLUME_N) % 1);
    const y = rimY + 1 - u * (rimY + 3);                  // vent to the top of the sky
    const r = 3 + u*u*13;
    const drift = u*u*22 + Math.sin(now/2200 + i)*2.5;    // leaning downwind as it climbs
    /* Fourteen thin puffs rather than eight fat ones. At eight the alpha had
       to be high enough that each ellipse showed its own rim, and a column of
       visible rims is a string of bubbles, not smoke. */
    const a = (1 - u) * (night ? .20 : .30);
    if (a <= .02) continue;
    // by night smoke is a dark body against the sky, lit warm only at the vent
    const col = night ? (u < .22 ? 'rgba(150,104,78,' : 'rgba(28,34,56,')
                      : 'rgba(206,200,196,';
    g.fillStyle = col + a.toFixed(3) + ')';
    g.beginPath(); g.ellipse(px + drift, y, r, r*.78, 0, 0, 7); g.fill();
    if (u < .35 && !night){                                // hot, dark core at the vent
      g.fillStyle = 'rgba(96,80,72,' + (a*.8).toFixed(3) + ')';
      g.beginPath(); g.ellipse(px + drift*.6, y + 1, r*.55, r*.45, 0, 0, 7); g.fill();
    }
  }

  // embers, only when they would be visible
  if (night || phase === 'dusk'){
    for (let i=0;i<5;i++){
      const u = ((now/2600 + i*.2) % 1);
      const y = rimY + 1 - u*26;
      const x = px + Math.sin(now/700 + i*2.1) * (2 + u*7) + u*u*6;
      g.fillStyle = 'rgba(246,164,72,' + ((1-u)*.85).toFixed(3) + ')';
      g.fillRect(x|0, y|0, 1, 1);
    }
  }
}

/* A live rank of grass along the ground line, leaning on a slow breeze. The
   baked backdrop cannot move, so the boundary the animal stands on was the
   one hard line in the scene that never did anything. */
const BLADES = Array.from({length:34}, (_, i) => ({
  x: 3 + i*6.6 + (i%3)*1.7, h: 4 + (i%4)*2, p: (i*1.7) % 6.3
}));
function drawGrassLine(g, phase, now){
  const S_ = SKY_SPECS[phase];
  const col = mixHex(S_.grass, '#000000', .20), lit = mixHex(S_.grass, S_.low, .34);
  for (const b of BLADES){
    const lean = Math.sin(now/1600 + b.p) * 1.6 + Math.sin(now/430 + b.p*2) * .4;
    const x = b.x | 0;
    for (let k=0;k<b.h;k++){
      const t = k/b.h;
      g.fillStyle = k === b.h-1 ? lit : col;
      g.fillRect(Math.round(x + lean*t*t), GROUND - 1 - k, 1, 1);
    }
  }
}

function drawMotes(g, dt, phase){
  g.fillStyle = phase === 'night' ? 'rgba(190,205,235,.30)' : 'rgba(255,248,208,.45)';
  for (const m of MOTES){
    m.x += m.vx * dt/1000; m.y += Math.sin(m.p + performance.now()/1400) * .08;
    if (m.x > W+2) m.x = -2;
    g.fillRect(m.x|0, m.y|0, 1, 1);
  }
}
function drawWater(g, phase, now){
  const S_ = SKY_SPECS[phase];
  g.fillStyle = mixHex(S_.water, S_.low, .55);
  for (let i=0;i<4;i++){
    const y = GROUND + 10 + i*2;
    const span = Math.sin(((y - GROUND - 8)/11)) ;
    const half = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((y-GROUND-8)/12, 2))) * 30);
    if (half < 4) continue;
    const w = Math.round(6 + Math.abs(Math.sin(now/760 + i*1.7)) * (half - 4));
    const cx = 177 + Math.round(Math.sin(now/1100 + i*2.2) * (half - w) * .5);
    g.fillRect(cx - (w>>1), y, w, 1);
  }
}

/* ---------------------- foreground, drawn over the animal ------------------ */
const FRONDS = [ {x:-3, s:1.15, p:0, dir:1}, {x:W+3, s:1.0, p:2.4, dir:-1} ];
function drawFronds(g, phase, now){
  const S_ = SKY_SPECS[phase];
  const dark = mixHex(S_.tree,'#000000',.40), body = S_.tree, lit = mixHex(S_.tree,S_.low,.32);
  for (const f of FRONDS){
    for (let a=0;a<4;a++){
      const ang = 0.44 + a*0.36 + Math.sin(now/1300 + f.p + a*.7) * 0.05;
      const len = (44 - a*5) * f.s;
      const bx = f.x, by = H + 3;
      for (let t=1;t<=13;t++){
        const u = t/13;
        const x = Math.round(bx + f.dir * Math.cos(ang) * len * u);
        const y = Math.round(by - Math.sin(ang) * len * u + u*u*5);
        const lf = Math.max(1, Math.round(lerp(7, 1.5, u) * f.s));
        g.fillStyle = (t & 1) ? body : dark;
        g.fillRect(x - 1, y - lf, 2, lf*2);                  // leaflets across the spine
        g.fillStyle = dark; g.fillRect(x - 1, y - 1, 2, 2);  // spine
        if (t < 5){ g.fillStyle = lit; g.fillRect(x - 1, y - lf, 2, 2); }
      }
    }
  }
}

/* ------------------------------ particles --------------------------------- */
let parts = [];
function emit(type, x, y, n, opt){
  opt = opt || {};
  for (let i=0;i<n;i++) parts.push({
    type, x: x + rnd(-4,4), y: y + rnd(-3,3),
    vx: opt.vx !== undefined ? rnd(-opt.vx,opt.vx) : rnd(-9,9),
    vy: opt.vy !== undefined ? opt.vy + rnd(-6,6) : rnd(-26,-10),
    g: opt.g || 0, life: opt.life || rnd(700,1200), age: 0, col: opt.col
  });
}
function stepParts(dt){
  for (const p of parts){ p.age += dt; p.vy += p.g*dt/1000; p.x += p.vx*dt/1000; p.y += p.vy*dt/1000; }
  parts = parts.filter(p => p.age < p.life);
}
/* Seven across rather than five, with a rim and a highlight. The old one was
   a 5x5 blob that vanished against the animal. */
function heartPx(g,x,y){
  g.fillStyle = '#8f2f46';
  g.fillRect(x+1,y-1,2,1); g.fillRect(x+4,y-1,2,1);
  g.fillRect(x,y,7,3); g.fillRect(x+1,y+3,5,1); g.fillRect(x+2,y+4,3,1); g.fillRect(x+3,y+5,1,1);
  g.fillStyle = '#e2697c';
  g.fillRect(x+1,y,5,2); g.fillRect(x+2,y+2,3,1); g.fillRect(x+3,y+3,1,1);
  g.fillStyle = '#f6b3c0';
  g.fillRect(x+1,y,2,1); g.fillRect(x+1,y+1,1,1);
}
function drawParts(g){
  for (const p of parts){
    const x = Math.round(p.x), y = Math.round(p.y), fade = p.age/p.life;
    if (p.type==='heart'){ heartPx(g,x,y); }
    else if (p.type==='spark'){ g.fillStyle = p.col||'#fff6d8'; g.fillRect(x,y,2,2); g.fillStyle='#ffffff'; g.fillRect(x,y,1,1); }
    else if (p.type==='crumb'){ g.fillStyle = p.col||'#9b7a52'; g.fillRect(x,y,1,1); }
    else if (p.type==='bubbleZ'){                       // an actual Z, not two squares
      g.fillStyle = fade < .6 ? '#dfe4f6' : '#9aa6c4';
      g.fillRect(x,y,5,1); g.fillRect(x+3,y+1,1,1); g.fillRect(x+2,y+2,1,1);
      g.fillRect(x+1,y+3,1,1); g.fillRect(x,y+4,5,1);
    }
    else if (p.type==='stink'){ g.fillStyle = fade<.5?'#7d9c5a':'#5d7a44'; g.fillRect(x,y,2,2); }
    else if (p.type==='note'){ g.fillStyle='#e8dcbf'; g.fillRect(x,y,2,4); g.fillRect(x+2,y-1,2,2); }
  }
}

/* --------------------------- props: food & mess ---------------------------- */
/* `flat` paints every part of the item in one colour. Stamped four times a
   pixel out in each direction under the real thing, that gives a food item
   the same hard outline every animal in this game has — which is what a green
   fern frond needs before it can be picked out against a green grass line.
   A bounding rectangle will not do it: it comes out as a black plaque. */
function drawItem(g, id, x, y, s, flat){
  s = s || 1; g.save(); g.translate(x,y); g.scale(s,s);
  const px = (c,a,b,w,h)=>{ g.fillStyle=flat||c; g.fillRect(a,b,w||1,h||1); };
  if (id==='berry'){ px('#4e7a4a',2,-2,1,2); px('#8f2b36',0,0,5,4); px('#b83b45',0,0,4,3); px('#e08a92',1,1,1,1); }
  if (id==='fish'){ px('#5b7c90',0,0,6,3); px('#7fa3b8',0,0,6,2); px('#c9dde6',1,1,2,1); px('#5b7c90',6,0,2,3); px('#1a140e',1,0,1,1); }
  if (id==='fern'){ px('#3f6440',2,0,1,5); for(let i=0;i<3;i++){ px('#6f9c55',1,1+i,1,1); px('#8fb763',3,1+i,1,1);} px('#8fb763',0,2,1,1); px('#6f9c55',4,2,1,1); }
  if (id==='cycad'){ px('#5a4a2a',2,3,2,2); px('#8a6b2c',1,0,4,4); px('#a8863c',1,0,3,3); px('#d0ae5c',2,1,1,1); }
  if (id==='meat'){ px('#82382a',0,0,5,4); px('#a04a34',0,0,5,3); px('#c46a4c',1,1,2,1); px('#efe9d8',5,2,2,2); }
  if (id==='cake'){ px('#b8823f',0,1,6,4); px('#d1a05e',0,1,6,3); px('#f0dcae',0,0,6,1); px('#b83b45',2,-1,2,2); }
  if (id==='rock'){ px('#6e6a5e',0,0,6,4); px('#8b8578',0,0,5,3); px('#a8a294',3,0,2,1); }
  g.restore();
}
function drawMess(g, x, y){
  g.fillStyle='#513218'; g.fillRect(x-3,y-2,7,3);
  g.fillStyle='#6b4322'; g.fillRect(x-3,y-2,6,2); g.fillRect(x-2,y-4,5,2); g.fillRect(x-1,y-6,3,2);
  g.fillStyle='#8a5c33'; g.fillRect(x-1,y-5,2,1); g.fillRect(x-2,y-2,2,1);
}
