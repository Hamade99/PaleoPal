/* ==========================================================================
   SPECIES ART
   Anatomy follows current reconstructions: lipped jaws and a barrel torso on
   the tyrannosaur, oversized horn sheaths and jugal horns on the ceratopsian,
   a sixty-degree S-curved neck over a shoulder hump on the brachiosaur.
   Proportions are then pushed toward a toy: bigger skull, bigger eye, shorter
   snout, rounder body. Shapes are painted onto material layers, and the
   lighting pass in the colour module turns those layers into shaded pixels.
   ========================================================================== */

/* The box every frame is drawn into. `BAKE_CX` is the centreline and `BAKE_G`
   the ground line inside it; a species draws with the ground at y = 0.

   Every pass in composeSprite is per-pixel over this whole box, so its area is
   the bake cost. The box was 232x210 and the largest frame any species and
   stage produces is 143x94 — five sixths of every pass was spent on empty
   canvas. Measured across every species, stage and animation, the union of
   what is actually touched is 154x95, and this is that plus a margin.

   Anything that makes an animal appreciably bigger — a longer-necked species,
   a taller stage — has to grow this. tools/sheet.html shows the clipping
   immediately. */
const BAKE_W = 168, BAKE_H = 112, BAKE_G = 100, BAKE_CX = 84;

/* Per-stage multipliers. Every feature that grows on its own schedule gets its
   own column — merging any two of them has produced a bad sprite at least once.

   A scale column and a set of ratios is not growth. With `s` doing most of the
   work the juvenile, subadult and adult were one animal at three sizes with a
   slightly smaller head each time, and the only stage that read as its own
   thing was the hatchling. Growing up changes what an animal *has*, not only
   how big the parts are, so four of these columns turn features on and off
   rather than scaling them:

   `muzzle` is snout DEPTH, and it is separate from `snout`, which is snout
   length. A young tyrannosaur has a shallow, narrow muzzle in front of a large
   braincase; the deep boxy skull is an adult feature and arrives late. Driving
   both off one number gives a hatchling either an adult's slab of a face or a
   pinched adult.

   `bulk` is how deep the trunk and neck are for a given length. Juveniles are
   slab-sided and leggy, adults are barrel-chested with a thick neck. It is the
   difference you actually see across a room.

   `torso` is trunk LENGTH. Young animals are short-bodied and big-headed; the
   body catches up last.

   `fuzz` is protofeather coverage. Juvenile tyrannosaurs are reconstructed
   with a substantial coat that reduces with age, which is both well supported
   and the single most visible thing that can change between two stages of the
   same animal.

   `frill` is separate from `horn` for the reason `snout` is separate from
   `head`: a baby Triceratops already has a frill, deeply scalloped and
   obvious, while its horns are barely stubs.

   `hornBend` is the ontogenetic sequence Horner and Goodwin read off a series
   of ten skulls: the postorbital horns start as straight stubs, curve
   backward in juveniles, straighten out in subadults, then recurve forward in
   adults. Negative is backward, positive forward. */
const STAGE = [
  { key:'hatchling', label:'Hatchling', s:.44, head:1.62, snout:.58, muzzle:.62, neck:.44, limb:.68, tail:.54,
    bulk:1.34, torso:.70, fuzz:1.00, horn:.14, frill:.50, hornBend: 0.00 },
  { key:'juvenile',  label:'Juvenile',  s:.64, head:1.38, snout:.76, muzzle:.74, neck:.68, limb:.83, tail:.76,
    bulk:1.12, torso:.84, fuzz:.68,  horn:.48, frill:.70, hornBend:-1.00 },
  { key:'subadult',  label:'Subadult',  s:.83, head:1.18, snout:.90, muzzle:.89, neck:.87, limb:.93, tail:.90,
    bulk:1.04, torso:.94, fuzz:.30,  horn:.80, frill:.86, hornBend:-0.15 },
  { key:'adult',     label:'Adult',     s:1.0, head:1.06, snout:1.00, muzzle:1.00, neck:1.00, limb:1.00, tail:1.00,
    bulk:1.00, torso:1.00, fuzz:.06,  horn:1.00, frill:1.00, hornBend: 1.00 }
];

/* --------------------------- gait and limbs -------------------------------
   The foot follows a stance/swing path against the ground, and the leg is
   solved with two-bone inverse kinematics. Bone lengths never change and a
   planted foot never slides, which is what stops a walk cycle looking rubbery.
   -------------------------------------------------------------------------- */
function gaitFoot(phase, stride, lift, duty){
  phase = ((phase % 1) + 1) % 1;
  if (phase < duty){                       // planted: starts ahead, slides back
    const t = phase / duty;
    return [stride * (-0.5 + t), 0];
  }
  const t = (phase - duty) / (1 - duty);   // airborne: swings from back to front
  return [stride * (0.5 - t), -lift * Math.sin(Math.PI * t)];
}
function limbIK(g, hx, hy, tx, ty, L1, L2, w, bend){
  const dx = tx - hx, dy = ty - hy;
  const raw = Math.hypot(dx, dy) || 0.001;
  const d = clamp(raw, Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.995);
  const ux = dx / raw, uy = dy / raw;
  const a = (L1*L1 - L2*L2 + d*d) / (2*d);
  const h = Math.sqrt(Math.max(0, L1*L1 - a*a));
  const kx = hx + ux*a - uy*h*bend, ky = hy + uy*a + ux*h*bend;
  const ax = hx + ux*d, ay = hy + uy*d;
  tube(g, [[hx,hy],[kx,ky]], [w, w*.64]);
  tube(g, [[kx,ky],[ax,ay]], [w*.64, w*.44]);
  return [ax, ay];
}
/* hy is the hip height above the ground line at y = 0, so the leg always reaches */
function legStep(g, hx, hy, phase, w, cfg, hornG){
  const len = Math.max(4, -hy);
  const mt = len * cfg.mt;
  if (cfg.thigh) oval(g, hx, hy + len*.17, w*.92, len*.25);
  const [ox, oy] = gaitFoot(phase, len*cfg.stride, len*cfg.lift, cfg.duty);
  const tx = hx + ox + len*(cfg.fwd||0), ty = oy;
  const ank = limbIK(g, hx, hy, tx + mt*cfg.back, ty - mt, (len-mt)/2*1.02, (len-mt)/2*1.02, w, cfg.bend);
  drawFoot(g, hornG, ank, tx, ty, w, cfg.foot || 'bird');
  return [tx, ty];
}
function drawFoot(g, hornG, ank, tx, ty, w, kind){
  if (kind === 'hoof'){
    // sauropod manus: the metacarpals stand in a vertical column and the whole
    // hand is a single hoof. No digits are visible in life, so none are drawn.
    tube(g, [[ank[0], ank[1]],[tx, ty - w*.44]], [w*.56, w*.60]);
    blob(g, [[tx - w*.32, ty - w*.52],[tx + w*.32, ty - w*.52],
             [tx + w*.36, ty - w*.10],[tx, ty - w*.03],[tx - w*.36, ty - w*.10]]);
    return;
  }
  if (kind === 'pad'){
    // sauropod pes: a wedge, deep at the heel where the fleshy pad sits and
    // sloping forward onto three claw-bearing inner toes
    tube(g, [[ank[0], ank[1]],[tx + w*.26, ty - w*.46]], [w*.50, w*.54]);
    blob(g, [[tx + w*.52, ty - w*.08],[tx + w*.60, ty - w*.40],[tx + w*.30, ty - w*.60],
             [tx - w*.16, ty - w*.44],[tx - w*.44, ty - w*.20],[tx - w*.40, ty - w*.03],
             [tx + w*.10, ty]]);
    if (hornG){
      blob(hornG, [[tx - w*.36, ty - w*.22],[tx - w*.58, ty - w*.10],[tx - w*.36, ty - w*.01]]);
      blob(hornG, [[tx - w*.20, ty - w*.30],[tx - w*.44, ty - w*.24],[tx - w*.24, ty - w*.12]]);
    }
    return;
  }
  if (kind === 'column'){
    // ceratopsian foot: short, broad and blunt-hooved
    tube(g, [[ank[0], ank[1]],[tx + w*.10, ty - w*.34]], [w*.50, w*.54]);
    blob(g, [[tx + w*.36, ty - w*.06],[tx + w*.40, ty - w*.34],[tx, ty - w*.46],
             [tx - w*.36, ty - w*.28],[tx - w*.38, ty - w*.02]]);
    if (hornG){
      blob(hornG, [[tx - w*.28, ty - w*.20],[tx - w*.46, ty - w*.08],[tx - w*.26, ty - w*.01]]);
      blob(hornG, [[tx - w*.08, ty - w*.26],[tx - w*.28, ty - w*.22],[tx - w*.10, ty - w*.10]]);
    }
    return;
  }
  tube(g, [[ank[0],ank[1]],[tx,ty]], [w*.46, w*.4]);
  oval(g, tx - w*.1, ty - w*.15, w*.56, w*.28);
}
/* How long a polyline is, in local units. Anything spaced along a path has to
   be spaced by distance and not by count: a fixed number of filaments spread
   over a hatchling's short back overlap into one solid band, and the same
   number over an adult's is a row of separated spikes. The coat painter
   learned this in session 8; the fuzz needed telling too. */
function pathLength(pts){
  let d = 0;
  for (let i=0;i<pts.length-1;i++) d += Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]);
  return d;
}
function samplePath(pts, t){
  let total = 0; const seg = [];
  for (let i=0;i<pts.length-1;i++){ const d = Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]); seg.push(d); total += d; }
  let want = clamp(t,0,1) * total;
  for (let i=0;i<seg.length;i++){
    if (want <= seg[i] || i === seg.length-1){
      const u = seg[i] ? clamp(want/seg[i],0,1) : 0;
      return [lerp(pts[i][0], pts[i+1][0], u), lerp(pts[i][1], pts[i+1][1], u)];
    }
    want -= seg[i];
  }
  return pts[pts.length-1];
}
function toes(g, x, y, n, dir, size){
  for (let i=0;i<n;i++) oval(g, x + dir*i*size*1.7, y, size*.78, size*.55);
}
function eyeAt(M, x, y, r, state){
  /* A shut eye is a line, not a shape. The lid used to be drawn as wide as the
     pupil with rounded caps, which at this size read as a black smudge across
     the face rather than as a closed eye. */
  if (state === 1){                                        // closed: a soft lid line
    tube(M.pupil, [[x-r*1.35,y-r*.08],[x,y+r*.34],[x+r*1.35,y-r*.08]], [r*.24,r*.32,r*.24]);
    return;
  }
  if (state === 2){                                        // squinting, pleased
    tube(M.pupil, [[x-r*1.3,y+r*.34],[x,y-r*.40],[x+r*1.3,y+r*.34]], [r*.24,r*.32,r*.24]);
    return;
  }
  if (state === 3){
    /* Half-lidded: ill, but awake. The sick pose used to borrow the shut lid
       from sleep, so an animal that needed a remedy and an animal that needed
       leaving alone were the same picture — and since `sick` overrides idle
       for as long as the illness lasts, a poorly animal simply had its eyes
       closed all day. The eye is open here, only sunk and hooded: the white
       still shows, which is the whole difference at this size. */
    oval(M.sclera, x, y + r*.28, r*1.04, r*.74);
    oval(M.pupil,  x - r*.10, y + r*.36, r*.60, r*.60);
    oval(M.glint,  x - r*.42, y + r*.10, r*.24, r*.22);
    tube(M.pupil, [[x-r*1.32,y-r*.22],[x,y-r*.02],[x+r*1.26,y-r*.28]], [r*.22,r*.30,r*.22]);
    return;
  }
  oval(M.sclera, x, y, r*1.1, r*1.24);
  oval(M.pupil,  x - r*.12, y + r*.14, r*.66, r*.86);
  oval(M.glint,  x - r*.46, y - r*.44, r*.3, r*.3);
}

/* ------------------------------- T. rex ----------------------------------- */

/* ------------------------------ hats -------------------------------------- */
const HAT_ART = {
  frond:  g => { g.fillStyle='#6f9c55'; g.fillRect(4,4,2,5); [[1,1],[3,0],[6,0],[8,1],[2,3],[7,3]].forEach(q=>g.fillRect(q[0],q[1],2,2)); },
  cap:    g => { g.fillStyle='#b08a4a'; g.fillRect(2,1,6,4); g.fillStyle='#8a6a36'; g.fillRect(0,5,10,2); },
  goggles:g => { g.fillStyle='#3a4d55'; g.fillRect(0,2,10,3); g.fillStyle='#9fd2e0'; g.fillRect(1,3,3,2); g.fillRect(6,3,3,2); },
  cone:   g => { g.fillStyle='#d95f7f'; g.fillRect(4,0,2,2); g.fillRect(3,2,4,2); g.fillRect(2,4,6,2); g.fillStyle='#5fb0a5'; g.fillRect(1,6,8,2); },
  hardhat:g => { g.fillStyle='#e0a92f'; g.fillRect(2,1,6,4); g.fillStyle='#c48c1c'; g.fillRect(0,5,10,2); g.fillRect(4,0,2,2); },
  crown:  g => { g.fillStyle='#d9a83f'; g.fillRect(0,0,2,3); g.fillRect(4,0,2,3); g.fillRect(8,0,2,3); g.fillRect(0,3,10,3); g.fillStyle='#c04848'; g.fillRect(4,4,2,2); }
};
function hatCanvas(id){
  const c = makeCv(12,11), g = readCtx(c);
  g.save(); g.translate(1,1); HAT_ART[id](g); g.restore();
  const d = g.getImageData(0,0,12,11), px = d.data, solid = new Uint8Array(12*11);
  for (let i=0;i<12*11;i++){ if (px[i*4+3] >= 118){ px[i*4+3] = 255; solid[i] = 1; } else px[i*4+3] = 0; }
  for (let y=0;y<11;y++) for (let x=0;x<12;x++){
    const i = y*12+x; if (solid[i]) continue;
    if ((x>0&&solid[i-1])||(x<11&&solid[i+1])||(y>0&&solid[i-12])||(y<10&&solid[i+12])){
      px[i*4]=0x24; px[i*4+1]=0x1d; px[i*4+2]=0x13; px[i*4+3]=255;
    }
  }
  g.putImageData(d,0,0);
  return c;
}
const HATS = {};
for (const k in HAT_ART) HATS[k] = hatCanvas(k);

/* ---------------------------- frame baking -------------------------------- */
/* Walk and idle are generated rather than typed out, because the only reason
   they were six frames and two frames was that a bake cost eight milliseconds
   and every pose is one. It costs about a third of that now, so the cycles are
   as long as they should be: twelve frames of walk reads as a walk instead of
   as six positions, and four frames of idle is a breath instead of a twitch.

   The body rises twice per stride, once under each foot, with sharp peaks and
   a flat trough — that asymmetry is the push-off. The tail swings once per
   stride, a quarter cycle behind it. */
const WALK_FRAMES = 12, IDLE_FRAMES = 4;
const TAU = Math.PI * 2;
const poseCycle = (count, fn) => Array.from({length:count}, (_, i) => fn(i/count, i));

const POSES = {
  idle:  poseCycle(IDLE_FRAMES, p => ({
           body: .65 - .65*Math.cos(TAU*p),          // one slow breath
           legPhase: 0,
           tail: .22*Math.sin(TAU*p)
         })),
  walk:  poseCycle(WALK_FRAMES, p => ({
           body: .2 + 1.3*Math.pow(Math.abs(Math.sin(TAU*p)), 1.4),
           legPhase: p,
           tail: .48*Math.sin(TAU*p + Math.PI/4)
         })),
  eat:   [ {body:0, legPhase:0, jaw:1, droop:.7, tail:.3}, {body:0, legPhase:0, jaw:.12, droop:.7, tail:-.1} ],
  /* Asleep is deep and slow and the eyes are shut. Ill is shallow, uneven and
     the eyes are open but hooded. The two used to share a lid and a droop,
     which is why an ill animal read as a sleeping one. */
  sleep: poseCycle(2, p => ({
           body: -2.5 + .40*(1 - Math.cos(TAU*p)),
           legPhase: 0, droop: 1.5, tail: .1, eye: 1
         })),
  cheer: [ {body:5, legPhase:.5, jaw:.8, tail:.9, eye:2}, {body:0, legPhase:0, jaw:.35, tail:-.7, eye:2} ],
  sick:  poseCycle(4, p => ({
           body: -1.5 + .55*Math.sin(TAU*p),
           legPhase: 0,
           droop: 1.05 + .20*Math.cos(TAU*p),
           tail: -.12 + .08*Math.sin(TAU*p),
           eye: 3
         }))
};
const matCache = new Map();
function matsFor(spId, skinId){
  const key = spId + '|' + skinId;
  if (!matCache.has(key)){
    const k = skinOf(spId, skinId);
    matCache.set(key, buildMaterials(Object.assign({}, SPECIES[spId].spec, {
      skin:k.skin, belly:k.belly, crest:k.crest, mark:k.mark
    })));
  }
  return matCache.get(key);
}
/* Least-recently-used, because the key space is species x coat x stage x
   animation x frame x eye and every entry is a canvas. A player only ever has
   one species, one coat and one stage live, which is about thirty frames; the
   rest of what gets baked is shop and nest thumbnails. The cap is generous
   enough never to evict anything in use and small enough to bound the memory. */
const FRAME_CACHE_MAX = 180;
const frameCache = new Map();
function frameOf(spId, stage, anim, idx, blinking, skinId){
  skinId = skinId || 'wild';
  const poses = POSES[anim] || POSES.idle;
  const pose = poses[idx % poses.length];
  const eye = pose.eye !== undefined ? pose.eye : (blinking ? 1 : 0);
  const key = spId+'|'+skinId+'|'+stage+'|'+anim+'|'+(idx%poses.length)+'|'+eye;
  if (frameCache.has(key)){
    const hit = frameCache.get(key);
    frameCache.delete(key); frameCache.set(key, hit);   // Map keeps insertion order
    return hit;
  }

  const sp = SPECIES[spId], st = STAGE[stage], k = st.s * sp.scale;
  const canvases = [], M = {};
  for (const name of LAYERS){
    const c = makeCv(BAKE_W, BAKE_H), g = readCtx(c);
    g.fillStyle = '#000';
    g.translate(BAKE_CX, BAKE_G); g.scale(k, k);
    canvases.push(c); M[name] = g;
  }
  const P = Object.assign({stage, legPhase:0, body:0, jaw:0, tail:0, droop:0}, pose, {eye});
  const anchors = sp.draw(M, P);
  // Countershading and the coat both ride the body the draw function just laid
  // down, never a path computed alongside it — the same rule the surface
  // detail follows. Belly first: the coat is masked to stop where it starts.
  paintBelly(M.belly, anchors.spine, sp.belly);
  paintPattern(M.mark, skinOf(spId, skinId).pattern, anchors.spine);

  const composed = composeSprite(canvases, matsFor(spId, skinId), BAKE_W, BAKE_H);
  const t = trim(composed);
  const conv = a => [BAKE_CX + a[0]*k - t.ox, BAKE_G + a[1]*k - t.oy];
  const out = {
    cv: t.cv, w: t.w, h: t.h,
    ox: BAKE_CX - t.ox, oy: BAKE_G - t.oy,
    eye: conv(anchors.eye), mouth: conv(anchors.mouth), hat: conv(anchors.hat),
    eyeR: (anchors.eyeR || 3) * k, k, hs: k * st.head
  };
  frameCache.set(key, out);
  while (frameCache.size > FRAME_CACHE_MAX) frameCache.delete(frameCache.keys().next().value);
  return out;
}

/* Bake ahead. A cold bake is a few milliseconds and every pose is one, so a
   twelve-frame walk baked lazily hitches twelve times the first time an animal
   crosses the pen. Two frames a tick fills the whole of the current stage and
   coat inside a second, and does nothing at all once it is full. */
let warmQueue = [], warmKey = '';
function warmFrames(spId, stage, skinId){
  const key = spId + '|' + skinId + '|' + stage;
  if (key !== warmKey){
    warmKey = key;
    warmQueue = [];
    for (const anim in POSES)
      for (let i=0;i<POSES[anim].length;i++) warmQueue.push([anim, i, false]);
    warmQueue.push(['idle', 0, true]);            // the blink is a bake of its own
  }
  for (let n=0; n<2 && warmQueue.length; n++){
    const [anim, i, blink] = warmQueue.shift();
    frameOf(spId, stage, anim, i, blink, skinId);
  }
}
