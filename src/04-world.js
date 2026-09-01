/* ==========================================================================
   WORLD
   The habitat is built the same way as the animals: flat colour blocked into
   integer columns, dithered gradients instead of smooth ones, one light from
   the upper left, and depth carried by parallax rather than by blur.
   ========================================================================== */

const SKY_SPECS = {
  night: { top:'#0a1124', low:'#28374f', far:'#1c2942', mid:'#151f2d', tree:'#111d20',
           grass:'#2b4331', dirt:'#382f27', water:'#22405a', tint:'rgba(16,24,54,.44)' },
  dawn:  { top:'#2c3f70', low:'#e39a6c', far:'#5d5b7c', mid:'#44465d', tree:'#2e4038',
           grass:'#5b7949', dirt:'#7b6046', water:'#7d6f86', tint:'rgba(196,124,84,.13)' },
  day:   { top:'#4d9dc9', low:'#c3e2d8', far:'#8fa79d', mid:'#6c8b6f', tree:'#3e5a44',
           grass:'#78a051', dirt:'#a5825a', water:'#6fa6b8', tint:'rgba(0,0,0,0)' },
  dusk:  { top:'#2b2854', low:'#da834b', far:'#504563', mid:'#3a3347', tree:'#2b3934',
           grass:'#597047', dirt:'#6f553f', water:'#6b5570', tint:'rgba(96,62,116,.20)' }
};
function skyPhase(d){
  const h = d.getHours() + d.getMinutes()/60;
  if (h < 5 || h >= 21) return 'night';
  if (h < 7.5) return 'dawn';
  if (h < 18)  return 'day';
  return 'dusk';
}
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const mixHex = (a,b,t) => {
  const A = [1,3,5].map(i=>parseInt(a.slice(i,i+2),16)), B = [1,3,5].map(i=>parseInt(b.slice(i,i+2),16));
  return '#' + A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join('');
};
const STARS = Array.from({length:54}, () => ({x:rnd(2,W-2), y:rnd(3,92), p:rnd(0,6.3), b:rnd(.4,1)}));
const MOTES = Array.from({length:14}, () => ({x:rnd(0,W), y:rnd(40,GROUND-6), vx:rnd(2,7), vy:rnd(-3,3), p:rnd(0,6.3)}));

/* --------------------------- baked backdrop -------------------------------- */
const bgCache = new Map();
function ridge(g, cfg){
  // integer-column heightfield: no antialiasing, so the silhouette stays crisp
  for (let x=0;x<W;x++){
    let h = cfg.base;
    for (const w of cfg.waves) h += Math.sin(x*w[0] + w[1]) * w[2];
    h = Math.round(h);
    g.fillStyle = cfg.col; g.fillRect(x, h, 1, GROUND - h + 2);
    g.fillStyle = cfg.lit; g.fillRect(x, h, 1, 1);
    let hn = cfg.base;
    for (const w of cfg.waves) hn += Math.sin((x+1)*w[0] + w[1]) * w[2];
    if (Math.round(hn) > h) g.fillRect(x, h, 1, 2);          // catch light on left faces
  }
}
function conifer(g, x, base, h, body, litc){
  g.fillStyle = '#2f2822';
  g.fillRect(x, base - Math.round(h*.2), 2, Math.round(h*.2));
  for (let k=0;k<3;k++){                                    // three tiers, each wider than the last
    const topY = Math.round(base - h + k*h*.26);
    const botY = Math.round(base - h + k*h*.26 + h*.40);
    const maxW = Math.round(h*.26 + k*h*.11);
    const rows = Math.max(2, botY - topY);
    for (let r=0;r<rows;r++){
      const wd = Math.max(1, Math.round(maxW * (r+1)/rows));
      g.fillStyle = body; g.fillRect(x - (wd>>1), topY + r, wd, 1);
      g.fillStyle = litc; g.fillRect(x - (wd>>1), topY + r, Math.max(1, wd*.4|0), 1);
    }
  }
}

function boulder(g, x, base, w, h, col, lit, shd){
  for (let i=0;i<h;i++){
    const t = i/h, wd = Math.round(w * (0.55 + 0.45*Math.sin((1-t)*Math.PI*0.5)));
    g.fillStyle = col; g.fillRect(x - (wd>>1), base - h + i, wd, 1);
    g.fillStyle = shd; g.fillRect(x + (wd>>1) - 2, base - h + i, 2, 1);
    if (i < 2){ g.fillStyle = lit; g.fillRect(x - (wd>>1) + 1, base - h + i, Math.max(1,wd-3), 1); }
  }
}
function fallenLog(g, x, base, len, col, lit, shd){
  g.fillStyle = col; g.fillRect(x, base - 5, len, 5);
  g.fillStyle = lit; g.fillRect(x, base - 5, len, 1);
  g.fillStyle = shd; g.fillRect(x, base - 1, len, 1);
  g.fillStyle = shd; g.fillRect(x + len - 3, base - 5, 3, 5);
  g.fillStyle = lit; g.fillRect(x + len - 2, base - 4, 1, 3);
  for (let i=6;i<len-6;i+=7){ g.fillStyle = shd; g.fillRect(x+i, base-4, 1, 3); }
}
function cycadPlant(g, x, base, h, col, lit, shd){
  g.fillStyle = shd; g.fillRect(x-2, base - h*.35, 5, h*.35);
  g.fillStyle = col; g.fillRect(x-1, base - h*.35, 3, h*.35);
  for (let a=0;a<5;a++){
    const ang = 0.35 + a*0.52, len = h * (0.72 - Math.abs(a-2)*0.08);
    const dir = a < 2 ? -1 : a > 2 ? 1 : 0;
    const dx = dir === 0 ? 0 : dir;
    for (let t=1;t<=7;t++){
      const u = t/7;
      const px = Math.round(x + dx * Math.cos(ang) * len * u * (dir?1:0));
      const py = Math.round(base - h*.35 - Math.sin(ang) * len * u + u*u*3);
      const lf = Math.max(1, Math.round(lerp(3.2, 1, u)));
      g.fillStyle = (t & 1) ? col : shd; g.fillRect(px - 1, py - lf, 2, lf*2);
      if (t < 3){ g.fillStyle = lit; g.fillRect(px - 1, py - lf, 2, 1); }
    }
  }
}
function reeds(g, x, base, n, col, lit){
  for (let i=0;i<n;i++){
    const rx = x + i*3, h = 6 + ((i*7)%5);
    g.fillStyle = col; g.fillRect(rx, base - h, 1, h);
    g.fillStyle = lit; g.fillRect(rx, base - h, 1, 2);
    g.fillStyle = col; g.fillRect(rx + (i&1?1:-1), base - h + 2, 1, 2);
  }
}
function bakeBg(phase){
  if (bgCache.has(phase)) return bgCache.get(phase);
  const S_ = SKY_SPECS[phase], c = makeCv(W,H), g = readCtx(c);
  const horizon = 108;

  // dithered sky: five steps with a 4x4 ordered dither across each boundary
  for (let y=0;y<horizon;y++){
    const f = (y/horizon) * 4, i = Math.floor(f), fr = f - i;
    const a = mixHex(S_.top, S_.low, clamp(i/4,0,1)), b = mixHex(S_.top, S_.low, clamp((i+1)/4,0,1));
    for (let x=0;x<W;x++){ g.fillStyle = (BAYER[y&3][x&3]/16 < fr) ? b : a; g.fillRect(x,y,1,1); }
  }
  g.fillStyle = S_.low; g.fillRect(0, horizon, W, GROUND - horizon + 2);

  // three depth planes, each flatter and lighter than the one in front
  ridge(g, { base:74, col: mixHex(S_.far, S_.low, .68), lit: mixHex(S_.far, S_.low, .78),
             waves:[[.019,.3,13],[.044,2.6,6]] });
  ridge(g, { base:84, col: mixHex(S_.far, S_.low, .42), lit: mixHex(S_.far, S_.low, .62),
             waves:[[.031,1.1,11],[.071,.4,5],[.013,2.2,7]] });
  // volcano on the far plane
  (function(){
    const px = 168, top = 52, half = 26;
    for (let x=px-half;x<=px+half;x++){
      const t = Math.abs(x-px)/half;
      let y = Math.round(top + Math.pow(t,1.3)*40 + 4);
      if (t < .26) y += 3 - Math.round(t*8);
      g.fillStyle = mixHex(S_.far, '#000000', .22); g.fillRect(x, y, 1, GROUND-y+2);
      g.fillStyle = x < px ? mixHex(S_.far,S_.low,.4) : mixHex(S_.far,'#000000',.42);
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#c4562f'; g.fillRect(px-6, top+6, 12, 2);
    g.fillStyle = '#e8a44a'; g.fillRect(px-4, top+6, 6, 1);
    g.fillStyle = 'rgba(210,150,120,.20)'; g.fillRect(px-3, top-8, 6, 12); g.fillRect(px-1, top-15, 4, 8);
  })();
  ridge(g, { base:100, col: mixHex(S_.mid, S_.low, .2), lit: mixHex(S_.mid, S_.low, .45),
             waves:[[.048,3.4,8],[.11,1.7,3]] });

  // treeline sitting on the middle plane
  const treeBody = mixHex(S_.tree, S_.low, .18), treeLit = mixHex(S_.tree, S_.low, .38);
  [[14,26],[26,19],[38,23],[196,24],[208,17],[184,20],[120,15],[132,21]]
    .forEach(t => conifer(g, t[0], GROUND-2, t[1], treeBody, treeLit));

  // ground: lit grass edge, then dithered dirt
  const grassLit = mixHex(S_.grass, S_.low, .40), grassDark = mixHex(S_.grass, '#000000', .32);
  for (let x=0;x<W;x++){                                    // tufted, not a ruled line
    const t = (Math.sin(x*.7) > .3 ? 1 : 0) + (Math.sin(x*.31 + 2) > .55 ? 1 : 0) + (Math.sin(x*1.3+1) > .8 ? 1 : 0);
    g.fillStyle = S_.grass; g.fillRect(x, GROUND-1-t, 1, 5+t);
    g.fillStyle = grassLit; g.fillRect(x, GROUND-1-t, 1, 1);
  }
  g.fillStyle = grassDark; g.fillRect(0, GROUND+3, W, 1);
  const d0 = S_.dirt, d1 = mixHex(S_.dirt,'#000000',.22), d2 = mixHex(S_.dirt,S_.low,.22);
  for (let y=GROUND+4;y<H;y++) for (let x=0;x<W;x++){
    const t = (y-GROUND-4)/(H-GROUND-4);
    g.fillStyle = (BAYER[y&3][x&3]/16 < t*.75) ? d1 : d0; g.fillRect(x,y,1,1);
  }
  for (let i=0;i<26;i++){                                   // pebbles
    const x = (rnd(2,W-4))|0, y = (GROUND+6+rnd(0,H-GROUND-9))|0;
    g.fillStyle = d1; g.fillRect(x,y,2,2); g.fillStyle = d2; g.fillRect(x,y,1,1);
  }
  for (let i=0;i<16;i++){                                   // grass tufts
    const x = (rnd(4,W-4))|0, y = (GROUND+5+rnd(0,H-GROUND-10))|0;
    g.fillStyle = mixHex(S_.grass,'#000000',.15); g.fillRect(x,y,1,3);
    g.fillRect(x-1,y+1,1,2); g.fillRect(x+1,y+1,1,2);
  }
  // scenery on the ground line, behind where the animal walks
  const rockCol = mixHex(S_.mid,'#000000',.12), rockLit = mixHex(S_.mid, S_.low,.42), rockShd = mixHex(S_.mid,'#000000',.38);
  boulder(g, 68, GROUND+2, 17, 10, rockCol, rockLit, rockShd);
  boulder(g, 78, GROUND+2, 9, 6, rockCol, rockLit, rockShd);
  boulder(g, 133, GROUND+1, 12, 7, rockCol, rockLit, rockShd);
  const logCol = mixHex(S_.dirt,'#000000',.18), logLit = mixHex(S_.dirt, S_.low,.34), logShd = mixHex(S_.dirt,'#000000',.44);
  fallenLog(g, 92, GROUND+2, 34, logCol, logLit, logShd);
  const plCol = mixHex(S_.tree, S_.low, .22), plLit = mixHex(S_.tree, S_.low, .5), plShd = mixHex(S_.tree,'#000000',.35);
  cycadPlant(g, 32, GROUND+2, 22, plCol, plLit, plShd);
  cycadPlant(g, 116, GROUND+1, 15, plCol, plLit, plShd);
  cycadPlant(g, 190, GROUND+3, 19, plCol, plLit, plShd);
  // watering hole, cut into the dirt on the right
  const px0 = 142, px1 = 212;
  for (let x=px0;x<px1;x++){
    const t = (x-px0)/(px1-px0), dep = Math.round(Math.sin(t*Math.PI)*11);
    if (dep <= 1) continue;
    g.fillStyle = mixHex(S_.dirt,'#000000',.45); g.fillRect(x, GROUND+6, 1, 2);
    g.fillStyle = mixHex(S_.water,'#000000',.25); g.fillRect(x, GROUND+8, 1, dep);
    g.fillStyle = S_.water; g.fillRect(x, GROUND+8, 1, Math.max(1, dep-3));
    g.fillStyle = mixHex(S_.water,S_.low,.45); g.fillRect(x, GROUND+8, 1, 1);
  }
  reeds(g, 138, GROUND+8, 5, plShd, plLit);
  reeds(g, 205, GROUND+8, 4, plShd, plLit);
  bgCache.set(phase,c);
  return c;
}

/* --------------------------- moving backdrop ------------------------------- */
const CLOUDS = [
  { x:30,  y:16, v:1.9, w:26, h:5, near:1 }, { x:140, y:10, v:2.6, w:34, h:6, near:1 },
  { x:88,  y:32, v:1.1, w:20, h:4, near:0 }, { x:196, y:26, v:1.4, w:24, h:4, near:0 }
];
let flyer = null, flyerAt = 4000;
function drawSkyBody(g, phase, now){
  // the sun and moon ride an arc keyed to the player's actual clock
  const d = new Date(), h = d.getHours() + d.getMinutes()/60;
  const night = phase === 'night';
  const t = clamp(night ? ((h + 3) % 24) / 12 : (h - 6) / 13, 0, 1);
  const cx = 18 + t*(W-36), cy = 62 - Math.sin(clamp(t,0,1)*Math.PI) * 44;
  if (night){
    g.fillStyle = '#e8e6d2'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
    g.fillStyle = SKY_SPECS[phase].top; g.beginPath(); g.arc(cx-3.5, cy-2.5, 6, 0, 7); g.fill();
  } else {
    g.fillStyle = phase === 'day' ? 'rgba(250,238,170,.35)' : 'rgba(250,200,140,.3)';
    g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
    g.fillStyle = phase === 'day' ? '#f7ecac' : '#f6c887';
    g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
  }
}
function drawClouds(g, phase, dt){
  const lit = phase === 'night' ? 'rgba(196,206,232,.30)' : 'rgba(248,246,234,.92)';
  const shd = phase === 'night' ? 'rgba(150,162,192,.26)' : 'rgba(214,214,204,.85)';
  for (const c of CLOUDS){
    c.x += c.v * dt/1000 * 4; if (c.x > W + c.w) c.x = -c.w;
    const x = Math.round(c.x), y = c.y, w = c.near ? c.w : c.w*.7, hh = c.near ? c.h : c.h-1;
    g.fillStyle = lit;
    g.fillRect(x - w/2, y, w, hh);
    g.fillRect(x - w/4, y - 3, w/2, 3);
    g.fillRect(x + w/6, y - 5, w/4, 2);
    g.fillStyle = shd; g.fillRect(x - w/2, y + hh - 1, w, 1);
  }
}
function drawFlyers(g, dt, now){
  if (!flyer && now > flyerAt){ flyer = { x:-14, y: rnd(18,54), v: rnd(26,40), p:0 }; }
  if (!flyer) return;
  flyer.x += flyer.v * dt/1000; flyer.p += dt;
  if (flyer.x > W + 14){ flyer = null; flyerAt = now + rnd(25,60)*1000; return; }
  const up = Math.sin(flyer.p/130) > 0;
  g.fillStyle = 'rgba(40,48,54,.7)';
  const x = Math.round(flyer.x), y = Math.round(flyer.y);
  g.fillRect(x-1, y, 3, 1);
  if (up){ g.fillRect(x-5, y-2, 4, 1); g.fillRect(x+2, y-2, 4, 1); }
  else   { g.fillRect(x-5, y+2, 4, 1); g.fillRect(x+2, y+2, 4, 1); }
}
function drawMotes(g, dt, phase){
  g.fillStyle = phase === 'night' ? 'rgba(190,205,235,.30)' : 'rgba(255,248,208,.45)';
  for (const m of MOTES){
    m.x += m.vx * dt/1000; m.y += Math.sin(m.p + performance.now()/1400) * .08;
    if (m.x > W+2) m.x = -2;
    g.fillRect(m.x|0, m.y|0, 1, 1);
  }
}
function drawWater(g, phase, now){
  const S_ = SKY_SPECS[phase];
  g.fillStyle = mixHex(S_.water, S_.low, .55);
  for (let i=0;i<4;i++){
    const y = GROUND + 10 + i*2;
    const span = Math.sin(((y - GROUND - 8)/11)) ;
    const half = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((y-GROUND-8)/12, 2))) * 30);
    if (half < 4) continue;
    const w = Math.round(6 + Math.abs(Math.sin(now/760 + i*1.7)) * (half - 4));
    const cx = 177 + Math.round(Math.sin(now/1100 + i*2.2) * (half - w) * .5);
    g.fillRect(cx - (w>>1), y, w, 1);
  }
}

/* ---------------------- foreground, drawn over the animal ------------------ */
const FRONDS = [ {x:-3, s:1.15, p:0, dir:1}, {x:W+3, s:1.0, p:2.4, dir:-1} ];
function drawFronds(g, phase, now){
  const S_ = SKY_SPECS[phase];
  const dark = mixHex(S_.tree,'#000000',.40), body = S_.tree, lit = mixHex(S_.tree,S_.low,.32);
  for (const f of FRONDS){
    for (let a=0;a<4;a++){
      const ang = 0.44 + a*0.36 + Math.sin(now/1300 + f.p + a*.7) * 0.05;
      const len = (44 - a*5) * f.s;
      const bx = f.x, by = H + 3;
      for (let t=1;t<=13;t++){
        const u = t/13;
        const x = Math.round(bx + f.dir * Math.cos(ang) * len * u);
        const y = Math.round(by - Math.sin(ang) * len * u + u*u*5);
        const lf = Math.max(1, Math.round(lerp(7, 1.5, u) * f.s));
        g.fillStyle = (t & 1) ? body : dark;
        g.fillRect(x - 1, y - lf, 2, lf*2);                  // leaflets across the spine
        g.fillStyle = dark; g.fillRect(x - 1, y - 1, 2, 2);  // spine
        if (t < 5){ g.fillStyle = lit; g.fillRect(x - 1, y - lf, 2, 2); }
      }
    }
  }
}

/* ------------------------------ particles --------------------------------- */
let parts = [];
function emit(type, x, y, n, opt){
  opt = opt || {};
  for (let i=0;i<n;i++) parts.push({
    type, x: x + rnd(-4,4), y: y + rnd(-3,3),
    vx: opt.vx !== undefined ? rnd(-opt.vx,opt.vx) : rnd(-9,9),
    vy: opt.vy !== undefined ? opt.vy + rnd(-6,6) : rnd(-26,-10),
    g: opt.g || 0, life: opt.life || rnd(700,1200), age: 0, col: opt.col
  });
}
function stepParts(dt){
  for (const p of parts){ p.age += dt; p.vy += p.g*dt/1000; p.x += p.vx*dt/1000; p.y += p.vy*dt/1000; }
  parts = parts.filter(p => p.age < p.life);
}
function heartPx(g,x,y,c){ g.fillStyle=c; g.fillRect(x+1,y,1,1); g.fillRect(x+3,y,1,1); g.fillRect(x,y+1,5,2); g.fillRect(x+1,y+3,3,1); g.fillRect(x+2,y+4,1,1); }
function drawParts(g){
  for (const p of parts){
    const x = Math.round(p.x), y = Math.round(p.y), fade = p.age/p.life;
    if (p.type==='heart'){ heartPx(g,x,y,'#e2697c'); g.fillStyle='#f0a3b0'; g.fillRect(x+1,y+1,1,1); }
    else if (p.type==='spark'){ g.fillStyle = p.col||'#fff6d8'; g.fillRect(x,y,2,2); g.fillStyle='#ffffff'; g.fillRect(x,y,1,1); }
    else if (p.type==='crumb'){ g.fillStyle = p.col||'#9b7a52'; g.fillRect(x,y,1,1); }
    else if (p.type==='bubbleZ'){ g.fillStyle='#dfe4f6'; g.fillRect(x,y,2,2); g.fillRect(x+2,y-2,2,2); }
    else if (p.type==='stink'){ g.fillStyle = fade<.5?'#7d9c5a':'#5d7a44'; g.fillRect(x,y,2,2); }
    else if (p.type==='note'){ g.fillStyle='#e8dcbf'; g.fillRect(x,y,2,4); g.fillRect(x+2,y-1,2,2); }
  }
}

/* --------------------------- props: food & mess ---------------------------- */
function drawItem(g, id, x, y, s){
  s = s || 1; g.save(); g.translate(x,y); g.scale(s,s);
  const px = (c,a,b,w,h)=>{ g.fillStyle=c; g.fillRect(a,b,w||1,h||1); };
  if (id==='berry'){ px('#4e7a4a',2,-2,1,2); px('#8f2b36',0,0,5,4); px('#b83b45',0,0,4,3); px('#e08a92',1,1,1,1); }
  if (id==='fish'){ px('#5b7c90',0,0,6,3); px('#7fa3b8',0,0,6,2); px('#c9dde6',1,1,2,1); px('#5b7c90',6,0,2,3); px('#1a140e',1,0,1,1); }
  if (id==='fern'){ px('#3f6440',2,0,1,5); for(let i=0;i<3;i++){ px('#6f9c55',1,1+i,1,1); px('#8fb763',3,1+i,1,1);} px('#8fb763',0,2,1,1); px('#6f9c55',4,2,1,1); }
  if (id==='cycad'){ px('#5a4a2a',2,3,2,2); px('#8a6b2c',1,0,4,4); px('#a8863c',1,0,3,3); px('#d0ae5c',2,1,1,1); }
  if (id==='meat'){ px('#82382a',0,0,5,4); px('#a04a34',0,0,5,3); px('#c46a4c',1,1,2,1); px('#efe9d8',5,2,2,2); }
  if (id==='cake'){ px('#b8823f',0,1,6,4); px('#d1a05e',0,1,6,3); px('#f0dcae',0,0,6,1); px('#b83b45',2,-1,2,2); }
  if (id==='rock'){ px('#6e6a5e',0,0,6,4); px('#8b8578',0,0,5,3); px('#a8a294',3,0,2,1); }
  g.restore();
}
function drawMess(g, x, y){
  g.fillStyle='#513218'; g.fillRect(x-3,y-2,7,3);
  g.fillStyle='#6b4322'; g.fillRect(x-3,y-2,6,2); g.fillRect(x-2,y-4,5,2); g.fillRect(x-1,y-6,3,2);
  g.fillStyle='#8a5c33'; g.fillRect(x-1,y-5,2,1); g.fillRect(x-2,y-2,2,1);
}
