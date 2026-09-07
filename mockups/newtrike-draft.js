/* A rebuilt Triceratops, parameterised so several takes come off one body of
   code. K holds only what makes a take different. */
function drawTrikeNew(M, P, K){
  const A = artFor('trike', P.stage), st = A.st, T_ = A.tune;
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail;
  const hF = st.horn, sM = st.snout, fM = st.frill, bend = st.hornBend;
  const bk = st.bulk, tor = st.torso;
  const bob = P.body, jaw = P.jaw||0, sw = P.tail||0, dr = P.droop||0;
  const TL = T_.tailLen;

  /* ---- the frame the animal hangs on ---------------------------------------
     A ceratopsian in side view is a deep barrel carried low between four
     pillars, with the shoulder standing higher than the hips and the head
     slung forward at about shoulder height. The old one had a level back and
     a level belly, which is a loaf. Three heights along the top and three
     along the bottom is the minimum that reads as an animal. */
  const hipX  = K.hipX*tor, shX = K.shX*tor;
  const hipY  = -T_.hipH*lM - bob;
  const shY   = hipY + K.shDrop*lM;              // glenoid, a little below the hip
  const withY = shY - K.withers*lM;              // shoulder hump: the high point
  const backY = hipY - K.back*lM;                // mid back, lower than the withers
  const rumpY = hipY - K.rump*lM;                // haunch rises again over the hip
  const bellyY = hipY + K.belly*lM*bk;
  const chestY = hipY + K.chest*lM*bk;           // chest hangs lower than the waist
  const T = d => hipX + d*tM;

  /* offside pair first, on `far` so they sit behind and darker */
  legStep(M.far, hipX-K.legSplay, hipY+2, (P.legPhase+.5)%1, 16*lM, TRI_HIND);
  legStep(M.far, shX-K.legSplay,  shY+3,  (P.legPhase+.25)%1, 14.5*lM, TRI_FORE);

  /* ---- one closed mass: chest, barrel, hips, tail --------------------------
     The neck is NOT in here. It is drawn on `head`, above the frill, so the
     shield rises behind the animal instead of being painted across its neck —
     which is what made the head read as a plate leaning on a body. */
  blob(M.skin, [
    [shX-K.chestF, withY+K.neckBase*lM],         // front of the shoulder
    [shX+1,        withY],                       // withers
    [K.midX,       backY],                       // mid back
    [hipX-2,       rumpY],                       // haunch
    [T(TL*13/62),  hipY-K.tailD*lM*bk + sw*1.5], // tail leaves the hips deep
    [T(TL*30/62),  hipY-K.tailD*.62*lM + sw*3],
    [T(TL*46/62),  hipY-K.tailD*.36*lM + sw*5],
    [T(TL),        hipY-K.tailD*.10*lM + sw*7],  // tip
    [T(TL*58/62),  hipY+1*lM + sw*7],
    [T(TL*38/62),  hipY+K.tailU*.7*lM + sw*4],
    [T(TL*16/62),  hipY+K.tailU*lM*bk + sw*1.5],
    [hipX+2,       hipY+K.tailU*1.15*lM*bk],     // under the haunch, no shelf
    [hipX-6,       bellyY],                      // belly behind the ribs
    [K.waistX,     bellyY - K.waist*lM],         // tucked waist
    [shX+7,        chestY],                      // deep chest
    [shX-K.chestF+2, chestY - K.chest*.55*lM],   // brisket
    [shX-K.chestF, withY+K.neckBase*lM + 9*lM]   // up the front of the shoulder
  ]);

  /* Haunch and shoulder as their own rounded masses, on the same material so
     they swell the outline without drawing a line across it. A quadruped this
     size reads by its two big muscle groups; without them the legs look
     pushed into a plank. */
  oval(M.skin, hipX-6, hipY-K.haunchY*lM, K.haunchR*lM*bk, K.haunchR*.82*lM*bk);
  oval(M.skin, shX+5,  shY-K.shoulderY*lM, K.shoulderR*lM*bk, K.shoulderR*.9*lM*bk);

  /* ---- head, carried forward at shoulder height --------------------------- */
  const nkX = shX - K.neckLen*nM, nkY = withY + K.neckDrop*lM;
  const hx = nkX - T_.neckLen*nM*K.headOut - 9*hM*sM, hy = nkY + 6*lM + dr*5;
  const sn = T_.headLen*hM*sM, hh = T_.headDepth*hM;

  /* ---- frill: a shield standing behind the skull --------------------------
     Drawn before the neck and the skull, both of which are on `head`, so its
     lower margin is tucked behind them and only the part that should be seen —
     the arc above and behind the skull roof — is. */
  const fx = hx + K.frillX*hM, fy = hy - hh*K.frillY;
  const fRx = T_.frillW*hM*fM*K.frillS, fRy = T_.frillH*hM*fM*K.frillS;
  const fTilt = K.frillTilt;
  const fc = Math.cos(fTilt), fs = Math.sin(fTilt);
  const rot = (px,py) => [fx + px*fc - py*fs, fy + px*fs + py*fc];
  const epi = T_.epi;
  const rim = [];
  const A0 = Math.PI*1.06, A1 = Math.PI*1.94;
  const EPI_N = 8;
  for (let i=0;i<=EPI_N;i++){
    const a = A0 + (A1-A0)*i/EPI_N;
    const r = (i % 2) ? 1.0 : (1 - epi);
    rim.push(rot(Math.cos(a)*fRx*r, Math.sin(a)*fRy*r));
  }
  rim.push(rot(fRx*.80, fRy*.52));
  rim.push(rot(fRx*.10, fRy*.60));
  rim.push(rot(-fRx*.74, fRy*.34));
  blob(M.shield, rim);
  for (let i=1;i<EPI_N;i+=2){
    const a = A0 + (A1-A0)*i/EPI_N;
    const q = rot(Math.cos(a)*fRx, Math.sin(a)*fRy);
    oval(M.horn, q[0], q[1], (1.1 + epi*7)*hM*fM, (1.0 + epi*5.5)*hM*fM);
  }

  /* ---- neck, on `head` so it covers the frill's base ---------------------- */
  tube(M.head, [[shX+2, withY+K.neckBase*lM + 2*lM],
                [nkX-2, nkY+1*lM],
                [hx+14*hM, hy-hh*.10]],
       [T_.neckThick*K.neckThick*lM*bk, T_.neckThick*K.neckThick*.94*lM*bk, 12*hM]);

  /* ---- skull -------------------------------------------------------------- */
  const lipY = hy + hh*.38;
  blob(M.head, [
    [hx+15*hM,   hy-hh*1.02],
    [hx+2*hM,    hy-hh*1.20],
    [hx-sn*.32,  hy-hh*1.08],
    [hx-sn*.66,  hy-hh*.84],
    [hx-sn*.90,  hy-hh*.46],
    [hx-sn*1.00, hy-hh*.06],
    [hx-sn*.88,  lipY-hh*.02],
    [hx-sn*.38,  lipY+hh*.06],
    [hx+4*hM,    hy+hh*.86],
    [hx+16*hM,   hy+hh*.36]
  ]);

  /* ---- jaw, beak, mouth: unchanged from the shipping animal --------------- */
  const jHinge = [hx + 8*hM, hy + hh*.44], jawA = -jaw*.26;
  const beakTip = -sn*1.10;
  const beakL = beakTip - 8*hM;
  M.jaw.save(); M.jaw.translate(jHinge[0], jHinge[1]); M.jaw.rotate(jawA);
  blob(M.jaw, [[4, -hh*.10],
               [beakL*.30, -hh*.18],
               [beakL*.66, -hh*.12],
               [beakL*.90,  hh*.06],
               [beakL*.84,  hh*.30],
               [beakL*.40,  hh*.42],
               [4, hh*.48]]);
  M.jaw.restore();
  blob(M.beak, [[hx-sn*.94, hy-hh*.30],[hx+beakTip, hy-hh*.02],[hx+beakTip-sn*.06, hy+hh*.26],
                [hx+beakTip+sn*.10, hy+hh*.44],[hx-sn*.90, lipY-hh*.04]]);
  M.beak.save(); M.beak.translate(jHinge[0], jHinge[1]); M.beak.rotate(jawA);
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

  /* ---- horns -------------------------------------------------------------- */
  const ex = hx - sn*.30, ey = hy - hh*.34;
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
  tube(M.horn, [[hx-sn*.72, hy-hh*.30],[hx-sn*.86, hy-hh*(.50+.5*hF)]], [4.0*hM, 1.2*hM]);
  blob(M.beak, [[hx-sn*.04, hy+hh*.60],[hx-sn*.28, hy+hh*.56],[hx-sn*.12, hy+hh*.90]]);

  /* Nubbin scales, kept to the flank where there is room for them. Scattered
     over the whole animal they read as dirt rather than as skin. */
  for (const q of [[6,-12],[18,-14],[30,-11],[13,-6]])
    oval(M.crest, q[0], hipY + q[1]*lM, 1.6*lM, 1.1*lM);

  legStep(M.limb, hipX-1, hipY, P.legPhase, 18*lM, TRI_HIND, M.horn);
  legStep(M.limb, shX+3,  shY+1, (P.legPhase+.75)%1, 16.5*lM, TRI_FORE, M.horn);

  eyeAt(M, ex, ey, 3.4*hM, P.eye);

  const spine = [
    [shX-4,   withY+8*lM,   8*lM],
    [shX+5,   hipY-K.back*.75*lM, 16*lM],
    [K.midX,  hipY-K.back*.70*lM, 17*lM],
    [hipX,    hipY-K.rump*.72*lM, 16*lM],
    [T(TL*15/62), hipY-7*lM,  10*lM],
    [T(TL*32/62), hipY-6*lM,   7*lM],
    [T(TL*48/62), hipY-4*lM, 4.5*lM],
    [T(TL),       hipY-2*lM, 2.0*lM]
  ];

  const crown = rot(fRx*.10, -fRy*.96);
  const roofBack = fx - fRx*.30*fc;
  const roofFront = ex + 5*hM;
  return { eye:[ex,ey], eyeR:3.4*hM, mouth:[hx - sn*1.12, hy + hh*.22],
           hat:[roofFront + (roofBack - roofFront)*.52, hy - hh*1.12],
           hatW: (roofBack - roofFront)*1.05,
           top: crown[1], spine };
}
