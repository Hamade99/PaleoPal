/* Tyrannosaurus rex sprite
   Part of Paleopal. Load order matters; see build.py. */

const REX_SPEC = { skin:'#7e9c54', belly:'#b8bd80', crest:'#5b7940', horn:'#e9dfba',
                   mouth:'#8e4a45', outline:'#241d13' };
const REX_GAIT = { stride:.46, lift:.17, duty:.56, mt:.22, back:.34, bend:1, thigh:false, foot:'bird' };
function drawRex(M, P){
  const st = STAGE[P.stage];
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;

  // skeleton landmarks. Hip is the acetabulum; everything else hangs off it.
  const hipX = 16,  hipY = -46*lM - bob;
  const backY = hipY - 24*lM, withX = -18, withY = hipY - 25*lM;
  const bellyY = hipY + 9*lM, throatY = hipY + 3*lM;
  const hx = withX - 26*nM - 4*hM, hy = withY - 10*nM - 2 + dr*9;
  const sM = st.snout;
  const sn = 23*hM*sM, hh = 15.5*hM;      // shorter and deeper than it was
  const T = d => hipX + d*tM;

  // far limb first, behind everything
  blob(M.far, [[hipX+9*lM, hipY-11*lM],[hipX+12*lM, hipY+4*lM],[hipX+2*lM, hipY+15*lM],
               [hipX-9*lM, hipY+13*lM],[hipX-13*lM, hipY-1*lM],[hipX-8*lM, hipY-11*lM]]);
  legStep(M.far, hipX-6, hipY+2, (P.legPhase+.5)%1, 14*lM, REX_GAIT);

  // one continuous mass from nape to tail tip: neck, ribcage, hips and tail
  const topLine = [[hx+11, hy-hh*.35],[withX, withY],[0, backY-1],[hipX+7, backY+1],[T(23), hipY-18*lM+sw*2]];
  blob(M.skin, [
    [hx+11, hy-hh*.35],                     // nape at the skull
    [withX, withY],                         // withers
    [0, backY-1],                           // back
    [hipX+7, backY+1],                      // over the hips
    [T(23), hipY-18*lM+sw*2],               // deep tail base
    [T(48), hipY-13*lM+sw*4],
    [T(72), hipY-7*lM+sw*6],                // tail tip
    [T(70), hipY-4*lM+sw*6],
    [T(43), hipY-1*lM+sw*4],
    [T(17), hipY+4*lM],
    [hipX-6, bellyY],                       // belly
    [-8, bellyY-1],
    [withX-7, throatY-2],                   // chest and throat
    [hx+9, hy+hh*.58]
  ]);

  /* Skull.

     The first version made every horizontal line straight: a flat roof from
     nape to muzzle, a ruler-straight oral margin under it, and a squared
     premaxilla at the end. Three straight lines and a right angle is a box
     with an eye on it, which is most of what made the face read as goofy.

     Three curves replace them, and none of them costs an anatomical claim:

       - the braincase domes over the orbit and falls away behind it. A
         tyrannosaur skull is deep and vaulted through the postorbital, and a
         big rounded braincase over a big eye is also the whole of what makes
         an animal read as young.
       - the oral margin is sinuous rather than level: high at the cheek,
         bowed down through the tooth row, lifting again at the tip. That is
         the shape the maxilla actually has, and read as a face it is a
         slight smile.
       - the muzzle keeps its squared-off front — a near-vertical premaxilla
         is the quickest way to read tyrannosaur rather than generic theropod
         at this size — but it is shorter and deeper than it was, so the head
         is a head rather than a snout with a skull behind it. */
  const lipBack = hy + hh*.26, lipMid = hy + hh*.44, lipTip = hy + hh*.30;
  blob(M.head, [
    [hx+14, hy-hh*.06],                     // occiput, meeting the nape
    [hx+12, hy-hh*.90],
    [hx+2,  hy-hh*1.18],                    // vaulted braincase, over the orbit
    [hx-sn*.34, hy-hh*1.06],
    [hx-sn*.66, hy-hh*.84],
    [hx-sn*.88, hy-hh*.56],
    // three near-vertical stations across the front, so the curve through
    // them stays flat instead of rounding the premaxilla off
    [hx-sn*1.00, hy-hh*.30],
    [hx-sn*1.05, hy+hh*.02],
    [hx-sn*1.02, lipTip-hh*.06],
    [hx-sn*.92, lipTip],                    // the oral margin, and its curve
    [hx-sn*.46, lipMid],
    [hx+14, lipBack]
  ]);

  /* Hinged mandible, on its own material. It was always drawn and always
     hinged, but it was painted onto `head`, and the compositor only draws an
     edge where two different materials meet — so the whole lower jaw merged
     into the skull and the animal had no mouth. It hangs below the upper
     jaw's oral margin, and that boundary is the lip line. The ventral profile
     is what shows, so it carries a rounded chin rather than the flat slab it
     had, which is the other half of the goofy face.

     −x is forward, so the jaw opens on a negative rotation. */
  const hinge = [hx + 12, hy + hh*.18], jawA = -jaw * .34;
  M.jaw.save(); M.jaw.translate(hinge[0], hinge[1]); M.jaw.rotate(jawA);
  blob(M.jaw, [[2,-hh*.12],[-sn*.42,-hh*.10],[-sn*.90,hh*.06],
               [-sn*.94,hh*.32],[-sn*.66,hh*.52],[-sn*.24,hh*.58],[2,hh*.46]]);
  M.jaw.restore();
  // pale chin, carried by the jaw rather than left floating under it
  M.belly.save(); M.belly.translate(hinge[0], hinge[1]); M.belly.rotate(jawA);
  oval(M.belly, -sn*.54, hh*.42, sn*.24, hh*.10);
  M.belly.restore();

  const about = (p, a, o) => [o[0] + (p[0]-o[0])*Math.cos(a) - (p[1]-o[1])*Math.sin(a),
                              o[1] + (p[0]-o[0])*Math.sin(a) + (p[1]-o[1])*Math.cos(a)];
  if (jaw > .06){
    /* The gape is the wedge between the two oral margins, anchored at the
       hinge. Drawing it as a slab carried around by the mandible put mouth
       lining outside the head; drawing it through `blob` bowed the curves
       outward and swallowed the whole face. Straight edges, because the two
       margins it runs between are straight. */
    const uTip = [hx - sn*.91, lipTip - hh*.02];
    const lTip = about([hx - sn*.88, hy + hh*.30], jawA, hinge);
    const gape = [hinge, uTip, lTip];
    M.mouth.beginPath();
    M.mouth.moveTo(gape[0][0], gape[0][1]);
    for (let i=1;i<gape.length;i++) M.mouth.lineTo(gape[i][0], gape[i][1]);
    M.mouth.closePath(); M.mouth.fill();
    /* Teeth. The large ones are maxillary; the dentary shows tips only, which
       is both what the animal had and what reads at this size. */
    const tw = Math.max(.9, 1.25*hM);
    for (let i=0;i<5;i++){
      const u = .18 + i*.17;
      oval(M.horn, lerp(hinge[0],uTip[0],u), lerp(hinge[1],uTip[1],u) + hh*.10,
           tw, Math.max(1.3, (2.4 - i*.22)*hM));
    }
    for (let i=0;i<4;i++){
      const u = .26 + i*.18;
      oval(M.horn, lerp(hinge[0],lTip[0],u), lerp(hinge[1],lTip[1],u) - hh*.08,
           tw*.8, Math.max(1.0, 1.5*hM));
    }
  } else {
    // shut: lips cover the teeth, so all that shows is the oral margin itself
    tube(M.mouth, [[hx+10, lipBack+hh*.02],[hx-sn*.46, lipMid],[hx-sn*.91, lipTip-hh*.02]],
         [Math.max(.9,1.5*hM), Math.max(.8,1.25*hM), Math.max(.6,.8*hM)]);
  }

  const ex = hx - sn*.40, ey = hy - hh*.34;
  /* Brow over the orbit, and the keratin row along the neck and back. The
     brow is a rounded hood rather than the flat plate it was — a straight bar
     over a round eye reads as a scowl, and there is a lacrimal boss there in
     any case. */
  blob(M.crest, [[ex+7.5*hM, ey-hh*.30],[ex+2*hM, ey-hh*.74],[ex-6*hM, ey-hh*.60],
                 [ex-7.5*hM, ey-hh*.30],[ex-4*hM, ey-hh*.22],[ex+3*hM, ey-hh*.24]]);
  for (let i=0;i<10;i++){
    const q = samplePath(topLine, .04 + i*.088);          // ride the actual back line
    oval(M.crest, q[0], q[1] + 1.6*lM, 2.3*lM, 1.4*lM);
  }
  // the ventral countershading is painted from the spine by paintBelly

  // two-fingered hand, palm turned inward the way a theropod wrist actually sits
  const ax = withX + 9, ay = withY + 22*lM;
  tube(M.limb, [[ax,ay],[ax-11*lM,ay+11*lM],[ax-20*lM,ay+7*lM]], [10*lM, 7.2*lM, 5.4*lM]);
  toes(M.horn, ax-23*lM, ay+6*lM, 2, -1, Math.max(1.3, 2.3*lM));

  // near limb: a heavy drumstick over the femur, then shank and bird foot
  blob(M.limb, [[hipX+14*lM, hipY-12*lM],[hipX+16*lM, hipY+5*lM],[hipX+5*lM, hipY+18*lM],
                [hipX-8*lM, hipY+15*lM],[hipX-14*lM, hipY-1*lM],[hipX-9*lM, hipY-13*lM]]);
  const foot = legStep(M.limb, hipX, hipY, P.legPhase, 15*lM, REX_GAIT);
  toes(M.horn, foot[0]-9*lM, foot[1]-1, 3, -1, Math.max(1.2, 2.1*lM));

  /* A larger eye set lower and further forward. Both eyes face forward, which
     the dossier promises, and a low, large orbit under a domed braincase is
     also the proportion that reads as young rather than as lizard. */
  eyeAt(M, ex, ey, 4.0*hM, P.eye);
  // naris: a slot well back from the tip, in the upper half of the muzzle
  oval(M.mouth, hx - sn*.78, hy - hh*.26, Math.max(.9,1.5*hM), Math.max(.7,.9*hM));

  /* Centreline for the coat painter: nape to tail tip, carrying the body's
     half-depth at each station so a band knows how far to run. */
  const spine = [
    [hx + 13,   hy + hh*.06,  hh*.52],   // nape
    [withX - 4, withY + 12*lM, 12*lM],   // withers
    [-4,        hipY - 7*lM,   16*lM],   // ribcage
    [hipX + 4,  hipY - 7*lM,   16*lM],   // hips
    [T(24),     hipY - 9*lM,    9*lM],   // tail base
    [T(48),     hipY - 7*lM,    5.5*lM],
    [T(72),     hipY - 6*lM,    2.0*lM]  // tail tip
  ];

  return { eye:[ex,ey], eyeR:4.0*hM, mouth:[hx - sn*.82, hy + hh*.14],
           hat:[hx - sn*.10, hy - hh*1.14], top: hy - hh*1.18, spine };
}

