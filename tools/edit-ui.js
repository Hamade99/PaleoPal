/* The editor's five tabs.

   It loads src/ directly, the same way tools/sheet.html does, so it is always
   editing the objects the game actually runs on. Every change mutates the live
   object, calls artChanged() to drop the caches the game has baked, and
   redraws its previews — which is why an edit shows up as the animal rather
   than as a number.

   Nothing here is part of the build. */

/* `$` is already 00-core.js's, and a second `const $` at script top level is a
   redeclaration that kills this whole file before a line of it runs. */
const mk = (tag, cls, txt) => { const e = document.createElement(tag);
  if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

window.addEventListener('error', e => {
  $('err').textContent = e.message + '\n' + (e.error && e.error.stack || '');
});

/* ---- tabs ---------------------------------------------------------------- */
let tab = 'pix';
const REDRAW = {};
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main').forEach(m => m.classList.toggle('on', m.id === 'tab-' + tab));
  if (REDRAW[tab]) REDRAW[tab]();
});

function note(text, bad){
  $('msg').textContent = text;
  $('msg').className = bad ? 'bad' : '';
}
$('save').onclick = async () => {
  note('Saving…');
  try { note(await saveData()); }
  catch (e){ note(e.message, true); }
};

/* Any change to the data invalidates something the game has baked. One call,
   then every visible preview is rebuilt — a preview showing a stale bake is
   how an editor teaches you the wrong thing about your own edit. */
function changed(){
  artChanged();
  for (const k in REDRAW) if (k === tab) REDRAW[k]();
}

/* ---- shared widgets ------------------------------------------------------ */

function colourRow(host, label, get, set){
  const row = mk('div', 'sw');
  row.appendChild(mk('b', null, label));
  const inp = mk('input'); inp.type = 'color'; inp.value = get();
  const hex = mk('span', null, get()); hex.style.color = 'var(--dim)'; hex.style.fontSize = '11px';
  inp.oninput = () => { set(inp.value); hex.textContent = inp.value; changed(); };
  row.appendChild(inp); row.appendChild(hex);
  host.appendChild(row);
}

/* rgba(...) is what the tints are written as, so the picker edits the colour
   and a separate box edits the alpha — a colour input cannot carry one. */
function rgbaRow(host, label, get, set){
  const row = mk('div', 'sw');
  row.appendChild(mk('b', null, label));
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]*))?\)/.exec(get()) || [0,0,0,0,'0'];
  const hex = '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('');
  const inp = mk('input'); inp.type = 'color'; inp.value = hex;
  const a = mk('input'); a.type = 'number'; a.step = '.01'; a.min = '0'; a.max = '1';
  a.value = m[4] === undefined || m[4] === '' ? 1 : parseFloat(m[4]);
  const push = () => {
    const r = parseInt(inp.value.slice(1,3),16), g = parseInt(inp.value.slice(3,5),16),
          b = parseInt(inp.value.slice(5,7),16);
    const av = String(+a.value).replace(/^0\./, '.');
    set('rgba(' + r + ',' + g + ',' + b + ',' + av + ')');
    changed();
  };
  inp.oninput = push; a.oninput = push;
  row.appendChild(inp); row.appendChild(a);
  host.appendChild(row);
}

function slider(host, label, get, set, min, max, step){
  const row = mk('label');
  row.appendChild(mk('span', null, label));
  const r = mk('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = get();
  const n = mk('input'); n.type = 'number'; n.step = step; n.value = get();
  const push = v => { set(+v); r.value = v; n.value = v; changed(); };
  r.oninput = () => push(r.value);
  n.oninput = () => push(n.value);
  row.appendChild(r); row.appendChild(n);
  host.appendChild(row);
}

function shot(cv, scale, label){
  const d = mk('div', 'cell');
  const c = mk('canvas');
  c.width = cv.width * scale; c.height = cv.height * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(cv, 0, 0, c.width, c.height);
  d.appendChild(c);
  if (label) d.appendChild(mk('span', null, label));
  return d;
}

function pickList(host, ids, current, onPick, labelOf){
  host.innerHTML = '';
  ids.forEach(id => {
    const b = mk('button', id === current() ? 'on' : '', labelOf ? labelOf(id) : id);
    b.onclick = () => { onPick(id); };
    host.appendChild(b);
  });
}

/* ---- tab: pixels --------------------------------------------------------- */
let pixId = Object.keys(PIX)[0], pixPen = 0, painting = 0;
const PIX_Z = 22;

function pixRedraw(){
  const p = PIX[pixId];
  pickList($('pixList'), Object.keys(PIX), () => pixId, id => { pixId = id; pixPen = 0; pixRedraw(); });

  // the palette, as chips: the selected one is what the left button paints
  const pal = $('pixPal'); pal.innerHTML = '';
  p.pal.forEach((c, i) => {
    const chip = mk('div', 'chip' + (i === pixPen ? ' on' : ''));
    chip.style.background = c;
    chip.title = c;
    chip.onclick = () => { pixPen = i; pixRedraw(); };
    pal.appendChild(chip);
  });
  const add = mk('div', 'chip', '+');
  add.style.cssText += ';display:flex;align-items:center;justify-content:center;color:#8fa39a';
  add.onclick = () => { p.pal.push('#ffffff'); pixPen = p.pal.length - 1; changed(); pixRedraw(); };
  pal.appendChild(add);

  // the grid
  const cv = $('pixGrid');
  cv.width = p.w * PIX_Z; cv.height = p.h * PIX_Z;
  const g = cv.getContext('2d');
  g.fillStyle = '#101a1c'; g.fillRect(0, 0, cv.width, cv.height);
  for (let y=0;y<p.h;y++) for (let x=0;x<p.w;x++){
    const ch = (p.rows[y] || '')[x] || ' ';
    if (ch !== ' '){ g.fillStyle = p.pal[PIX_CH.indexOf(ch)] || '#f0f'; g.fillRect(x*PIX_Z, y*PIX_Z, PIX_Z, PIX_Z); }
    else if ((x + y) & 1){ g.fillStyle = '#162124'; g.fillRect(x*PIX_Z, y*PIX_Z, PIX_Z, PIX_Z); }
  }
  g.strokeStyle = 'rgba(143,163,154,.22)'; g.lineWidth = 1;
  for (let x=0;x<=p.w;x++){ g.beginPath(); g.moveTo(x*PIX_Z+.5,0); g.lineTo(x*PIX_Z+.5,cv.height); g.stroke(); }
  for (let y=0;y<=p.h;y++){ g.beginPath(); g.moveTo(0,y*PIX_Z+.5); g.lineTo(cv.width,y*PIX_Z+.5); g.stroke(); }
  // the origin, for the sprites that are drawn around a point
  if (p.ox || p.oy){
    g.strokeStyle = '#e0ac48';
    g.strokeRect((p.ox||0)*PIX_Z+.5, (p.oy||0)*PIX_Z+.5, PIX_Z-1, PIX_Z-1);
  }

  // how it actually appears in the game, at one, two and four times
  const pv = $('pixPreview'); pv.innerHTML = '';
  const outline = pixId.slice(0,5) === 'icon.' ? '#141c1e' : pixId.slice(0,4) === 'hat.' ? '#241d13' : null;
  const bare = makeCv(p.w, p.h);
  pixDraw(readCtx(bare), pixId, p.ox||0, p.oy||0, 1);
  [1,2,4].forEach(z => pv.appendChild(shot(bare, z, z + 'x')));
  if (outline) pv.appendChild(shot(pixCanvas(pixId, outline), 4, 'outlined'));

  // palette entries, editable, plus the sprite's own size
  const sw = $('pixSwatches'); sw.innerHTML = '';
  p.pal.forEach((c, i) => colourRow(sw, PIX_CH[i], () => p.pal[i], v => { p.pal[i] = v; pixRedraw(); }));
  const size = mk('div'); size.style.marginTop = '8px';
  slider(size, 'width', () => p.w, v => { pixResize(p, v, p.h); pixRedraw(); }, 4, 24, 1);
  slider(size, 'height', () => p.h, v => { pixResize(p, p.w, v); pixRedraw(); }, 4, 24, 1);
  sw.appendChild(size);
}
function pixResize(p, w, h){
  p.rows = Array.from({length:h}, (_, y) => ((p.rows[y] || '').padEnd(w)).slice(0, w));
  p.w = w; p.h = h;
}
function pixPaint(ev, erase){
  const p = PIX[pixId], r = $('pixGrid').getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left) / PIX_Z), y = Math.floor((ev.clientY - r.top) / PIX_Z);
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  const row = (p.rows[y] || '').padEnd(p.w);
  const ch = erase ? ' ' : PIX_CH[pixPen];
  if (row[x] === ch) return;
  p.rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
  changed(); pixRedraw();
}
$('pixGrid').addEventListener('mousedown', e => {
  e.preventDefault(); painting = e.button === 2 ? 2 : 1; pixPaint(e, painting === 2);
});
$('pixGrid').addEventListener('mousemove', e => { if (painting) pixPaint(e, painting === 2); });
window.addEventListener('mouseup', () => painting = 0);
$('pixGrid').addEventListener('contextmenu', e => e.preventDefault());
REDRAW.pix = pixRedraw;

/* ---- tab: species -------------------------------------------------------- */
let spId = 'rex';
/* A sensible range for a slider is a property of the number, not of the
   editor: a tail length wants 0 to twice its default, a ratio wants a tight
   band around 1. Anything unlisted gets half to double what it is now. */
const TUNE_RANGE = { foreRatio:[0.8, 1.6, .01], frillTilt:[-1.2, .4, .01], hornLen:[0, 4, .05],
                     crestH:[1, 4, .05], fuzzLen:[0, 14, .1] };
function rangeFor(key, v){
  if (TUNE_RANGE[key]) return TUNE_RANGE[key];
  const step = Math.abs(v) < 3 ? .1 : .5;
  return [Math.min(0, v * 2), Math.max(1, Math.abs(v) * 2), step];
}
function speciesStrip(host, id, anim){
  host.innerHTML = '';
  for (let st = 0; st < STAGE.length; st++){
    const f = frameOf(id, st, anim || 'idle', 0, false, 'wild');
    host.appendChild(shot(f.cv, 2, STAGE[st].key));
  }
}
function spRedraw(){
  pickList($('spList'), Object.keys(SPECIES), () => spId, id => { spId = id; spRedraw(); },
           id => SPECIES[id].common);
  const sp = SPECIES[spId], tune = sp.tune, spec = sp.spec;
  const t = $('spTune'); t.innerHTML = '';
  for (const k in tune){
    const [lo, hi, step] = rangeFor(k, tune[k]);
    slider(t, k, () => tune[k], v => tune[k] = v, lo, hi, step);
  }
  const c = $('spCols'); c.innerHTML = '';
  for (const k in spec){
    if (k === 'beak' && !spec.beak) continue;
    colourRow(c, k, () => spec[k], v => spec[k] = v);
  }
  speciesStrip($('spPreview'), spId);
}
REDRAW.species = spRedraw;

/* ---- tab: growth --------------------------------------------------------- */
const STAGE_COLS = ['s','head','snout','muzzle','neck','limb','tail','bulk','torso','fuzz','horn','frill','hornBend'];
function stRedraw(){
  const t = $('stTable'); t.innerHTML = '';
  const grid = mk('div', 'grid4');
  grid.style.gridTemplateColumns = 'auto repeat(' + STAGE.length + ', auto)';
  grid.appendChild(mk('span', null, ''));
  STAGE.forEach(s => grid.appendChild(mk('span', null, s.key)));
  STAGE_COLS.forEach(col => {
    grid.appendChild(mk('span', null, col));
    STAGE.forEach(s => {
      const n = mk('input'); n.type = 'number'; n.step = '.01'; n.value = s[col];
      n.style.width = '62px';
      n.oninput = () => { s[col] = +n.value; changed(); };
      grid.appendChild(n);
    });
  });
  t.appendChild(grid);
  const pv = $('stPreview'); pv.innerHTML = '';
  for (const id in SPECIES){
    const h = mk('h2', null, SPECIES[id].common);
    const strip = mk('div', 'strip');
    pv.appendChild(h); pv.appendChild(strip);
    speciesStrip(strip, id);
  }
}
REDRAW.stages = stRedraw;

/* ---- tab: coats ---------------------------------------------------------- */
let coatKey = 'rex|wild';
function coatRedraw(){
  const keys = [];
  for (const sp in SKINS) for (const k of SKINS[sp]) keys.push(sp + '|' + k.id);
  pickList($('coatList'), keys, () => coatKey, k => { coatKey = k; coatRedraw(); },
           k => { const [sp, id] = k.split('|');
                  return SPECIES[sp].common + ' · ' + SKINS[sp].find(x => x.id === id).name; });
  const [sp, id] = coatKey.split('|');
  const coat = SKINS[sp].find(x => x.id === id);
  const c = $('coatCols'); c.innerHTML = '';
  ['skin','belly','crest','mark'].forEach(k => {
    if (coat[k] === undefined) return;
    colourRow(c, k, () => coat[k], v => coat[k] = v);
  });
  const pat = mk('label');
  pat.appendChild(mk('span', null, 'pattern'));
  const sel = mk('select');
  ['none','bands','spots','speckle','patches'].forEach(p => {
    const o = mk('option', null, p); o.value = p; if (coat.pattern === p) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => { coat.pattern = sel.value; changed(); };
  pat.appendChild(sel); c.appendChild(pat);

  const pv = $('coatPreview'); pv.innerHTML = '';
  [1,3].forEach(st => pv.appendChild(shot(frameOf(sp, st, 'idle', 0, false, id).cv, 2, STAGE[st].key)));
  pv.appendChild(shot(frameOf(sp, 3, 'walk', 4, false, id).cv, 2, 'walk'));
}
REDRAW.coats = coatRedraw;

/* ---- tab: habitats ------------------------------------------------------- */
let bioId = 'valley';
const PHASES = ['dawn','day','dusk','night'];
function bioRedraw(){
  pickList($('bioList'), Object.keys(BIOME_ART), () => bioId, id => { bioId = id; bioRedraw(); },
           id => BIOME_ART[id].name);
  const B = BIOME_ART[bioId];
  const sky = $('bioSky'); sky.innerHTML = '';
  PHASES.forEach(ph => {
    colourRow(sky, ph + ' top', () => B.sky[ph][0], v => B.sky[ph][0] = v);
    colourRow(sky, ph + ' low', () => B.sky[ph][1], v => B.sky[ph][1] = v);
  });
  const gr = $('bioGround'); gr.innerHTML = '';
  for (const k in B.ground) colourRow(gr, k, () => B.ground[k], v => B.ground[k] = v);
  const ti = $('bioTint'); ti.innerHTML = '';
  PHASES.forEach(ph => rgbaRow(ti, ph, () => B.tint[ph], v => B.tint[ph] = v));

  const pv = $('bioPreview'); pv.innerHTML = '';
  PHASES.forEach(ph => pv.appendChild(shot(bakeBg(ph, bioId), 1, ph)));
}
REDRAW.habitat = bioRedraw;

/* ---- go ------------------------------------------------------------------ */
pixRedraw();
loadTemplate().then(() => note('Ready. Edits are live; Save writes src/00-art.js.'))
  .catch(e => note(e.message + ' — serve the folder over http, not file://', true));
