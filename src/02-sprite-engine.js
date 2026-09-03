/* ==========================================================================
   SPECIES ART
   Anatomy follows current reconstructions: lipped jaws and a barrel torso on
   the tyrannosaur, oversized horn sheaths and jugal horns on the ceratopsian,
   a sixty-degree S-curved neck over a shoulder hump on the brachiosaur.
   Proportions are then pushed toward a toy: bigger skull, bigger eye, shorter
   snout, rounder body. Shapes are painted onto material layers, and the
   lighting pass in the colour module turns those layers into shaded pixels.
   ========================================================================== */

const BAKE_W = 232, BAKE_H = 210, BAKE_G = 196, BAKE_CX = 104;

/* Per-stage multipliers. Every feature that grows on its own schedule gets its
   own column — merging any two of them has produced a bad sprite at least once.

   `frill` is separate from `horn` for the reason `snout` is separate from
   `head`: a baby Triceratops already has a frill, deeply scalloped and
   obvious, while its horns are barely stubs. Driving the frill off the horn
   column left hatchlings with almost no frill under an enormous skull.

   `hornBend` is the ontogenetic sequence Horner and Goodwin read off a series
   of ten skulls: the postorbital horns start as straight stubs, curve
   backward in juveniles, straighten out in subadults, then recurve forward in
   adults. Negative is backward, positive forward. */
const STAGE = [
  { key:'hatchling', label:'Hatchling', s:.44, head:1.62, snout:.58, neck:.44, limb:.68, tail:.54, horn:.14, frill:.50, hornBend: 0.00 },
  { key:'juvenile',  label:'Juvenile',  s:.64, head:1.38, snout:.76, neck:.68, limb:.83, tail:.76, horn:.48, frill:.70, hornBend:-1.00 },
  { key:'subadult',  label:'Subadult',  s:.83, head:1.18, snout:.90, neck:.87, limb:.93, tail:.90, horn:.80, frill:.86, hornBend:-0.15 },
  { key:'adult',     label:'Adult',     s:1.0, head:1.06, snout:1.00, neck:1.00, limb:1.00, tail:1.00, horn:1.00, frill:1.00, hornBend: 1.00 }
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
  if (state === 1){                                        // closed: a soft lid line
    tube(M.pupil, [[x-r*1.5,y-r*.1],[x,y+r*.45],[x+r*1.5,y-r*.1]], [r*.55,r*.6,r*.55]);
    return;
  }
  if (state === 2){                                        // squinting, pleased
    tube(M.pupil, [[x-r*1.4,y+r*.45],[x,y-r*.5],[x+r*1.4,y+r*.45]], [r*.55,r*.6,r*.55]);
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
const POSES = {
  idle:  [ {body:0, legPhase:0, tail:.2}, {body:1.3, legPhase:0, tail:-.2} ],
  walk:  [ {body:.2, legPhase:0,     tail:0},   {body:1.5, legPhase:1/6, tail:.43},
           {body:.7, legPhase:2/6,   tail:.43}, {body:.2, legPhase:3/6, tail:0},
           {body:1.5, legPhase:4/6,  tail:-.43},{body:.7, legPhase:5/6, tail:-.43} ],
  eat:   [ {body:0, legPhase:0, jaw:1, droop:.7, tail:.3}, {body:0, legPhase:0, jaw:.12, droop:.7, tail:-.1} ],
  sleep: [ {body:-2.5, legPhase:0, droop:1.5, tail:.1, eye:1} ],
  cheer: [ {body:5, legPhase:.5, jaw:.8, tail:.9, eye:2}, {body:0, legPhase:0, jaw:.35, tail:-.7, eye:2} ],
  sick:  [ {body:-1.5, legPhase:0, droop:1.1, tail:-.1, eye:1}, {body:-2.4, legPhase:0, droop:1.2, tail:0, eye:1} ]
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
const frameCache = new Map();
function frameOf(spId, stage, anim, idx, blinking, skinId){
  skinId = skinId || 'wild';
  const poses = POSES[anim] || POSES.idle;
  const pose = poses[idx % poses.length];
  const eye = pose.eye !== undefined ? pose.eye : (blinking ? 1 : 0);
  const key = spId+'|'+skinId+'|'+stage+'|'+anim+'|'+(idx%poses.length)+'|'+eye;
  if (frameCache.has(key)) return frameCache.get(key);

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
  // the coat rides the body the draw function just laid down, never a path
  // computed alongside it — the same rule the surface detail follows
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
  return out;
}
