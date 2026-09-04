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
  const sn = 25*hM*sM, hh = 14.5*hM;
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

  /* Upper jaw, deep behind the eye. The premaxilla is squared off — a
     near-vertical front edge rather than a rounded nub — which is the quickest
     way to read tyrannosaur instead of generic theropod at this size. */
  const lipY = hy + hh*.30;
  blob(M.head, [[hx+13, hy-hh*.12],[hx+11, hy-hh*.96],[hx-sn*.30, hy-hh*1.04],
                [hx-sn*.62, hy-hh*.86],[hx-sn*.86, hy-hh*.62],
                // the front is carried on three near-vertical stations, so the
                // curve through them stays flat instead of rounding the tip off
                [hx-sn*.99, hy-hh*.44],[hx-sn*1.03, hy-hh*.16],[hx-sn*1.02, lipY-hh*.10],
                [hx-sn*.94, lipY],[hx-sn*.45, lipY+hh*.05],[hx+13, hy+hh*.36]]);

  /* Hinged mandible, on its own material. It was always drawn and always
     hinged, but it was painted onto `head`, and the compositor only draws an
     edge where two different materials meet — so the whole lower jaw merged
     into the skull and the animal had no mouth. It hangs below the upper
     jaw's oral margin, and that boundary is the lip line.

     −x is forward, so the jaw opens on a negative rotation. */
  const hinge = [hx + 11, hy + hh*.16], jawA = -jaw * .34;
  M.jaw.save(); M.jaw.translate(hinge[0], hinge[1]); M.jaw.rotate(jawA);
  blob(M.jaw, [[2,-hh*.16],[-sn*.40,-hh*.20],[-sn*.92,hh*.02],
               [-sn*.88,hh*.34],[-sn*.34,hh*.52],[2,hh*.44]]);
  M.jaw.restore();
  // pale chin, carried by the jaw rather than left floating under it
  M.belly.save(); M.belly.translate(hinge[0], hinge[1]); M.belly.rotate(jawA);
  oval(M.belly, -sn*.52, hh*.38, sn*.22, hh*.09);
  M.belly.restore();

  const about = (p, a, o) => [o[0] + (p[0]-o[0])*Math.cos(a) - (p[1]-o[1])*Math.sin(a),
                              o[1] + (p[0]-o[0])*Math.sin(a) + (p[1]-o[1])*Math.cos(a)];
  if (jaw > .06){
    /* The gape is the wedge between the two oral margins, anchored at the
       hinge. Drawing it as a slab carried around by the mandible put mouth
       lining outside the head; drawing it through `blob` bowed the curves
       outward and swallowed the whole face. Straight edges, because the two
       margins it runs between are straight. */
    const uTip = [hx - sn*.93, lipY - hh*.04];
    const lTip = about([hx - sn*.86, hy + hh*.36], jawA, hinge);
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
    tube(M.mouth, [[hx+9, hy+hh*.31],[hx-sn*.46, lipY+hh*.02],[hx-sn*.93, lipY-hh*.06]],
         [Math.max(.9,1.5*hM), Math.max(.8,1.25*hM), Math.max(.6,.8*hM)]);
  }

  const ex = hx - sn*.46, ey = hy - hh*.42;
  // lacrimal ridge above the eye, and the keratin row along the neck and back
  blob(M.crest, [[ex+7*hM, ey-hh*.32],[ex+1*hM, ey-hh*.66],[ex-7*hM, ey-hh*.5],[ex-6*hM, ey-hh*.26]]);
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

  eyeAt(M, ex, ey, 3.5*hM, P.eye);
  oval(M.mouth, hx - sn*.84, hy - hh*.34, Math.max(.8,1.2*hM), Math.max(.8,1.1*hM));

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

  return { eye:[ex,ey], eyeR:3.5*hM, mouth:[hx - sn*.82, hy + hh*.12],
           hat:[hx - sn*.16, hy - hh*1.02], top: hy - hh, spine };
}

