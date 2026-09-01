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

  // skull: deep behind the eye, tapering to a blunt muzzle
  blob(M.head, [[hx+13, hy-hh*.12],[hx+11, hy-hh*.96],[hx-sn*.34, hy-hh*1.03],
                [hx-sn*.86, hy-hh*.72],[hx-sn*1.0, hy-hh*.08],[hx-sn*.92, hy+hh*.24],
                [hx-sn*.45, hy+hh*.32],[hx+13, hy+hh*.36]]);
  // hinged lower jaw. Lips cover the teeth, so a shut mouth shows none of them
  M.head.save(); M.head.translate(hx+10, hy+hh*.14); M.head.rotate(jaw*.44);
  blob(M.head, [[3,-hh*.28],[-sn*.38,-hh*.3],[-sn*.94,-hh*.04],[-sn*.88,hh*.3],[-sn*.34,hh*.46],[3,hh*.4]]);
  M.head.restore();
  if (jaw > .06){
    M.mouth.save(); M.mouth.translate(hx+10, hy+hh*.14); M.mouth.rotate(jaw*.44);
    blob(M.mouth, [[0,-hh*.2],[-sn*.38,-hh*.22],[-sn*.8,-hh*.02],[-sn*.76,hh*.18],[-sn*.28,hh*.26],[0,hh*.22]]);
    M.mouth.restore();
    for (let i=0;i<4;i++) oval(M.horn, hx - sn*.2 - i*sn*.17, hy + hh*.14, Math.max(.8,1.2*hM), Math.max(1.1,2*hM));
  }

  const ex = hx - sn*.46, ey = hy - hh*.42;
  // lacrimal ridge above the eye, and the keratin row along the neck and back
  blob(M.crest, [[ex+7*hM, ey-hh*.32],[ex+1*hM, ey-hh*.66],[ex-7*hM, ey-hh*.5],[ex-6*hM, ey-hh*.26]]);
  for (let i=0;i<10;i++){
    const q = samplePath(topLine, .04 + i*.088);          // ride the actual back line
    oval(M.crest, q[0], q[1] + 1.6*lM, 2.3*lM, 1.4*lM);
  }
  oval(M.belly, -6, bellyY - 2*lM, 17*lM, 4*lM);
  oval(M.belly, hx - sn*.3, hy + hh*.26, sn*.3, hh*.16);

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

  return { eye:[ex,ey], eyeR:3.5*hM, mouth:[hx - sn*.82, hy + hh*.12],
           hat:[hx - sn*.16, hy - hh*1.02], top: hy - hh };
}

