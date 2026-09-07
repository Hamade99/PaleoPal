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
