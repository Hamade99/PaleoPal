'use strict';
/* ==========================================================================
   PALEOPAL — a pocket dinosaur care sim
   Sections: core → sprites → species → world → sim → render → ui
   ========================================================================== */

const W = 224, H = 168, GROUND = 140;
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp  = (a,b,t) => a + (b-a)*t;
const rnd   = (a,b) => a + Math.random()*(b-a);
const pick  = a => a[(Math.random()*a.length)|0];
const $     = id => document.getElementById(id);
const HOUR  = 3600e3, MIN = 60e3;

/* ---------- storage: works as artifact, as a file, and inside a webview ---- */
const Store = {
  async get(k){
    if (window.storage) { try { const r = await window.storage.get(k); return r ? r.value : null; } catch(e){ return null; } }
    try { return localStorage.getItem(k); } catch(e){ return null; }
  },
  async set(k,v){
    if (window.storage) { try { await window.storage.set(k,v); return; } catch(e){ return; } }
    try { localStorage.setItem(k,v); } catch(e){}
  },
  async del(k){
    if (window.storage) { try { await window.storage.delete(k); return; } catch(e){ return; } }
    try { localStorage.removeItem(k); } catch(e){}
  }
};

/* ---------- audio ---------- */
let AC = null;
function tone(f, dur, type, vol, delay, slide){
  if (!G || !G.sound) return;
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + (delay||0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(28, f + slide), t + dur);
    g.gain.setValueAtTime(vol || .06, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + dur + .04);
  }catch(e){}
}
const SFX = {
  chomp:()=>{tone(200,.06,'square',.07);tone(140,.08,'square',.07,.06);},
  coin :()=>{tone(880,.06,'square',.05);tone(1320,.09,'square',.05,.06);},
  purr :()=>{tone(300,.14,'sine',.05,0,90);},
  crack:()=>tone(130,.07,'sawtooth',.09,0,-45),
  hatch:()=>[523,659,784,1046].forEach((f,i)=>tone(f,.13,'square',.06,i*.1)),
  bonk :()=>tone(95,.15,'square',.09,0,-45),
  wash :()=>tone(420,.14,'triangle',.06,0,520),
  yawn :()=>tone(480,.42,'sine',.05,0,-300),
  roar :()=>{tone(72,.5,'sawtooth',.11,0,-32);tone(54,.55,'square',.08,.05,-22);},
  pop  :()=>tone(340,.05,'triangle',.07),
  sneeze:()=>{tone(700,.05,'square',.05);tone(240,.16,'sawtooth',.08,.05,-120);}
};

/* ==========================================================================
   SPRITE PIPELINE
   Shapes are drawn as smooth paths on an offscreen canvas, then hard-quantised
   (alpha threshold + palette snap) and given a dilated outline. That gives real
   pixel art with correct anatomy instead of hand-typed ASCII blobs.
   ========================================================================== */

function makeCv(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function readCtx(c){ return c.getContext('2d', { willReadFrequently:true }); }
const article = w => /^[aeiou]/i.test(w) ? 'an ' : 'a ';
/* the copy is written out in words, so counts that appear in a sentence are too */
const NUM_WORD = ['No','One','Two','Three','Four','Five','Six','Seven','Eight'];
const numWord = n => NUM_WORD[n] || String(n);

/* tapered tube through a centreline — the workhorse for necks, tails, limbs */
function tube(g, pts, widths, col){
  const n = pts.length;
  const left = [], right = [];
  for (let i=0;i<n;i++){
    const p = pts[i];
    const a = pts[Math.max(0,i-1)], b = pts[Math.min(n-1,i+1)];
    let dx = b[0]-a[0], dy = b[1]-a[1];
    const L = Math.hypot(dx,dy) || 1; dx/=L; dy/=L;
    const w = widths[i]/2;
    left.push([p[0]-dy*w, p[1]+dx*w]);
    right.push([p[0]+dy*w, p[1]-dx*w]);
  }
  if (col) g.fillStyle = col;
  g.beginPath();
  curveThrough(g, left, true);
  const rr = right.slice().reverse();
  for (let i=0;i<rr.length;i++) g.lineTo(rr[i][0], rr[i][1]);
  g.closePath(); g.fill();
  // round the caps so tips read as tips, not chisels
  g.beginPath(); g.arc(pts[0][0],pts[0][1],Math.max(.5,widths[0]/2),0,7); g.fill();
  g.beginPath(); g.arc(pts[n-1][0],pts[n-1][1],Math.max(.5,widths[n-1]/2),0,7); g.fill();
}
function curveThrough(g, p, start){
  if (start) g.moveTo(p[0][0], p[0][1]);
  for (let i=0;i<p.length-1;i++){
    const a=p[i], b=p[i+1];
    const prev=p[Math.max(0,i-1)], next=p[Math.min(p.length-1,i+2)];
    const c1=[a[0]+(b[0]-prev[0])/6, a[1]+(b[1]-prev[1])/6];
    const c2=[b[0]-(next[0]-a[0])/6, b[1]-(next[1]-a[1])/6];
    g.bezierCurveTo(c1[0],c1[1],c2[0],c2[1],b[0],b[1]);
  }
}
function blob(g, pts, col){
  if (col) g.fillStyle = col;
  g.beginPath();
  const p = pts.concat([pts[0],pts[1]]);
  g.moveTo(p[0][0],p[0][1]);
  for (let i=0;i<p.length-1;i++){
    const a=p[i], b=p[i+1];
    const prev=p[(i-1+p.length)%p.length], next=p[(i+2)%p.length];
    g.bezierCurveTo(a[0]+(b[0]-prev[0])/6, a[1]+(b[1]-prev[1])/6,
                    b[0]-(next[0]-a[0])/6, b[1]-(next[1]-a[1])/6, b[0],b[1]);
  }
  g.closePath(); g.fill();
}
function oval(g,x,y,rx,ry,col,rot){
  if (col) g.fillStyle=col; g.beginPath(); g.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot||0,0,7); g.fill();
}

/* hard-edge pass: kill antialiasing, snap to the species ramp, dilate outline */
function crisp(src, palette, outline){
  const w = src.width, h = src.height;
  const g = readCtx(src);
  const img = g.getImageData(0,0,w,h), d = img.data;
  const ramp = palette.map(hex => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),hex]);
  const solid = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++){
    const o=i*4;
    if (d[o+3] < 118){ d[o+3]=0; continue; }
    d[o+3]=255; solid[i]=1;
    let best=ramp[0], bd=1e9;
    for (const c of ramp){
      const dd=(c[0]-d[o])**2+(c[1]-d[o+1])**2+(c[2]-d[o+2])**2;
      if (dd<bd){bd=dd;best=c;}
    }
    d[o]=best[0]; d[o+1]=best[1]; d[o+2]=best[2];
  }
  // dilate a 1px outline into the transparent border
  const oc = [parseInt(outline.slice(1,3),16),parseInt(outline.slice(3,5),16),parseInt(outline.slice(5,7),16)];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i=y*w+x; if (solid[i]) continue;
    if ((x>0&&solid[i-1])||(x<w-1&&solid[i+1])||(y>0&&solid[i-w])||(y<h-1&&solid[i+w])){
      const o=i*4; d[o]=oc[0]; d[o+1]=oc[1]; d[o+2]=oc[2]; d[o+3]=255;
    }
  }
  g.putImageData(img,0,0);
  return src;
}

/* trim transparent margins so anchors and ground contact stay exact */
function trim(src){
  const w=src.width,h=src.height,g=readCtx(src);
  const d=g.getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(d[(y*w+x)*4+3]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  }
  if (x1<0) return {cv:src,ox:0,oy:0,w,h};
  const nw=x1-x0+1, nh=y1-y0+1, out=makeCv(nw,nh);
  out.getContext('2d').drawImage(src,x0,y0,nw,nh,0,0,nw,nh);
  return {cv:out, ox:x0, oy:y0, w:nw, h:nh};
}
