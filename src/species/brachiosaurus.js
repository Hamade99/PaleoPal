/* Brachiosaurus altithorax sprite
   Part of Paleopal. Load order matters; see build.py. */

/* ---------------------------- Brachiosaurus -------------------------------- */
const BRA_SPEC = { skin:'#71958a', belly:'#a9ba8e', crest:'#88a894', horn:'#e2e3bc',
                   mouth:'#4c3a35', outline:'#1b2422' };
const BRA_FORE = { stride:.30, lift:.06, duty:.74, mt:.07, back:0,   bend:-1, thigh:false, foot:'hoof' };
const BRA_HIND = { stride:.30, lift:.06, duty:.74, mt:.15, back:.30, bend:1,  thigh:true,  foot:'pad' };
function drawBrachio(M, P){
  const st = STAGE[P.stage];
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;
  // forelimbs about 1.2 times the hindlimbs: the trait the animal is named for
  const foreLen = 56*lM, hindLen = 46*lM;
  const shX = -14, shY = -foreLen - bob, hipX = 30, hipY = -hindLen - bob;

  legStep(M.far, shX-7,  shY+4, (P.legPhase+.25)%1, 14*lM, BRA_FORE);
  legStep(M.far, hipX-7, hipY+3,(P.legPhase+.5)%1,  14*lM, BRA_HIND);

  // short tail for a sauropod, carried clear of the ground
  tube(M.skin, [[hipX,hipY],[hipX+22*tM,hipY+1+sw*3],[hipX+44*tM,hipY+3+sw*5],
                [hipX+66*tM,hipY+6+sw*7],[hipX+86*tM,hipY+10+sw*9]],
       [31*lM, 22*lM, 14*lM, 7*lM, 2.5*lM]);
  // the back slopes down from the shoulders to the hips
  tube(M.skin, [[shX,shY],[8,shY+8],[hipX,hipY]], [39*lM, 44*lM, 34*lM]);
  oval(M.skin, shX + 2, shY - 6*lM, 18*lM, 12*lM);          // shoulder hump

  // neck near sixty degrees, S-curved, drooping slightly at the head end
  const nl = 58*nM;
  const n1 = [shX - 9,  shY - nl*.30];
  const n2 = [shX - 19, shY - nl*.63];
  const n3 = [shX - 23, shY - nl*.94 + dr*10];
  tube(M.head, [[shX-3, shY-9],n1,n2,n3], [26*lM, 18*lM, 13*lM, 11*lM]);

  const sM = st.snout;
  const hx = n3[0] - 7*hM, hy = n3[1] - 4*hM, sn = 16*hM*sM, hh = 8*hM;

  /* The skull is about ten pixels long, so only three things can read on it:
     the crest silhouette, the eye, and the jaw line. It had two. The muzzle is
     squared off in front, where the spatulate teeth sat, rather than rounded
     to a lump. */
  const lipY = hy + hh*.34;
  blob(M.head, [[hx+10*hM,hy-hh*.8],[hx-sn*.35,hy-hh*1.15],[hx-sn*.94,hy-hh*.52],
                [hx-sn*1.04,hy-hh*.06],[hx-sn*.98,lipY-hh*.06],
                [hx-sn*.30,lipY+hh*.06],[hx+10*hM,hy+hh*.72]]);

  /* Mandible. The sauropod jaw line is long and close to straight, running
     back to below the eye. */
  const jHinge = [hx + 6*hM, hy + hh*.30], jawA = -jaw*.30;
  M.jaw.save(); M.jaw.translate(jHinge[0], jHinge[1]); M.jaw.rotate(jawA);
  blob(M.jaw, [[2,-hh*.06],[-sn*.42,-hh*.12],[-sn*.94,hh*.02],
               [-sn*.88,hh*.34],[-sn*.30,hh*.46],[3,hh*.36]]);
  M.jaw.restore();
  if (jaw > .06){
    const uTip = [hx - sn*.96, lipY - hh*.08];
    const lTip = [jHinge[0] + (-sn*.90)*Math.cos(jawA) - (hh*.04)*Math.sin(jawA),
                  jHinge[1] + (-sn*.90)*Math.sin(jawA) + (hh*.04)*Math.cos(jawA)];
    M.mouth.beginPath();
    M.mouth.moveTo(jHinge[0], jHinge[1]);
    M.mouth.lineTo(uTip[0], uTip[1]);
    M.mouth.lineTo(lTip[0], lTip[1]);
    M.mouth.closePath(); M.mouth.fill();
  } else {
    tube(M.mouth, [[hx+4*hM, hy+hh*.30],[hx-sn*.44, lipY+hh*.02],[hx-sn*.92, lipY-hh*.08]],
         [Math.max(.9,1.3*hM), Math.max(.8,1.1*hM), Math.max(.6,.8*hM)]);
  }

  // tall nasal chamber sitting on the roof of a very small skull
  blob(M.crest, [[hx+2*hM,hy-hh*1.0],[hx-sn*.16,hy-hh*2.05],[hx-sn*.62,hy-hh*1.8],[hx-sn*.6,hy-hh*.85]]);
  /* Nares on the crest. As a filled block this read as a hole punched in a
     tuft of hair; a notch bitten out of the crest's front edge reads as a
     nostril. */
  oval(M.mouth, hx - sn*.54, hy - hh*1.62, Math.max(.7,.9*hM), Math.max(.6,.7*hM));

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
    [8,       shY + 8,  22*lM],          // deepest, over the ribs
    [hipX,    hipY,     17*lM],          // hips
    [hipX + 22*tM, hipY + 1,  11*lM],    // tail
    [hipX + 44*tM, hipY + 3,   7*lM],
    [hipX + 66*tM, hipY + 6,   3.5*lM],
    [hipX + 86*tM, hipY + 10,  1.5*lM]
  ];

  return { eye:[hx - sn*.48, hy - hh*.3], eyeR:2.9*hM, mouth:[hx - sn*.9, hy + hh*.5],
           hat:[hx - sn*.3, hy - hh*2.05], top: hy - hh*2.05, spine };
}

