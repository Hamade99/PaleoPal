/* Triceratops horridus sprite
   Part of Paleopal. Load order matters; see build.py. */

/* ----------------------------- Triceratops --------------------------------- */
const TRI_SPEC = { skin:'#ab7040', belly:'#ca9b64', crest:'#8a5228', horn:'#efe6c8',
                   mouth:'#7e3a30', outline:'#26190f' };
const TRI_HIND = { stride:.34, lift:.11, duty:.66, mt:.15, back:.2,  bend:1,  thigh:true,  foot:'column' };
const TRI_FORE = { stride:.32, lift:.10, duty:.66, mt:.15, back:-.1, bend:-1, thigh:false, foot:'column' };
function drawTrike(M, P){
  const st = STAGE[P.stage];
  const hM = st.head, nM = st.neck, lM = st.limb, tM = st.tail, hF = st.horn, sM = st.snout;
  const bob = P.body, sw = P.tail||0, dr = P.droop||0;

  const hipX = 24, hipY = -41*lM - bob;
  const shX = -12, shY = -38*lM - bob;
  const withY = hipY - 24*lM;                 // tall neural spines make a shoulder hump
  const backY = hipY - 20*lM, bellyY = hipY + 13*lM;
  const T = d => hipX + d*tM;

  legStep(M.far, hipX-7, hipY+2, (P.legPhase+.5)%1, 16*lM, TRI_HIND);
  legStep(M.far, shX-7,  shY+3,  (P.legPhase+.25)%1, 14.5*lM, TRI_FORE);

  // barrel body: deepest at the shoulder hump, dipping over the back, short tail
  blob(M.skin, [
    [shX-11, withY+6*lM],                     // nape, meeting the frill
    [shX,    withY],                          // shoulder hump
    [6,      backY-1],                        // back
    [hipX+3, backY+2],                        // hips
    [T(9),   hipY-16*lM+sw*2],                // hip bulge
    [T(21),  hipY-11*lM+sw*4],                // tail base
    [T(34),  hipY-4*lM+sw*6],                 // tail tip
    [T(32),  hipY-1*lM+sw*6],
    [T(16),  hipY+3*lM],
    [T(4),   hipY+8*lM],
    [hipX-4, bellyY],                         // belly
    [2,      bellyY+2*lM],
    [shX+2,  bellyY-1*lM],
    [shX-9,  hipY+2*lM]                       // throat
  ]);

  // frill: solid bone shield, tilted back, with epoccipital scallops on the rim
  const fx = shX - 15*nM - 4, fy = hipY - 14*lM - 8*nM + dr*4;
  const fRx = 17.5*hM*(.34+.66*hF), fRy = 20.5*hM*(.34+.66*hF);
  const rim = [];
  for (let i=0;i<=12;i++){                    // epoccipitals scallop the rim itself
    const a = Math.PI*1.20 + (Math.PI*1.28) * i/12;
    const r = (i % 2) ? 1.0 : .90;
    rim.push([fx + Math.cos(a)*fRx*r, fy + Math.sin(a)*fRy*r]);
  }
  rim.push([fx - fRx*.5, fy + fRy*.62], [fx - fRx*.95, fy - fRy*.15]);
  blob(M.head, rim);

  // skull: long, low and carried well forward of the frill
  const hx = fx - 19*hM*sM, hy = fy + 9*hM, sn = 21*hM*sM, hh = 10.5*hM;
  blob(M.head, [[hx+18*hM, hy-hh*1.15],[hx-sn*.42, hy-hh*1.2],[hx-sn*.94, hy-hh*.55],
                [hx-sn*1.02, hy+hh*.35],[hx-sn*.45, hy+hh*.95],[hx+18*hM, hy+hh*.9]]);
  // hooked rostral beak
  blob(M.horn, [[hx-sn*.84, hy-hh*.62],[hx-sn*1.36, hy-hh*.02],[hx-sn*1.2, hy+hh*.62],
                [hx-sn*.66, hy+hh*.74]]);
  const ex = hx - sn*.38, ey = hy - hh*.34;
  // brow horns: the keratin sheath ran past the bone core, so they are long
  tube(M.horn, [[ex+4*hM, ey-hh*.7],[ex-10*hM*hF, ey-(hh*.8+hh*1.15*hF)],
                [ex-24*hM*hF, ey-(hh*.85+hh*1.5*hF)]], [7.4*hM, 4.0*hM, 1.0*hM]);
  tube(M.horn, [[ex-4*hM, ey-hh*.78],[ex-17*hM*hF, ey-(hh*.7+hh*.85*hF)],
                [ex-31*hM*hF, ey-(hh*.7+hh*1.05*hF)]], [6.3*hM, 3.4*hM, .9*hM]);
  tube(M.horn, [[hx-sn*.76, hy-hh*.3],[hx-sn*.92, hy-hh*(.5+.55*hF)]], [4.4*hM, 1.3*hM]);
  blob(M.horn, [[hx-sn*.06, hy+hh*.5],[hx-sn*.34, hy+hh*.44],[hx-sn*.16, hy+hh*1.35]]); // jugal horn

  // low nubbin feature scales over the flank and tail base
  for (const q of [[-2,-10],[9,-13],[20,-11],[13,-5],[28,-8],[2,-4]])
    oval(M.crest, q[0], hipY + q[1]*lM, 1.7*lM, 1.2*lM);

  oval(M.belly, 6, bellyY - 3*lM, 22*lM, 5*lM);

  legStep(M.limb, hipX+2, hipY, P.legPhase, 18*lM, TRI_HIND, M.horn);
  legStep(M.limb, shX+4, shY+1, (P.legPhase+.75)%1, 16.5*lM, TRI_FORE, M.horn);

  eyeAt(M, ex, ey, 3.1*hM, P.eye);
  oval(M.mouth, hx - sn*.74, hy - hh*.12, Math.max(.8,1.2*hM), Math.max(.8,1*hM));

  return { eye:[ex,ey], eyeR:3.1*hM, mouth:[hx - sn*1.15, hy + hh*.25],
           hat:[fx - fRx*.1, fy - fRy*.95], top: fy - fRy };
}

