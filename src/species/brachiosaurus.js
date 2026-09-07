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

  /* The forelimbs run about 1.2 times the hindlimbs — the trait the animal is
     named for, and the reason the back slopes. It is an ADULT trait. Sauropod
     growth series have hatchlings built much closer to square, with the
     disproportion and the long neck arriving together, so a baby is a
     level-backed, short-necked, big-headed thing and only the adult is the
     silhouette everyone recognises. Held at 1.2 from hatching, every stage
     was the adult at a different size, which was the complaint. */
  const mature = P.stage / (STAGE.length - 1);          // 0 hatchling, 1 adult
  const T_ = A.tune, TL = T_.tailLen;
  const hindLen = T_.hindH*lM, foreLen = hindLen * (1.00 + (T_.foreRatio-1)*mature);
  const shX = -T_.shoulder*tor, shY = -foreLen - bob, hipX = T_.hipBack*tor, hipY = -hindLen - bob;

  legStep(M.far, shX-7,  shY+4, (P.legPhase+.25)%1, 14*lM, BRA_FORE);
  legStep(M.far, hipX-7, hipY+3,(P.legPhase+.5)%1,  14*lM, BRA_HIND);

  // short tail for a sauropod, carried clear of the ground
  tube(M.skin, [[hipX,hipY],[hipX+TL*22/86*tM,hipY+1+sw*3],[hipX+TL*44/86*tM,hipY+3+sw*5],
                [hipX+TL*66/86*tM,hipY+6+sw*7],[hipX+TL*tM,hipY+10+sw*9]],
       [31*lM*bk, 22*lM*bk, 14*lM, 7*lM, 2.5*lM]);
  // the back slopes down from the shoulders to the hips
  tube(M.skin, [[shX,shY],[8*tor,shY+8],[hipX,hipY]],
       [T_.bodyD*39/44*lM*bk, T_.bodyD*lM*bk, T_.bodyD*34/44*lM*bk]);
  oval(M.skin, shX + 2, shY - 6*lM, 18*lM*bk, 12*lM*bk);    // shoulder hump

  // neck near sixty degrees, S-curved, drooping slightly at the head end
  const nl = T_.neckLen*nM;
   const n1 = [shX - 9 - dr,  shY - nl*.30 + dr*2];
   const n2 = [shX - 19 - dr*3, shY - nl*.63 + dr*5];
   const n3 = [shX - 23 - dr*4, shY - nl*.94 + dr*8];
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
    M.mouth.beginPath();
    M.mouth.moveTo(jHinge[0], jHinge[1]);
    M.mouth.lineTo(uTip[0], uTip[1]);
    M.mouth.lineTo(lTip[0], lTip[1]);
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
    [hipX + TL*22/86*tM, hipY + 1,  11*lM],    // tail
    [hipX + TL*44/86*tM, hipY + 3,   7*lM],
    [hipX + TL*66/86*tM, hipY + 6,   3.5*lM],
    [hipX + TL*tM,     hipY + 10,  1.5*lM]
  ];

  /* Headgear goes over the nasal arch, which is the only thing on this skull
     tall enough to hang a hat on. Centred on the crest's peak and dropped
     slightly into it so it caps the hump rather than balancing on the point;
     `hatW` is the crest's own span, so it covers what it is sitting on and
     grows with the arch. */
  return { eye:[hx - sn*.48, hy - hh*.3], eyeR:2.9*hM, mouth:[hx - sn*.9, hy + hh*.5],
           hat:[hx - sn*.18, hy - hh*crTop*.97], hatW: sn*.78 + 2*hM,
           top: hy - hh*crTop, spine };
}

