/* Tyrannosaurus rex sprite
   Part of Paleopal. Load order matters; see build.py. */

const REX_GAIT = { stride:.46, lift:.17, duty:.56, mt:.22, back:.34, bend:1, thigh:false, foot:'bird' };
function drawRex(M, P){
  const A = artFor('rex', P.stage), st = A.st, T_ = A.tune;
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const bk = st.bulk, tor = st.torso, fz = st.fuzz, bs = st.horn;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;

  /* Skeleton landmarks. Hip is the acetabulum; everything else hangs off it.

     `torso` shortens the trunk in young animals and `bulk` deepens it, which
     between them are most of the difference between a leggy slab-sided
     juvenile and a barrel-chested adult. Before they existed the three older
     stages were one animal at three sizes. */
  const hipX = 16,  hipY = -T_.hipH*lM - bob;
  const backY = hipY - T_.backH*lM, withX = -T_.shoulder*tor, withY = hipY - T_.withersH*lM;
  const bellyY = hipY + T_.bellyD*lM*bk, throatY = hipY + T_.bellyD/3*lM*bk;
  const hx = withX - T_.neckLen*nM - 4*hM, hy = withY - T_.neckDrop*nM - 2 + dr*9;
  const sM = st.snout;
  /* Skull depth at the orbit, and at the muzzle. A young tyrannosaur carries a
     shallow snout in front of a large braincase; the deep boxy skull is an
     adult feature and arrives late. One depth for both gave a hatchling an
     adult's slab of a face at hatchling scale. */
  const hh = T_.headDepth*hM, fh = hh * (0.46 + 0.54*st.muzzle);
  const dep = u => hh + (fh - hh) * u;     // linear taper along the snout
  const sn = T_.headLen*hM*sM;
  const T = d => hipX + d*tM;

  // far limb first, behind everything
  blob(M.far, [[hipX+9*lM, hipY-11*lM],[hipX+12*lM, hipY+4*lM],[hipX+2*lM, hipY+15*lM],
               [hipX-9*lM, hipY+13*lM],[hipX-13*lM, hipY-1*lM],[hipX-8*lM, hipY-11*lM]]);
  legStep(M.far, hipX-6, hipY+2, (P.legPhase+.5)%1, 14*lM, REX_GAIT);

  // one continuous mass from nape to tail tip: neck, ribcage, hips and tail
  const TL = T_.tailLen;
  const topLine = [[hx+11, hy-hh*.35],[withX, withY],[0, backY-1],[hipX+7, backY+1],[T(TL*23/72), hipY-T_.tailBase*lM+sw*2]];
  blob(M.skin, [
    [hx+11, hy-hh*.35],                     // nape at the skull
    [withX, withY],                         // withers
    [0, backY-1],                           // back
    [hipX+7, backY+1],                      // over the hips
    [T(TL*23/72), hipY-T_.tailBase*lM*bk+sw*2],   // deep tail base
    [T(TL*48/72), hipY-13*lM+sw*4],
    [T(TL),     hipY-7*lM+sw*6],                // tail tip
    [T(TL*70/72), hipY-4*lM+sw*6],
    [T(TL*43/72), hipY-1*lM+sw*4],
    [T(TL*17/72), hipY+4*lM*bk],
    [hipX-6, bellyY],                       // belly
    [-8, bellyY-1],
    [withX-7*bk, throatY-2],                // chest and throat
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
  const lipBack = hy + hh*.26, lipMid = hy + dep(.46)*.44, lipTip = hy + fh*.30;
  blob(M.head, [
    [hx+14, hy-hh*.06],                     // occiput, meeting the nape
    [hx+12, hy-hh*.90],
    [hx+2,  hy-hh*1.18],                    // vaulted braincase, over the orbit
    [hx-sn*.34, hy-dep(.34)*1.06],
    [hx-sn*.66, hy-dep(.66)*.84],
    [hx-sn*.88, hy-dep(.88)*.56],
    // three near-vertical stations across the front, so the curve through
    // them stays flat instead of rounding the premaxilla off
    [hx-sn*1.00, hy-fh*.30],
    [hx-sn*1.05, hy+fh*.02],
    [hx-sn*1.02, lipTip-fh*.06],
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
  const jawLength = sn + 12;
  M.jaw.save(); M.jaw.translate(hinge[0], hinge[1]); M.jaw.rotate(jawA);
  blob(M.jaw, [[2,-hh*.12],[-jawLength*.42,-dep(.42)*.10],[-jawLength*.96,fh*.06],
               [-jawLength*.94,fh*.32],[-jawLength*.66,dep(.66)*.52],[-jawLength*.24,hh*.58],[2,hh*.46]]);
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
    const lTip = about([hinge[0] - jawLength*.96, hinge[1] + fh*.06], jawA, hinge);
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
  /* Brow over the orbit. The lacrimal boss and the postorbital rugosity are
     adult ornament: they are barely there on a hatchling and heaviest on a
     full-grown animal, so this rides the same column the other horns do.
     It is a rounded hood rather than the flat plate it was — a straight bar
     over a round eye reads as a scowl. */
  const bw = .40 + .60*bs;
  blob(M.crest, [[ex+7.5*hM, ey-hh*.30],[ex+2*hM, ey-hh*(.30+.44*bw)],
                 [ex-6*hM, ey-hh*(.30+.30*bw)],[ex-7.5*hM, ey-hh*.30],
                 [ex-4*hM, ey-hh*.22],[ex+3*hM, ey-hh*.24]]);
  if (bs > .55){                                          // the postorbital boss
    oval(M.crest, ex + 8.5*hM, ey - hh*.16, 2.4*hM*bs, 3.0*hM*bs);
  }

  /* The coat.

     A juvenile tyrannosaur is reconstructed with a substantial covering of
     filaments that reduces with age; an adult keeps a keratin row down the
     neck and back and little else. This is the single most visible thing that
     can differ between two stages of one animal, and without it the juvenile,
     subadult and adult were one silhouette at three sizes.

     Both the down and the keratin row ride `topLine`, the same points the body
     outline uses, so neither can float off the back. The down is drawn as
     overlapping ovals of uneven length: an even row of equal spines is a
     mohawk, and what this wants to read as is a ragged fringe. */
  const backLen = pathLength(topLine);
  if (fz > .10){
    // one filament every few units of spine, not a fixed count: at a fixed
    // count a hatchling's short back took thirty-seven of them and they
    // overlapped into a solid band, which is a thicker animal, not a coat
    const n = Math.max(7, Math.round(backLen / (3.4*lM)));
    for (let i=0;i<n;i++){
      const t = i/(n-1);
      const q = samplePath(topLine, .01 + t*.92);
      const wob = Math.abs(Math.sin(i*2.39 + 1.1));
      // long enough to break the outline: a coat that stops at the back line
      // is a texture, and this has to read as a covering
      const len = (1.8 + T_.fuzzLen*fz) * lM * (0.40 + 0.60*wob) * (1 - t*.40);
      oval(M.crest, q[0] + len*.40, q[1] - len*.30, 1.5*lM, len*.62);
    }
    // and a tuft at the nape, where a young theropod's coat is thickest
    for (let i=0;i<4;i++){
      const len = (2.2 + T_.fuzzLen*5.6/5.2*fz) * lM * (0.55 + 0.45*Math.abs(Math.sin(i*3.1)));
      oval(M.crest, hx + 11 + i*2.4*lM, hy - hh*.36 - len*.30, 1.7*lM, len*.58);
    }
  }
  // the keratin row: sparse and low when young, a full row on an adult
  const rows = Math.max(5, Math.round(backLen / (5.6*lM)));
  for (let i=0;i<rows;i++){
    const q = samplePath(topLine, .04 + i*(.88/rows));     // ride the actual back line
    oval(M.crest, q[0], q[1] + 1.6*lM, 2.3*lM, (.8 + .6*(1-fz))*lM);
  }
  // the ventral countershading is painted from the spine by paintBelly

  // two-fingered hand, palm turned inward the way a theropod wrist actually sits
  const ax = withX + 9, ay = withY + 22*lM;
  tube(M.limb, [[ax,ay],[ax-T_.armLen*lM,ay+T_.armLen*lM],[ax-T_.armLen*20/11*lM,ay+7*lM]], [10*lM, 7.2*lM, 5.4*lM]);
  toes(M.horn, ax-T_.armLen*23/11*lM, ay+6*lM, 2, -1, Math.max(1.3, 2.3*lM));

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
    [T(TL*24/72), hipY - 9*lM,    9*lM],   // tail base
    [T(TL*48/72), hipY - 7*lM,    5.5*lM],
    [T(TL),     hipY - 6*lM,    2.0*lM]  // tail tip
  ];

  return { eye:[ex,ey], eyeR:4.0*hM, mouth:[hx - sn*.82, hy + hh*.14],
           hat:[hx - sn*.10, hy - hh*1.14], top: hy - hh*1.18, spine };
}

