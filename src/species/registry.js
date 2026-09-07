/* Species registry, field notes and coats
   Part of Paleopal. Load order matters; see build.py. */

/* --------------------------- species registry ------------------------------ */
const SPECIES = {
  rex: {
    id:'rex', draw:drawRex, spec:REX_SPEC, tune:REX_TUNE, scale:.82, speed:15, strideBase:.46*46,
    name:'Tyrannosaurus rex', common:'T. rex', diet:'carnivore',
    likes:['fish','meat'], dislikes:['fern'],
    eggTint:'#7e9c54', lure:'eats meat',
    era:'Late Cretaceous, 68-66 million years ago, western North America',
    facts:[
      'Its bite is the strongest measured for any land animal, around 35,000 newtons.',
      'Work on tooth wear and jaw foramina points to lips covering the teeth, so a closed mouth showed none of them.',
      'Belly ribs called gastralia made the torso barrel-shaped rather than lean.',
      'Each hand has exactly two fingers, and the palms faced inward, not down.',
      'Both eyes face forward, so it judged distance the way a hawk does.',
      'Feather coverage in T. rex is uncertain. The juvenile down and low adult back ornaments here are reconstruction choices, not directly known features.',
      'A juvenile has a shallow snout and long legs. The deep boxy skull and the barrel chest arrive late.'
    ],
    checks:['Lips covering the teeth','Deep barrel torso','Two fingers, palms inward',
            'Level spine, tail as counterweight','Keratin row down the neck','Forward-facing eyes',
            'Down when young, bare when grown','Shallow snout and long legs as a juvenile']
  },
  trike: {
    id:'trike', draw:drawTrike, spec:TRI_SPEC, tune:TRI_TUNE, scale:.86, speed:10, strideBase:.34*41,
    name:'Triceratops horridus', common:'Triceratops', diet:'herbivore',
    likes:['fern','cycad'], dislikes:['fish'],
    eggTint:'#ab7040', lure:'eats ferns',
    era:'Late Cretaceous, 68-66 million years ago, Hell Creek',
    facts:[
      'Horn cores grew keratin sheaths that ran past the bone, so living horns were longer than the skeleton shows.',
      'The brow horns change direction as the animal grows. They start as straight stubs, curve backward in juveniles, straighten out, then recurve forward in adults.',
      'The frill is solid bone, ringed with small knobs called epoccipitals. They begin as deep scallops and flatten into the rim with age.',
      'Skin impressions show large scales with scattered low nubbins, not the spines older art gave it.',
      'A jugal horn juts down from each cheek, below the eye.',
      'T. horridus carried a long snout and only a small nasal horn.',
      'The beak has two halves: a rostral bone above and a predentary below, and they meet.'
    ],
    checks:['Horns above the eyes, sheathed long','Horn curve reverses between hatchling and adult',
            'Solid frill with rim knobs, deeper when young','Hooked rostral beak',
            'Lower beak meeting the upper','Jugal horn on each cheek','Nubbin feature scales',
            'Upright hind legs, elbows held out','Short-bodied and stocky as a hatchling']
  },
  brachio: {
    id:'brachio', draw:drawBrachio, spec:BRA_SPEC, tune:BRA_TUNE, scale:.66, speed:5.5, strideBase:.30*46,
    name:'Brachiosaurus altithorax', common:'Brachiosaurus', diet:'herbivore',
    likes:['berry','cycad'], dislikes:['meat'],
    eggTint:'#71958a', lure:'eats berries',
    era:'Late Jurassic, 154-150 million years ago, North America',
    facts:[
      'The forelimbs run about 1.2 times the length of the hindlimbs, which is why the back slopes backward.',
      'Its habitual neck posture is debated. This sprite uses a raised, gently curved neck rather than treating one exact angle as established.',
      'A hump of tall vertebral spines over the shoulders anchored the neck muscles.',
      'Its nasal chambers formed a crest on the roof of a very small skull.',
      'The tail is short for a sauropod, and one big thumb claw sits on each forefoot.',
      'The big-headed, short-necked hatchling is a stylized growth reconstruction; a complete B. altithorax hatchling series is not known.'
    ],
    checks:['Forelimbs longer than hindlimbs','Back sloping down to the hips','Shoulder hump at the neck base',
            'S-curved neck near sixty degrees','Nasal crest on the skull','Thumb claw on each forefoot',
            'Level-backed and short-necked as a hatchling','Nasal arch growing with age']
  }
};

/* ------------------------------ the egg choice -----------------------------
   Three places need the same row of eggs: the renderer draws it, the pointer
   handler hit-tests it, and the label strip under the stage names it. All
   three derive from SPECIES here, so adding a species is a registry edit and
   nothing else.

   Slots are centred on the canvas and spaced EGG_GAP apart, tightening once
   the row would otherwise run off the edges. The hit radius follows the gap so
   neighbouring eggs can never claim the same tap.
   -------------------------------------------------------------------------- */
const EGG_GAP = 66, EGG_MARGIN = 24, EGG_HIT = 20;
function eggChoices(){
  const ids = Object.keys(SPECIES), n = ids.length;
  const gap = n < 2 ? 0 : Math.min(EGG_GAP, (W - EGG_MARGIN*2) / (n - 1));
  const hit = n < 2 ? EGG_HIT : Math.min(EGG_HIT, gap/2);
  return ids.map((id, i) => ({ id, x: W/2 + (i - (n-1)/2) * gap, hit }));
}

/* ------------------------------ coat patterns ------------------------------
   A pattern used to be laid down as a field of shapes in fixed sprite-local
   coordinates: seventeen near-vertical tubes marching across the bake box
   regardless of where the animal was inside it. On a long-bodied animal that
   reads as a barcode painted over a dinosaur — it cut across the frill, the
   neck and the legs at the same angle and the same spacing, and the effect on
   the sauropod in particular was that the coat did not appear to be on the
   animal at all.

   The rule the surface detail already follows applies here too: ride the
   body. Each species draw function now returns `spine`, its centreline from
   nape to tail tip with the body's half-depth at each station, and every
   pattern is placed against that. Bands run perpendicular to the spine and
   tighten toward the tail, so they read as flank banding resolving into tail
   rings — which is both what the Sinosauropteryx melanosome work supports and
   what reads as an animal.

   Everything is a deterministic function of the loop index, so a coat does
   not crawl between animation frames.
   -------------------------------------------------------------------------- */
function sampleSpine(spine, t){
  let total = 0; const seg = [];
  for (let i=0;i<spine.length-1;i++){
    const d = Math.hypot(spine[i+1][0]-spine[i][0], spine[i+1][1]-spine[i][1]);
    seg.push(d); total += d;
  }
  let want = clamp(t,0,1) * total;
  for (let i=0;i<seg.length;i++){
    if (want <= seg[i] || i === seg.length-1){
      const u = seg[i] ? clamp(want/seg[i],0,1) : 0;
      const a = spine[i], b = spine[i+1];
      return { x:lerp(a[0],b[0],u), y:lerp(a[1],b[1],u), half:lerp(a[2],b[2],u),
               ang:Math.atan2(b[1]-a[1], b[0]-a[0]) };
    }
    want -= seg[i];
  }
  const last = spine[spine.length-1];
  return { x:last[0], y:last[1], half:last[2], ang:0 };
}
/* the unit normal to the spine. +normal points at the belly, because sprite
   local units put the ground at y = 0 and the animal above it. */
const spineNormal = q => [-Math.sin(q.ang), Math.cos(q.ang)];

/* ----------------------------- countershading -----------------------------
   Dark above, pale below is the one colour pattern with direct fossil support
   — melanosomes in Psittacosaurus and Sinosauropteryx — and it is also the
   cheapest way to stop a flat-coloured animal reading as a cut-out.

   It used to be a hand-placed ellipse under the ribcage on each species, which
   at sprite scale was invisible. It now rides the spine, like the coats, and
   `belly` is masked to body pixels in the compositor, so the band can be drawn
   far outside the outline and let the mask trim it.

   `hi` is where the pale starts, as a fraction of the body's half-depth at
   that station: three stops read as throat, mid-body and tail. The throat sits
   highest because that is where countershading reaches furthest up a living
   animal, and the tail lowest.
   -------------------------------------------------------------------------- */
const BELLY_DEFAULT = { hi:[.45, .58, .70], t0:.02, t1:.99, steps:26 };
function paintBelly(g, spine, cfg){
  if (!spine || spine.length < 2) return;
  cfg = Object.assign({}, BELLY_DEFAULT, cfg || {});
  const hi = cfg.hi, N = cfg.steps;
  const top = [], bot = [];
  for (let i=0;i<=N;i++){
    const u = i/N, t = lerp(cfg.t0, cfg.t1, u);
    const q = sampleSpine(spine, t), [nx,ny] = spineNormal(q);
    const k = u < .5 ? lerp(hi[0], hi[1], u*2) : lerp(hi[1], hi[2], u*2-1);
    top.push([q.x + nx*q.half*k, q.y + ny*q.half*k]);
    bot.push([q.x + nx*q.half*2.8, q.y + ny*q.half*2.8]);   // well past the outline
  }
  g.beginPath();
  g.moveTo(top[0][0], top[0][1]);
  for (let i=1;i<top.length;i++) g.lineTo(top[i][0], top[i][1]);
  for (let i=bot.length-1;i>=0;i--) g.lineTo(bot[i][0], bot[i][1]);
  g.closePath(); g.fill();
}

/* Total arc length of a spine, so pattern density can be specified as a real
   distance rather than as a count. A count gives the short-bodied Triceratops
   the same sixteen bands as the long-necked Brachiosaurus, which on the
   Triceratops closed up into a striped mattress. */
function spineLen(spine){
  let total = 0;
  for (let i=0;i<spine.length-1;i++)
    total += Math.hypot(spine[i+1][0]-spine[i][0], spine[i+1][1]-spine[i][1]);
  return total;
}
/* a deterministic 0..1 from an index, so a coat never crawls between frames */
const jit = (i, m) => ((i * 2654435761) % m) / m;

function paintPattern(g, kind, spine){
  if (!kind || kind === 'none' || !spine || spine.length < 2) return;
  const L = spineLen(spine);
  const count = (perUnit, min) => Math.max(min, Math.round(L * perUnit));

  if (kind === 'bands'){
    const N = count(1/14, 5);                    // one band every ~14 units
    for (let i=0;i<N;i++){
      const t = .10 + (i/Math.max(1,N-1)) * .87;
      const q = sampleSpine(spine, t), [nx,ny] = spineNormal(q);
      const reach = q.half * 1.4;
      const w = lerp(4.6, 1.9, t) * (.82 + jit(i+3, 13)*.4);
      // the belly side is cut short: banding fades into the countershading
      tube(g, [[q.x - nx*reach, q.y - ny*reach], [q.x, q.y],
               [q.x + nx*reach*.62, q.y + ny*reach*.62]], [w*.5, w, w*.44]);
    }
    return;
  }
  if (kind === 'spots'){
    const N = count(1/5.2, 10);
    for (let i=0;i<N;i++){
      const t = .06 + ((i*0.6180339887) % 1) * .90;
      const q = sampleSpine(spine, t), [nx,ny] = spineNormal(q);
      const v = (jit(i+7, 61) - .55) * 1.7;      // across the body, biased upward
      const r = lerp(4.4, 1.6, t) * (.68 + jit(i+11, 17)*.62) * (1 - Math.abs(v)*.3);
      oval(g, q.x + nx*q.half*v, q.y + ny*q.half*v, r, r*.82);
    }
    return;
  }
  if (kind === 'speckle'){
    const N = count(1/1.1, 40);
    for (let i=0;i<N;i++){
      const t = .04 + ((i*0.6180339887) % 1) * .94;
      const q = sampleSpine(spine, t), [nx,ny] = spineNormal(q);
      const v = (jit(i+5, 53) - .58) * 1.8;
      const r = 1.1 + jit(i+13, 7)*.8;
      oval(g, q.x + nx*q.half*v, q.y + ny*q.half*v, r, r*.9);
    }
    return;
  }
  if (kind === 'patches'){
    const N = count(1/17, 5);
    for (let i=0;i<N;i++){
      const t = .07 + ((i*0.6180339887) % 1) * .84;
      const q = sampleSpine(spine, t), [nx,ny] = spineNormal(q);
      const v = (jit(i+3, 43) - .74) * 1.5;      // sit high on the flank
      const r = lerp(12, 5, t) * (.75 + jit(i+9, 11)*.5);
      oval(g, q.x + nx*q.half*v, q.y + ny*q.half*v, r, r*(.58 + jit(i+2,5)*.34), q.ang);
    }
  }
}
