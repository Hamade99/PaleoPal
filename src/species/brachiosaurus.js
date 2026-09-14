/* Brachiosaurus altithorax sprite
   Part of Paleopal. Load order matters; see build.py. */

/* ---------------------------- Brachiosaurus -------------------------------- */
const BRA_FORE = { stride:.30, lift:.06, duty:.74, mt:.07, back:0,   bend:-1, thigh:false, foot:'hoof' };
const BRA_HIND = { stride:.30, lift:.06, duty:.74, mt:.15, back:.30, bend:1,  thigh:true,  foot:'pad' };
function drawBrachio(M, P){
  const A = artFor('brachio', P.stage), st = A.st;
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const bk = st.bulk, tor = st.torso, cr = st.horn;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;
  const fold = P.fold||0, curl = P.curl||0;

  /* The forelimbs run about 1.2 times the hindlimbs — the trait the animal is
     named for, and the reason the back slopes. It is an ADULT trait. Sauropod
     growth series have hatchlings built much closer to square, with the
     disproportion and the long neck arriving together, so a baby is a
     level-backed, short-necked, big-headed thing and only the adult is the
     silhouette everyone recognises. Held at 1.2 from hatching, every stage
     was the adult at a different size, which was the complaint. */
  const mature = P.stage / (STAGE.length - 1);          // 0 hatchling, 1 adult
  const T_ = A.tune, TL = T_.tailLen;
  /* This one sleeps on its feet, and it got there the long way round.

     Recumbency does not draw on this animal. Its body is a closed tube from
     shoulder to tail resting on its own radius, so folded limbs finish up
     *inside* it and what reaches the glass is a legless sausage. Curling it up
     like a cat was then tried — both ends turned inward, tail swept over the
     rump, neck laid back along the body — on the theory that a curled animal
     is not supposed to show its legs and the shape would say so. It came out
     an unreadable lump with a hook on it: at this size you could not tell
     which end was the head, and the tail arc read as a separate object.

     Standing is the honest answer anyway. No sauropod is preserved resting,
     nothing that size could fold up and get back out of it, and large animals
     generally can and do sleep on their feet. So `fold` settles the weight
     rather than putting the animal down — the body drops a tenth onto slightly
     bent legs and stays there — and `curl` does the work; see the neck below. */
  const settle = 1 - .10*fold;
  const hindLen = T_.hindH*lM*settle;
  const foreLen = T_.hindH*lM * (1.00 + (T_.foreRatio-1)*mature) * settle;
  const shX = -T_.shoulder*tor, shY = -foreLen - bob, hipX = T_.hipBack*tor, hipY = -hindLen - bob;
  /* A dozing animal lets its tail down. Not a fixed number of units — the tail
     stations are literal offsets from the hip and do not scale with `limb`, so
     a drop that looked right on an adult put a hatchling's tip in the soil.
     This aims the tip at a quarter of the hip's height instead, which holds at
     every stage: well down from the carried, level tail of an animal that is
     awake, and still clear of the ground, because a sauropod's tail is
     stiffened and does not lie on it. */
  const lay = t => fold * Math.max(0, -hipY*.75 - 10) * t * t;

  legStep(M.far, shX-7,  shY+4, (P.legPhase+.25)%1, 14*lM, BRA_FORE);
  legStep(M.far, hipX-7, hipY+3,(P.legPhase+.5)%1,  14*lM, BRA_HIND);

  // short tail for a sauropod, carried clear of the ground
  tube(M.skin, [[hipX,hipY],[hipX+TL*22/86*tM,hipY+1+sw*3+lay(22/86)],
                [hipX+TL*44/86*tM,hipY+3+sw*5+lay(44/86)],
                [hipX+TL*66/86*tM,hipY+6+sw*7+lay(66/86)],
                [hipX+TL*tM,hipY+10+sw*9+lay(1)]],
       [31*lM*bk, 22*lM*bk, 14*lM, 7*lM, 2.5*lM]);
  // the back slopes down from the shoulders to the hips
  tube(M.skin, [[shX,shY],[8*tor,shY+8],[hipX,hipY]],
       [T_.bodyD*39/44*lM*bk, T_.bodyD*lM*bk, T_.bodyD*34/44*lM*bk]);
  oval(M.skin, shX + 2, shY - 6*lM, 18*lM*bk, 12*lM*bk);    // shoulder hump

  /* Neck near sixty degrees, S-curved, drooping slightly at the head end —
     and `curl` brings it down to doze. It comes out of its sixty degrees, arcs
     forward, and the head hangs at about the height of the knees, which is
     what a standing animal's neck does when it stops holding it up.

     Not down on the ground: that is a sauropod drinking, and this one is
     asleep. Not back over the body either — see above. Against an idle animal
     carrying its head three body-depths in the air it is still the largest
     silhouette change any of the three species makes, which is what has to be
     true: a lowered neck and a shut eye are all this animal has to say it
     with. */
  const nl = T_.neckLen*nM;
  const nk = (sx, sy, rx, ry) => [lerp(sx, rx, curl), lerp(sy, ry, curl)];
  const n1 = nk(shX - 9 - dr,    shY - nl*.30 + dr*2, shX - 11,     shY - nl*.10);
  const n2 = nk(shX - 19 - dr*3, shY - nl*.63 + dr*5, shX - nl*.42, shY + nl*.20);
  const n3 = nk(shX - 23 - dr*4, shY - nl*.94 + dr*8, shX - nl*.68, shY + nl*.46);
  /* The whole neck thickens with `bulk`, the head end included. Left at its
     adult width under a hatchling's oversized skull, the neck came out as a
     stick with a head on the end of it. */
  tube(M.head, [[shX-3, shY-9],n1,n2,n3],
       [T_.neckThick*lM*bk, T_.neckThick*19/26*lM*bk, T_.neckThick*15/26*lM*bk, T_.neckThick*12.5/26*lM*bk]);

  const sM = st.snout;
  const hx = n3[0] - 7*hM, hy = n3[1] - 4*hM, sn = T_.headLen*hM*sM, hh = T_.headDepth*hM;
  // the muzzle is shallower than the braincase, and more so when young
  const fh = hh * (0.62 + 0.38*st.muzzle);

  /* The skull is about ten pixels long, so only three things can read on it:
     the crest silhouette, the eye, and the jaw line. It had two. The muzzle is
     squared off in front, where the spatulate teeth sat, rather than rounded
     to a lump. */
  const lipY = hy + hh*.34;
  blob(M.head, [[hx+10*hM,hy-hh*.8],[hx-sn*.35,hy-hh*1.15],[hx-sn*.94,hy-fh*.52],
                [hx-sn*1.04,hy-fh*.06],[hx-sn*.98,lipY-fh*.06],
                [hx-sn*.30,lipY+hh*.06],[hx+10*hM,hy+hh*.72]]);

  /* Mandible. The sauropod jaw line is long and close to straight, running
     back to below the eye. */
   const jHinge = [hx + 6*hM, hy + hh*.30], jawA = -jaw*.22;
   const jawLength = sn + 6*hM;
  M.jaw.save(); M.jaw.translate(jHinge[0], jHinge[1]); M.jaw.rotate(jawA);
   blob(M.jaw, [[2,-hh*.06],[-jawLength*.42,-hh*.12],[-jawLength*.98,hh*.02],
                      [-jawLength*.94,hh*.34],[-jawLength*.30,hh*.46],[3,hh*.36]]);
  M.jaw.restore();
  if (jaw > .06){
    const uTip = [hx - sn*.96, lipY - hh*.08];
   const lTip = [jHinge[0] - jawLength*.98*Math.cos(jawA) - hh*.02*Math.sin(jawA),
              jHinge[1] - jawLength*.98*Math.sin(jawA) + hh*.02*Math.cos(jawA)];
    // the gape is left open, flesh only in the corner at the hinge (see the note in rex.js)
    const corner = .28;
    M.mouth.beginPath();
    M.mouth.moveTo(jHinge[0], jHinge[1]);
    M.mouth.lineTo(lerp(jHinge[0], uTip[0], corner), lerp(jHinge[1], uTip[1], corner));
    M.mouth.lineTo(lerp(jHinge[0], lTip[0], corner), lerp(jHinge[1], lTip[1], corner));
    M.mouth.closePath(); M.mouth.fill();
  } else {
    tube(M.mouth, [[hx+4*hM, hy+hh*.30],[hx-sn*.44, lipY+hh*.02],[hx-sn*.92, lipY-hh*.08]],
         [Math.max(.9,1.3*hM), Math.max(.8,1.1*hM), Math.max(.6,.8*hM)]);
  }

  /* The nasal chamber on the roof of a very small skull, and it grows. On a
     hatchling it is a low swelling; the tall arch is an adult's, so it rides
     the horn column the other two species use for their ornament. It is the
     only thing this skull can say at ten pixels long besides the eye and the
     jaw line, so it is worth having it change. */
  const crTop = 1.10 + (T_.crestH-1.10)*cr, crBack = 0.85 + 0.85*cr;
  blob(M.crest, [[hx+2*hM,hy-hh*1.0],[hx-sn*.16,hy-hh*crTop],
                 [hx-sn*.62,hy-hh*crBack],[hx-sn*.6,hy-hh*.85]]);
   oval(M.mouth, hx - sn*.82, hy - fh*.38, Math.max(.7,.9*hM), Math.max(.6,.7*hM));

  // the ventral countershading is painted from the spine by paintBelly

  const nf = legStep(M.limb, shX+4, shY+2, (P.legPhase+.75)%1, 17*lM, BRA_FORE);
  legStep(M.limb, hipX+2, hipY, P.legPhase, 17*lM, BRA_HIND, M.horn);
  oval(M.horn, nf[0] - 5.4*lM, nf[1] - 2.6*lM, 1.9*lM, 2.2*lM);   // short brachiosaurid thumb claw

  eyeAt(M, hx - sn*.48, hy - hh*.3, 2.9*hM, P.eye);

  /* Centreline for the coat painter. It runs the whole animal, neck included,
     so banding comes down the neck and resolves into rings out the tail —
     which is the one place a sauropod coat has somewhere to go. */
  const spine = [
    [n3[0], n3[1] + 4,   9*lM],          // base of the skull
    [n2[0], n2[1],      10*lM],
    [n1[0], n1[1],      13*lM],
    [shX - 2, shY + 2,  19*lM],          // shoulder hump
    [8*tor,   shY + 8,  22*lM],          // deepest, over the ribs
    [hipX,    hipY,     17*lM],          // hips
    [hipX + TL*22/86*tM, hipY + 1 + lay(22/86),  11*lM],    // tail
    [hipX + TL*44/86*tM, hipY + 3 + lay(44/86),   7*lM],
    [hipX + TL*66/86*tM, hipY + 6 + lay(66/86),   3.5*lM],
    [hipX + TL*tM,     hipY + 10 + lay(1),      1.5*lM]
  ];

  /* Headgear goes over the nasal arch, the only thing on this skull tall enough
     to hang a hat on. Both the centre and the width come off the arch's own
     control points rather than a fraction of the snout: the arch is built from
     `crTop` and `crBack`, which move with `st.horn` as the animal grows, so a
     hand-picked fraction of `sn` drifted across it — a pixel and a half behind
     the middle on an adult and the same distance in front of it on a hatchling,
     which is what made every hat look pushed off one edge or the other. */
  const crestBack = hx + 2*hM, crestFront = hx - sn*.62;
  /* Nudged forward off the exact summit. The arch is not symmetrical — the
     front slope is long and the back one drops away — so a hat centred on the
     highest pixel sits over the back slope and looks pushed off the edge, which
     is the complaint even though the arithmetic was centred. */
  return { eye:[hx - sn*.48, hy - hh*.3], eyeR:2.9*hM, mouth:[hx - sn*.9, hy + hh*.5],
           hat:[(crestBack + crestFront)/2 - sn*.12, hy - hh*crTop*.97],
           hatW: (crestBack - crestFront)*1.05,
           top: hy - hh*crTop, spine };
}

