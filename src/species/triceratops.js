/* Triceratops horridus sprite
   Part of Paleopal. Load order matters; see build.py.

   Proportions follow the modern skeletals: a deep barrel torso, a tail about
   one and a half times the length of the torso and deep at its base, and a
   skull-and-frill unit carried forward of the shoulder rather than sitting on
   top of it.

   That last point is the whole of this rewrite. The frill used to be built
   around a point just in front of the withers, tipped back forty degrees, and
   the body outline was run forward to meet it — so its lower half was buried
   in the shoulder hump, its rim never cleared the back line, and the skull
   appeared to be extruded out of the front of a lump. In side view a
   ceratopsian is a head with an animal behind it: the shield stands clear
   against the sky, there is a short thick neck under it, and the shoulder
   starts behind that. The frill is anchored to the back of the skull now, the
   skull is carried forward of the shoulder, and the body's nape stops short
   so that neck is something you can see.

   Growth follows Horner and Goodwin's series of ten skulls:
     - the frill is present and deeply scalloped from the start, and lengthens
       with positive allometry (STAGE.frill)
     - the epoccipitals along the rim start as deep deltoid scallops and
       flatten to low spindles that fuse into the margin (EPI_DEPTH)
     - the brow horns are straight stubs, curve backward in juveniles,
       straighten in subadults and recurve forward in adults (STAGE.hornBend)
   -------------------------------------------------------------------------- */
const TRI_SPEC = { skin:'#a06635', belly:'#c8975e', crest:'#7d4a22', horn:'#efe6c8',
                   /* The frill carries its own colour, pulled further from the
                      body ramp than it was: on the flank colours the shield
                      was separated from the neck by nothing but the outline,
                      and a shield that does not read as a shield is most of
                      this animal's silhouette thrown away. */
                   shield:'#cfa068',
                   mouth:'#7e3a30', outline:'#26190f' };
const TRI_HIND = { stride:.34, lift:.11, duty:.66, mt:.15, back:.2,  bend:1,  thigh:true,  foot:'column' };
const TRI_FORE = { stride:.32, lift:.10, duty:.66, mt:.15, back:-.1, bend:-1, thigh:false, foot:'column' };
/* how far the rim scallops bite in, per growth stage: deltoid when young,
   low spindles fused to the margin when adult */
const EPI_DEPTH = [.22, .17, .12, .08];

function drawTrike(M, P){
  const st = STAGE[P.stage];
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const hF = st.horn, sM = st.snout, fM = st.frill, bend = st.hornBend;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;

  const hipX = 26, hipY = -41*lM - bob;
  const shX = -16, shY = -38*lM - bob;         // glenoid
  const withY = hipY - 25*lM;                  // tall neural spines: a shoulder hump
  const backY = hipY - 20*lM, bellyY = hipY + 14*lM;
  const T = d => hipX + d*tM;

  legStep(M.far, hipX-7, hipY+2, (P.legPhase+.5)%1, 16*lM, TRI_HIND);
  legStep(M.far, shX-7,  shY+3,  (P.legPhase+.25)%1, 14.5*lM, TRI_FORE);

  /* One closed mass: nape, ribcage, hips and tail. The nape stops at the base
     of the neck instead of running forward into the frill, so the neck is a
     column with sky either side of it rather than a filled wedge. The tail
     leaves the hips nearly as deep as the pelvis and tapers the whole way
     out, which is what stops it reading as a stub bolted on the back. */
  blob(M.skin, [
    [shX-9,  withY+8*lM],                      // base of the neck
    [shX-2,  withY],                           // shoulder hump
    [8,      backY-1],                         // back
    [hipX+4, backY+2],                         // hips
    [T(14),  hipY-17*lM+sw*1.5],               // tail base, still deep
    [T(30),  hipY-13*lM+sw*3],
    [T(46),  hipY-8.5*lM+sw*5],
    [T(62),  hipY-3*lM+sw*7],                  // tail tip
    [T(60),  hipY-0.5*lM+sw*7],
    [T(42),  hipY+2*lM+sw*4],
    [T(22),  hipY+6*lM+sw*1.5],
    [T(5),   hipY+10*lM],
    [hipX-6, bellyY],                          // belly
    [2,      bellyY+2*lM],
    [shX+3,  bellyY-1*lM],
    [shX-8,  hipY+2*lM]                        // throat
  ]);

  /* The neck: short, thick and near horizontal, carrying the head forward of
     the shoulder. Drawn on `skin`, so it merges with the body the way a neck
     should — the boundary that has to read is the one behind the frill, and
     the frill has a material of its own for exactly that. */
  const nkX = shX - 7*nM, nkY = withY + 9*lM;
  const hx = nkX - 20*nM - 9*hM*sM, hy = nkY + 7*lM + dr*5;   // the jaw joint
  const sn = 24*hM*sM, hh = 10.5*hM;
  tube(M.skin, [[shX-2, nkY-2*lM],[nkX-4, nkY+1*lM],[hx+14*hM, hy-hh*.10]],
       [15*lM, 13.5*lM, 12*hM]);

  /* Frill: a solid bone shield, anchored to the back of the skull roof and
     opening up and back over the neck. Its rim stands clear of the back line
     the whole way round — that separation is the entire silhouette of the
     animal, and burying it in the shoulder is what made the old one read as a
     hump of neck.

     It rides STAGE.frill, not the horn column: a baby already has an obvious,
     deeply scalloped frill and almost no horns. */
  const fx = hx + 15*hM, fy = hy - hh*1.16;    // the base, on the skull roof
  const fRx = 17.0*hM*fM, fRy = 22.0*hM*fM;
  const fTilt = -0.24;                          // tipped back, but standing up
  const fc = Math.cos(fTilt), fs = Math.sin(fTilt);
  const rot = (px,py) => [fx + px*fc - py*fs, fy + px*fs + py*fc];
  const epi = EPI_DEPTH[P.stage];
  const rim = [];
  const A0 = Math.PI*1.10, A1 = Math.PI*2.02;   // front edge, over the crown, down the back
  /* The epoccipitals scallop the rim itself. Sixteen of them came out as a
     one-pixel sawtooth that read as fur; an adult shows five or six knobs in
     side profile, so the rim is stepped at that count instead. */
  const EPI_N = 8;
  for (let i=0;i<=EPI_N;i++){
    const a = A0 + (A1-A0)*i/EPI_N;
    const r = (i % 2) ? 1.0 : (1 - epi);
    rim.push(rot(Math.cos(a)*fRx*r, Math.sin(a)*fRy*r));
  }
  rim.push(rot(fRx*.74, fRy*.34));              // rear-bottom corner, clear of the neck
  rim.push(rot(fRx*.10, fRy*.44));              // bottom margin, behind the cheek
  rim.push(rot(-fRx*.72, fRy*.30));             // front-bottom, where the skull joins
  blob(M.shield, rim);
  /* The epoccipitals as bone, not only as a step in the outline. They are
     separate ossifications that fuse to the margin, so they are the colour of
     the horns rather than of the shield, and at this size a scalloped edge on
     its own is invisible — a row of pale knobs is what makes the rim read as
     a rim. They shrink with age on the same schedule as the scallops. */
  for (let i=1;i<EPI_N;i+=2){
    const a = A0 + (A1-A0)*i/EPI_N;
    const q = rot(Math.cos(a)*fRx, Math.sin(a)*fRy);
    oval(M.horn, q[0], q[1], (1.1 + epi*7)*hM*fM, (1.0 + epi*5.5)*hM*fM);
  }

  /* Skull: deep, boxy, and carried forward and below the frill base. It stops
     at the oral margin, because the mandible has to live somewhere. The old
     one was a long thin wedge — about half of this animal's head is frill,
     and giving the skull the other half made it a snout on a stalk. */
  const lipY = hy + hh*.38;
  blob(M.head, [
    [hx+15*hM,   hy-hh*1.02],                   // back of the skull roof
    [hx+2*hM,    hy-hh*1.20],                   // roof over the orbit
    [hx-sn*.32,  hy-hh*1.08],
    [hx-sn*.66,  hy-hh*.84],                    // sloping to the beak
    [hx-sn*.90,  hy-hh*.46],
    [hx-sn*1.00, hy-hh*.06],
    [hx-sn*.88,  lipY-hh*.02],                  // oral margin
    [hx-sn*.38,  lipY+hh*.06],
    [hx+4*hM,    hy+hh*.86],                    // deep cheek, down to the jugal
    [hx+16*hM,   hy+hh*.36]
  ]);

  /* Jaw. A ceratopsian bites with two beaks — the rostral above, the
     predentary below — and the gap between them is the mouth. The old sprite
     drew one cream mass across the whole snout, which read as a bald face and
     left the eat animation with nothing to move. */
  const jHinge = [hx + 8*hM, hy + hh*.44], jawA = -jaw*.26;
  M.jaw.save(); M.jaw.translate(jHinge[0], jHinge[1]); M.jaw.rotate(jawA);
  blob(M.jaw, [[4,-hh*.06],[-sn*.36,-hh*.12],[-sn*.78,hh*.06],
               [-sn*.72,hh*.42],[-sn*.24,hh*.56],[5,hh*.44]]);
  M.jaw.restore();

  // rostral: a parrot hook, not a rounded snout cap
  blob(M.horn, [[hx-sn*.92, hy-hh*.40],[hx-sn*1.16, hy-hh*.04],[hx-sn*1.22, hy+hh*.24],
                [hx-sn*1.04, hy+hh*.42],[hx-sn*.88, lipY-hh*.04]]);
  // predentary, riding the jaw so it opens with it
  M.horn.save(); M.horn.translate(jHinge[0], jHinge[1]); M.horn.rotate(jawA);
  blob(M.horn, [[-sn*.56, hh*.00],[-sn*.88, hh*.12],[-sn*.82, hh*.44],[-sn*.52, hh*.42]]);
  M.horn.restore();

  if (jaw > .06){
    const uTip = [hx - sn*.86, lipY - hh*.04];
    const lTip = [jHinge[0] + (-sn*.78)*Math.cos(jawA) - (hh*.06)*Math.sin(jawA),
                  jHinge[1] + (-sn*.78)*Math.sin(jawA) + (hh*.06)*Math.cos(jawA)];
    M.mouth.beginPath();
    M.mouth.moveTo(jHinge[0], jHinge[1]);
    M.mouth.lineTo(uTip[0], uTip[1]);
    M.mouth.lineTo(lTip[0], lTip[1]);
    M.mouth.closePath(); M.mouth.fill();
  } else {
    tube(M.mouth, [[hx+6*hM, lipY+hh*.06],[hx-sn*.38, lipY+hh*.04],[hx-sn*.80, lipY-hh*.04]],
         [Math.max(.9,1.4*hM), Math.max(.8,1.2*hM), Math.max(.6,.9*hM)]);
  }
  const ex = hx - sn*.30, ey = hy - hh*.34;

  /* Brow horns. The keratin sheath ran well past the bone core, so an adult's
     are long; the curvature is the ontogenetic sequence — straight stubs, then
     backward, then straightening, then recurved forward. The mid control point
     bows against the tip, which is what makes a recurve read as a recurve
     rather than as a bent stick.

     They spring from above the orbit, which is where a postorbital horn is,
     and they are rooted low enough on the skull to read as growing out of the
     face rather than off the front of the frill.

     Width tracks the sheath as well as the skull. Scaling thickness on head
     bulk alone gave hatchlings two fat cones where they should have stubs. */
  const hl = hh*(.50 + 1.85*hF);
  const hw = hM * (.40 + .60*hF);
  const browHorn = (dx, dy, len, w) => {
    const bx = ex + dx*hM, by = ey + dy;
    const tip = [bx - len*(.34 + .58*bend), by - len*.82];
    const mid = [(bx + tip[0])/2 + len*.20*bend, (by + tip[1])/2 + len*.06];
    tube(M.horn, [[bx,by], mid, tip], [w*hw, w*.52*hw, w*.12*hw]);
  };
  browHorn( 5, -hh*.52, hl,     9.6);
  browHorn(-4, -hh*.62, hl*.88, 7.8);
  // nasal horn: small in T. horridus, and small at every age
  tube(M.horn, [[hx-sn*.72, hy-hh*.30],[hx-sn*.86, hy-hh*(.50+.5*hF)]], [4.0*hM, 1.2*hM]);
  // jugal horn: a short cheek point aimed down and back, not a hanging tusk
  blob(M.horn, [[hx-sn*.06, hy+hh*.66],[hx-sn*.32, hy+hh*.60],[hx-sn*.10, hy+hh*1.14]]);

  // low nubbin feature scales over the flank and tail base
  for (const q of [[-2,-11],[10,-14],[22,-12],[15,-6],[32,-9],[2,-5],[41,-7]])
    oval(M.crest, q[0], hipY + q[1]*lM, 1.7*lM, 1.2*lM);

  // the ventral countershading is painted from the spine by paintBelly

  legStep(M.limb, hipX+2, hipY, P.legPhase, 18*lM, TRI_HIND, M.horn);
  legStep(M.limb, shX+4, shY+1, (P.legPhase+.75)%1, 16.5*lM, TRI_FORE, M.horn);

  eyeAt(M, ex, ey, 3.4*hM, P.eye);

  /* Centreline for the coat painter: nape to tail tip, with the body's
     half-depth at each station so a band knows how far to run. */
  const spine = [
    [shX-6,   withY+11*lM,  8*lM],   // base of the neck
    [shX+4,   hipY-6*lM,   17*lM],   // shoulder
    [10,      hipY-4*lM,   17*lM],
    [hipX+2,  hipY-3*lM,   16*lM],   // hips
    [T(15),   hipY-7*lM,   10*lM],   // tail base
    [T(32),   hipY-6*lM,    7*lM],
    [T(48),   hipY-4*lM,    4.5*lM],
    [T(62),   hipY-2*lM,    2.0*lM]  // tail tip
  ];

  // headgear sits on the crown of the frill, which the tilt moves forward as
  // well as up — the old anchor was still using the untilted top of the arc
  const crown = rot(fRx*.10, -fRy*.96);
  return { eye:[ex,ey], eyeR:3.4*hM, mouth:[hx - sn*1.12, hy + hh*.22],
           hat:crown, top: crown[1], spine };
}
