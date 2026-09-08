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

/* ---- tabs ----------------------------------------------------------------
   Two kinds of redraw, and keeping them apart is the whole of why the sliders
   work.

   BUILD constructs a tab's controls. PAINT redraws only its previews. Dragging
   a slider fires `input` on every pixel of travel, and the first version called
   BUILD each time — which removes the very element the pointer is dragging and
   replaces it with a fresh one. The drag dies after a single step, the number
   still updates because the event landed, and the slider looks broken.

   So: moving a control PAINTS. Only choosing a different thing to edit, or
   changing what controls there should be, BUILDS.
   -------------------------------------------------------------------------- */
let tab = 'pix';
const BUILD = {}, PAINT = {};
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main').forEach(m => m.classList.toggle('on', m.id === 'tab-' + tab));
  if (BUILD[tab]) BUILD[tab]();
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

/* A value moved. Drop what the game has baked and repaint the previews — a
   preview showing a stale bake is how an editor teaches you the wrong thing
   about your own edit — but leave the controls where they are. */
function changed(){
  artChanged();
  if (PAINT[tab]) PAINT[tab]();
}
/* The set of controls itself has to change. */
function rebuild(){
  artChanged();
  if (BUILD[tab]) BUILD[tab]();
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

function pixBuild(){
  const p = PIX[pixId];
  pickList($('pixList'), Object.keys(PIX), () => pixId, id => { pixId = id; pixPen = 0; pixBuild(); });

  // the palette, as chips: the selected one is what the left button paints
  const pal = $('pixPal'); pal.innerHTML = '';
  p.pal.forEach((c, i) => {
    const chip = mk('div', 'chip' + (i === pixPen ? ' on' : ''));
    chip.style.background = c;
    chip.title = c;
    chip.onclick = () => {                       // in place: no rebuild needed
      pixPen = i;
      [...pal.children].forEach((el2, k) => el2.classList.toggle('on', k === i));
    };
    pal.appendChild(chip);
  });
  const add = mk('div', 'chip', '+');
  add.style.cssText += ';display:flex;align-items:center;justify-content:center;color:#8fa39a';
  add.onclick = () => { p.pal.push('#ffffff'); pixPen = p.pal.length - 1; rebuild(); };
  pal.appendChild(add);

  // palette entries and the sprite's own size. A colour picker repaints; it
  // also has to recolour its own chip, which the rebuild used to do for it.
  const sw = $('pixSwatches'); sw.innerHTML = '';
  p.pal.forEach((c, i) => colourRow(sw, PIX_CH[i], () => p.pal[i],
    v => { p.pal[i] = v; pal.children[i].style.background = v; }));
  const size = mk('div'); size.style.marginTop = '8px';
  slider(size, 'width', () => p.w, v => pixResize(p, v, p.h), 4, 32, 1);
  slider(size, 'height', () => p.h, v => pixResize(p, p.w, v), 4, 32, 1);
  sw.appendChild(size);

  pixPaint();
}

function pixPaint(){
  const p = PIX[pixId];
  const cv = $('pixGrid');
  if (cv.width !== p.w * PIX_Z || cv.height !== p.h * PIX_Z){
    cv.width = p.w * PIX_Z; cv.height = p.h * PIX_Z;
  }
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
}

function pixResize(p, w, h){
  p.rows = Array.from({length:h}, (_, y) => ((p.rows[y] || '').padEnd(w)).slice(0, w));
  p.w = w; p.h = h;
}
function pixAt(ev, erase){
  const p = PIX[pixId], r = $('pixGrid').getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left) / PIX_Z), y = Math.floor((ev.clientY - r.top) / PIX_Z);
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  const row = (p.rows[y] || '').padEnd(p.w);
  const ch = erase ? ' ' : PIX_CH[pixPen];
  if (row[x] === ch) return;
  p.rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
  changed();
}
$('pixGrid').addEventListener('mousedown', e => {
  e.preventDefault(); painting = e.button === 2 ? 2 : 1; pixAt(e, painting === 2);
});
$('pixGrid').addEventListener('mousemove', e => { if (painting) pixAt(e, painting === 2); });
window.addEventListener('mouseup', () => painting = 0);
$('pixGrid').addEventListener('contextmenu', e => e.preventDefault());
BUILD.pix = pixBuild;
PAINT.pix = pixPaint;

const STAGE_COLS = ['s','head','snout','muzzle','neck','limb','tail','bulk','torso','fuzz','horn','frill','hornBend'];

/* ---- tab: species -------------------------------------------------------- */
let spId = 'rex', spStage = -1;          // -1 is the base, 0..3 a growth stage
/* A sensible range for a slider is a property of the number, not of the
   editor: a tail length wants 0 to twice its default, a ratio wants a tight
   band around 1. Anything unlisted gets half to double what it is now. */
const TUNE_RANGE = { foreRatio:[0.8, 1.6, .01], frillTilt:[-1.2, .4, .01], hornLen:[0, 4, .05],
                     crestH:[1, 4, .05], fuzzLen:[0, 14, .1], epi:[0, .5, .01],
                     hornBend:[-2, 2, .05] };
const STAGE_RANGE = [0, 2.2, .01];       // every STAGE column is a multiplier
function rangeFor(key, v){
  if (TUNE_RANGE[key]) return TUNE_RANGE[key];
  if (STAGE_COLS.includes(key)) return STAGE_RANGE;
  const step = Math.abs(v) < 3 ? .1 : .5;
  return [Math.min(0, v * 2), Math.max(1, Math.abs(v) * 2), step];
}
function speciesStrip(host, id, mark){
  host.innerHTML = '';
  for (let st = 0; st < STAGE.length; st++){
    const f = frameOf(id, st, 'idle', 0, false, 'wild');
    const cell = shot(f.cv, 2, STAGE[st].key);
    if (st === mark) cell.style.outline = '2px solid var(--moss)';
    host.appendChild(cell);
  }
}

/* One row of the proportions panel.

   At the base it edits the species' own TUNE table. At a stage it edits that
   stage's override row and shows what the value would be without one — a
   number whose inherited value you cannot see is a number you cannot safely
   change. Pinned rows are marked and can be cleared back to inherited, because
   an override that only ever accumulates is a fork rather than an adjustment.

   The first edit at a stage turns an inherited row into a pinned one, and that
   decoration is applied to this row in place. Rebuilding the panel to show it
   would replace the slider under the pointer and end the drag. */
function tuneRow(host, key, inherited){
  const row = mk('label');
  const overrides = spStage >= 0 ? SPECIES_STAGE[spId][spStage] : null;
  const name = mk('span', overrides && key in overrides ? 'pin' : '', key);
  row.appendChild(name);
  const start = overrides && key in overrides ? overrides[key] : inherited;
  const [lo, hi, step] = rangeFor(key, inherited);
  const r = mk('input'); r.type = 'range'; r.min = lo; r.max = hi; r.step = step; r.value = start;
  const n = mk('input'); n.type = 'number'; n.step = step; n.value = start;
  const tail = mk('span');                          // holds × or "inherited"
  tail.style.cssText = 'min-width:0;font-size:11px';

  const clearBtn = () => {
    const x = mk('button', 'clear', '×');
    x.title = 'back to ' + inherited;
    x.onclick = ev => { ev.preventDefault(); delete overrides[key]; rebuild(); };
    return x;
  };
  const markPinned = () => {
    name.className = 'pin';
    tail.innerHTML = ''; tail.appendChild(clearBtn());
  };
  if (overrides){
    if (key in overrides) markPinned();
    else { tail.textContent = 'inherited'; tail.style.opacity = '.6'; }
  }

  const push = v => {
    if (spStage < 0) SPECIES[spId].tune[key] = +v;
    else {
      const fresh = !(key in overrides);
      overrides[key] = +v;
      if (fresh) markPinned();
    }
    r.value = v; n.value = v;
    changed();
  };
  r.oninput = () => push(r.value);
  n.oninput = () => push(n.value);
  row.appendChild(r); row.appendChild(n);
  if (overrides) row.appendChild(tail);
  host.appendChild(row);
}

function spBuild(){
  pickList($('spList'), Object.keys(SPECIES), () => spId, id => { spId = id; spBuild(); },
           id => SPECIES[id].common);
  // which stage the panel is editing: the base, or one of the four
  const sel = $('spStage'); sel.innerHTML = '';
  [['-1','All stages (base)']].concat(STAGE.map((s,i) => [String(i), 'Only ' + s.key]))
    .forEach(([v,l]) => { const o = mk('option', null, l); o.value = v;
                          if (+v === spStage) o.selected = true; sel.appendChild(o); });
  sel.onchange = () => { spStage = +sel.value; spBuild(); };

  const sp = SPECIES[spId];
  const t = $('spTune'); t.innerHTML = '';
  /* At a stage the panel shows the growth columns too, because "the trike's
     frill at hatchling" is a growth column and is exactly what this is for. At
     the base they belong on the Growth tab, where every species shares them. */
  if (spStage >= 0){
    t.appendChild(heading('Growth columns'));
    STAGE_COLS.forEach(k => tuneRow(t, k, STAGE[spStage][k]));
    t.appendChild(heading('Proportions', true));
  }
  for (const k in sp.tune) tuneRow(t, k, sp.tune[k]);

  const c = $('spCols'); c.innerHTML = '';
  for (const k in sp.spec) colourRow(c, k, () => sp.spec[k], v => sp.spec[k] = v);
  spPaint();
}
function heading(text, gap){
  const h = mk('div', null, text);
  h.style.cssText = 'color:var(--dim);font-size:11px;margin:' + (gap ? '10px' : '2px') + ' 0 6px';
  return h;
}
function spPaint(){ speciesStrip($('spPreview'), spId, spStage); }
BUILD.species = spBuild;
PAINT.species = spPaint;

/* ---- tab: growth --------------------------------------------------------- */
function stBuild(){
  const t = $('stTable'); t.innerHTML = '';
  const grid = mk('div', 'grid4');
  grid.style.gridTemplateColumns = 'auto repeat(' + STAGE.length + ', auto)';
  grid.appendChild(mk('span', null, ''));
  STAGE.forEach(s2 => grid.appendChild(mk('span', null, s2.key)));
  STAGE_COLS.forEach(col => {
    grid.appendChild(mk('span', null, col));
    STAGE.forEach(s2 => {
      const n = mk('input'); n.type = 'number'; n.step = '.01'; n.value = s2[col];
      n.style.width = '62px';
      n.oninput = () => { s2[col] = +n.value; changed(); };
      grid.appendChild(n);
    });
  });
  t.appendChild(grid);
  stPaint();
}
function stPaint(){
  const pv = $('stPreview'); pv.innerHTML = '';
  for (const id in SPECIES){
    pv.appendChild(mk('h2', null, SPECIES[id].common));
    const strip = mk('div', 'strip');
    pv.appendChild(strip);
    speciesStrip(strip, id);
  }
}
BUILD.stages = stBuild;
PAINT.stages = stPaint;

/* ---- tab: coats ---------------------------------------------------------- */
let coatKey = 'rex|wild';
function coatBuild(){
  const keys = [];
  for (const sp in SKINS) for (const k of SKINS[sp]) keys.push(sp + '|' + k.id);
  pickList($('coatList'), keys, () => coatKey, k => { coatKey = k; coatBuild(); },
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
  ['none','bands','spots','speckle','patches'].forEach(pn => {
    const o = mk('option', null, pn); o.value = pn; if (coat.pattern === pn) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => { coat.pattern = sel.value; changed(); };
  pat.appendChild(sel); c.appendChild(pat);
  coatPaint();
}
function coatPaint(){
  const [sp, id] = coatKey.split('|');
  const pv = $('coatPreview'); pv.innerHTML = '';
  [1,3].forEach(st => pv.appendChild(shot(frameOf(sp, st, 'idle', 0, false, id).cv, 2, STAGE[st].key)));
  pv.appendChild(shot(frameOf(sp, 3, 'walk', 4, false, id).cv, 2, 'walk'));
}
BUILD.coats = coatBuild;
PAINT.coats = coatPaint;

/* ---- tab: habitats ------------------------------------------------------- */
let bioId = 'valley';
const PHASES = ['dawn','day','dusk','night'];
function bioBuild(){
  pickList($('bioList'), Object.keys(BIOME_ART), () => bioId, id => { bioId = id; bioBuild(); },
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
  bioPaint();
}
function bioPaint(){
  const pv = $('bioPreview'); pv.innerHTML = '';
  PHASES.forEach(ph => pv.appendChild(shot(bakeBg(ph, bioId), 1, ph)));
}
BUILD.habitat = bioBuild;
PAINT.habitat = bioPaint;

/* ---- tab: headgear -------------------------------------------------------
   Placing a hat is a judgement about where it looks right, and no number is
   that judgement — you can only see it. So the control is the animal: drag the
   hat onto its head and the offsets fall out of where you dropped it.

   Nothing here knows what hats exist. The list is whatever `PIX` holds under
   `hat.`, read at build time, and the species list is whatever `SPECIES` holds,
   so drawing a new hat in the Pixels tab is the whole of adding one — it turns
   up here on its own with no fit and the species' default placement.

   The preview calls the game's own `drawGear()`. It is in the sprite engine
   rather than the renderer precisely so this can, because a preview that
   places the hat its own way is free to be wrong in a way the game is not.
   -------------------------------------------------------------------------- */
let gearSp = Object.keys(SPECIES)[0], gearHat = null, gearStage = -1;
const GEAR_Z = 5, GEAR_PAD = 16;   // a hat rides above the frame's own box

const gearHats = () => Object.keys(PIX).filter(k => k.slice(0,4) === 'hat.').map(k => k.slice(4));
const gearShown = () => gearStage < 0 ? STAGE.length - 1 : gearStage;   // base previews on the adult

/* The row being edited: the hat's own, or one stage's override of it.
   `make` is false for reading, so looking at a hat never writes one. */
function gearRow(make){
  const byHat = GEAR_FIT[gearSp] || (make ? (GEAR_FIT[gearSp] = {}) : null);
  if (!byHat) return null;
  const hat = byHat[gearHat] || (make ? (byHat[gearHat] = {}) : null);
  if (!hat || gearStage < 0) return hat;
  const at = hat.at || (make ? (hat.at = {}) : null);
  if (!at) return null;
  const key = STAGE[gearStage].key;
  return at[key] || (make ? (at[key] = {}) : null);
}
/* What the animal is actually wearing right now, whoever said so. */
const gearEff = () => gearFor(gearSp, gearHat, gearShown());

/* Anything that says nothing is deleted, so the table keeps listing only the
   exceptions instead of filling with zeroes and empty rows. */
function gearTidy(){
  const hat = (GEAR_FIT[gearSp] || {})[gearHat];
  if (!hat) return;
  const strip = o => {
    if (!o) return;
    for (const k of ['dx','dy']) if (!o[k]) delete o[k];
    if (o.s === 1) delete o.s;
  };
  strip(hat);
  for (const k in hat.at || {}){
    strip(hat.at[k]);
    if (!Object.keys(hat.at[k]).length) delete hat.at[k];
  }
  if (hat.at && !Object.keys(hat.at).length) delete hat.at;
  if (!Object.keys(hat).length) delete GEAR_FIT[gearSp][gearHat];
}

function gearBuild(){
  const hats = gearHats();
  if (!hats.length){ $('gearCanvas').textContent = 'No headgear in PIX yet.'; return; }
  if (!hats.includes(gearHat)) gearHat = hats[0];

  pickList($('gearSp'), Object.keys(SPECIES), () => gearSp,
           id => { gearSp = id; gearBuild(); }, id => SPECIES[id].common);
  pickList($('gearHat'), hats, () => gearHat, id => { gearHat = id; gearBuild(); });

  /* Every stage, or one of them. The base row is what this hat does on this
     animal at any age; a stage is where that age wants something else, and a
     stage that has said something is marked, so which ones are pinned is
     visible without clicking through all four. */
  const row = $('gearStageRow'); row.innerHTML = '';
  const hat = (GEAR_FIT[gearSp] || {})[gearHat] || {};
  const mkBtn = (i, label, pinned) => {
    const b = mk('button', i === gearStage ? 'on' : '', label + (pinned ? ' *' : ''));
    b.onclick = () => { gearStage = i; gearBuild(); };
    row.appendChild(b);
  };
  mkBtn(-1, 'all stages', false);
  STAGE.forEach((st, i) => mkBtn(i, st.key, !!(hat.at || {})[st.key]));

  const nums = $('gearNums'); nums.innerHTML = '';
  slider(nums, 'size', () => gearEff().s,
         v => { gearRow(true).s = v; gearTidy(); }, .4, 2.5, .01);
  const read = mk('div'); read.id = 'gearRead';
  read.style.cssText = 'color:var(--dim);font-size:11px;margin:4px 0';
  nums.appendChild(read);

  const reset = mk('button', 'clear',
    gearStage < 0 ? 'Reset this hat everywhere'
                  : 'Clear ' + STAGE[gearStage].key + ' - back to all stages');
  reset.onclick = () => {
    const h = (GEAR_FIT[gearSp] || {})[gearHat];
    if (h){
      if (gearStage < 0) delete GEAR_FIT[gearSp][gearHat];
      else if (h.at) delete h.at[STAGE[gearStage].key];
      gearTidy();
    }
    rebuild();
  };
  nums.appendChild(reset);

  /* The canvas is built here and only here. It is a control, not a preview:
     `changed()` runs PAINT on every pointer move, and the first version of this
     tab rebuilt the canvas there - which removes the element the pointer has
     captured, so the drag died after about five pixels and the hat crawled.
     Same trap the sliders hit, one tab over. PAINT redraws into this canvas;
     it never replaces it. */
  const host = $('gearCanvas'); host.innerHTML = '';
  const f0 = frameOf(gearSp, gearShown(), 'idle', 0, false, 'wild');
  const c = mk('canvas');
  c.width = (f0.cv.width + GEAR_PAD*2) * GEAR_Z;
  c.height = (f0.cv.height + GEAR_PAD*2) * GEAR_Z;
  c.style.cssText = 'image-rendering:pixelated;touch-action:none;cursor:grab;background:#131c1e';

  /* A drag moves the pointer in CSS pixels and the offsets are in sprite
     units, so the movement is divided by the zoom, by the animal's own scale,
     and by whatever the layout has done to the canvas - drag on a hatchling
     and on an adult and the hat lands under the pointer both times. */
  let from = null;
  c.onpointerdown = e => {
    const fit = gearEff(), f = frameOf(gearSp, gearShown(), 'idle', 0, false, 'wild');
    const r = c.getBoundingClientRect();
    from = { x:e.clientX, y:e.clientY, dx:fit.dx, dy:fit.dy,
             per: (r.width / c.width) * GEAR_Z * f.k };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = 'grabbing';
  };
  c.onpointermove = e => {
    if (!from) return;
    const target = gearRow(true);
    target.dx = Math.round((from.dx + (e.clientX - from.x) / from.per) * 10) / 10;
    target.dy = Math.round((from.dy + (e.clientY - from.y) / from.per) * 10) / 10;
    changed();                       // repaint only: BUILD here would kill the drag
  };
  const drop = () => {
    if (!from) return;
    from = null; c.style.cursor = 'grab';
    gearTidy(); rebuild();           // the pointer is gone, so controls may move
  };
  c.onpointerup = drop;
  c.onpointercancel = drop;
  host.appendChild(c);
  gearPaint();
}

function gearPaint(){
  const c = $('gearCanvas').querySelector('canvas');
  if (!c) return;
  const f = frameOf(gearSp, gearShown(), 'idle', 0, false, 'wild');
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.scale(GEAR_Z, GEAR_Z);
  g.drawImage(f.cv, GEAR_PAD, GEAR_PAD);
  drawGear(g, f, GEAR_PAD + f.ox, GEAR_PAD + f.oy, false, gearHat, gearSp);

  const eff = gearEff(), own = gearRow(false) || {};
  const read = $('gearRead');
  if (read){
    const mark = k => own[k] !== undefined ? '' : '*';
    read.textContent =
      'dx ' + eff.dx + mark('dx') +
      '   dy ' + eff.dy + mark('dy') +
      '   size ' + eff.s + mark('s') +
      (gearStage < 0 ? '        (star = species default)'
                     : '        (star = inherited from all stages)');
  }

  const pv = $('gearPreview'); pv.innerHTML = '';
  const at = (((GEAR_FIT[gearSp] || {})[gearHat] || {}).at) || {};
  STAGE.forEach((st, i) => {
    const sf = frameOf(gearSp, i, 'idle', 0, false, 'wild');
    const cc = mk('canvas');
    cc.width = sf.cv.width + GEAR_PAD*2; cc.height = sf.cv.height + GEAR_PAD;
    const gg = cc.getContext('2d');
    gg.imageSmoothingEnabled = false;
    gg.drawImage(sf.cv, GEAR_PAD, GEAR_PAD);
    drawGear(gg, sf, GEAR_PAD + sf.ox, GEAR_PAD + sf.oy, false, gearHat, gearSp);
    const cell = shot(cc, 2, st.key + (at[st.key] ? ' *' : ''));
    if (i === gearShown()) cell.style.outline = '2px solid var(--moss)';
    pv.appendChild(cell);
  });
}
BUILD.gear = gearBuild;
PAINT.gear = gearPaint;

/* ---- tab: body -----------------------------------------------------------
   The proportions as handles on the animal instead of as a column of sliders.
   The sliders in the Species tab still edit the same numbers — this is another
   way in, not another set of values.

   Three things this tab has to get right, all of which the first version got
   wrong:

   The animal must not move while you drag it. A frame is trimmed to its own
   ink, so the moment a proportion changes the box around the animal changes
   size — lengthen the tail and the frame goes from 145 pixels wide to 162.
   Drawn into the corner of the canvas that shift lands on the animal, which
   slid out from under the pointer and made the whole thing feel broken. So the
   canvas is a fixed size and the animal is pinned by its own ground origin:
   whatever happens to the box, the feet stay where they are.

   A handle must move one thing. Dragging a square that rotated the frill on
   one axis and resized it on the other is two tools sharing a button.

   And you must be able to see what you are about to grab. Handles are named on
   hover, the list beside the canvas selects them, and the selected one is the
   only one a drag can move — so two landmarks a few pixels apart stop fighting
   over the pointer.
   -------------------------------------------------------------------------- */
const PART_KEYS = {
  rex: {
    snout:    { x:'headLen',   note:'snout length' },
    jaw:      { y:'headDepth', note:'skull depth' },
    head:     { x:'neckLen', y:'neckDrop', note:'where the head is carried' },
    shoulder: { x:'shoulder', y:'withersH', note:'shoulder position and hump' },
    back:     { y:'backH',     note:'depth of the ribcage' },
    hip:      { y:'hipH',      note:'hip height, and so leg length' },
    belly:    { y:'bellyD',    note:'how far the belly hangs' },
    arm:      { x:'armLen',    note:'arm length' },
    tailBase: { y:'tailBase',  note:'depth of the tail at the hips' },
    tail:     { x:'tailLen',   note:'tail length' }
  },
  trike: {
    snout:    { x:'headLen',   note:'snout length' },
    jaw:      { y:'headDepth', note:'skull depth' },
    head:     { x:'neckLen', y:'neckDrop', note:'where the head is carried' },
    frill:    { y:'frillH',    note:'frill height' },
    shoulder: { x:'shoulder', y:'withersH', note:'shoulder position and hump' },
    foreleg:  { y:'shoulderDrop', note:'front leg length' },
    back:     { y:'backH',     note:'mid back' },
    rump:     { y:'rumpH',     note:'haunch over the hip' },
    hip:      { x:'hipBack', y:'hipH', note:'hip position, and back leg length' },
    haunch:   { y:'haunchR',   note:'thigh mass' },
    chest:    { y:'chestD',    note:'depth of the chest' },
    belly:    { y:'bellyD',    note:'how far the belly hangs' },
    tailBase: { y:'tailBase',  note:'depth of the tail at the hips' },
    tail:     { x:'tailLen',   note:'tail length' }
  },
  brachio: {
    snout:    { x:'headLen',   note:'snout length' },
    jaw:      { y:'headDepth', note:'skull depth' },
    crest:    { y:'crestH',    note:'nasal arch' },
    neck:     { y:'neckLen',   note:'neck length' },
    head:     { x:'shoulder',  note:'how far forward the head reaches' },
    shoulder: { y:'foreRatio', note:'how much longer the front legs are' },
    hip:      { x:'hipBack', y:'hindH', note:'hip position, and leg length' },
    belly:    { y:'bodyD',     note:'depth of the barrel' },
    tail:     { x:'tailLen',   note:'tail length' }
  }
};

let bodySp = Object.keys(SPECIES)[0], bodyStage = 3, bodyPart = null, bodyHover = null;
let bodyAnim = 'idle', bodyPlaying = false, bodyFrame = 0, bodyRAF = 0, bodyLast = 0;
/* A fixed stage in sprite units, and where the animal's feet go on it. Nothing
   here is derived from the frame, which is the whole point. */
const BODY_Z = 4, BODY_W = 200, BODY_H = 128, BODY_OX = 78, BODY_OY = 112;

const bodyFrameOf = () => frameOf(bodySp, bodyStage, bodyAnim, bodyFrame, false, 'wild');
const bodyKeys = () => PART_KEYS[bodySp] || {};
/* A landmark in canvas units, pinned to the origin rather than to the box. */
function bodyAt(name, f){
  f = f || bodyFrameOf();
  const q = f.parts[name];
  return q ? [BODY_OX + q[0] - f.ox, BODY_OY + q[1] - f.oy] : null;
}

/* One unit of `key` is worth this many pixels at `part`. Measured, not derived:
   nudge the key, re-bake, see how far the landmark went. Against the animal's
   own origin, because the trimmed box moves whenever the sprite changes size. */
function bodyRate(part, key){
  const tune = SPECIES[bodySp].tune;
  const where = () => { const f = bodyFrameOf(); const q = f.parts[part];
                        return q ? [q[0] - f.ox, q[1] - f.oy] : null; };
  const before = where();
  const was = tune[key];
  tune[key] = was + 1;
  artChanged();
  const after = where();
  tune[key] = was;
  artChanged();
  if (!before || !after) return null;
  return [after[0] - before[0], after[1] - before[1]];
}

function bodyStop(){ if (bodyRAF) cancelAnimationFrame(bodyRAF); bodyRAF = 0; }

function bodyBuild(){
  bodyStop();
  const keys = bodyKeys();
  if (bodyPart && !keys[bodyPart]) bodyPart = null;

  pickList($('bodySp'), Object.keys(SPECIES), () => bodySp,
           id => { bodySp = id; bodyPart = null; bodyBuild(); }, id => SPECIES[id].common);
  pickList($('bodyPart'), Object.keys(keys), () => bodyPart,
           id => { bodyPart = (bodyPart === id ? null : id); bodyBuild(); });

  const st = $('bodyStage'); st.innerHTML = '';
  st.appendChild(mk('span', 'lbl', 'stage'));
  STAGE.forEach((s, i) => {
    const b = mk('button', i === bodyStage ? 'on' : '', s.key);
    b.onclick = () => { bodyStage = i; bodyBuild(); };
    st.appendChild(b);
  });

  const an = $('bodyAnim'); an.innerHTML = '';
  an.appendChild(mk('span', 'lbl', 'pose'));
  Object.keys(POSES).forEach(name => {
    const b = mk('button', name === bodyAnim ? 'on' : '', name);
    b.onclick = () => { bodyAnim = name; bodyFrame = 0; bodyBuild(); };
    an.appendChild(b);
  });

  /* The play control was the ninth button in the pose row, in the same style,
     labelled "play" — which is indistinguishable from a pose called play. It
     gets its own row and says what it does. */
  const pl = $('bodyPlay'); pl.innerHTML = '';
  const b = mk('button', bodyPlaying ? 'on' : '',
               bodyPlaying ? '■  stop animation' : '▶  play animation');
  b.style.minWidth = '150px';
  b.onclick = () => { bodyPlaying = !bodyPlaying; bodyBuild(); };
  pl.appendChild(b);
  pl.appendChild(mk('span', 'lbl',
    POSES[bodyAnim].length > 1 ? POSES[bodyAnim].length + ' frames'
                               : 'this pose is a single frame'));

  /* Built here and only here: PAINT redraws into it, never replaces it. */
  const host = $('bodyCanvas'); host.innerHTML = '';
  const c = mk('canvas');
  c.width = BODY_W * BODY_Z; c.height = BODY_H * BODY_Z;
  c.style.cssText = 'image-rendering:pixelated;touch-action:none;cursor:crosshair;background:#131c1e';

  const at = e => {
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width) / BODY_Z,
            (e.clientY - r.top)  * (c.height / r.height) / BODY_Z];
  };
  const nearest = pos => {
    const f = bodyFrameOf();
    let best = null, bd = 6;
    for (const name in bodyKeys()){
      const q = bodyAt(name, f);
      if (!q) continue;
      const d = Math.hypot(q[0] - pos[0], q[1] - pos[1]);
      if (d < bd){ bd = d; best = name; }
    }
    return best;
  };

  let drag = null;
  c.onpointerdown = e => {
    /* A selected part owns the pointer. Nothing selected: grab what is under
       it and select that, so the next drag is unambiguous. */
    const name = bodyPart || nearest(at(e));
    if (!name || !bodyKeys()[name]) return;
    bodyPart = name;
    const map = bodyKeys()[name], tune = SPECIES[bodySp].tune;
    drag = { name, map, x:e.clientX, y:e.clientY,
             x0: map.x ? tune[map.x] : 0, y0: map.y ? tune[map.y] : 0,
             rx: map.x ? bodyRate(name, map.x) : null,
             ry: map.y ? bodyRate(name, map.y) : null,
             css: c.getBoundingClientRect().width / c.width };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = 'grabbing';
    bodyPaint();
  };
  c.onpointermove = e => {
    if (!drag){
      const h = nearest(at(e));
      if (h !== bodyHover){ bodyHover = h; bodyPaint(); }
      c.style.cursor = h ? 'grab' : 'crosshair';
      return;
    }
    const tune = SPECIES[bodySp].tune;
    const dx = (e.clientX - drag.x) / drag.css / BODY_Z;
    const dy = (e.clientY - drag.y) / drag.css / BODY_Z;
    if (drag.map.x && drag.rx && Math.abs(drag.rx[0]) > 1e-4)
      tune[drag.map.x] = +(drag.x0 + dx / drag.rx[0]).toFixed(2);
    if (drag.map.y && drag.ry && Math.abs(drag.ry[1]) > 1e-4)
      tune[drag.map.y] = +(drag.y0 + dy / drag.ry[1]).toFixed(2);
    changed();
  };
  const drop = () => {
    if (!drag) return;
    drag = null; c.style.cursor = 'crosshair';
    rebuild();
  };
  c.onpointerup = drop;
  c.onpointercancel = drop;
  c.onpointerleave = () => { if (!drag && bodyHover){ bodyHover = null; bodyPaint(); } };
  host.appendChild(c);

  const read = mk('div'); read.id = 'bodyRead';
  read.style.cssText = 'color:var(--dim);font-size:11px;margin-top:5px;min-height:15px';
  host.appendChild(read);

  bodyPaint();
  if (bodyPlaying) bodyTick(0);
}

function bodyTick(now){
  bodyRAF = requestAnimationFrame(bodyTick);
  if (now - bodyLast < 110) return;
  bodyLast = now;
  bodyFrame = (bodyFrame + 1) % POSES[bodyAnim].length;
  bodyPaint();
}

function bodyPaint(){
  const c = $('bodyCanvas').querySelector('canvas');
  if (!c) return;
  const f = bodyFrameOf();
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.scale(BODY_Z, BODY_Z);

  // the ground the animal stands on, so a leg-length change reads as one
  g.fillStyle = '#1c2a2c';
  g.fillRect(0, BODY_OY, BODY_W, BODY_H - BODY_OY);
  // pinned by its own origin: the box may resize, the feet may not move
  g.drawImage(f.cv, BODY_OX - f.ox, BODY_OY - f.oy);

  const keys = bodyKeys();
  for (const name in keys){
    const q = bodyAt(name, f);
    if (!q) continue;
    const on = name === bodyPart, hot = name === bodyHover;
    const r = on ? 3 : 2.5;
    g.fillStyle = 'rgba(16,26,24,.8)';
    g.fillRect(q[0] - r, q[1] - r, r*2, r*2);
    g.fillStyle = on ? '#e0ac48' : hot ? '#cfe0a8' : '#8cb765';
    g.fillRect(q[0] - r + 1, q[1] - r + 1, r*2 - 2, r*2 - 2);
  }

  const read = $('bodyRead');
  if (read){
    const name = bodyPart || bodyHover;
    const tune = SPECIES[bodySp].tune;
    if (!name) read.textContent = 'Hover a handle to name it, click to select. A selected handle is the only one a drag moves.';
    else {
      const k = keys[name];
      read.textContent = name + ' — ' + k.note + '   ·   '
        + [k.x, k.y].filter(Boolean).map(q => q + ' ' + tune[q]).join('   ')
        + (bodyPart === name ? '   (selected — click it in the list again to release)' : '');
    }
  }
}
BUILD.body = bodyBuild;
PAINT.body = bodyPaint;

/* ---- tab: draw -----------------------------------------------------------
   Drawing a body part by hand, in place of the shape the species computes.

   The palette here is the list of materials, not a list of colours, and that
   is not a simplification — it is what the pipeline wants. composeSprite reads
   every material layer as a mask and takes all of its colour from that
   material's ramp, so a drawing states which material each pixel is and gets
   the shading, the internal edges and the outline back for free. Painting in
   colours would mean painting the lighting by hand and having it ignored.

   One grid pixel is one baked pixel. The drawing is therefore per stage, and
   the trace guide is the animal at that stage rather than a scaled sketch.
   -------------------------------------------------------------------------- */
let drawSp = 'rex', drawStage = 3, drawUnit = 'head', drawPen = LAYERS.indexOf('head');
let drawGuide = true, drawInk = 0;
let drawAnim = 'idle', drawFrame = 0, drawPlaying = false, drawRAF = 0, drawLast = 0;
const DRAW_MARGIN = 4;

const drawStem = (u, s) => drawSp + '|' + (u || drawUnit) + '|' + (s === undefined ? drawStage : s);
/* The key the editor is currently painting into. A part drawn for this one
   frame of this one pose owns the pixel; otherwise the plain drawing does, and
   editing that changes every pose at once. Which of the two it is has to be on
   the screen, or a change to one frame that silently altered all twelve would
   be indistinguishable from a change to twelve that altered one. */
const drawKey = () => {
  const stem = drawStem(), per = stem + '|' + drawAnim + '|' + drawFrameNow();
  return PART_PIX[per] ? per : stem;
};
const drawFrameNow = () => drawFrame % (POSES[drawAnim] || POSES.idle).length;
const drawPerFrame = () => drawKey() !== drawStem();
const drawHas = (u, s) => partKeys(drawSp, u || drawUnit, s === undefined ? drawStage : s).length > 0;

/* The layers as the species leaves them, for the pose being previewed. */
function drawRaw(){
  const poses = POSES[drawAnim] || POSES.idle;
  const pose = poses[drawFrame % poses.length];
  return drawLayers(drawSp, drawStage, pose, pose.eye !== undefined ? pose.eye : 0);
}
function drawUnitLayer(raw){ return raw.canvases[LAYERS.indexOf(PART_UNITS[drawUnit].layer)]; }

/* What to call the thing being painted with. A material is called what it is;
   a painting colour is called a colour, because that is the difference the
   person drawing needs to hold on to. */
function drawPenLabel(i){
  const slot = i - INK_FIRST;
  if (slot >= 0 && slot < INKS){
    const ink = inksFor(drawSp)[slot];
    return ink ? 'colour ' + (slot + 1) + ' ' + ink.col + (ink.lit ? '' : ' (flat)')
               : 'colour ' + (slot + 1) + ' (unset)';
  }
  return LAYERS[i];
}
/* Recolour one chip where it stands. Dragging the light slider must not
   rebuild the palette out from under the pointer. */
function rebuildInkChip(slot){
  const mats = matsFor(drawSp, 'wild'), name = LAYERS[INK_FIRST + slot];
  const pal = $('drawPal');
  const chip = [...pal.children].find(el => (el.title || '').startsWith('colour ' + (slot + 1)));
  if (chip && mats[name]) chip.style.background = mats[name].r[2];
  if (drawPen === INK_FIRST + slot) $('drawPenName').textContent = drawPenLabel(drawPen);
}

/* Where this unit hangs, in box pixels. The same walk down the preference list
   that stampParts does, and the same conversion, or the editor would show the
   drawing somewhere the game does not put it. */
function drawAnchorOf(raw){
  for (const name of PART_UNITS[drawUnit].at){
    const q = raw.anchors.parts && raw.anchors.parts[name];
    if (q) return [Math.round(BAKE_CX + q[0]*raw.k), Math.round(BAKE_G + q[1]*raw.k)];
  }
  return [BAKE_CX, BAKE_G];
}
function inkBox(cv){
  const d = readCtx(cv).getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y=0;y<cv.height;y++) for (let x=0;x<cv.width;x++)
    if (d[(y*cv.width + x)*4 + 3] >= 118){
      if (x<x0) x0=x; if (x>x1) x1=x; if (y<y0) y0=y; if (y>y1) y1=y;
    }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/* The entry being edited, or — where there is none yet — an empty grid cut to
   fit whatever the species draws there, with the anchor already in the right
   cell. A unit with no procedural geometry at all, a frill on a rex, gets a
   small square around the anchor to start from.

   `make` is what turns that proposal into a real entry. Nothing is written to
   PART_PIX by looking at a unit, only by painting on it, so clicking through
   the list to see what is there does not fill the file with blank grids. */
function drawEntry(make, into){
  const key = into || drawKey();
  if (PART_PIX[key]) return PART_PIX[key];
  const raw = drawRaw(), a = drawAnchorOf(raw), box = inkBox(drawUnitLayer(raw));
  const p = box
    ? { w: box.x1 - box.x0 + 1 + DRAW_MARGIN*2, h: box.y1 - box.y0 + 1 + DRAW_MARGIN*2,
        ox: a[0] - box.x0 + DRAW_MARGIN,        oy: a[1] - box.y0 + DRAW_MARGIN }
    : { w: 24, h: 24, ox: 12, oy: 12 };
  p.rows = Array.from({length:p.h}, () => ' '.repeat(p.w));
  if (make) PART_PIX[key] = p;
  return p;
}
const drawZoom = p => Math.max(2, Math.min(12, Math.floor(620 / p.w)));

/* Seed the grid from the shape it replaces, as that unit's own material. A rex
   body is four thousand pixels and nobody is drawing that from an empty grid;
   what this tab is actually for is taking what the maths produced and pushing
   it around.

   `into` is the key to write, so the same tracing serves one drawing and a
   whole pose's worth of them. */
function drawTraceInto(into, anim, frame){
  const p = drawEntry(true, into);
  const poses = POSES[anim] || POSES.idle, pose = poses[frame % poses.length];
  const raw = drawLayers(drawSp, drawStage, pose, pose.eye !== undefined ? pose.eye : 0);
  const a = drawAnchorOf(raw);
  const cv = raw.canvases[LAYERS.indexOf(PART_UNITS[drawUnit].layer)];
  const d = readCtx(cv).getImageData(0, 0, cv.width, cv.height).data;
  const ch = PART_CH[LAYERS.indexOf(PART_UNITS[drawUnit].layer)];
  const gx = a[0] - p.ox, gy = a[1] - p.oy;      // box pixel under grid cell 0,0
  p.rows = Array.from({length:p.h}, (_, r) => {
    let row = '';
    for (let c=0;c<p.w;c++){
      const X = gx + c, Y = gy + r;
      const on = X >= 0 && Y >= 0 && X < cv.width && Y < cv.height
                 && d[(Y*cv.width + X)*4 + 3] >= 118;
      row += on ? ch : ' ';
    }
    return row;
  });
}
function drawTrace(){ drawTraceInto(drawKey(), drawAnim, drawFrameNow()); rebuild(); }

/* Every frame of the pose being previewed, traced off the gait solver into a
   drawing of its own. This is the only way a hand-drawn leg walks, and it is
   also the only way anyone would ever agree to draw twelve of them: what comes
   out is twelve legs that already step correctly, to be edited rather than
   invented. The box is measured once, off the frame with the widest reach, so
   every frame shares a grid and a swing does not run off the edge of one. */
function drawTraceAll(){
  const poses = POSES[drawAnim] || POSES.idle;
  const stem = drawStem();
  let box = null, anchor = null;
  for (let i = 0; i < poses.length; i++){
    const pose = poses[i];
    const raw = drawLayers(drawSp, drawStage, pose, pose.eye !== undefined ? pose.eye : 0);
    const a = drawAnchorOf(raw);
    const b = inkBox(raw.canvases[LAYERS.indexOf(PART_UNITS[drawUnit].layer)]);
    if (!b) continue;
    // in anchor-relative coordinates, so the union is meaningful across frames
    const rel = { x0: b.x0 - a[0], y0: b.y0 - a[1], x1: b.x1 - a[0], y1: b.y1 - a[1] };
    box = box ? { x0: Math.min(box.x0, rel.x0), y0: Math.min(box.y0, rel.y0),
                  x1: Math.max(box.x1, rel.x1), y1: Math.max(box.y1, rel.y1) } : rel;
    anchor = a;
  }
  if (!box){ note('nothing to trace — this unit draws nothing at this stage', true); return; }
  const shape = { w: box.x1 - box.x0 + 1 + DRAW_MARGIN*2, h: box.y1 - box.y0 + 1 + DRAW_MARGIN*2,
                  ox: -box.x0 + DRAW_MARGIN, oy: -box.y0 + DRAW_MARGIN };
  for (let i = 0; i < poses.length; i++){
    const key = stem + '|' + drawAnim + '|' + i;
    PART_PIX[key] = { w: shape.w, h: shape.h, ox: shape.ox, oy: shape.oy,
                      rows: Array.from({length: shape.h}, () => ' '.repeat(shape.w)) };
    drawTraceInto(key, drawAnim, i);
  }
  note(poses.length + ' frames of ' + drawAnim + ' traced — edit them one at a time');
  rebuild();
}

function drawStop(){ if (drawRAF) cancelAnimationFrame(drawRAF); drawRAF = 0; }
function drawTick(now){
  drawRAF = requestAnimationFrame(drawTick);
  if (now - drawLast < 110) return;
  drawLast = now;
  drawFrame = (drawFrame + 1) % (POSES[drawAnim] || POSES.idle).length;
  drawPaint();
}

function drawBuild(){
  drawStop();
  const mats = matsFor(drawSp, 'wild');

  pickList($('drawSp'), Object.keys(SPECIES), () => drawSp,
           id => { drawSp = id; drawBuild(); }, id => SPECIES[id].common);
  pickList($('drawUnit'), Object.keys(PART_UNITS), () => drawUnit,
           id => { drawUnit = id; drawPen = LAYERS.indexOf(PART_UNITS[id].layer); drawBuild(); },
           id => (drawHas(id) ? '● ' : '   ') + id);

  const st = $('drawStage'); st.innerHTML = '';
  st.appendChild(mk('span', 'lbl', 'stage'));
  STAGE.forEach((s, i) => {
    const b = mk('button', i === drawStage ? 'on' : '',
                 (drawHas(drawUnit, i) ? '● ' : '') + s.key);
    b.onclick = () => { drawStage = i; drawBuild(); };
    st.appendChild(b);
  });

  const an = $('drawAnim'); an.innerHTML = '';
  an.appendChild(mk('span', 'lbl', 'pose'));
  Object.keys(POSES).forEach(name => {
    const per = PART_PIX[drawStem() + '|' + name + '|0'] ? '● ' : '';
    const b = mk('button', name === drawAnim ? 'on' : '', per + name);
    b.onclick = () => { drawAnim = name; drawFrame = 0; drawBuild(); };
    an.appendChild(b);
  });
  const play = mk('button', drawPlaying ? 'on' : '',
                  drawPlaying ? '■ stop' : '▶ play');
  play.onclick = () => { drawPlaying = !drawPlaying; drawBuild(); };
  an.appendChild(play);

  /* One button per frame of the pose, so a per-frame drawing can be reached
     and worked on. Marked where that frame has a drawing of its own. */
  const fr = $('drawFrames'); fr.innerHTML = '';
  const poses = POSES[drawAnim] || POSES.idle;
  if (poses.length > 1){
    fr.appendChild(mk('span', 'lbl', 'frame'));
    for (let i = 0; i < poses.length; i++){
      const own = !!PART_PIX[drawStem() + '|' + drawAnim + '|' + i];
      const b = mk('button', i === drawFrameNow() ? 'on' : '', (own ? '●' : '') + i);
      b.onclick = () => { drawFrame = i; drawBuild(); };
      fr.appendChild(b);
    }
  }

  /* Two kinds of thing in one palette, and the difference is worth keeping in
     mind while drawing.

     The materials come first. Their chips show what that material will paint on
     this animal, but the colour is a readout — what is being chosen is what the
     pixel is made of, and the lighting decides the rest.

     Then the species' own painting colours, for the details no material can
     honestly describe. Those really are colours, and `+` adds one. */
  const inks = inksFor(drawSp);
  const pal = $('drawPal'); pal.innerHTML = '';
  const chips = [];
  LAYERS.forEach((name, i) => {
    const ink = i >= INK_FIRST && i < INK_FIRST + INKS ? inks[i - INK_FIRST] : null;
    if (i >= INK_FIRST && i < INK_FIRST + INKS && !ink) return;      // not defined
    const chip = mk('div', 'chip' + (i === drawPen ? ' on' : ''));
    chip.style.background = (mats[name] && mats[name].r[2]) || '#f0f';
    if (ink) chip.style.borderStyle = 'dashed';                      // a colour, not a material
    chip.title = drawPenLabel(i) + '  (' + PART_CH[i] + ')';
    chip.onclick = () => {
      drawPen = i;
      chips.forEach(([el, k]) => el.classList.toggle('on', k === i));
      $('drawPenName').textContent = drawPenLabel(i);
    };
    chips.push([chip, i]);
    pal.appendChild(chip);
  });
  if (inks.filter(Boolean).length < INKS){
    const add = mk('div', 'chip', '+');
    add.style.cssText += ';display:flex;align-items:center;justify-content:center;color:#8fa39a';
    add.title = 'a colour of this animal’s own, for a detail no material describes';
    add.onclick = () => {
      const list = PART_MATS[drawSp] || (PART_MATS[drawSp] = []);
      let slot = 0; while (list[slot]) slot++;
      list[slot] = { col: '#c2603c', lit: 1 };
      drawPen = INK_FIRST + slot;
      rebuild();
    };
    pal.appendChild(add);
  }
  $('drawPenName').textContent = drawPenLabel(drawPen);

  /* One row per painting colour: the colour itself, how much light it takes,
     and a way to take it away again. */
  const ic = $('drawInks'); ic.innerHTML = '';
  inks.forEach((ink, slot) => {
    if (!ink) return;
    const row = mk('div', 'sw');
    row.appendChild(mk('b', null, 'colour ' + (slot + 1)));
    const col = mk('input'); col.type = 'color'; col.value = ink.col;
    col.oninput = () => { ink.col = col.value; changed(); rebuildInkChip(slot); };
    const lit = mk('input'); lit.type = 'range';
    lit.min = 0; lit.max = 1.4; lit.step = .1; lit.value = ink.lit === undefined ? 1 : ink.lit;
    lit.style.width = '90px';
    lit.title = 'how much light this colour takes — 0 is flat';
    lit.oninput = () => { ink.lit = +lit.value; changed(); rebuildInkChip(slot); };
    const kill = mk('button', 'clear', '×');
    kill.title = 'remove this colour';
    kill.onclick = () => {
      inksFor(drawSp)[slot] = null;
      if (drawPen === INK_FIRST + slot) drawPen = LAYERS.indexOf(PART_UNITS[drawUnit].layer);
      rebuild();
    };
    row.appendChild(col); row.appendChild(lit); row.appendChild(kill);
    ic.appendChild(row);
  });
  if (!inks.filter(Boolean).length)
    ic.appendChild(mk('div', 'lbl', 'none yet — + in the palette adds one'));

  const tools = $('drawTools'); tools.innerHTML = '';
  const guide = mk('button', drawGuide ? 'on' : '', 'trace guide');
  guide.onclick = () => { drawGuide = !drawGuide; drawBuild(); };
  const trace = mk('button', '', 'fill from the computed shape');
  trace.onclick = drawTrace;
  tools.appendChild(guide); tools.appendChild(trace);
  /* Only worth offering where the pose has frames to differ between. A part
     that cannot bend needs one drawing per frame to move, and this is what
     makes that a minute's work instead of an afternoon's. */
  if ((POSES[drawAnim] || POSES.idle).length > 1){
    const all = mk('button', '', 'trace every frame of ' + drawAnim);
    all.title = 'the only way a drawn leg walks: one drawing per frame, '
              + 'each traced off the gait so it already steps';
    all.onclick = drawTraceAll;
    tools.appendChild(all);
  }
  const clear = mk('button', '', 'back to procedural');
  clear.onclick = () => {
    for (const k of partKeys(drawSp, drawUnit, drawStage)) delete PART_PIX[k];
    rebuild();
  };
  tools.appendChild(clear);

  const size = $('drawSize'); size.innerHTML = '';
  const p0 = drawEntry(false);
  slider(size, 'width',  () => p0.w, v => drawResize('w', v), 4, 200, 1);
  slider(size, 'height', () => p0.h, v => drawResize('h', v), 4, 200, 1);
  slider(size, 'anchor x', () => p0.ox, v => { drawEntry(true).ox = v; }, -40, 200, 1);
  slider(size, 'anchor y', () => p0.oy, v => { drawEntry(true).oy = v; }, -40, 200, 1);

  /* Built once. PAINT draws into it and resizes it, and never replaces it, or
     a drag would die on its first pixel of travel. */
  const host = $('drawCanvas'); host.innerHTML = '';
  const c = mk('canvas');
  c.style.cssText = 'touch-action:none;cursor:crosshair;background:#101a1c';
  const cell = ev => {
    const p = drawEntry(false), z = drawZoom(p), r = c.getBoundingClientRect();
    return [Math.floor((ev.clientX - r.left) * (c.width / r.width) / z),
            Math.floor((ev.clientY - r.top)  * (c.height / r.height) / z)];
  };
  const put = (ev, erase) => {
    const p = drawEntry(true), [x, y] = cell(ev);
    if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
    const row = (p.rows[y] || '').padEnd(p.w), ch = erase ? ' ' : PART_CH[drawPen];
    if (row[x] === ch) return;
    p.rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
    changed();
  };
  c.addEventListener('mousedown', e => {
    e.preventDefault(); drawInk = e.button === 2 ? 2 : 1; put(e, drawInk === 2);
  });
  c.addEventListener('mousemove', e => { if (drawInk) put(e, drawInk === 2); });
  c.addEventListener('contextmenu', e => e.preventDefault());
  host.appendChild(c);

  drawPaint();
  if (drawPlaying) drawTick(0);
}
window.addEventListener('mouseup', () => drawInk = 0);

function drawResize(which, v){
  const p = drawEntry(true);
  if (which === 'w') p.w = v; else p.h = v;
  p.rows = Array.from({length:p.h}, (_, y) => ((p.rows[y] || '').padEnd(p.w)).slice(0, p.w));
}

function drawPaint(){
  const c = $('drawCanvas').querySelector('canvas');
  if (!c) return;
  const p = drawEntry(false), z = drawZoom(p), mats = matsFor(drawSp, 'wild');
  if (c.width !== p.w*z || c.height !== p.h*z){ c.width = p.w*z; c.height = p.h*z; }
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#101a1c'; g.fillRect(0, 0, c.width, c.height);

  /* The animal as it would be with nothing drawn by hand, faint, behind the
     grid — the whole animal and not just this unit, because a jaw is drawn to
     fit a skull and a skull to sit on a neck. Aligned by the anchor, which is
     the one point the drawing and the computed shape are guaranteed to share. */
  const raw = drawRaw(), a = drawAnchorOf(raw);
  const gx = a[0] - p.ox, gy = a[1] - p.oy;
  if (drawGuide){
    const ghost = composeSprite(raw.canvases, mats, BAKE_W, BAKE_H);
    g.globalAlpha = .3;
    g.drawImage(ghost, -gx*z, -gy*z, ghost.width*z, ghost.height*z);
    g.globalAlpha = 1;
  }

  for (let y=0;y<p.h;y++) for (let x=0;x<p.w;x++){
    const ch = (p.rows[y] || '')[x] || ' ';
    if (ch !== ' '){
      const li = PART_CH.indexOf(ch);
      g.fillStyle = (mats[LAYERS[li]] && mats[LAYERS[li]].r[2]) || '#f0f';
      g.fillRect(x*z, y*z, z, z);
    } else if (!drawGuide && ((x + y) & 1)){
      g.fillStyle = '#162124'; g.fillRect(x*z, y*z, z, z);
    }
  }
  if (z >= 4){
    g.strokeStyle = 'rgba(143,163,154,.16)'; g.lineWidth = 1;
    for (let x=0;x<=p.w;x++){ g.beginPath(); g.moveTo(x*z+.5, 0); g.lineTo(x*z+.5, c.height); g.stroke(); }
    for (let y=0;y<=p.h;y++){ g.beginPath(); g.moveTo(0, y*z+.5); g.lineTo(c.width, y*z+.5); g.stroke(); }
  }
  // the anchor: the cell the landmark lands in, which is what the drawing hangs by
  g.strokeStyle = '#e0ac48'; g.lineWidth = 2;
  g.strokeRect(p.ox*z + 1, p.oy*z + 1, z - 2, z - 2);

  const poses = POSES[drawAnim] || POSES.idle;
  const f = frameOf(drawSp, drawStage, drawAnim, drawFrame % poses.length, false, 'wild');
  const pv = $('drawPreview'); pv.innerHTML = '';
  [1, 2, 4].forEach(s => pv.appendChild(shot(f.cv, s, s + 'x')));

  const gs = $('drawStages'); gs.innerHTML = '';
  STAGE.forEach((s, i) => gs.appendChild(
    shot(frameOf(drawSp, i, 'idle', 0, false, 'wild').cv, 2,
         s.key + (drawHas(drawUnit, i) ? ' ●' : ''))));

  const read = $('drawRead');
  const key = drawKey(), owned = partKeys(drawSp, drawUnit, drawStage).length;
  read.textContent = PART_UNITS[drawUnit].note + '   ·   replaces the '
    + PART_UNITS[drawUnit].layer + ' layer, hangs from '
    + PART_UNITS[drawUnit].at.join(' or ') + '   ·   '
    + (!PART_PIX[key] ? 'not drawn — procedural'
       : drawPerFrame() ? p.w + '×' + p.h + ' — editing ' + drawAnim + ' frame '
                          + drawFrameNow() + ' only, of ' + owned + ' drawings'
                        : p.w + '×' + p.h + ' — editing the drawing used by every pose');
}
BUILD.draw = drawBuild;
PAINT.draw = drawPaint;

/* ---- tab: backdrop -------------------------------------------------------
   A whole habitat painted by hand, over the one bakeBg computes.

   A different editor from the Draw tab and deliberately a separate one. There
   the palette is a list of materials and the grid is the size of a jaw; here
   it is real colours and 280x210 of them. One panel that rebuilt itself into
   two shapes is exactly what BUILD and PAINT exist to avoid.

   Nothing here repaints through a bake. A backdrop is fifty-nine thousand
   pixels and re-baking the habitat on every pixel of a drag is a drag that
   stutters, so the grid is drawn straight from the rows through one ImageData
   and the game's own view is refreshed when the pointer comes up.
   -------------------------------------------------------------------------- */
let bdBio = 'valley', bdPhase = 'base', bdPen = 0, bdZ = 2, bdTool = 'pen';
let bdGuide = true, bdCrops = true, bdInk = 0;
const BD_PHASES = ['base', 'dawn', 'day', 'dusk', 'night'];

const bdKey = (b, p) => (p || bdPhase) === 'base' ? (b || bdBio) : (b || bdBio) + '|' + (p || bdPhase);
const bdHas = (b, p) => !!BG_PIX[bdKey(b, p)];

/* The habitat as it would be with nothing painted over it. Taken by lifting
   the drawing out and putting it back, because bakeBg composites the drawing
   itself and asking it for the version underneath any other way would mean a
   second code path that could disagree with the first. */
function bdProcedural(){
  const key = bdKey(), kept = BG_PIX[key];
  delete BG_PIX[key]; artChanged();
  const out = makeCv(BG_W, BG_H);
  readCtx(out).drawImage(bakeBg(bdPhase === 'base' ? 'day' : bdPhase, bdBio), 0, 0);
  if (kept) BG_PIX[key] = kept;
  artChanged();
  return out;
}

function bdEntry(make){
  const key = bdKey();
  if (BG_PIX[key]) return BG_PIX[key];
  const p = { w: BG_W, h: BG_H, pal: ['#000000'], quiet: [],
              rows: Array.from({length: BG_H}, () => ' '.repeat(BG_W)) };
  if (make) BG_PIX[key] = p;
  return p;
}

/* Seed the drawing from the computed habitat.

   Nobody paints fifty-nine thousand pixels from nothing; what this tab is for
   is taking the generated scene and changing it. The palette is built by
   counting: the sixty-two most-used colours are kept and everything else snaps
   to the nearest of them, which for a backdrop made of flat bands and dithers
   costs almost nothing — the tail is single pixels of blend. */
function bdTrace(){
  const src = bdProcedural(), d = readCtx(src).getImageData(0, 0, BG_W, BG_H).data;
  const seen = new Map();
  for (let i = 0; i < BG_W*BG_H; i++){
    const k = (d[i*4] << 16) | (d[i*4+1] << 8) | d[i*4+2];
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  const keep = [...seen.entries()].sort((a, b) => b[1] - a[1])
                 .slice(0, BG_CH.length).map(e => e[0]);
  const hex = k => '#' + (k & 0xffffff).toString(16).padStart(6, '0');
  const snap = new Map();
  const near = k => {
    if (snap.has(k)) return snap.get(k);
    const r = k >> 16 & 255, g = k >> 8 & 255, b = k & 255;
    let best = 0, bd = Infinity;
    keep.forEach((c, i) => {
      const dd = ((c>>16&255)-r)**2 + ((c>>8&255)-g)**2 + ((c&255)-b)**2;
      if (dd < bd){ bd = dd; best = i; }
    });
    snap.set(k, best);
    return best;
  };
  const p = bdEntry(true);
  p.pal = keep.map(hex);
  p.rows = Array.from({length: BG_H}, (_, y) => {
    let row = '';
    for (let x = 0; x < BG_W; x++){
      const i = y*BG_W + x;
      row += BG_CH[near((d[i*4] << 16) | (d[i*4+1] << 8) | d[i*4+2])];
    }
    return row;
  });
  bdPen = 0;
  rebuild();
}

/* Flood fill, four-connected, over the character grid. */
function bdFill(x0, y0, ch){
  const p = bdEntry(true);
  const from = (p.rows[y0] || '')[x0] || ' ';
  if (from === ch) return;
  const rows = p.rows.map(r => r.padEnd(p.w).split(''));
  const stack = [[x0, y0]];
  while (stack.length){
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
    if (rows[y][x] !== from) continue;
    rows[y][x] = ch;
    stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
  }
  p.rows = rows.map(r => r.join(''));
}

function bdBuild(){
  pickList($('bdBio'), Object.keys(BIOMES), () => bdBio,
           id => { bdBio = id; bdBuild(); },
           id => (bdHas(id, 'base') ? '● ' : '   ') + (BIOME_ART[id] ? BIOME_ART[id].name : id));

  const ph = $('bdPhase'); ph.innerHTML = '';
  ph.appendChild(mk('span', 'lbl', 'drawing'));
  BD_PHASES.forEach(name => {
    const b = mk('button', name === bdPhase ? 'on' : '',
                 (bdHas(bdBio, name) ? '● ' : '') + (name === 'base' ? 'base (all day)' : name));
    b.onclick = () => { bdPhase = name; bdBuild(); };
    ph.appendChild(b);
  });

  const p = bdEntry(false);
  const pal = $('bdPal'); pal.innerHTML = '';
  p.pal.forEach((c, i) => {
    const chip = mk('div', 'chip' + (i === bdPen ? ' on' : ''));
    chip.style.background = c;
    chip.title = c + '  (' + BG_CH[i] + ')';
    chip.onclick = () => {
      bdPen = i;
      [...pal.children].forEach((el, k) => el.classList.toggle('on', k === i));
    };
    pal.appendChild(chip);
  });
  if (p.pal.length < BG_CH.length){
    const add = mk('div', 'chip', '+');
    add.style.cssText += ';display:flex;align-items:center;justify-content:center;color:#8fa39a';
    add.onclick = () => { bdEntry(true).pal.push('#ffffff'); bdPen = bdEntry(true).pal.length - 1; rebuild(); };
    pal.appendChild(add);
  }

  const sw = $('bdSwatches'); sw.innerHTML = '';
  p.pal.forEach((c, i) => colourRow(sw, BG_CH[i], () => bdEntry(false).pal[i],
    v => { bdEntry(true).pal[i] = v; pal.children[i].style.background = v; }));

  const tools = $('bdTools'); tools.innerHTML = '';
  ['pen', 'fill', 'pick'].forEach(t => {
    const b = mk('button', t === bdTool ? 'on' : '', t);
    b.onclick = () => { bdTool = t; bdBuild(); };
    tools.appendChild(b);
  });
  [['guide', () => bdGuide, () => bdGuide = !bdGuide],
   ['crop marks', () => bdCrops, () => bdCrops = !bdCrops]].forEach(([label, get, set]) => {
    const b = mk('button', get() ? 'on' : '', label);
    b.onclick = () => { set(); bdBuild(); };
    tools.appendChild(b);
  });
  [1, 2, 3].forEach(z => {
    const b = mk('button', z === bdZ ? 'on' : '', z + 'x');
    b.onclick = () => { bdZ = z; bdBuild(); };
    tools.appendChild(b);
  });
  const trace = mk('button', '', 'fill from the computed habitat');
  trace.onclick = bdTrace;
  const clear = mk('button', '', 'back to procedural');
  clear.onclick = () => { delete BG_PIX[bdKey()]; rebuild(); };
  tools.appendChild(trace); tools.appendChild(clear);

  /* Which live elements this drawing would rather do without. */
  const q = $('bdQuiet'); q.innerHTML = '';
  q.appendChild(mk('span', 'lbl', 'hide'));
  ['stars','sky','live','clouds','flyers','water','grass','motes','fronds'].forEach(name => {
    const has = (p.quiet || []).indexOf(name) >= 0;
    const b = mk('button', has ? 'on' : '', name);
    b.onclick = () => {
      const e = bdEntry(true);
      e.quiet = e.quiet || [];
      const i = e.quiet.indexOf(name);
      if (i < 0) e.quiet.push(name); else e.quiet.splice(i, 1);
      rebuild();
    };
    q.appendChild(b);
  });

  const host = $('bdCanvas'); host.innerHTML = '';
  const c = mk('canvas');
  c.style.cssText = 'touch-action:none;cursor:crosshair;background:#101a1c;max-width:100%';
  const cell = ev => {
    const r = c.getBoundingClientRect();
    return [Math.floor((ev.clientX - r.left) * (c.width / r.width) / bdZ),
            Math.floor((ev.clientY - r.top)  * (c.height / r.height) / bdZ)];
  };
  const put = (ev, erase) => {
    const [x, y] = cell(ev);
    if (x < 0 || y < 0 || x >= BG_W || y >= BG_H) return;
    const e = bdEntry(true);
    if (bdTool === 'pick' && !erase){
      const ch = (e.rows[y] || '')[x];
      const i = BG_CH.indexOf(ch);
      if (i >= 0){ bdPen = i; bdBuild(); }
      return;
    }
    const ch = erase ? ' ' : BG_CH[bdPen];
    if (bdTool === 'fill' && !erase){ bdFill(x, y, ch); bdGrid(); return; }
    const row = (e.rows[y] || '').padEnd(e.w);
    if (row[x] === ch) return;
    e.rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
    bdGrid();                               // the grid only: the bake waits
  };
  c.addEventListener('mousedown', e => {
    e.preventDefault(); bdInk = e.button === 2 ? 2 : 1; put(e, bdInk === 2);
  });
  c.addEventListener('mousemove', e => { if (bdInk && bdTool !== 'pick') put(e, bdInk === 2); });
  c.addEventListener('contextmenu', e => e.preventDefault());
  host.appendChild(c);

  bdPaint();
}
/* The pointer coming up is what pays for the bake. */
window.addEventListener('mouseup', () => { if (bdInk){ bdInk = 0; if (tab === 'backdrop') changed(); } });

/* The grid itself: one ImageData for the drawing, the computed habitat behind
   it where it is blank, then the crop marks. Called on every painted pixel, so
   there is nothing per-pixel in it. */
let bdGuideCv = null, bdGuideKey = '';
function bdGrid(){
  const c = $('bdCanvas').querySelector('canvas');
  if (!c) return;
  const p = bdEntry(false), z = bdZ;
  if (c.width !== BG_W*z || c.height !== BG_H*z){ c.width = BG_W*z; c.height = BG_H*z; }
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#101a1c'; g.fillRect(0, 0, c.width, c.height);

  if (bdGuide){
    const key = bdBio + '|' + bdPhase;
    if (key !== bdGuideKey){ bdGuideCv = bdProcedural(); bdGuideKey = key; }
    g.globalAlpha = .45;
    g.drawImage(bdGuideCv, 0, 0, c.width, c.height);
    g.globalAlpha = 1;
  }

  const small = makeCv(BG_W, BG_H), sg = readCtx(small);
  const img = sg.createImageData(BG_W, BG_H), d = img.data;
  const rgb = p.pal.map(h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]);
  for (let y = 0; y < BG_H; y++){
    const row = p.rows[y] || '';
    for (let x = 0; x < BG_W; x++){
      const i = BG_CH.indexOf(row[x] || ' ');
      if (i < 0 || !rgb[i]) continue;
      const o = (y*BG_W + x)*4;
      d[o] = rgb[i][0]; d[o+1] = rgb[i][1]; d[o+2] = rgb[i][2]; d[o+3] = 255;
    }
  }
  sg.putImageData(img, 0, 0);
  g.drawImage(small, 0, 0, c.width, c.height);

  /* What each growth stage will actually see. Drawn last so it is never hidden
     by the picture — the outer box is the adult's view and the inner one the
     hatchling's, and anything outside the outer box is never on screen. */
  if (bdCrops){
    g.lineWidth = 1;
    BG_CROP.forEach(([sx, sy, sw, sh], i) => {
      g.strokeStyle = i === 0 ? 'rgba(224,172,72,.85)' : 'rgba(224,172,72,.30)';
      g.strokeRect(sx*z + .5, sy*z + .5, sw*z - 1, sh*z - 1);
    });
    g.strokeStyle = 'rgba(255,0,128,.5)';
    g.beginPath(); g.moveTo(0, BG_G*z + .5); g.lineTo(c.width, BG_G*z + .5); g.stroke();
  }
}

function bdPaint(){
  bdGrid();
  const p = bdEntry(false);
  const pv = $('bdPreview'); pv.innerHTML = '';
  PHASES.forEach(ph => pv.appendChild(shot(bakeBg(ph, bdBio), 1, ph)));
  const st = $('bdStages'); st.innerHTML = '';
  const world = bakeBg(bdPhase === 'base' ? 'day' : bdPhase, bdBio);
  BG_CROP.forEach(([sx, sy, sw, sh], i) => {
    const c = makeCv(W, H), g = readCtx(c);
    g.imageSmoothingEnabled = false;
    g.drawImage(world, sx, sy, sw, sh, 0, 0, W, H);
    st.appendChild(shot(c, 1, STAGE[i].key));
  });
  $('bdRead').textContent = BG_PIX[bdKey()]
    ? p.w + '×' + p.h + ' drawn, ' + p.pal.length + ' colours   ·   about '
      + Math.round(p.w * p.h / 1000) + 'k characters in src/00-bg-art.js'
    : 'nothing drawn — this habitat is computed';
}
BUILD.backdrop = bdBuild;
PAINT.backdrop = bdPaint;

/* ---- tab: rig ------------------------------------------------------------
   Parts added to an animal's skeleton, edited on the animal.

   The first version of this tab had three dropdowns to add a part, a fourth to
   say which joint each point hung on, eighteen blue dots permanently scattered
   over the animal, and a width slider per point. It was accurate, and nobody
   could tell what was going on, which is a fair description of a bad tool.

   What it does now: press a shape, click where you want it, drag it. The point
   attaches itself to whichever bone is nearest, because that is the right
   answer almost every time, and it says which one in words. The bones stay
   hidden until something is being moved. Thickness is one slider, not four.
   -------------------------------------------------------------------------- */
let rigSp = 'trike', rigSel = -1, rigVert = -1, rigStage = 3, rigArm = null;
let rigAnim = 'idle', rigFrame = 0, rigPlaying = false, rigRAF = 0, rigLast = 0;
let rigBones = false, rigDragging = false;
const RIG_Z = 4, RIG_W = 210, RIG_H = 134, RIG_OX = 80, RIG_OY = 118;
/* Plain words. `tube` and `blob` are what the drawing primitives are called;
   they are not what somebody adding a horn is thinking. */
const RIG_KINDS = [['tube','spike'], ['blob','shape'], ['oval','bump']];
const rigKindName = k => (RIG_KINDS.find(e => e[0] === k) || [k, k])[1];

const rigList = () => RIG_PARTS[rigSp] || (RIG_PARTS[rigSp] = []);
const rigCur = () => rigList()[rigSel];
const rigStageKey = () => STAGE[rigStage].key;
/* What a drag actually moves. If this age has been given a shape of its own,
   the drag edits that; otherwise it edits the one every age shares. */
function rigEdit(){
  const p = rigCur();
  if (!p) return null;
  return (p.at && p.at[rigStageKey()]) || p;
}
const rigOverridden = () => { const p = rigCur(); return !!(p && p.at && p.at[rigStageKey()]); };

function rigPose(){
  const poses = POSES[rigAnim] || POSES.idle;
  return poses[rigFrame % poses.length];
}
function rigFrameOf(){
  const pose = rigPose();
  const raw = drawLayers(rigSp, rigStage, pose, pose.eye !== undefined ? pose.eye : 0);
  const f = frameOf(rigSp, rigStage, rigAnim,
                    rigFrame % (POSES[rigAnim] || POSES.idle).length, false, 'wild');
  return { joints: raw.anchors.joints || {}, f, k: f.k };
}

/* Canvas pixels to joint units. Undo the joint's rotation, then its scale,
   then the animal's own scale. */
function rigDelta(joints, name, dx, dy, k){
  const j = joints[name] || {};
  let x = dx / k, y = dy / k;
  if (j.rot){
    // through a temporary, or the second line uses the x the first just wrote
    const c = Math.cos(-j.rot), s = Math.sin(-j.rot);
    const nx = x*c - y*s;
    y = x*s + y*c; x = nx;
  }
  return [x / (j.sx === undefined ? 1 : j.sx), y / (j.sy === undefined ? 1 : j.sy)];
}
/* Which bone a point belongs to. Nearest wins, measured in the animal's own
   units, and it is right often enough that nobody should have to be asked. */
function rigNearestJoint(joints, lx, ly){
  let best = null, bd = Infinity;
  for (const name in joints){
    const j = joints[name];
    const d = Math.hypot(j.x - lx, j.y - ly);
    if (d < bd){ bd = d; best = name; }
  }
  return best;
}
/* Which part is under the pointer: nearest outline point wins. */
function rigPick(joints, k, pos){
  let best = -1, bd = 7;
  rigList().forEach((part, i) => {
    if (!rigShows(part, rigStage)) return;
    rigOutline(joints, rigForStage(part, rigStage)).forEach(p => {
      const d = Math.hypot(RIG_OX + p[0]*k - pos[0], RIG_OY + p[1]*k - pos[1]);
      if (d < bd){ bd = d; best = i; }
    });
  });
  return best;
}
/* Put a point back on whichever bone it is now nearest to. Dragging a horn tip
   across the face should not leave it measured from the hip. */
function rigRehome(joints, ed, i){
  const p = rigOutline(joints, ed)[i];
  const near = rigNearestJoint(joints, p[0], p[1]);
  if (!near || near === ed.v[i][0]) return;
  const j = joints[near];
  let x = p[0] - j.x, y = p[1] - j.y;
  if (j.rot){
    const c = Math.cos(-j.rot), s = Math.sin(-j.rot);
    const nx = x*c - y*s; y = x*s + y*c; x = nx;
  }
  ed.v[i] = [near, +(x/(j.sx||1)).toFixed(3), +(y/(j.sy||1)).toFixed(3)];
}

function rigStop(){ if (rigRAF) cancelAnimationFrame(rigRAF); rigRAF = 0; }
function rigTick(now){
  rigRAF = requestAnimationFrame(rigTick);
  if (now - rigLast < 110) return;
  rigLast = now;
  rigFrame = (rigFrame + 1) % (POSES[rigAnim] || POSES.idle).length;
  rigPaint();
}

/* Put a new part where the pointer is, on the nearest bone, at a size that can
   actually be seen and grabbed. */
function rigPlace(kind, joints, lx, ly){
  const joint = rigNearestJoint(joints, lx, ly);
  const j = joints[joint];
  const ox = (lx - j.x) / (j.sx || 1), oy = (ly - j.y) / (j.sy || 1);
  const p = { name: rigKindName(kind) + ' ' + (rigList().length + 1),
              layer: 'horn', kind: kind, v: [] };
  if (kind === 'oval'){ p.v = [[joint, ox, oy]]; p.r = [.35, .35]; }
  else if (kind === 'tube'){
    p.v = [[joint, ox, oy], [joint, ox, oy - .5], [joint, ox, oy - 1.0]];
    p.w = [6, 3.2, .8];
  } else {
    p.v = [[joint, ox-.35, oy], [joint, ox, oy-.6], [joint, ox+.35, oy], [joint, ox, oy+.45]];
  }
  rigList().push(p);
  rigSel = rigList().length - 1;
  rigVert = -1; rigArm = null;
  rebuild();
}

function rigBuild(){
  rigStop();
  const info = rigFrameOf(), joints = info.joints;
  const list = rigList();
  if (rigSel >= list.length) rigSel = list.length - 1;
  const cur = rigCur(), ed = rigEdit();

  const sp = $('rigSp'); sp.innerHTML = '';
  Object.keys(SPECIES).forEach(id => {
    const b = mk('button', id === rigSp ? 'on' : '', SPECIES[id].common);
    b.onclick = () => { rigSp = id; rigSel = -1; rigVert = -1; rigArm = null; rigBuild(); };
    sp.appendChild(b);
  });

  const st = $('rigStage'); st.innerHTML = '';
  st.appendChild(mk('span', 'lbl', 'age'));
  STAGE.forEach((s, i) => {
    const b = mk('button', i === rigStage ? 'on' : '', s.key);
    b.onclick = () => { rigStage = i; rigBuild(); };
    st.appendChild(b);
  });
  const lab = mk('span', 'lbl', 'moving'); lab.style.marginLeft = '14px';
  st.appendChild(lab);
  ['idle','walk','sleep','sick'].forEach(name => {
    const b = mk('button', name === rigAnim ? 'on' : '', name);
    b.onclick = () => { rigAnim = name; rigFrame = 0; rigBuild(); };
    st.appendChild(b);
  });
  const play = mk('button', rigPlaying ? 'on' : '', rigPlaying ? 'stop' : 'play');
  play.onclick = () => { rigPlaying = !rigPlaying; rigBuild(); };
  st.appendChild(play);

  /* Adding: one press per shape, then click the animal. */
  const add = $('rigAdd'); add.innerHTML = '';
  add.appendChild(mk('span', 'lbl', 'add'));
  RIG_KINDS.forEach(pair => {
    const b = mk('button', rigArm === pair[0] ? 'on' : '', '+ ' + pair[1]);
    b.onclick = () => { rigArm = rigArm === pair[0] ? null : pair[0]; rigBuild(); };
    add.appendChild(b);
  });
  if (rigArm) add.appendChild(mk('span', 'lbl', 'now click the animal where you want it'));
  const bones = mk('button', rigBones ? 'on' : '', 'show bones');
  bones.onclick = () => { rigBones = !rigBones; rigBuild(); };
  add.appendChild(bones);

  /* What the selected part is made of, as the colours it will actually be. */
  const mats = matsFor(rigSp, 'wild');
  const pal = $('rigPal'); pal.innerHTML = '';
  if (cur){
    pal.appendChild(mk('span', 'lbl', 'made of'));
    ['skin','limb','shield','head','crest','horn','beak','mouth','jaw'].forEach(name => {
      const chip = mk('div', 'chip' + (cur.layer === name ? ' on' : ''));
      chip.style.background = (mats[name] && mats[name].r[2]) || '#f0f';
      chip.title = name;
      chip.onclick = () => { cur.layer = name; rebuild(); };
      pal.appendChild(chip);
    });
    pal.appendChild(mk('span', 'lbl', cur.layer));
  }

  /* Which ages have it at all, as four buttons you switch on and off. */
  const ages = $('rigAges'); ages.innerHTML = '';
  if (cur){
    ages.appendChild(mk('span', 'lbl', 'has it at'));
    STAGE.forEach((s, i) => {
      const on = !cur.stages || cur.stages.indexOf(i) >= 0;
      const b = mk('button', on ? 'on' : '', s.key);
      b.onclick = () => {
        const now = cur.stages ? cur.stages.slice() : [0,1,2,3];
        const at = now.indexOf(i);
        if (at >= 0) now.splice(at, 1); else now.push(i);
        now.sort();
        if (now.length === 4) delete cur.stages; else cur.stages = now;
        rebuild();
      };
      ages.appendChild(b);
    });
    const diff = mk('button', rigOverridden() ? 'on' : '',
                    rigOverridden() ? 'this age has its own shape' : 'same shape at every age');
    diff.style.marginLeft = '14px';
    diff.title = 'A part is one shape at every age by default, because its points are measured '
               + 'in the bone’s own units and the bone already grows. Switch this on only '
               + 'where an age is a genuinely different shape, not merely a different size.';
    diff.onclick = () => {
      if (rigOverridden()){
        delete cur.at[rigStageKey()];
        if (!Object.keys(cur.at).length) delete cur.at;
      } else {
        cur.at = cur.at || {};
        const copy = { v: cur.v.map(x => x.slice()) };
        if (cur.w) copy.w = cur.w.slice();
        if (cur.r) copy.r = cur.r.slice();
        cur.at[rigStageKey()] = copy;
      }
      rebuild();
    };
    ages.appendChild(diff);
  }

  const listHost = $('rigList'); listHost.innerHTML = '';
  list.forEach((part, i) => {
    const row = mk('div', 'sw');
    const b = mk('button', '', (part.off ? '- ' : '') + (part.name || rigKindName(part.kind)));
    b.style.cssText = 'flex:1;text-align:left;background:none;border:0;cursor:pointer;'
                    + 'font:inherit;padding:3px 6px;'
                    + (i === rigSel ? 'background:#2c4a3c;color:var(--bone)' : 'color:var(--dim)');
    b.onclick = () => { rigSel = i; rigVert = -1; rigBuild(); };
    const hide = mk('button', 'clear', part.off ? 'show' : 'hide');
    hide.style.color = 'var(--dim)';
    hide.onclick = () => { part.off = !part.off; rebuild(); };
    const del = mk('button', 'clear', 'x');
    del.onclick = () => { list.splice(i, 1); rigSel = -1; rigVert = -1; rebuild(); };
    row.appendChild(b); row.appendChild(hide); row.appendChild(del);
    listHost.appendChild(row);
  });
  if (!list.length) listHost.appendChild(mk('div', 'lbl', 'nothing added yet'));

  /* One number, not four. A spike has a thickness and a point; the taper
     between them keeps the ratio it was seeded with. */
  const nums = $('rigNums'); nums.innerHTML = '';
  if (ed && ed.w){
    slider(nums, 'thickness', () => +ed.w[0].toFixed(1), v => {
      const r = v / (ed.w[0] || 1);
      for (let i = 0; i < ed.w.length; i++) ed.w[i] = +(ed.w[i] * r).toFixed(2);
    }, .4, 20, .2);
    slider(nums, 'point', () => +ed.w[ed.w.length-1].toFixed(1),
           v => ed.w[ed.w.length-1] = v, 0, 8, .1);
  }
  if (ed && ed.r){
    slider(nums, 'width',  () => ed.r[0], v => ed.r[0] = v, .02, 2, .01);
    slider(nums, 'height', () => ed.r[1], v => ed.r[1] = v, .02, 2, .01);
  }

  const host = $('rigCanvas'); host.innerHTML = '';
  const c = mk('canvas');
  c.width = RIG_W * RIG_Z; c.height = RIG_H * RIG_Z;
  c.style.cssText = 'image-rendering:pixelated;touch-action:none;background:#131c1e;cursor:'
                  + (rigArm ? 'copy' : 'crosshair');
  const at = e => {
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width) / RIG_Z,
            (e.clientY - r.top)  * (c.height / r.height) / RIG_Z];
  };
  let drag = null;
  c.onpointerdown = e => {
    const pos = at(e);
    const now = rigFrameOf(), J = now.joints, k = now.k;
    if (rigArm){
      rigPlace(rigArm, J, (pos[0] - RIG_OX)/k, (pos[1] - RIG_OY)/k);
      return;
    }
    const edit = rigEdit();
    if (edit){
      let best = -1, bd = 6;
      rigOutline(J, edit).forEach((p, i) => {
        const d = Math.hypot(RIG_OX + p[0]*k - pos[0], RIG_OY + p[1]*k - pos[1]);
        if (d < bd){ bd = d; best = i; }
      });
      if (best >= 0){
        rigVert = best; rigDragging = true;
        drag = { i: best, x: e.clientX, y: e.clientY, v0: edit.v[best].slice(), k: k,
                 css: c.getBoundingClientRect().width / c.width };
        c.setPointerCapture(e.pointerId);
        rigPaint();
        return;
      }
    }
    rigSel = rigPick(J, k, pos); rigVert = -1;
    rigBuild();
  };
  c.onpointermove = e => {
    if (!drag) return;
    const edit = rigEdit(); if (!edit) return;
    const J = rigFrameOf().joints;
    const dx = (e.clientX - drag.x) / drag.css / RIG_Z;
    const dy = (e.clientY - drag.y) / drag.css / RIG_Z;
    const d = rigDelta(J, edit.v[drag.i][0], dx, dy, drag.k);
    edit.v[drag.i][1] = +(drag.v0[1] + d[0]).toFixed(3);
    edit.v[drag.i][2] = +(drag.v0[2] + d[1]).toFixed(3);
    changed();
  };
  const drop = () => {
    if (!drag) return;
    const edit = rigEdit();
    if (edit) rigRehome(rigFrameOf().joints, edit, drag.i);
    drag = null; rigDragging = false;
    rebuild();
  };
  c.onpointerup = drop; c.onpointercancel = drop;
  host.appendChild(c);

  rigPaint();
  if (rigPlaying) rigTick(0);
}

function rigPaint(){
  const c = $('rigCanvas').querySelector('canvas');
  if (!c) return;
  const info = rigFrameOf(), joints = info.joints, f = info.f, k = info.k;
  const g = c.getContext('2d');
  g.setTransform(1,0,0,1,0,0);
  g.clearRect(0,0,c.width,c.height);
  g.imageSmoothingEnabled = false;
  g.scale(RIG_Z, RIG_Z);
  g.fillStyle = '#1c2a2c'; g.fillRect(0, RIG_OY, RIG_W, RIG_H - RIG_OY);
  g.drawImage(f.cv, RIG_OX - f.ox, RIG_OY - f.oy);

  const conv = p => [RIG_OX + p[0]*k, RIG_OY + p[1]*k];
  const cur = rigCur(), ed = rigEdit();

  /* The bones, only while they are useful: when something is being moved, or
     when asked for. Eighteen dots permanently over the animal is confetti, and
     it reads as damage rather than as structure. */
  if (rigBones || rigDragging){
    for (const name in joints){
      const q = conv([joints[name].x, joints[name].y]);
      g.fillStyle = 'rgba(120,170,220,.9)';
      g.fillRect(q[0]-1, q[1]-1, 2, 2);
    }
  }
  if (ed && cur && rigShows(cur, rigStage)){
    const pts = rigOutline(joints, ed).map(conv);
    g.strokeStyle = 'rgba(224,172,72,.75)'; g.lineWidth = .4;
    g.beginPath();
    pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    if (ed.kind === 'blob') g.closePath();
    g.stroke();
    // the bone the held point answers to, so the attachment is a visible thing
    if (rigVert >= 0 && ed.v[rigVert]){
      const j = joints[ed.v[rigVert][0]];
      if (j){
        const q = conv([j.x, j.y]);
        g.strokeStyle = 'rgba(120,170,220,.65)';
        g.beginPath(); g.moveTo(pts[rigVert][0], pts[rigVert][1]); g.lineTo(q[0], q[1]); g.stroke();
        g.fillStyle = 'rgba(120,170,220,.95)'; g.fillRect(q[0]-1.5, q[1]-1.5, 3, 3);
      }
    }
    pts.forEach((p, i) => {
      const on = i === rigVert, r = on ? 2 : 1.5;
      g.fillStyle = 'rgba(16,26,24,.85)'; g.fillRect(p[0]-r, p[1]-r, r*2, r*2);
      g.fillStyle = on ? '#e0ac48' : '#cfe0a8';
      g.fillRect(p[0]-r+.5, p[1]-r+.5, r*2-1, r*2-1);
    });
  }

  const pv = $('rigPreview'); pv.innerHTML = '';
  STAGE.forEach((s, i) =>
    pv.appendChild(shot(frameOf(rigSp, i, 'idle', 0, false, 'wild').cv, 1, s.key)));

  const read = $('rigRead');
  if (!Object.keys(joints).length) read.textContent = SPECIES[rigSp].common + ' has no skeleton yet.';
  else if (rigArm) read.textContent = 'Click the animal to put a ' + rigKindName(rigArm) + ' there.';
  else if (!cur) read.textContent = 'Click a part on the animal to pick it up, or add one above.';
  else read.textContent = (cur.name || 'part') + ' follows the '
     + (rigVert >= 0 && ed.v[rigVert] ? ed.v[rigVert][0] : ed.v[0][0])
     + (rigVert >= 0 ? '   ·   drag it anywhere; it re-attaches to whatever is nearest'
                     : '   ·   drag a handle to reshape it');
}
BUILD.rig = rigBuild;
PAINT.rig = rigPaint;

/* ---- go ------------------------------------------------------------------ */
pixBuild();
/* Say up front which kind of Save this is. Opened through tools/edit.cmd, Save
   writes src/00-art.js and there is nothing to do afterwards; opened any other
   way there is no /save to talk to, and Save degrades into a file dialog that
   hands you a copy to move by hand. Both are fine, but finding out which one
   you have at the moment a dialog appears is not. */
warmTemplate()
  .then(() => EDIT.launcherPresent())
  .then(live => live
    ? note('Ready. Save writes src/00-art.js.')
    : note('Not launched through tools/edit.cmd — Save will ask you for a file '
         + 'instead of writing src/00-art.js. Close this and run tools/edit.cmd '
         + '(or: python tools/edit.py).', true))
  .catch(e => note(e.message, true));
