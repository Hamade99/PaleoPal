/* Triceratops horridus sprite
   Part of Paleopal. Load order matters; see build.py.

   Proportions follow the modern skeletals: a deep barrel torso, a tail about
   one and a half times the length of the torso and deep at its base, and a
   skull-and-frill unit carried forward of the shoulder rather than sitting on
   top of it.

   Rebuilt from the frame outwards after the previous animal was rejected as
   awkward next to the other two. Six passes of moving control points on it had
   changed nothing, and the reason showed up the moment the colour was stripped
   off and the silhouettes were put side by side: on the rex you can name every
   part from the outline alone, and on this one the frill ran straight into the
   shoulder, so the whole top line from beak to tail tip was a single unbroken
   lump. The notch of sky between the back of the frill and the shoulder is
   what says Triceratops, and nothing else about the animal can make up for
   its absence.

   Three things follow from that, and they are the rewrite:

     - the head is carried far enough forward, and the frill tipped back far
       enough, to open that notch
     - the neck is drawn on `head` rather than `skin`. The layer order is
       skin, shield, head, so the frill used to be painted across the neck and
       the animal read as a face with a plate leaning on it. Now the head unit
       covers the shield's base and the shield stands behind it
     - the barrel has three heights along the top and three along the bottom
       instead of one each, and the shoulder and haunch are their own masses,
       so the legs come out of an animal rather than out of a plank

   The tail also lost a third of its length; it was carrying about as much of
   the animal's area as the whole body.

   Growth follows Horner and Goodwin's series of ten skulls:
     - the frill is present and deeply scalloped from the start, and lengthens
       with positive allometry (STAGE.frill)
     - the epoccipitals along the rim start as deep deltoid scallops and
       flatten to low spindles that fuse into the margin (`epi`, per stage
       in SPECIES_STAGE)
     - the brow horns are straight stubs, curve backward in juveniles,
       straighten in subadults and recurve forward in adults (STAGE.hornBend)
   -------------------------------------------------------------------------- */
const TRI_HIND = { stride:.34, lift:.11, duty:.66, mt:.15, back:.2,  bend:1,  thigh:true,  foot:'column' };
const TRI_FORE = { stride:.32, lift:.10, duty:.66, mt:.15, back:-.1, bend:-1, thigh:false, foot:'column' };
function drawTrike(M, P){
  const A = artFor('trike', P.stage), st = A.st, T_ = A.tune;
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const hF = st.horn, sM = st.snout, fM = st.frill, bend = st.hornBend;
  const bk = st.bulk, tor = st.torso;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;
  const TL = T_.tailLen;

  /* The frame the animal hangs on. Three heights along the top — withers,
     a dip, then the haunch — and three along the bottom — brisket, a slight
     waist, then the flank. The old one had one height for the whole back and
     one for the whole belly, which is a loaf with a head on it, and no amount
     of moving the corners fixed that. */
  const hipX  = T_.hipBack*tor, shX = -T_.shoulder*tor;
  const hipY  = -T_.hipH*lM - bob;
  const shY   = hipY + T_.shoulderDrop*lM;          // glenoid: how far the front leg is shorter
  const withY = shY - T_.withersH*lM;              // shoulder hump: the high point
  const backY = hipY - T_.backH*lM;                // mid back, below the withers
  const rumpY = hipY - T_.rumpH*lM;                // rising again over the hip
  const bellyY = hipY + T_.bellyD*lM*bk;
  const chestY = hipY + T_.chestD*lM*bk;           // the chest hangs lower than the waist
  const T = d => hipX + d*tM;

  legStep(M.far, hipX-6, hipY+2, (P.legPhase+.5)%1, 16*lM, TRI_HIND);
  legStep(M.far, shX-6,  shY+3,  (P.legPhase+.25)%1, 14.5*lM, TRI_FORE);

  /* One closed mass: chest, barrel, hips and tail. The neck is deliberately
     NOT in here — see below. */
  blob(M.skin, [
    [shX-9,       withY+9*lM],                     // front of the shoulder
    [shX+1,       withY],                          // withers
    [5,           backY],                          // mid back
    [hipX-2,      rumpY],                          // haunch
    [T(TL*13/62), hipY-T_.tailBase*lM*bk + sw*1.5],// the tail leaves the hips deep
    [T(TL*30/62), hipY-T_.tailBase*.62*lM + sw*3],
    [T(TL*46/62), hipY-T_.tailBase*.36*lM + sw*5],
    [T(TL),       hipY-T_.tailBase*.10*lM + sw*7], // tip
    [T(TL*58/62), hipY+1*lM + sw*7],
    [T(TL*38/62), hipY+3.5*lM + sw*4],
    [T(TL*16/62), hipY+5*lM*bk + sw*1.5],
    [hipX+2,      hipY+5.75*lM*bk],                // under the haunch, no shelf
    [hipX-6,      bellyY],                         // flank
    [6,           bellyY - T_.waistD*lM],          // waist
    [shX+7,       chestY],                         // deep chest
    [shX-7,       chestY - T_.chestD*.55*lM],      // brisket
    [shX-9,       withY+18*lM]                     // up the front of the shoulder
  ]);

  /* Haunch and shoulder as their own rounded masses, on the same material so
     they swell the outline without drawing a line across it. A quadruped this
     size reads by its two big muscle groups; without them the legs look
     pushed into a plank. */
  oval(M.skin, hipX-6, hipY-6*lM, T_.haunchR*lM*bk, T_.haunchR*.82*lM*bk);
  oval(M.skin, shX+5,  shY-6*lM,  T_.shoulderR*lM*bk, T_.shoulderR*.9*lM*bk);

  /* The head is carried forward of the shoulder, at about shoulder height.
     `neckLen` is the whole run from the glenoid to the occiput; the neck
     starts a third of the way along it and the skull hangs off the rest. */
  const nkX = shX - T_.neckLen*nM*.35, nkY = withY + T_.neckDrop*lM;
  const hx = nkX - T_.neckLen*nM*.65 - 9*hM*sM, hy = nkY + 6*lM + dr*5;
  const sn = T_.headLen*hM*sM, hh = T_.headDepth*hM;

  /* Frill: a shield standing behind the skull.

     Drawn before the neck and the skull, both of which are on `head`, and the
     layer order is skin, shield, head — so its lower margin is tucked behind
     them and only the arc above and behind the skull roof shows. Painted the
     other way round, which is how it was, the shield lies across the neck and
     the animal reads as a face with a plate leaning on it.

     What actually identifies this animal in silhouette is the notch of sky
     between the back of the frill and the shoulder. Every version without that
     notch read as one unbroken lump from beak to tail whatever else was done
     to it, so the frill is tipped back hard and the head carried far enough
     forward to open it. */
  const fx = hx + 14*hM, fy = hy - hh*1.16;
  const fRx = T_.frillW*hM*fM, fRy = T_.frillH*hM*fM;
  const fTilt = T_.frillTilt;
  const fc = Math.cos(fTilt), fs = Math.sin(fTilt);
  const rot = (px,py) => [fx + px*fc - py*fs, fy + px*fs + py*fc];
  const epi = T_.epi;
  const rim = [];
  const A0 = Math.PI*1.06, A1 = Math.PI*1.94;   // front edge, over the crown, down the back
  /* The epoccipitals scallop the rim itself. Sixteen of them came out as a
     one-pixel sawtooth that read as fur; an adult shows five or six knobs in
     side profile, so the rim is stepped at that count instead. */
  const EPI_N = 8;
  for (let i=0;i<=EPI_N;i++){
    const a = A0 + (A1-A0)*i/EPI_N;
    const r = (i % 2) ? 1.0 : (1 - epi);
    rim.push(rot(Math.cos(a)*fRx*r, Math.sin(a)*fRy*r));
  }
  rim.push(rot(fRx*.80, fRy*.52));              // rear-bottom corner, behind the neck
  rim.push(rot(fRx*.10, fRy*.60));              // bottom margin, behind the cheek
  rim.push(rot(-fRx*.74, fRy*.34));             // front-bottom, where the skull joins
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

  /* The neck, on `head` rather than `skin`, so it covers the frill's base and
     the two of them read as one head unit standing in front of the shield. */
  tube(M.head, [[shX+2, withY+11*lM],[nkX-2, nkY+1*lM],[hx+14*hM, hy-hh*.10]],
       [T_.neckThick*lM*bk, T_.neckThick*.94*lM*bk, 12*hM]);

  /* Skull: deep, boxy, and carried forward and below the frill base. It stops
     at the oral margin, because the mandible has to live somewhere. */
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

  /* Jaw and beak.

     A ceratopsian bites with two beaks — the rostral above, the predentary
     below — and they meet. The first pass built the mandible as a fixed
     fraction of the snout measured from the hinge, which left its tip twenty
     units short of the upper beak: a permanent underbite that read as a
     shark. The rostral overhung it, and both were drawn on `horn`, so the
     front of the face was two pale blobs with nothing between them.

     The mandible is built against the upper beak's own tip now. `beakL` is
     where that tip falls in hinge-local coordinates, so the lower jaw closes
     on it however the skull is scaled, at every growth stage. */
  const jHinge = [hx + 8*hM, hy + hh*.44], jawA = -jaw*.26;
  const beakTip = -sn*1.10;                      // the upper beak, from hx
  const beakL = beakTip - 8*hM;                  // the same point, from the hinge
  M.jaw.save(); M.jaw.translate(jHinge[0], jHinge[1]); M.jaw.rotate(jawA);
  /* Deep at the back where the coronoid process is, tapering to the beak.
     Carried at one depth the whole way it was a slab, and the face came out
     as three stacked bands: skull, jaw, beak. */
  blob(M.jaw, [[4, -hh*.10],
               [beakL*.30, -hh*.18],             // dorsal margin, under the tooth row
               [beakL*.66, -hh*.12],
               [beakL*.90,  hh*.06],             // rising to meet the predentary
               [beakL*.84,  hh*.30],
               [beakL*.40,  hh*.42],
               [4, hh*.48]]);
  M.jaw.restore();

  /* Rostral: the hooked tip of the upper beak, and only the tip. It used to
     start a third of the way back down the snout, which is a parrot's face
     rather than a Triceratops'. */
  blob(M.beak, [[hx-sn*.94, hy-hh*.30],[hx+beakTip, hy-hh*.02],[hx+beakTip-sn*.06, hy+hh*.26],
                [hx+beakTip+sn*.10, hy+hh*.44],[hx-sn*.90, lipY-hh*.04]]);
  // predentary, riding the jaw so it opens with it, closing on the rostral
  M.beak.save(); M.beak.translate(jHinge[0], jHinge[1]); M.beak.rotate(jawA);
  // it hooks up at the front, the way a predentary does, and stays inside the
  // mandible's own outline instead of hanging off it as a spike
  blob(M.beak, [[beakL*.56, -hh*.06],[beakL*.92, hh*.02],[beakL*.86, hh*.26],[beakL*.52, hh*.34]]);
  M.beak.restore();

  if (jaw > .06){
    const uTip = [hx + beakTip + sn*.06, lipY - hh*.04];
    const lTip = [jHinge[0] + (beakL*.86)*Math.cos(jawA) - (hh*.06)*Math.sin(jawA),
                  jHinge[1] + (beakL*.86)*Math.sin(jawA) + (hh*.06)*Math.cos(jawA)];
    M.mouth.beginPath();
    M.mouth.moveTo(jHinge[0], jHinge[1]);
    M.mouth.lineTo(uTip[0], uTip[1]);
    M.mouth.lineTo(lTip[0], lTip[1]);
    M.mouth.closePath(); M.mouth.fill();
  } else {
    tube(M.mouth, [[hx+6*hM, lipY+hh*.06],[hx-sn*.38, lipY+hh*.04],[hx-sn*.86, lipY-hh*.02]],
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
  const hl = hh*(.50 + T_.hornLen*hF);
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
  /* Jugal horn: a point on the cheek, and it has to stay on the cheek. Run
     down past the mandible's ventral line it stops being a cheek boss and
     becomes a pale tusk hanging under the jaw — which, with the rostral also
     drawn in horn, was the second of the two white tips on the front of this
     face. */
  blob(M.beak, [[hx-sn*.04, hy+hh*.60],[hx-sn*.28, hy+hh*.56],[hx-sn*.12, hy+hh*.90]]);

  /* Nubbin feature scales, kept to the flank where there is room for them.
     Scattered over the whole animal they read as dirt rather than as skin. */
  for (const q of [[6,-12],[18,-14],[30,-11],[13,-6]])
    oval(M.crest, q[0], hipY + q[1]*lM, 1.6*lM, 1.1*lM);

  // the ventral countershading is painted from the spine by paintBelly

  legStep(M.limb, hipX-1, hipY, P.legPhase, 18*lM, TRI_HIND, M.horn);
  legStep(M.limb, shX+3,  shY+1, (P.legPhase+.75)%1, 16.5*lM, TRI_FORE, M.horn);

  eyeAt(M, ex, ey, 3.4*hM, P.eye);

  /* Centreline for the coat painter: nape to tail tip, with the body's
     half-depth at each station so a band knows how far to run. */
  const spine = [
    [shX-4,   withY+8*lM,   8*lM],   // base of the neck
    [shX+5,   hipY-T_.backH*.75*lM, 16*lM],   // shoulder
    [5,       hipY-T_.backH*.70*lM, 17*lM],
    [hipX,    hipY-T_.rumpH*.72*lM, 16*lM],   // hips
    [T(TL*15/62), hipY-7*lM,   10*lM],   // tail base
    [T(TL*32/62), hipY-6*lM,    7*lM],
    [T(TL*48/62), hipY-4*lM,    4.5*lM],
    [T(TL),     hipY-2*lM,    2.0*lM]  // tail tip
  ];

  /* Headgear goes on the skull roof, not on the frill. The crown of the frill
     is the highest point on the animal, which is why it was the anchor, but a
     hat up there is a hat on a shield standing behind the head — it read as
     hovering in the sky behind the animal, because that is where the top of the
     frill is. The roof is the strip between the brow horns and the frill's
     front edge, so the hat is placed along it and sized to it: far enough back
     to clear the horns, far enough forward that the frill rises behind it. */
  const crown = rot(fRx*.10, -fRy*.96);        // still the highest point, for `top`
  const roofBack = fx - fRx*.30*fc;            // where the frill leaves the skull
  const roofFront = ex + 5*hM;                 // the brow horn bases
  /* Where the big pieces of this animal are, for the editor's Body tab to hang
     handles on. They are read-only landmarks — dragging one writes the TUNE
     numbers underneath it, never these — and they exist here because only the
     draw function knows where it put anything. */
  /* The skeleton, published.
     Every one of these already existed as a local variable — `hx`, `hipY`,
     `fTilt` — computed from the growth columns and the pose and then thrown
     away when the function returned. Handing them out is what lets a part be
     data: a shape bound to `skull` turns when the skull turns and scales when
     it scales, and nothing has to be told how.

     Each carries its own units, and that is the load-bearing detail. `skull`
     measures x in snout lengths and y in head depths, so a point on the face
     stays on the face at every growth stage without anybody storing four
     copies of it. `frill` carries the tilt as well, so a shape bound to it is
     tipped with the shield rather than sheared across it. */
  const joints = {
    hip:      { x: hipX,  y: hipY,   sx: 1,  sy: lM, sw: lM },
    rump:     { x: hipX,  y: rumpY,  sx: 1,  sy: lM, sw: lM },
    haunch:   { x: hipX-6, y: hipY-6*lM, sx: lM*bk, sy: lM*bk, sw: lM*bk },
    back:     { x: 0,     y: backY,  sx: 1,  sy: lM, sw: lM },
    withers:  { x: shX,   y: withY,  sx: 1,  sy: lM, sw: lM },
    shoulder: { x: shX,   y: shY,    sx: 1,  sy: lM, sw: lM },
    chest:    { x: shX,   y: chestY, sx: 1,  sy: lM, sw: lM },
    belly:    { x: 0,     y: bellyY, sx: 1,  sy: lM, sw: lM },
    neck:     { x: nkX,   y: nkY,    sx: 1,  sy: lM, sw: lM*bk },
    skull:    { x: hx,    y: hy,     sx: sn, sy: hh, sw: hM },
    jaw:      { x: jHinge[0], y: jHinge[1], sx: sn, sy: hh, sw: hM, rot: jawA },
    frill:    { x: fx,    y: fy,     sx: fRx, sy: fRy, sw: hM*fM, rot: fTilt },
    brow:     { x: ex,    y: ey,     sx: hM, sy: hh, sw: hM*(.40 + .60*hF) },
    eye:      { x: ex,    y: ey,     sx: hM, sy: hM, sw: hM },
    tail0:    { x: T(TL*13/62), y: hipY + sw*1.5, sx: tM, sy: lM*bk, sw: lM*bk },
    tail1:    { x: T(TL*30/62), y: hipY + sw*3,   sx: tM, sy: lM, sw: lM },
    tail2:    { x: T(TL*46/62), y: hipY + sw*5,   sx: tM, sy: lM, sw: lM },
    tail3:    { x: T(TL),       y: hipY + sw*7,   sx: tM, sy: lM, sw: lM }
  };

  const parts = {
    snout:    [hx - sn, hy],
    jaw:      [hx - sn*.38, lipY + hh*.06],
    head:     [hx, hy],
    frill:    crown,
    neck:     [nkX, nkY],
    shoulder: [shX, withY],
    foreleg:  [shX, shY],
    back:     [5, backY],
    rump:     [hipX-2, rumpY],
    hip:      [hipX, hipY],
    haunch:   [hipX-6, hipY-6*lM],
    chest:    [shX+7, chestY],
    belly:    [6, bellyY],
    tailBase: [T(TL*13/62), hipY - T_.tailBase*lM*bk],
    tail:     [T(TL), hipY - 4*lM]
  };
  return { eye:[ex,ey], eyeR:3.4*hM, mouth:[hx - sn*1.12, hy + hh*.22],
           hat:[roofFront + (roofBack - roofFront)*.52, hy - hh*1.12],
           hatW: (roofBack - roofFront)*1.05,
           top: crown[1], spine, parts, joints };
}
