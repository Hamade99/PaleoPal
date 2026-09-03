/* Triceratops horridus sprite
   Part of Paleopal. Load order matters; see build.py.

   Proportions follow the modern skeletals: a deep barrel torso, a tail about
   one and a quarter times the length of the torso and deep at its base, and a
   skull that is large but not half the animal. The earlier version had a tail
   shorter than the torso, which read as a stub.

   Growth follows Horner and Goodwin's series of ten skulls:
     - the frill is present and deeply scalloped from the start, and lengthens
       with positive allometry (STAGE.frill)
     - the epoccipitals along the rim start as deep deltoid scallops and
       flatten to low spindles that fuse into the margin (EPI_DEPTH)
     - the brow horns are straight stubs, then curve backward, then straighten,
       then recurve forward (STAGE.hornBend)
   -------------------------------------------------------------------------- */
const TRI_SPEC = { skin:'#ab7040', belly:'#ca9b64', crest:'#8a5228', horn:'#efe6c8',
                   mouth:'#7e3a30', outline:'#26190f' };
const TRI_HIND = { stride:.34, lift:.11, duty:.66, mt:.15, back:.2,  bend:1,  thigh:true,  foot:'column' };
const TRI_FORE = { stride:.32, lift:.10, duty:.66, mt:.15, back:-.1, bend:-1, thigh:false, foot:'column' };
/* how far the rim scallops bite in, per growth stage: deltoid when young,
   low spindles fused to the margin when adult */
const EPI_DEPTH = [.30, .24, .17, .11];

function drawTrike(M, P){
  const st = STAGE[P.stage];
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const hF = st.horn, sM = st.snout, fM = st.frill, bend = st.hornBend;
  const bob = P.body, sw = P.tail||0, dr = P.droop||0;

  const hipX = 26, hipY = -41*lM - bob;
  const shX = -16, shY = -38*lM - bob;         // torso 42 long, was 36
  const withY = hipY - 25*lM;                  // tall neural spines: a shoulder hump
  const backY = hipY - 20*lM, bellyY = hipY + 14*lM;
  const T = d => hipX + d*tM;

  legStep(M.far, hipX-7, hipY+2, (P.legPhase+.5)%1, 16*lM, TRI_HIND);
  legStep(M.far, shX-7,  shY+3,  (P.legPhase+.25)%1, 14.5*lM, TRI_FORE);

  /* One closed mass: nape, ribcage, hips and tail. The tail leaves the hips
     nearly as deep as the pelvis and tapers the whole way out, which is what
     stops it reading as a stub bolted on the back. */
  blob(M.skin, [
    [shX-12, withY+7*lM],                      // nape, meeting the frill
    [shX-1,  withY],                           // shoulder hump
    [8,      backY-1],                         // back
    [hipX+4, backY+2],                         // hips
    [T(12),  hipY-17*lM+sw*1.5],               // tail base, still deep
    [T(26),  hipY-13*lM+sw*3],
    [T(39),  hipY-8.5*lM+sw*5],
    [T(50),  hipY-4*lM+sw*7],                  // tail tip
    [T(48),  hipY-1.5*lM+sw*7],
    [T(34),  hipY+1*lM+sw*4],
    [T(18),  hipY+5*lM+sw*1.5],
    [T(5),   hipY+10*lM],
    [hipX-6, bellyY],                          // belly
    [2,      bellyY+2*lM],
    [shX+3,  bellyY-1*lM],
    [shX-10, hipY+2*lM]                        // throat
  ]);

  /* Frill: a solid bone shield, tipped back off the skull roof.

     The previous version drew it as an upright ellipse centred near the
     withers, which meant its lower-back half was buried in the shoulder hump
     and the whole thing read as a lump of neck rather than a shield. It is
     now built in its own tilted frame and carried high enough that the rim
     stands clear of the body outline the whole way round — that separation is
     the entire silhouette of the animal.

     It rides STAGE.frill, not the horn column: a baby already has an obvious,
     deeply scalloped frill and almost no horns. */
  const fx = shX - 14*nM - 3, fy = hipY - 24*lM - 8*nM + dr*4;
  const fRx = 16.0*hM*fM, fRy = 22.0*hM*fM;
  const fTilt = -0.40;                          // tipped back off the skull roof
  const fc = Math.cos(fTilt), fs = Math.sin(fTilt);
  const rot = (px,py) => [fx + px*fc - py*fs, fy + px*fs + py*fc];
  const epi = EPI_DEPTH[P.stage];
  const rim = [];
  const A0 = Math.PI*1.04, A1 = Math.PI*2.16;   // front-top, over the crown, down the back
  for (let i=0;i<=16;i++){                      // the epoccipitals scallop the rim itself
    const a = A0 + (A1-A0)*i/16;
    const r = (i % 2) ? 1.0 : (1 - epi);
    rim.push(rot(Math.cos(a)*fRx*r, Math.sin(a)*fRy*r));
  }
  rim.push(rot(fRx*.30, fRy*.86));              // bottom margin, tucking toward the jaw
  rim.push(rot(-fRx*.62, fRy*.66));             // front-bottom, where the skull joins
  blob(M.head, rim);

  /* Skull: long, low, and carried well forward and below the frill base. */
  const hx = fx - 17*hM*sM - 6, hy = fy + 13*hM, sn = 21*hM*sM, hh = 10.0*hM;
  blob(M.head, [[hx+19*hM, hy-hh*1.05],[hx-sn*.42, hy-hh*1.16],[hx-sn*.94, hy-hh*.55],
                [hx-sn*1.02, hy+hh*.35],[hx-sn*.45, hy+hh*.95],[hx+19*hM, hy+hh*.9]]);
  // hooked rostral beak: a parrot hook, not a rounded snout cap
  blob(M.horn, [[hx-sn*.86, hy-hh*.66],[hx-sn*1.30, hy-hh*.16],[hx-sn*1.34, hy+hh*.34],
                [hx-sn*1.06, hy+hh*.62],[hx-sn*.70, hy+hh*.70]]);
  const ex = hx - sn*.36, ey = hy - hh*.30;

  /* Brow horns. The keratin sheath ran well past the bone core, so an adult's
     are long; the curvature is the ontogenetic sequence — straight stubs, then
     backward, then straightening, then recurved forward. The mid control point
     bows against the tip, which is what makes a recurve read as a recurve
     rather than as a bent stick.

     Width tracks the sheath as well as the skull. Scaling thickness on head
     bulk alone gave hatchlings two fat cones where they should have stubs. */
  const hl = hh*(.50 + 1.95*hF);
  const hw = hM * (.40 + .60*hF);
  const browHorn = (dx, dy, len, w) => {
    const bx = ex + dx*hM, by = ey + dy;
    const tip = [bx - len*(.14 + .44*bend), by - len*.95];
    const mid = [(bx + tip[0])/2 + len*.18*bend, (by + tip[1])/2 + len*.05];
    tube(M.horn, [[bx,by], mid, tip], [w*hw, w*.50*hw, w*.12*hw]);
  };
  browHorn( 5, -hh*.58, hl,     7.2);
  browHorn(-3, -hh*.68, hl*.90, 6.0);
  // nasal horn: small in T. horridus, and small at every age
  tube(M.horn, [[hx-sn*.74, hy-hh*.28],[hx-sn*.88, hy-hh*(.45+.5*hF)]], [4.0*hM, 1.2*hM]);
  // jugal horn: a short cheek point aimed down and back, not a hanging tusk
  blob(M.horn, [[hx-sn*.18, hy+hh*.62],[hx-sn*.44, hy+hh*.56],[hx-sn*.24, hy+hh*1.06]]);

  // low nubbin feature scales over the flank and tail base
  for (const q of [[-2,-11],[10,-14],[22,-12],[15,-6],[32,-9],[2,-5],[41,-7]])
    oval(M.crest, q[0], hipY + q[1]*lM, 1.7*lM, 1.2*lM);

  oval(M.belly, 6, bellyY - 3*lM, 23*lM, 5*lM);

  legStep(M.limb, hipX+2, hipY, P.legPhase, 18*lM, TRI_HIND, M.horn);
  legStep(M.limb, shX+4, shY+1, (P.legPhase+.75)%1, 16.5*lM, TRI_FORE, M.horn);

  eyeAt(M, ex, ey, 2.7*hM, P.eye);
  oval(M.mouth, hx - sn*.74, hy - hh*.12, Math.max(.8,1.2*hM), Math.max(.8,1*hM));

  /* Centreline for the coat painter: nape to tail tip, with the body's
     half-depth at each station so a band knows how far to run. */
  const spine = [
    [shX-8,   withY+9*lM,   9*lM],   // nape
    [shX+4,   hipY-6*lM,   17*lM],   // shoulder
    [10,      hipY-4*lM,   17*lM],
    [hipX+2,  hipY-3*lM,   16*lM],   // hips
    [T(13),   hipY-7*lM,   10*lM],   // tail base
    [T(27),   hipY-6*lM,    7*lM],
    [T(40),   hipY-4*lM,    4.5*lM],
    [T(50),   hipY-3*lM,    2.0*lM]  // tail tip
  ];

  // headgear sits on the crown of the frill, which the tilt moved forward as
  // well as up — the old anchor was still using the untilted top of the arc
  const crown = rot(0, -fRy*.90);
  return { eye:[ex,ey], eyeR:2.7*hM, mouth:[hx - sn*1.15, hy + hh*.25],
           hat:crown, top: crown[1], spine };
}
