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
  const bob = P.body, sw = P.tail||0, dr = P.droop||0;
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
  blob(M.head, [[hx+10*hM,hy-hh*.8],[hx-sn*.35,hy-hh*1.15],[hx-sn*1.0,hy-hh*.3],
                [hx-sn*.95,hy+hh*.7],[hx-sn*.2,hy+hh*1.05],[hx+10*hM,hy+hh*.85]]);
  // tall nasal chamber sitting on the roof of a very small skull
  blob(M.crest, [[hx+2*hM,hy-hh*1.0],[hx-sn*.16,hy-hh*2.05],[hx-sn*.62,hy-hh*1.8],[hx-sn*.6,hy-hh*.85]]);
  oval(M.mouth, hx - sn*.5, hy - hh*1.55, Math.max(.8,1.1*hM), Math.max(.8,1.0*hM));

  oval(M.belly, 8, hipY + 15*lM, 16*lM, 4.2*lM);

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

