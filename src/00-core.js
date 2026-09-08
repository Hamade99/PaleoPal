'use strict';
/* ==========================================================================
   PALEOPAL — a pocket dinosaur care sim
   Sections: core → sprites → species → world → sim → render → ui
   ========================================================================== */

const W = 224, H = 168, GROUND = 140;

/* The world is bigger than the screen, and growing up reveals it.

   Not a magnification of the old backdrop — an extension of it. Today's
   picture sits inside the larger one unmoved, at its old coordinates, with
   more scenery drawn around the outside; the view starts cropped to it and
   pulls back a notch at each growth spurt until the whole world is on screen
   at adult.

   The ground line is what fixes every number here. It has to land at the same
   fraction of the height in the world as it does on the screen, or the animal
   — which is drawn in screen space and never moves — would leave the grass as
   the view pulled back. 140/168 is 175/210, and that single constraint gives
   the padding: 28 columns each side, 35 rows of sky above, 7 of ground below.

   The painters keep working in the old coordinates. bakeBg translates by the
   padding once and every literal position in 04-world.js stays exactly as it
   was written — the volcano, the falls, every boulder, every skyline point.
   Only the loops that run the full width have to widen, and since they are all
   functions of x, including their hash1 detail, the extra width generates
   itself and matches what is already there.

   Scaling the painters instead was tried on paper and does not survive this
   file: the sky dither, the grass, the dirt and the cliffs are per-pixel
   fillRect(x, y, 1, 1) loops, and at a fractional scale those become
   fractional rects that antialias into mush. */
const BG_W = 280, BG_H = 210;                    // the world, 4:3 like the screen
const BG_PAD_X = 28, BG_PAD_Y = 35;              // where today's picture sits in it
const BG_G = GROUND + BG_PAD_Y;                  // 175 — the ground line, in world space
/* The world's edges in the painters' own coordinates, where today's picture is
   still 0..W and 0..H. */
const BG_L = -BG_PAD_X, BG_R = W + BG_PAD_X;     // -28 … 252
const BG_T = -BG_PAD_Y, BG_B = BG_H - BG_PAD_Y;  // -35 … 175
const BG_SPAN = BG_R - BG_L;                     // 280, for the full-width fills

/* How much of the world is on screen, one crop per growth stage.

   Every crop is 4:3, so nothing stretches, and every one is anchored on the
   ground line instead of being centred: the animal is drawn in screen space
   and never moves, so the grass has to stay under its feet at all four. That
   is what fixes `sy` — (BG_G - sy) * H/sh has to come out at GROUND — and the
   widths were then picked so that every number here is a whole pixel. `sh`
   divisible by six makes `sy` integral and by three makes `sw` integral; miss
   that and the crop samples on half-pixels, which softens the whole backdrop
   instead of only reducing it.

   The reduction is real and was accepted for the sake of seeing the world:
   with smoothing off this drops rows and columns, about one in ten at juvenile
   and one in five at adult, and what suffers is the one-pixel detail — the lit
   top edge of the grass, the specular on the river, the ordered dither in the
   sky. The hatchling crop is scale 1.0 over the old picture, so a newly
   hatched animal sees exactly what the game drew before any of this existed.

   Here rather than in the renderer because the editor draws these as guides
   over a backdrop being painted, and the editor does not load the renderer. */
const BG_CROP = [
  [28, 35, 224, 168],        // hatchling  1.000 — today's picture, untouched
  [16, 20, 248, 186],        // juvenile   0.903
  [ 8, 10, 264, 198],        // subadult   0.848
  [ 0,  0, 280, 210]         // adult      0.800 — the whole world
];
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp  = (a,b,t) => a + (b-a)*t;
const rnd   = (a,b) => a + Math.random()*(b-a);
const pick  = a => a[(Math.random()*a.length)|0];
const $     = id => document.getElementById(id);
const HOUR  = 3600e3, MIN = 60e3;

/* ---------- storage: works as artifact, as a file, and inside a webview ---- */
const Store = {
  async get(k){
    if (window.storage) { const result = await window.storage.get(k); return result ? result.value : null; }
    return localStorage.getItem(k);
  },
  async set(k,v){
    if (window.storage) return window.storage.set(k,v);
    localStorage.setItem(k,v);
  },
  async del(k){
    if (window.storage) return window.storage.delete(k);
    localStorage.removeItem(k);
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
