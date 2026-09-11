/* ==========================================================================
   WORLD
   The habitat is built the same way as the animals: flat colour blocked into
   integer columns, dithered gradients instead of smooth ones, one light from
   the upper left, and depth carried by parallax rather than by blur.
   ========================================================================== */

function skyPhase(d){
  const h = d.getHours() + d.getMinutes()/60;
  if (h < 5 || h >= 21) return 'night';
  if (h < 7.5) return 'dawn';
  if (h < 18)  return 'day';
  return 'dusk';
}
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
/* Deterministic value noise in [0,1). Every attempt in this file at making a
   surface look broken by thresholding a sine has come out as a barcode: the
   volcano's gullies, the cliff's joints and the glacier's crevasses were all
   evenly spaced stripes, because a sine over a threshold is periodic and the
   eye reads periodic as manufactured. Anything that is supposed to look
   fractured picks its positions from here instead. */
function hash1(x){ const v = Math.sin(x*127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
const mixHex = (a,b,t) => {
  const A = [1,3,5].map(i=>parseInt(a.slice(i,i+2),16)), B = [1,3,5].map(i=>parseInt(b.slice(i,i+2),16));
  return '#' + A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join('');
};

/* ------------------------------- habitats ---------------------------------
   Five places to keep an animal, bought in the shop and shared by every
   animal in the nest — a habitat is the enclosure, not the pet.

   A biome supplies four things and inherits everything else:

     sky     the two sky colours per phase, because the sky is half the
             screen and is the one thing that cannot be derived
     ground  the DAY colours of the six ground materials. Dawn, dusk and
             night are mixed from those by PHASE_MIX below.
     tint    the wash laid over the finished frame
     three painters — landmark, treeline and floor — run inside the shared
             bake between the shared ridges and the shared grass line, plus
             an optional `live` for anything that has to move

   Writing four phases by hand for five biomes is a hundred and eighty hex
   values that all have to agree with each other, and they would not. Mixing
   the day palette toward one colour per phase reproduces the hand-tuned
   valley palette this game shipped with to within a couple of values, which
   is the check that the rule is the same one the eye was already applying.
   -------------------------------------------------------------------------- */
const PHASE_MIX = {
  day:   { to:'#0b1122', k:0    },
  dawn:  { to:'#2a2440', k:0.26 },
  dusk:  { to:'#2b2038', k:0.30 },
  night: { to:'#0b1122', k:0.66 }
};
const GROUND_KEYS = ['far','mid','tree','grass','dirt','water'];

/* A habitat is its palette from BIOME_ART merged with its painters. The
   palette is data the editor writes; the painters are code it cannot. */
const BIOME_PAINT = {
  valley: {
landmark: drawVolcano, treeline: valleyTrees, floor: valleyFloor, live: drawPlume
  },
  lagoon: {
landmark: drawSeaStacks, treeline: lagoonTrees, floor: lagoonFloor, live: drawSurf,
    // a low bar of dune rather than a hill, so the water is not hidden
    nearRidge:{ base:127, col:'#c2b083', lit:'#dccca3', waves:[[.052,1.4,4],[.13,.6,2]] }
  },
  ashfall: {
landmark: drawAshVolcano, treeline: ashTrees, floor: ashFloor, live: drawAshfall
  },
  gorge: {
landmark: drawFalls, treeline: gorgeTrees, floor: gorgeFloor, live: drawFallsSpray,
    /* The wall is the near side of the gorge, not something behind the hills:
       painted before the near ridge, the fall disappeared behind it half way
       down and its spray was drawn over the treeline in front. */
    landmarkFront: true
  },
  boreal: {
landmark: drawGlacier, treeline: borealTrees, floor: borealFloor, live: drawAurora
  },
};
const BIOMES = {};
for (const k in BIOME_ART) BIOMES[k] = Object.assign({}, BIOME_ART[k], BIOME_PAINT[k]);
const BIOME_IDS = Object.keys(BIOMES);
/* Whose view this is. Defaults to the animal on screen, but takes a pet so the
   nest and the shop can ask about one that is not the active one. */
const biomeId = (pet = S) => (pet && BIOMES[pet.biome] ? pet.biome : 'valley');

/* The nine-colour palette a painter works from, built once per biome and
   phase and then cached. Everything that used to read SKY_SPECS[phase] reads
   skyOf(phase) instead. */
const skyCache = new Map();
function skySpec(bid, phase){
  const key = bid + '|' + phase;
  if (skyCache.has(key)) return skyCache.get(key);
  const B = BIOMES[bid] || BIOMES.valley, m = PHASE_MIX[phase];
  const out = { top: B.sky[phase][0], low: B.sky[phase][1], tint: B.tint[phase] };
  for (const k of GROUND_KEYS) out[k] = m.k ? mixHex(B.ground[k], m.to, m.k) : B.ground[k];
  skyCache.set(key, out);
  return out;
}
const skyOf = phase => skySpec(biomeId(), phase);

const STARS = Array.from({length:54}, () => ({x:rnd(2,W-2), y:rnd(3,92), p:rnd(0,6.3), b:rnd(.4,1)}));
const MOTES = Array.from({length:14}, () => ({x:rnd(0,W), y:rnd(40,GROUND-6), vx:rnd(2,7), vy:rnd(-3,3), p:rnd(0,6.3)}));

/* --------------------------- baked backdrop -------------------------------- */
const bgCache = new Map();
function ridge(g, cfg){
  // integer-column heightfield: no antialiasing, so the silhouette stays crisp.
  // Runs the width of the world rather than the width of the screen — it is a
  // function of x, so the hills either side of the old picture are the same
  // hills carried on.
  for (let x=BG_L;x<BG_R;x++){
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

/* ---------------------- extra scenery primitives --------------------------
   The shared kit — ridge, conifer, araucaria, treeFern, boulder, fallenLog,
   cycadPlant, reeds — covers the valley. These are what the other four
   habitats need on top of it.
   -------------------------------------------------------------------------- */

/* A standing dead trunk: bark gone, a couple of broken limbs, no crown. Half
   the reason the ash flats read as a place something happened. */
function snag(g, x, base, h, col, lit){
  g.fillStyle = col;
  for (let r=0;r<h;r++){
    const lean = Math.round(Math.sin(r*.14 + x)*1.1);
    g.fillRect(x + lean, base - r, 2, 1);
    if (r === h-1) g.fillRect(x + lean, base - r - 1, 1, 1);
  }
  g.fillStyle = lit; g.fillRect(x, base - h + 1, 1, Math.round(h*.5));
  // two broken limbs, at different heights and lengths
  const a = Math.round(h*.62), b = Math.round(h*.34);
  g.fillStyle = col;
  for (let i=0;i<Math.round(h*.30);i++) g.fillRect(x - 1 - i, base - a - Math.round(i*.7), 1, 1);
  for (let i=0;i<Math.round(h*.20);i++) g.fillRect(x + 2 + i, base - b - Math.round(i*.5), 1, 1);
}

/* A cycadeoid: a stout barrel trunk with a crown of stiff fronds. Reads as
   tropical without being a coconut palm, which is eighty million years early. */
function palmoid(g, x, base, h, col, lit, shd){
  const trunk = Math.round(h*.60);
  g.fillStyle = shd; g.fillRect(x-1, base - trunk, 4, trunk);
  g.fillStyle = col; g.fillRect(x, base - trunk, 2, trunk);
  for (let r=2;r<trunk;r+=3){ g.fillStyle = shd; g.fillRect(x-1, base - r, 4, 1); }
  const crown = base - trunk;
  for (let a=0;a<7;a++){
    const ang = .12 + a*.50, len = h*(.50 - Math.abs(a-3)*.04);
    const dir = a < 3 ? -1 : a > 3 ? 1 : 0;
    for (let t=1;t<=8;t++){
      const u = t/8;
      const px = Math.round(x + dir*Math.cos(ang)*len*u);
      const py = Math.round(crown - Math.sin(ang)*len*u + u*u*4);
      g.fillStyle = (t & 1) ? col : shd;
      g.fillRect(px, py - 1, 2, 2);
      if (t < 3){ g.fillStyle = lit; g.fillRect(px, py - 1, 2, 1); }
    }
  }
}

/* A snow-capped spire conifer. The cap is what makes a dark triangle read as
   a tree in winter rather than as a hole in the snow. */
function spireConifer(g, x, base, h, body, lit, snow){
  g.fillStyle = '#2a2620';
  g.fillRect(x, base - Math.round(h*.14), 2, Math.round(h*.14));
  for (let r=0;r<h;r++){
    const u = r/h;                                   // 0 at the top
    const wd = Math.max(1, Math.round(h*.34 * Math.pow(u, .78)));
    const y = base - h + r;
    g.fillStyle = body; g.fillRect(x + 1 - (wd>>1), y, wd, 1);
    if (u < .30){ g.fillStyle = snow; g.fillRect(x + 1 - (wd>>1), y, Math.max(1, wd-1), 1); }
    else if (r % 4 === 1){ g.fillStyle = snow; g.fillRect(x + 1 - (wd>>1), y, Math.max(1, wd>>1), 1); }
    else if (r % 4 === 2){ g.fillStyle = lit;  g.fillRect(x + 1 - (wd>>1), y, 1, 1); }
  }
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
    if (hash1(Math.floor(i/3)*2.3) > .74){
      g.fillStyle = lit ? mixHex(S_.far, S_.low, .34) : mixHex(S_.far, '#000000', .52);
      g.fillRect(px+i, y+3, 1, Math.round((base - y) * (.28 + hash1(Math.floor(i/3)*5.9)*.34)));
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
/* ------------------------------- landmarks --------------------------------
   One per habitat, baked behind the near ridge. A landmark is what makes a
   place a place: without one, five palettes over the same three hills are the
   same picture five times.
   -------------------------------------------------------------------------- */

/* Ash flats: the same mountain, closer and in the middle of doing it. The
   cone is drawn by the valley's own painter at a different seat, because the
   two habitats are the same valley on either side of one afternoon. */
function drawAshVolcano(g, S_){
  const keep = VOLC.x;
  VOLC.x = 120;                                  // it has moved to the middle of the view
  drawVolcano(g, S_);
  VOLC.x = keep;
  // fresh flows, still warm, running out across the flats
  for (const dir of [-1, 1]){
    for (let k=0;k<26;k++){
      const y = GROUND - 34 + k;
      const rx = 120 + dir * (volcSpan(y) * .62 + k*1.4);
      g.fillStyle = mixHex('#5a2a1a', S_.low, .10);
      g.fillRect(Math.round(rx), y, 2, 1);
    }
  }
}

/* Salt lagoon: sea stacks standing off a headland, and the sea itself, which
   is the horizon rather than a pool in the ground. */
function drawSeaStacks(g, S_){
  const sea = mixHex(S_.water, S_.low, .40), seaNear = S_.water;
  const seaLit = mixHex(S_.water, '#ffffff', .40);
  const rock = mixHex(S_.far, '#000000', .30), rockLit = mixHex(S_.far, S_.low, .26);
  const rockShd = mixHex(S_.far, '#000000', .50);
  const HZ = 96, SHORE = GROUND + 2;
  /* Open water from the horizon down to the shore, banded so it recedes: the
     far water takes the haze colour and the near water does not. */
  for (let y=HZ;y<SHORE;y++){
    const t = (y - HZ) / (SHORE - HZ);
    g.fillStyle = mixHex(sea, seaNear, t);
    g.fillRect(BG_L, y, BG_SPAN, 1);
    if ((y % 3) === 0){                                   // catch light on the swell
      g.fillStyle = seaLit;
      for (let x=BG_L+(y*13)%9; x<BG_R; x+=9 + (y%5)) g.fillRect(x, y, 2 + (y%3), 1);
    }
  }
  /* The stacks stand IN the water, so they are based on the waterline at the
     distance they sit, not on the ground line — based at the shore they were
     forty pixels tall behind a hill and none of them showed. Undercut at the
     base, because that is what the sea does to a stack. */
  for (const st of [[40,34,9,108],[62,22,6,102],[176,29,8,112]]){
    const [px, h, hw, foot] = st;
    for (let i=-hw;i<=hw;i++){
      const t = Math.abs(i)/hw;
      const top = foot - Math.round(h * (1 - Math.pow(t, 3.4)));
      const cut = Math.round((1 - t) * 2);                // the notch at the waterline
      g.fillStyle = i < 0 ? rock : rockShd;
      g.fillRect(px+i, top, 1, foot - top - cut);
      g.fillStyle = i < 0 ? rockLit : rock;
      g.fillRect(px+i, top, 1, 1);
    }
    g.fillStyle = seaLit;                                 // wash around the foot
    g.fillRect(px-hw-2, foot-1, hw*2+5, 1);
  }
}

/* Fern gorge: a cliff wall closing the view, with a fall coming off the lip
   into a pool. Vertical is the whole point — every other habitat here is
   horizontal bands, and a wall of rock is what makes this one a gorge. */
const FALLS = { x:150, top:24, w:20, pool: GROUND - 6 };
function drawFalls(g, S_){
  /* Keyed off the MIDDLE plane, not the far one. Taken a third of the way to
     black from the haze colour the wall came out nearly black, which at this
     size is a hole in the picture rather than rock. */
  const rock = mixHex(S_.mid, '#000000', .10), rockLit = mixHex(S_.mid, S_.low, .40);
  const rockShd = mixHex(S_.mid, '#000000', .40);
  const wet = mixHex(S_.water, '#ffffff', .34);
  /* The wall: a broken face running in from the right edge to the fall. The
     first version banded it on a fixed period, which came out as courses of
     masonry — a cliff is bedded, but the beds are uneven and they are broken
     by joints running down through them. */
  for (let x=100;x<BG_R;x++){
    const u = clamp((x - 100) / 40, 0, 1);
    const top = Math.round(84 - u*58 + hash1(x*.9)*3 + Math.sin(x*.061)*4);
    /* A joint is a short break in a few beds, not a stripe from the sky to
       the floor. Both its position and its extent come off the hash, or the
       wall comes out as courses of masonry with pilasters on it. */
    const jb = Math.floor(x/3);
    const joint = hash1(jb*1.7) > .80;
    const jTop = top + 4 + Math.round(hash1(jb*3.3) * (GROUND - top) * .45);
    const jLen = 6 + Math.round(hash1(jb*5.1) * (GROUND - top) * .40);
    for (let y=top;y<GROUND+2;y++){
      const bed = ((y*2 + Math.round(Math.sin(x*.08)*5) + Math.round(hash1(y*.7)*6)) % 19);
      const inJoint = joint && y > jTop && y < jTop + jLen;
      g.fillStyle = inJoint ? rockShd
                  : bed < 3 ? mixHex(rock, rockShd, .40)
                  : (x < 124 ? rock : mixHex(rock, rockShd, .16));
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = rockLit; g.fillRect(x, top, 1, 2);
    if (hash1(Math.floor(x/5)*2.9) > .72){                     // moss on a wet ledge
      g.fillStyle = mixHex(rock, S_.tree, .45);
      g.fillRect(x, top + 3 + Math.round(hash1(Math.floor(x/5)*7.7)*(GROUND-top)*.8), 1, 2);
    }
  }
  // the notch the water has cut, and the fall standing in it
  const half = FALLS.w/2;
  for (let i=-half;i<=half;i++){
    const t = Math.abs(i)/half;
    const x = Math.round(FALLS.x + i);
    g.fillStyle = rockShd; g.fillRect(x, FALLS.top, 1, FALLS.pool - FALLS.top);
    if (t < .74){
      g.fillStyle = mixHex(S_.water, S_.low, .34);
      g.fillRect(x, FALLS.top + 2, 1, FALLS.pool - FALLS.top - 2);
      if (t < .42){ g.fillStyle = wet; g.fillRect(x, FALLS.top + 2, 1, FALLS.pool - FALLS.top - 2); }
    }
  }
  // the plunge pool it lands in
  for (let x=FALLS.x-26;x<FALLS.x+26;x++){
    const t = Math.abs(x - FALLS.x)/26;
    const dep = Math.round((1 - t*t) * 8);
    if (dep < 1) continue;
    g.fillStyle = mixHex(S_.water, '#000000', .34); g.fillRect(x, FALLS.pool, 1, dep);
    g.fillStyle = S_.water; g.fillRect(x, FALLS.pool, 1, Math.max(1, dep-2));
    g.fillStyle = wet; g.fillRect(x, FALLS.pool, 1, 1);
  }
}

/* Polar dawn: a glacier tongue coming down out of the range. Ice is not white
   — it is white on top and blue underneath, and the blue is what says ice
   rather than snow. */
function drawGlacier(g, S_){
  /* An ice FRONT, not an ice mountain. The first attempt built a pointed cone
     with evenly spaced crevasses down it, which came out as a striped tent.
     What reads as a glacier at this size is the thing a glacier actually
     presents to you: a long wall of ice with a broken top, a face split into
     seracs, and blue in every shadow — ice is white on top and blue inside,
     and the blue is the whole difference between ice and snow. */
  const ice     = mixHex('#c6dcea', S_.low, .30);
  const iceLit  = mixHex('#f4fafd', S_.low, .18);
  const iceShd  = mixHex('#7ba7c6', S_.low, .18);
  const iceDeep = mixHex('#3f7ba6', S_.low, .12);
  const x0 = 86, foot = 106;
  for (let x=x0;x<BG_R;x++){
    const u = (x - x0) / (W - x0);
    // a broken top edge: two long waves and a short one, so no two seracs match
    const top = Math.round(74 - u*16
                + Math.sin(x*.055 + 1.3)*3.4
                + Math.sin(x*.019)*2.6
                + hash1(x*.53)*3.5);
    // which serac this column belongs to, and whether it is a lit or shaded face
    /* Seracs and crevasses are blocks, not columns. Sampled per pixel the
       hash gives a different answer every column, and a one-pixel feature
       repeated a hundred and forty times is hatching — the same barcode with
       the spacing randomised. Quantising x is what makes them features. */
    const serac = hash1(Math.floor(x/7)*3.1);
    g.fillStyle = serac > .55 ? iceShd : ice;
    g.fillRect(x, top, 1, foot - top + 2);
    g.fillStyle = iceLit; g.fillRect(x, top, 1, 2);        // sun on the upper surface
    /* A crevasse opens somewhere down the face and closes again; run from a
       fixed depth on a fixed period they were a row of blue bars, and the
       whole front read as a barcode. */
    const cb = Math.floor(x/4);
    if (hash1(cb*7.3) > .74){
      const cTop = top + 3 + Math.round(hash1(cb*4.7) * (foot - top) * .30);
      g.fillStyle = iceDeep;
      g.fillRect(x, cTop, 1, 4 + Math.round(hash1(cb*6.3) * (foot - top) * .45));
    }
  }
  // the calving face at the foot: undercut, and bluest where it meets the moraine
  g.fillStyle = iceDeep; g.fillRect(x0, foot, BG_R - x0, 3);
  g.fillStyle = iceShd;  g.fillRect(x0, foot + 3, BG_R - x0, 1);
  /* No rock shoulder. A dark block butted against the left end of the ice
     read as a chimney standing in a snowfield; the front running out of the
     haze on its own is what a glacier looks like from a valley floor. */
}

/* -------------------------- treelines and floors --------------------------
   A treeline sits on the middle plane behind the animal; a floor is the band
   the animal stands on and everything scattered across it. The grass edge and
   the dithered dirt under it are shared, because every habitat needs a ground
   line in the same place — what differs is what is growing out of it.
   -------------------------------------------------------------------------- */

function valleyTrees(g, S_){
  /* Eight identical conifers in two clumps was a hedge; a Late Cretaceous
     skyline has araucaria with domed crowns on bare trunks and tree ferns
     under them, and three silhouettes instead of one is most of what turns a
     hedge into a wood. */
  const body = mixHex(S_.tree, S_.low, .18), lit = mixHex(S_.tree, S_.low, .38);
  const farBody = mixHex(S_.tree, S_.low, .32), farLit = mixHex(S_.tree, S_.low, .46);
  [[-18,13],[52,15],[62,11],[150,13],[162,17],[172,12],[100,10],[238,14]]
    .forEach(t => conifer(g, t[0], GROUND-4, t[1], farBody, farLit));   // back rank, hazed
  [[-24,21],[-9,25],[14,26],[26,19],[38,23],[196,24],[208,17],[184,20],[120,15],[132,21],[231,18],[246,23]]
    .forEach(t => conifer(g, t[0], GROUND-2, t[1], body, lit));
  [[-16,23],[8,26],[46,21],[142,23],[216,19],[240,25]]
    .forEach(t => araucaria(g, t[0], GROUND-2, t[1], body, lit));
  [[-4,11],[33,12],[128,10],[203,11],[70,9],[227,10],[250,12]]
    .forEach(t => treeFern(g, t[0], GROUND-1, t[1], body, lit));
}
function valleyFloor(g, S_){
  const rockCol = mixHex(S_.mid,'#000000',.12), rockLit = mixHex(S_.mid, S_.low,.42),
        rockShd = mixHex(S_.mid,'#000000',.38);
  boulder(g, 68, GROUND+2, 17, 10, rockCol, rockLit, rockShd);
  boulder(g, 78, GROUND+2, 9, 6, rockCol, rockLit, rockShd);
  boulder(g, 133, GROUND+1, 12, 7, rockCol, rockLit, rockShd);
  boulder(g, -15, GROUND+2, 13, 8, rockCol, rockLit, rockShd);
  boulder(g, 243, GROUND+1, 10, 6, rockCol, rockLit, rockShd);
  const logCol = mixHex(S_.dirt,'#000000',.18), logLit = mixHex(S_.dirt, S_.low,.34),
        logShd = mixHex(S_.dirt,'#000000',.44);
  fallenLog(g, 92, GROUND+2, 34, logCol, logLit, logShd);
  const plCol = mixHex(S_.tree, S_.low, .22), plLit = mixHex(S_.tree, S_.low, .5),
        plShd = mixHex(S_.tree,'#000000',.35);
  cycadPlant(g, 32, GROUND+2, 22, plCol, plLit, plShd);
  cycadPlant(g, 116, GROUND+1, 15, plCol, plLit, plShd);
  cycadPlant(g, 190, GROUND+3, 19, plCol, plLit, plShd);
  cycadPlant(g, -6, GROUND+3, 20, plCol, plLit, plShd);
  cycadPlant(g, 232, GROUND+2, 17, plCol, plLit, plShd);
  waterHole(g, S_, 142, 212, 11);
  reeds(g, 138, GROUND+8, 5, plShd, plLit);
  reeds(g, 205, GROUND+8, 4, plShd, plLit);
}

function lagoonTrees(g, S_){
  const body = mixHex(S_.tree, S_.low, .16), lit = mixHex(S_.tree, S_.low, .40),
        shd = mixHex(S_.tree,'#000000',.30);
  [[-20,26],[-5,19],[16,30],[30,22],[196,27],[210,20],[92,18],[234,28],[248,21]]
    .forEach(t => palmoid(g, t[0], GROUND-2, t[1], body, lit, shd));
  [[-13,10],[46,11],[74,9],[168,12],[120,8],[241,11]]
    .forEach(t => treeFern(g, t[0], GROUND-1, t[1], body, lit));
}
function lagoonFloor(g, S_){
  // wet sand: a darker strip where the water has been, running the width
  g.fillStyle = mixHex(S_.dirt, S_.water, .30);
  for (let x=BG_L;x<BG_R;x++){
    const y = GROUND + 9 + Math.round(Math.sin(x*.045 + 1.2)*2.5 + Math.sin(x*.13)*1.2);
    g.fillRect(x, y, 1, BG_B - y);
  }
  const rockCol = mixHex(S_.mid,'#000000',.16), rockLit = mixHex(S_.mid, S_.low,.44),
        rockShd = mixHex(S_.mid,'#000000',.42);
  boulder(g, 58, GROUND+3, 13, 7, rockCol, rockLit, rockShd);
  boulder(g, 172, GROUND+2, 10, 5, rockCol, rockLit, rockShd);
  boulder(g, -17, GROUND+3, 12, 6, rockCol, rockLit, rockShd);
  boulder(g, 240, GROUND+2, 9, 5, rockCol, rockLit, rockShd);
  // driftwood, bleached
  const dw = mixHex(S_.dirt, '#ffffff', .30);
  fallenLog(g, 96, GROUND+4, 30, dw, mixHex(dw,'#ffffff',.3), mixHex(dw,'#000000',.35));
  // shells and weed along the strand line
  for (let i=0;i<22;i++){
    const x = (rnd(BG_L+4,BG_R-6))|0, y = (GROUND+5+rnd(0,10))|0;
    g.fillStyle = mixHex(S_.dirt,'#ffffff',.55); g.fillRect(x,y,2,1); g.fillRect(x,y-1,1,1);
  }
  for (let i=0;i<9;i++){
    const x = (rnd(BG_L+6,BG_R-8))|0, y = (GROUND+12+rnd(0,10))|0;
    g.fillStyle = mixHex(S_.tree,'#000000',.20); g.fillRect(x,y,4,1); g.fillRect(x+2,y+1,3,1);
  }
}

function ashTrees(g, S_){
  const col = mixHex(S_.tree, S_.low, .10), lit = mixHex(S_.tree, S_.low, .34);
  [[-22,21],[-9,13],[14,24],[27,15],[40,20],[62,12],[186,22],[199,14],[212,19],[92,16],[104,10],[160,13],[233,23],[246,15]]
    .forEach(t => snag(g, t[0], GROUND-2, t[1], col, lit));
}
function ashFloor(g, S_){
  // drifts of ash, banked where the wind put them
  const drift = mixHex(S_.dirt, '#ffffff', .22);
  for (let x=BG_L;x<BG_R;x++){
    const h = 2 + Math.round(2.4*Math.abs(Math.sin(x*.037 + .8)) + 1.6*Math.abs(Math.sin(x*.11)));
    g.fillStyle = drift; g.fillRect(x, GROUND+4, 1, h);
  }
  const rockCol = mixHex(S_.mid,'#000000',.20), rockLit = mixHex(S_.mid, S_.low,.30),
        rockShd = mixHex(S_.mid,'#000000',.46);
  boulder(g, 50, GROUND+2, 15, 9, rockCol, rockLit, rockShd);
  boulder(g, 148, GROUND+2, 11, 6, rockCol, rockLit, rockShd);
  boulder(g, 200, GROUND+1, 9, 5, rockCol, rockLit, rockShd);
  boulder(g, -13, GROUND+2, 14, 8, rockCol, rockLit, rockShd);
  boulder(g, 238, GROUND+3, 11, 6, rockCol, rockLit, rockShd);
  const logCol = mixHex(S_.dirt,'#000000',.42);
  fallenLog(g, 78, GROUND+3, 30, logCol, mixHex(logCol,S_.low,.20), mixHex(logCol,'#000000',.4));
  // half-buried bone, which is what an ash flat preserves
  g.fillStyle = mixHex('#efe6c8', S_.low, .24);
  g.fillRect(112, GROUND+16, 15, 2); g.fillRect(110, GROUND+15, 4, 4); g.fillRect(126, GROUND+15, 4, 4);
}

function gorgeTrees(g, S_){
  const body = mixHex(S_.tree, S_.low, .12), lit = mixHex(S_.tree, S_.low, .34);
  const farBody = mixHex(S_.tree, S_.low, .30), farLit = mixHex(S_.tree, S_.low, .44);
  [[-24,27],[-12,22],[10,30],[22,24],[34,28],[48,22],[62,26],[76,20]]
    .forEach(t => conifer(g, t[0], GROUND-3, t[1], farBody, farLit));
  [[-18,24],[6,25],[30,21],[58,23],[84,19]]
    .forEach(t => araucaria(g, t[0], GROUND-2, t[1], body, lit));
  [[-6,12],[18,14],[42,12],[68,13],[92,11],[100,9]]
    .forEach(t => treeFern(g, t[0], GROUND-1, t[1], body, lit));
}
function gorgeFloor(g, S_){
  const plCol = mixHex(S_.tree, S_.low, .20), plLit = mixHex(S_.tree, S_.low, .48),
        plShd = mixHex(S_.tree,'#000000',.32);
  const rockCol = mixHex(S_.mid,'#000000',.10), rockLit = mixHex(S_.tree, S_.low,.30),
        rockShd = mixHex(S_.mid,'#000000',.40);
  // mossy boulders: the lit face is moss, not stone
  boulder(g, 40, GROUND+3, 16, 9, rockCol, rockLit, rockShd);
  boulder(g, 60, GROUND+2, 10, 6, rockCol, rockLit, rockShd);
  boulder(g, 104, GROUND+4, 13, 7, rockCol, rockLit, rockShd);
  cycadPlant(g, 22, GROUND+3, 24, plCol, plLit, plShd);
  cycadPlant(g, 78, GROUND+2, 18, plCol, plLit, plShd);
  cycadPlant(g, 128, GROUND+4, 21, plCol, plLit, plShd);
  cycadPlant(g, -10, GROUND+3, 22, plCol, plLit, plShd);
  boulder(g, 242, GROUND+2, 12, 7, rockCol, rockLit, rockShd);
  // the stream running out of the plunge pool, along the front
  for (let x=BG_L;x<BG_R;x++){
    const y = GROUND + 14 + Math.round(Math.sin(x*.028 + 2.1)*3);
    g.fillStyle = mixHex(S_.water,'#000000',.28); g.fillRect(x, y, 1, BG_B - y);
    g.fillStyle = S_.water; g.fillRect(x, y, 1, Math.max(1, BG_B - y - 3));
    g.fillStyle = mixHex(S_.water,'#ffffff',.34); g.fillRect(x, y, 1, 1);
  }
  reeds(g, 12, GROUND+13, 6, plShd, plLit);
  reeds(g, 186, GROUND+13, 5, plShd, plLit);
}

function borealTrees(g, S_){
  const body = mixHex(S_.tree, S_.low, .14), lit = mixHex(S_.tree, S_.low, .34);
  const snow = mixHex('#eef4f8', S_.low, .22);
  const farBody = mixHex(S_.tree, S_.low, .40), farLit = mixHex(S_.tree, S_.low, .52);
  [[-16,13],[46,14],[58,11],[70,16],[196,13],[208,10],[236,15]]
    .forEach(t => spireConifer(g, t[0], GROUND-4, t[1], farBody, farLit, snow));
  [[-25,26],[-11,21],[10,30],[22,24],[34,28],[86,22],[100,26],[184,25],[214,21],[120,19],[229,27],[245,22]]
    .forEach(t => spireConifer(g, t[0], GROUND-2, t[1], body, lit, snow));
}
function borealFloor(g, S_){
  // wind-packed snow: drifts with a lit crest and a blue shadow behind each
  const lit = mixHex(S_.grass, '#ffffff', .45), shd = mixHex(S_.grass, '#4d86ad', .34);
  for (let x=BG_L;x<BG_R;x++){
    const h = 3 + Math.round(3.2*Math.abs(Math.sin(x*.031 + 1.7)) + 1.8*Math.abs(Math.sin(x*.094)));
    g.fillStyle = shd; g.fillRect(x, GROUND+4, 1, h + 2);
    g.fillStyle = lit; g.fillRect(x, GROUND+4, 1, 1);
  }
  const rockCol = mixHex(S_.mid,'#000000',.22), rockLit = mixHex(S_.mid, S_.low,.40),
        rockShd = mixHex(S_.mid,'#000000',.44);
  boulder(g, 56, GROUND+2, 15, 8, rockCol, rockLit, rockShd);
  boulder(g, 150, GROUND+3, 11, 6, rockCol, rockLit, rockShd);
  boulder(g, -14, GROUND+2, 13, 7, rockCol, rockLit, rockShd);
  boulder(g, 241, GROUND+3, 10, 5, rockCol, rockLit, rockShd);
  // caps of snow on top of them, which is the whole reason they read as cold
  g.fillStyle = lit;
  g.fillRect(50, GROUND-6, 13, 2); g.fillRect(146, GROUND-3, 9, 2);
  const logCol = mixHex(S_.dirt,'#000000',.34);
  fallenLog(g, 96, GROUND+4, 28, logCol, lit, mixHex(logCol,'#000000',.4));
  // meltwater, refrozen at the edges
  waterHole(g, S_, 168, 216, 8);
  g.fillStyle = mixHex('#dbeaf2', S_.low, .20);
  g.fillRect(168, GROUND+7, 48, 1); g.fillRect(172, GROUND+8, 8, 1); g.fillRect(200, GROUND+9, 10, 1);
}

/* The watering hole, cut into the dirt. Two habitats want one in different
   places and at different depths, so it is a function rather than a passage
   copied twice. */
function waterHole(g, S_, x0, x1, deep){
  for (let x=x0;x<x1;x++){
    const t = (x-x0)/(x1-x0), dep = Math.round(Math.sin(t*Math.PI)*deep);
    if (dep <= 1) continue;
    g.fillStyle = mixHex(S_.dirt,'#000000',.45); g.fillRect(x, GROUND+6, 1, 2);
    g.fillStyle = mixHex(S_.water,'#000000',.25); g.fillRect(x, GROUND+8, 1, dep);
    g.fillStyle = S_.water; g.fillRect(x, GROUND+8, 1, Math.max(1, dep-3));
    g.fillStyle = mixHex(S_.water,S_.low,.45); g.fillRect(x, GROUND+8, 1, 1);
  }
}

/* The shared bake.

   Sky, four depth planes, a river out on the valley floor, the grass edge and
   the dithered dirt band are the same everywhere — every habitat needs a
   horizon and a ground line, and having them in one place is what stops five
   backdrops drifting apart by two pixels each. What differs is the landmark
   standing behind the near ridge, what is growing on the middle plane, and
   what is scattered on the floor, and those are three functions on the biome.

   Cached per biome and phase, so a habitat is baked once and then costs
   nothing. */
function bakeBg(phase, bid){
  bid = bid || biomeId();
  const key = bid + '|' + phase;
  if (bgCache.has(key)) return bgCache.get(key);
  const B = BIOMES[bid] || BIOMES.valley;
  const S_ = skySpec(bid, phase), c = makeCv(BG_W, BG_H), g = readCtx(c);
  /* The one line that makes the world bigger. Everything below, and every
     literal coordinate in every painter this calls, goes on meaning what it
     always meant; the extra scenery is what now fits outside it. */
  g.translate(BG_PAD_X, BG_PAD_Y);
  const habitat = HABITAT_ART[bid] || HABITAT_ART.valley;
  const horizon = habitat.horizon;

  /* Dithered sky: five steps with a 4x4 ordered dither across each boundary.
     The gradient still runs from the top of the old picture, not from the top
     of the world — the extra rows above are more of the highest band, which is
     what more sky over the same landscape looks like. */
  for (let y=BG_T;y<horizon;y++){
    const f = (Math.max(0, y)/horizon) * 4, i = Math.floor(f), fr = f - i;
    const a = mixHex(S_.top, S_.low, clamp(i/4,0,1)), b = mixHex(S_.top, S_.low, clamp((i+1)/4,0,1));
    for (let x=BG_L;x<BG_R;x++){ g.fillStyle = (BAYER[y&3][x&3]/16 < fr) ? b : a; g.fillRect(x,y,1,1); }
  }
  g.fillStyle = S_.low; g.fillRect(BG_L, horizon, BG_SPAN, GROUND - horizon + 2);

  /* Four depth planes, each flatter and lighter than the one in front. The
     furthest is nearly the colour of the sky it stands against: without a
     plane that close to the haze, the range began abruptly at a hard edge and
     the distance behind it read as painted card. */
  for (const [offset,haze] of [[-8,.86],[0,.68],[10,.42]]){
    g.fillStyle = mixHex(S_.far,S_.low,haze);
    g.beginPath(); g.moveTo(BG_L,horizon);
    for (const [pointX,pointY] of habitat.skyline) g.lineTo(pointX,pointY+offset);
    g.lineTo(BG_R,GROUND); g.lineTo(BG_L,GROUND); g.closePath(); g.fill();
  }
  /* A river out on the valley floor, between the far range and the near one.
     One flat band of sky colour lying down is the cheapest depth cue there
     is: everything above it is read as far away because the water proves
     there is ground between here and there. It has to be painted before the
     landmark, or it runs straight across the landmark's flank. */
  if (bid !== 'lagoon'){
    const riv = mixHex(S_.water, S_.low, .62);
    for (let x=BG_L;x<BG_R;x++){
      const top = 92 + Math.round(Math.sin(x*.021 + 1.4)*2.5 + Math.sin(x*.055)*1.2);
      const dep = 3 + Math.round(Math.sin(x*.03 + 2.2)*1.4);
      g.fillStyle = riv; g.fillRect(x, top, 1, dep);
      g.fillStyle = mixHex(S_.water, '#ffffff', .30); g.fillRect(x, top, 1, 1);
    }
  }
  if (B.landmark && !B.landmarkFront) B.landmark(g, S_);
  /* The near plane. A hill in every habitat except the coast, where the whole
     point is that there is nothing between you and the water — run at base
     100 it buried the sea and the stacks standing in it. */
  ridge(g, B.nearRidge || { base:100, col: mixHex(S_.mid, S_.low, .2),
                            lit: mixHex(S_.mid, S_.low, .45),
                            waves:[[.048,3.4,8],[.11,1.7,3]] });
  if (B.landmark && B.landmarkFront) B.landmark(g, S_);
  if (B.treeline) B.treeline(g, S_);

  // ground: lit grass edge, then dithered dirt
  const grassLit = mixHex(S_.grass, S_.low, .40), grassDark = mixHex(S_.grass, '#000000', .32);
  for (let x=BG_L;x<BG_R;x++){                              // tufted, not a ruled line
    const t = (Math.sin(x*.7) > .3 ? 1 : 0) + (Math.sin(x*.31 + 2) > .55 ? 1 : 0) + (Math.sin(x*1.3+1) > .8 ? 1 : 0);
    g.fillStyle = S_.grass; g.fillRect(x, GROUND-1-t, 1, 5+t);
    g.fillStyle = grassLit; g.fillRect(x, GROUND-1-t, 1, 1);
  }
  g.fillStyle = grassDark; g.fillRect(BG_L, GROUND+3, BG_SPAN, 1);
  /* The dirt runs to the bottom of the world, not to the bottom of the old
     picture, but its gradient still ends where it used to — the extra rows are
     the far end of the same band rather than a restart of it. */
  const d0 = S_.dirt, d1 = mixHex(S_.dirt,'#000000',.22), d2 = mixHex(S_.dirt,S_.low,.22);
  for (let y=GROUND+4;y<BG_B;y++) for (let x=BG_L;x<BG_R;x++){
    const t = clamp((y-GROUND-4)/(H-GROUND-4), 0, 1);
    g.fillStyle = (BAYER[y&3][x&3]/16 < t*.75) ? d1 : d0; g.fillRect(x,y,1,1);
  }
  for (let i=0;i<33;i++){                                   // pebbles
    const x = (rnd(BG_L+2,BG_R-4))|0, y = (GROUND+6+rnd(0,BG_B-GROUND-9))|0;
    g.fillStyle = d1; g.fillRect(x,y,2,2); g.fillStyle = d2; g.fillRect(x,y,1,1);
  }
  for (let i=0;i<20;i++){                                   // ground cover
    const x = (rnd(BG_L+4,BG_R-4))|0, y = (GROUND+5+rnd(0,BG_B-GROUND-10))|0;
    g.fillStyle = mixHex(S_.grass,'#000000',.15); g.fillRect(x,y,1,3);
    g.fillRect(x-1,y+1,1,2); g.fillRect(x+1,y+1,1,2);
  }
  if (B.floor) B.floor(g, S_);

  bgCache.set(key, c);
  return c;
}

/* A habitat at thumbnail size, for the shop. What is being sold is the view,
   so the shelf shows the view rather than a swatch or a name. */
function biomeThumb(bid){
  return bakeBg(skyPhase(new Date()), bid);
}

/* --------------------------- moving backdrop ------------------------------- */
/* Clouds.

   The old ones were three stacked rectangles — a wide one, a narrower one on
   top, a narrower one on top of that — which is a wedding cake, and all four
   were the same wedding cake at four sizes.

   Fair-weather cumulus has three properties and none of them is a rectangle:

     1. A FLAT BASE. The condensation level is an altitude, so every cloud in
        a field has its bottom on the same line and that line is straight and
        sharp. It is the single most recognisable thing about a cumulus and
        the thing a stack of centred rectangles destroys.
     2. A CAULIFLOWER TOP of overlapping rounded lobes at different radii,
        with one dominant tower that is never in the middle.
     3. STRONG SIDE LIGHTING. The lobes facing the sun are near-white, the
        undersides are grey, and the base is the darkest part of the cloud —
        at dawn and dusk it is also the warmest, because it is being lit from
        underneath by a sun near the horizon.

   So a cumulus is drawn column by column against the union of its lobes, the
   way the ridges and the volcano are. Cirrus is a different cloud entirely —
   ice crystals sheared out into fibrous streaks with no body and no base —
   and having one kind of each is most of what stops the sky reading as four
   copies of one thing. */
const CLOUDS = [
  { x:30,  y:28, v:5.4, w:38, kind:'cumulus', seed:0.31 },
  { x:132, y:24, v:7.2, w:48, kind:'cumulus', seed:1.77 },
  { x:196, y:37, v:3.6, w:28, kind:'cumulus', seed:2.55 },
  { x:88,  y:9,  v:2.4, w:58, kind:'cirrus',  seed:0.94 },
  { x:20,  y:48, v:1.7, w:44, kind:'cirrus',  seed:3.10 }
];

/* Lobes are derived from the cloud's seed rather than stored, so the shape is
   fixed for the life of the cloud and no two clouds share one. */
function cloudLobes(c){
  if (c.lobes) return c.lobes;
  const n = 4 + (Math.abs(Math.sin(c.seed*12.9)) > .5 ? 1 : 0);
  const out = [];
  for (let i=0;i<n;i++){
    const u = (i + .5)/n;
    const r = c.w * (0.13 + 0.10*Math.abs(Math.sin(c.seed*3.7 + i*1.9)));
    out.push({ x: (u - .5) * c.w * (0.80 + 0.12*Math.sin(c.seed*7.1 + i*2.3)), r });
  }
  out[n > 4 ? 1 : 0].r *= 1.45;           // one dominant tower, off centre
  /* The lobe's widest point sits a third of a radius above the base, so most
     of the circle is above the flat bottom and the sides meet it steeply. At
     0.58 the tallest cloud stood thirty pixels off its base and ran off the
     top of the sky, where it was clipped into a rectangle. */
  for (const L of out) L.cy = -L.r*0.35;
  return (c.lobes = out);
}

function drawCumulus(g, c, x, top, body, shade, base){
  const half = Math.ceil(c.w/2), baseY = Math.round(c.y);
  const lobes = cloudLobes(c);
  const skyline = i => {                                   // top of the union of lobes
    let t = 0;
    for (const L of lobes){
      const dx = i - L.x;
      if (Math.abs(dx) < L.r){
        const y = L.cy - Math.sqrt(L.r*L.r - dx*dx);
        if (y < t) t = y;
      }
    }
    return t;
  };
  for (let i=-half;i<=half;i++){
    const t = Math.max(Math.round(skyline(i)), 1 - baseY); // never off the top of the sky
    if (t >= 0) continue;                                  // outside the cloud
    const h = -t, px = x + i;
    g.fillStyle = body; g.fillRect(px, baseY + t, 1, h);
    // the underside darkens toward the flat base
    g.fillStyle = shade;
    g.fillRect(px, baseY - Math.max(1, Math.round(h*.30)), 1, Math.max(1, Math.round(h*.30)));
    g.fillStyle = base; g.fillRect(px, baseY - 1, 1, 1);
    /* Sunlit crown. Light comes from the upper left, the same as everything
       else in this game, so a column whose surface is still rising to the
       right is facing the light and a column past the crest is not. */
    const rising = Math.round(skyline(i+1)) < t;
    g.fillStyle = top;
    g.fillRect(px, baseY + t, 1, rising ? 2 : 1);
  }
}

function drawCirrus(g, c, x, top, body){
  const half = c.w/2;
  for (let k=0;k<4;k++){
    const len = Math.round(c.w * (0.42 + 0.5*Math.abs(Math.sin(c.seed*5.3 + k*2.1))));
    const x0 = Math.round(x - half + (c.w - len) * (0.5 + 0.45*Math.sin(c.seed + k*1.6)));
    const y0 = Math.round(c.y + k*2 + Math.sin(c.seed*2.2 + k)*1.5);
    const rake = (k % 2 ? 1 : -1) * 2 / Math.max(1, len);   // sheared by the wind aloft
    for (let i=0;i<len;i++){
      const a = Math.sin((i/len) * Math.PI);                // fibrous: fades at both ends
      if (a < .34) continue;
      g.fillStyle = a > .82 ? top : body;
      g.fillRect(x0 + i, y0 + Math.round(i*rake), 1, 1);
    }
  }
}

function stepWorld(dt, now){
  for (const cloud of CLOUDS){ cloud.x += cloud.v*dt/1000; if (cloud.x > W+cloud.w) cloud.x = -cloud.w; }
  if (!flyer && now > flyerAt) flyer = {x:-14,y:rnd(18,54),v:rnd(26,40),p:0};
  if (flyer){
    flyer.x += flyer.v*dt/1000; flyer.p += dt;
    if (flyer.x > W+14){ flyer = null; flyerAt = now+rnd(25,60)*1000; }
  }
  for (const mote of MOTES){
    mote.x += mote.vx*dt/1000;
    mote.y += Math.sin(mote.p+now/1400)*dt*.0048;
    if (mote.x > W+2) mote.x = -2;
  }
}
function drawClouds(g, phase){
  const S_ = skyOf(phase), night = phase === 'night';
  /* A cloud is white lit and grey shaded, but the underside takes its colour
     from the horizon it is being lit by — which at dawn and dusk means the
     base of every cloud in the sky goes warm. */
  const top   = night ? 'rgba(206,216,240,.36)' : mixHex(S_.low, '#ffffff', .82);
  const body  = night ? 'rgba(158,170,200,.30)' : mixHex(S_.low, '#ffffff', .52);
  /* The underside darkens toward slate rather than toward the ground colour.
     Mixed toward S_.mid the bases came out green, which is a cloud with a
     field reflected in it; mixed toward S_.top they went purple at dawn,
     which is a cloud lit by the wrong half of the sky. Keeping the horizon's
     own hue and only taking light out of it leaves a grey base by day and a
     warm one at dawn and dusk, which is what a low sun actually does. */
  const shade = night ? 'rgba(112,124,156,.28)' : mixHex(S_.low, '#46505f', .24);
  const base  = night ? 'rgba(84,94,128,.32)'   : mixHex(S_.low, '#46505f', .46);
  for (const c of CLOUDS){
    const x = Math.round(c.x);
    if (c.kind === 'cirrus') drawCirrus(g, c, x, top, body);
    else drawCumulus(g, c, x, top, body, shade, base);
  }
}
let flyer = null, flyerAt = 4000;
function drawSkyBody(g, phase, now){
  // the sun and moon ride an arc keyed to the player's actual clock
  const d = new Date(), h = d.getHours() + d.getMinutes()/60;
  const night = phase === 'night';
  const t = clamp(night ? ((h + 3) % 24) / 12 : (h - 6) / 13, 0, 1);
  const cx = 18 + t*(W-36), cy = 62 - Math.sin(clamp(t,0,1)*Math.PI) * 44;
  if (night){
    g.fillStyle = '#e8e6d2'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
    g.fillStyle = skyOf(phase).top; g.beginPath(); g.arc(cx-3.5, cy-2.5, 6, 0, 7); g.fill();
  } else {
    g.fillStyle = phase === 'day' ? 'rgba(250,238,170,.35)' : 'rgba(250,200,140,.3)';
    g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
    g.fillStyle = phase === 'day' ? '#f7ecac' : '#f6c887';
    g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
  }
}
function drawFlyers(g){
  if (!flyer) return;
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

/* --------------------------- live habitat layers ---------------------------
   Anything in a habitat that moves has to be drawn per frame, because the
   backdrop is baked once per biome and phase and then cached — the volcano's
   smoke sat still for the whole life of this project for exactly that reason.
   One hook per biome, called from drawScene.
   -------------------------------------------------------------------------- */

/* Salt lagoon: a surf line running up the sand and back down it. */
function drawSurf(g, phase, now){
  const S_ = skyOf(phase);
  const foam = mixHex(S_.water, '#ffffff', .72), wash = mixHex(S_.water, '#ffffff', .40);
  for (let k=0;k<3;k++){
    const u = ((now/3400 + k*.34) % 1);
    const reach = GROUND - 6 + Math.round(Math.sin(u*Math.PI) * 11);   // in and back out
    const a = Math.sin(u*Math.PI);
    if (a < .12) continue;
    for (let x=0;x<W;x++){
      const y = reach + Math.round(Math.sin(x*.06 + k*2.1 + now/900)*1.6);
      g.fillStyle = a > .55 ? foam : wash;
      g.fillRect(x, y, 1, 1);
      if (a > .70 && (x + k*3) % 7 < 3) g.fillRect(x, y+1, 1, 1);
    }
  }
}

/* Ash flats: the plume, and everything it drops. */
const ASH = Array.from({length:26}, () => ({ x:rnd(0,W), y:rnd(0,GROUND), v:rnd(6,16), p:rnd(0,6.3) }));
function drawAshfall(g, phase, now){
  const keep = VOLC.x; VOLC.x = 120;
  drawPlume(g, phase, now);
  drawPlume(g, phase, now + 2100);            // a second column, offset: it is erupting
  VOLC.x = keep;
  g.fillStyle = phase === 'night' ? 'rgba(180,176,186,.34)' : 'rgba(96,88,84,.42)';
  for (const a of ASH){
    a.y += a.v * 0.016;
    a.x += Math.sin(now/1100 + a.p) * .30;
    if (a.y > GROUND){ a.y = -2; a.x = rnd(0, W); }
    g.fillRect(a.x|0, a.y|0, 1, 1);
  }
}

/* Fern gorge: the fall coming down, and the spray coming off it. */
function drawFallsSpray(g, phase, now){
  const S_ = skyOf(phase);
  const white = mixHex(S_.water, '#ffffff', .78), pale = mixHex(S_.water, '#ffffff', .40);
  const half = FALLS.w/2;
  /* Streaks down the cut at different rates. The span stops at the pool: run
     to the ground line they carried on over the treeline in front of the
     wall, which is a waterfall falling through a wood. */
  const span = FALLS.pool - FALLS.top - 5;
  for (let k=0;k<7;k++){
    const off = (k - 3) * 2.4 + Math.sin(k*2.3)*1.2;
    if (Math.abs(off) > half*.72) continue;
    const x = Math.round(FALLS.x + off);
    for (let i=0;i<4;i++){
      const y = FALLS.top + 3 + ((now*(0.06 + k*0.008) + i*span/4 + k*13) % span);
      g.fillStyle = (k % 2) ? white : pale;
      g.fillRect(x, y|0, 1, Math.min(4, FALLS.pool - y));
    }
  }
  // the boil at the foot, and mist coming off it
  for (let i=0;i<9;i++){
    const u = ((now/1500 + i*.11) % 1);
    const r = 2 + u*7;
    g.fillStyle = 'rgba(226,240,240,' + ((1-u)*.24).toFixed(3) + ')';
    g.beginPath();
    g.ellipse(FALLS.x + Math.sin(i*2.1)*13, FALLS.pool - 1 - u*12, r, r*.62, 0, 0, 7);
    g.fill();
  }
}

/* Polar dawn: aurora, and only when it would be visible. */
function drawAurora(g, phase, now){
  if (phase === 'day') return;
  const a = phase === 'night' ? 1 : .34;
  for (let k=0;k<3;k++){
    const base = 22 + k*9, amp = 7 - k*1.6;
    for (let x=0;x<W;x+=1){
      const y = base + Math.sin(x*.028 + now/2600 + k*1.7)*amp
                     + Math.sin(x*.071 + now/1500 + k)*2.2;
      const h = 10 + Math.sin(x*.041 + now/2000 + k*2.4)*7;
      if (h < 2) continue;
      const fade = (0.10 + 0.06*Math.sin(x*.02 + now/3100 + k)) * a;
      g.fillStyle = 'rgba(126,226,168,' + fade.toFixed(3) + ')';
      g.fillRect(x, y|0, 1, h|0);
      g.fillStyle = 'rgba(150,180,246,' + (fade*.7).toFixed(3) + ')';
      g.fillRect(x, (y+h*.7)|0, 1, (h*.5)|0);
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
  const S_ = skyOf(phase);
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

function drawMotes(g, phase){
  g.fillStyle = phase === 'night' ? 'rgba(190,205,235,.30)' : 'rgba(255,248,208,.45)';
  for (const m of MOTES){
    g.fillRect(m.x|0, m.y|0, 1, 1);
  }
}
function drawWater(g, phase, now){
  const S_ = skyOf(phase);
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
  const S_ = skyOf(phase);
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
   a 5x5 blob that vanished against the animal. The art is in PIX now. */
function heartPx(g,x,y){ pixDraw(g, 'heart', x, y, 1); }
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

/* --------------------------- props: food & mess ----------------------------
   Both are entries in PIX. `flat` paints every pixel one colour, which is what
   gives a food item the hard outline every animal in this game has — a green
   fern frond on a green grass line is otherwise invisible, and a bounding
   rectangle comes out as a black plaque instead of an outline. */
function drawItem(g, id, x, y, s, flat){ pixDraw(g, 'item.' + id, x, y, s || 1, flat); }
function drawMess(g, x, y){ pixDraw(g, 'mess', x, y, 1); }
