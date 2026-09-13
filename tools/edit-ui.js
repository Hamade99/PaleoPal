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
/* Zoom is per sprite, not a constant. A twelve-pixel icon wants every cell the
   size of a thumbnail; the case is 96x160 and at the same zoom would be a grid
   two thousand pixels across. Both axes are checked, because the case is far
   taller than it is wide and only fitting the width would still run it off the
   bottom of the window. */
const pixZoom = p => Math.max(2, Math.min(22, Math.floor(Math.min(760 / p.w, 820 / p.h))));

/* The case is the one sprite whose size is a contract. The game's boxes are
   fractions of a 96x160 grid, and the recess, the key plates and the head are
   at cells the layout relies on, so it cannot be resized from here. */
const CASE_ID = 'case', CASE_W = 96, CASE_H = 155;
const CASE_CELLS = { recess:[3,45,90,67], screenBox:[3,32,90,86], keys:[7,125,14,16], keyStep:17,
                     head:[5,10,86,19], glass:[5,46,86,65] };

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
  if (pixId === CASE_ID){
    size.appendChild(mk('div', 'lblnote', CASE_W + ' x ' + CASE_H + ', fixed.'));
    size.lastChild.style.cssText = 'color:#8fa39a;font-size:11px';
  } else {
    slider(size, 'width', () => p.w, v => pixResize(p, v, p.h), 4, 32, 1);
    slider(size, 'height', () => p.h, v => pixResize(p, p.w, v), 4, 32, 1);
  }
  sw.appendChild(size);

  pixPaint();
}

function pixPaint(){
  const p = PIX[pixId];
  const PIX_Z = pixZoom(p);
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
  /* The case skips the zoom strip. Three more copies of a 96x160 sprite is most
     of the width of the window, and the assembled preview beside it says
     everything they would have said and more. */
  if (pixId !== CASE_ID){
    const bare = makeCv(p.w, p.h);
    pixDraw(readCtx(bare), pixId, p.ox||0, p.oy||0, 1);
    [1,2,4].forEach(z => pv.appendChild(shot(bare, z, z + 'x')));
    if (outline) pv.appendChild(shot(pixCanvas(pixId, outline), 4, 'outlined'));
  }

  $('caseCard').hidden = pixId !== CASE_ID;
  if (pixId === CASE_ID){ casePaint(); $('caseWearing').textContent = caseLive(); }
}

function pixResize(p, w, h){
  p.rows = Array.from({length:h}, (_, y) => ((p.rows[y] || '').padEnd(w)).slice(0, w));
  p.w = w; p.h = h;
}
function pixAt(ev, erase){
  const p = PIX[pixId], r = $('pixGrid').getBoundingClientRect();
  const PIX_Z = pixZoom(p);
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

/* ---- importing a picture --------------------------------------------------
   A drawn case is data in src/00-art.js and goes wherever the project goes. An
   imported one is a file, and the project ships no image assets — so by default
   it lands in Store, on this machine, where it is the owner's own skin and costs
   the build nothing. `Promote` is the separate, deliberate step that writes it
   into src/00-art.js and makes it the game's actual look.

   Both read back through the same precedence, in the game and here: a local
   skin first, then the promoted one, then the drawing. */
let caseSkinURL = null;                  // the local skin, when there is one
let caseModeNow = 'moulded';             // or 'drawn', when the sprite is in use

async function caseLoadSkin(){
  try {
    caseSkinURL = await Store.get(CASE_KEY);
    caseModeNow = (await Store.get(CASE_MODE_KEY)) === 'drawn' ? 'drawn' : 'moulded';
  } catch (e){ caseSkinURL = null; caseModeNow = 'moulded'; }
  if (!caseSkinURL && CASE_SKIN) caseSkinURL = CASE_SKIN;
  return caseSkinURL;
}

/* What the game is wearing right now, said plainly, because the preview beside
   it always shows your drawing whether or not the game is using it — that is
   what you are editing, so that is what it has to show. */
function caseLive(){
  return caseSkinURL ? 'The game is wearing the imported picture.'
       : caseModeNow === 'drawn' ? 'The game is wearing this drawing.'
       : 'The game is wearing the moulded case. This drawing is not in use.';
}
async function caseUseDrawing(){
  caseModeNow = 'drawn';
  try { await Store.set(CASE_MODE_KEY, 'drawn'); } catch (e){}
  caseState('The game is wearing this drawing now.');
  rebuild();
}
async function caseUseMoulded(){
  caseModeNow = 'moulded';
  caseSkinURL = null;
  try { await Store.del(CASE_KEY); await Store.set(CASE_MODE_KEY, 'moulded'); } catch (e){}
  caseState('Back to the moulded case.');
  rebuild();
}

function caseState(text, bad){
  const el = $('caseState');
  el.textContent = text;
  el.style.color = bad ? 'var(--rust)' : 'var(--dim)';
}

/* What to tell someone before they go and draw one. The ratio is the part that
   matters — the picture is stretched to the case, so anything 3:5 lands square
   and anything else arrives distorted. The pixel size is only about not being
   scaled up on the largest screen the case can appear on. */
function caseWarning(){
  const cells = c => c[0] + '–' + (c[0]+c[2]) + ' across, ' + c[1] + '–' + (c[1]+c[3]) + ' down';
  $('caseWarn').innerHTML =
    '<b>' + CASE_IMPORT[0] + ' x ' + CASE_IMPORT[1] + '</b>, or anything else in the same '
  + '<b>' + CASE_W + ':' + CASE_H + '</b> shape — it is stretched to the case, so a different '
  + 'ratio arrives squashed. PNG with the outside transparent; the case is not a rectangle. '
  + 'JPEG will chew the hard edges. Leave the glass (cells ' + cells(CASE_CELLS.recess) + '), '
  + 'the five keys (' + cells(CASE_CELLS.keys) + ', in steps of ' + CASE_CELLS.keyStep + ') and '
  + 'the head strip (' + cells(CASE_CELLS.head) + ') clear: the game draws those on top.';
}

function caseImport(file){
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) return caseState('That file is ' + Math.round(file.size/1048576)
    + 'MB. Keep it under 4MB — it has to live in this browser\u2019s storage.', true);
  const reader = new FileReader();
  reader.onerror = () => caseState('Could not read that file.', true);
  reader.onload = () => {
    const url = String(reader.result);
    const img = new Image();
    img.onerror = () => caseState('That does not decode as an image.', true);
    img.onload = async () => {
      const ratio = img.width / img.height, want = CASE_W / CASE_H;
      caseSkinURL = url;
      try { await Store.set(CASE_KEY, url); await Store.set(CASE_MODE_KEY, 'drawn'); }
      catch (e){ return caseState('Imported, but it would not fit in storage — it will be '
        + 'gone when this page reloads.', true); }
      const off = Math.abs(ratio - want) / want;
      caseState(img.width + 'x' + img.height + ', ' + Math.round(file.size/1024) + 'KB. '
        + (off > .02 ? 'That is ' + ratio.toFixed(3) + ' to 1 where the case is '
                       + want.toFixed(3) + ' — it will be stretched to fit.'
                     : 'Saved on this machine.'), off > .02);
      rebuild();
    };
    img.src = url;
  };
  reader.readAsDataURL(file);
}



/* Writing the picture into the project. It is a separate press because it is a
   different decision: it makes the import the game's look for everyone, adds
   its whole weight to the built file, and is the one thing here that puts an
   image asset in a project whose house rule says it has none. */
async function casePromote(){
  if (!caseSkinURL) return caseState('Nothing imported to promote.', true);
  const kb = Math.round(caseSkinURL.length * 0.75 / 1024);
  if (!confirm('Write this picture into src/00-art.js?\n\nIt becomes the game\u2019s case for '
             + 'everyone, and adds about ' + kb + 'KB to the built file.')) return;
  CASE_SKIN = caseSkinURL;
  caseState('Promoted. Press Save to write it to src/00-art.js.');
  rebuild();
}

$('caseImport').onclick = () => $('caseFile').click();
$('caseFile').onchange = e => { caseImport(e.target.files[0]); e.target.value = ''; };
$('caseDrawn').onclick = caseUseDrawing;
$('caseClear').onclick = caseUseMoulded;
$('casePromote').onclick = casePromote;
/* ---- the case ------------------------------------------------------------
   The case is a sprite like any other, so it is edited on the Pixels tab with
   the icons and the hats. What it needs that they do not is somewhere to see it
   assembled: a faceplate is only right or wrong relative to the things that sit
   on it, and a screen recess two cells off reads as a mistake in the case
   rather than in the drawing of it.

   So the preview puts the live parts where the game puts them, from the same
   cell numbers the stylesheet uses. Nothing here is a guess: change the layout
   and this has to change with it, which is the point of the numbers being in
   one table at the top of this file. */
const CASE_PZ = 3;                                   // preview zoom, cells to px

/* What an imported picture should be. The case is drawn at one cell per --px
   and --px runs to about 5 on a desktop, so sixteen device pixels a cell covers
   every screen it can appear on without ever being scaled up. */
const CASE_IMPORT = [CASE_W * 16, CASE_H * 16];

function caseCell(i){ return [i[0]*CASE_PZ, i[1]*CASE_PZ, i[2]*CASE_PZ, i[3]*CASE_PZ]; }

/* The habitat and an animal in it, at the size the glass actually shows. Built
   at 224x168 and scaled down, rather than drawn small, so it is the real
   picture rather than an impression of one. */
function caseGlass(){
  const cv = makeCv(W, H), g = readCtx(cv);
  g.imageSmoothingEnabled = false;
  const [sx, sy, sw, sh] = BG_CROP[3];
  g.drawImage(bakeBg('day', 'valley'), sx, sy, sw, sh, 0, 0, W, H);
  const f = frameOf('rex', 3, 'idle', 0, false, 'wild');
  g.drawImage(f.cv, Math.round(W/2 - f.ox), GROUND - f.oy);
  return cv;
}

function casePaint(){
  const cv = $('casePv');
  cv.width = CASE_W * CASE_PZ; cv.height = CASE_H * CASE_PZ;
  const g = readCtx(cv);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, cv.width, cv.height);

  // the artwork, as it will be scaled onto the shell
  if (caseSkinURL){
    const img = new Image();
    img.onload = () => { g.drawImage(img, 0, 0, cv.width, cv.height); casePaintLive(g); };
    img.src = caseSkinURL;
    return;
  }
  const bare = makeCv(CASE_W, CASE_H);
  pixDraw(readCtx(bare), CASE_ID, 0, 0, 1);
  g.drawImage(bare, 0, 0, cv.width, cv.height);
  casePaintLive(g);
}

/* Everything the case does not own, drawn where the game draws it. */
function casePaintLive(g){
  const z = CASE_PZ;
  // the glass, centred in the recess the way the canvas floats in the opening
  const [gx, gy, gw, gh] = caseCell(CASE_CELLS.glass);
  g.drawImage(caseGlass(), gx, gy, gw, gh);
  g.strokeStyle = 'rgba(140,183,101,.35)'; g.lineWidth = 1;
  const [rx, ry, rw, rh] = caseCell(CASE_CELLS.recess);
  g.strokeRect(rx + .5, ry + .5, rw - 1, rh - 1);

  // the name and the four meters, on the dark panel above the glass
  const [px_, py] = caseCell(CASE_CELLS.screenBox);
  g.fillStyle = '#e9e1cb';
  g.font = 'bold ' + (5*z) + 'px ui-monospace,monospace';
  g.fillText('Tank', px_ + 3*z, py + 10*z);
  g.fillStyle = '#8fa39a'; g.font = (3.2*z) + 'px ui-monospace,monospace';
  g.fillText('Adult T. rex', px_ + 19*z, py + 10*z);
  const cols = ['#e0ac48','#e8d24e','#7fb2c9','#d98aa8'], names = ['Hunger','Energy','Clean','Joy'];
  for (let i = 0; i < 4; i++){
    const bx = px_ + 3*z + i*18.5*z, by = py + 13*z, bw = 17*z, bh = 10*z;
    g.fillStyle = '#141d21'; g.fillRect(bx, by, bw, bh);
    g.strokeStyle = '#2b3a3f'; g.strokeRect(bx + .5, by + .5, bw - 1, bh - 1);
    g.fillStyle = '#8fa39a'; g.font = (2.4*z) + 'px ui-monospace,monospace';
    g.fillText(names[i], bx + 2, by + 4*z);
    g.fillStyle = '#05090a'; g.fillRect(bx + 2, by + 5.5*z, bw - 4, 2.5*z);
    g.fillStyle = cols[i];   g.fillRect(bx + 2, by + 5.5*z, (bw - 4) * (.55 + i*.12), 2.5*z);
  }
  // the mood line, along the foot of the panel
  g.fillStyle = '#e9e1cb'; g.font = (3.2*z) + 'px ui-monospace,monospace';
  g.fillText('Tank is content.', px_ + 3*z, py + 76*z);

  // the five keys, on the plates the art draws for them
  const icons = ['feed','play','wash','care','shop'];
  const [kx, ky, kw, kh] = CASE_CELLS.keys;
  icons.forEach((id, i) => {
    const x = (kx + i*CASE_CELLS.keyStep)*z, y = ky*z;
    /* Moulded, the way the stylesheet moulds them: a flat fill, one highlight
       along the top, one shade along the bottom, a hard edge and a drop onto the
       shell. Drawn flat here the preview would be telling you the case looks
       like something it does not. */
    g.fillStyle = '#0c2419'; g.fillRect(x + 1.5*z, y + 1.5*z, kw*z, kh*z);
    g.fillStyle = '#2f6b49'; g.fillRect(x, y, kw*z, kh*z);
    g.fillStyle = '#448a60'; g.fillRect(x, y, kw*z, 1*z);
    g.fillStyle = '#1b432e'; g.fillRect(x, y + kh*z - 1*z, kw*z, 1*z);
    g.strokeStyle = '#0c2419'; g.lineWidth = 1;
    g.strokeRect(x + .5, y + .5, kw*z - 1, kh*z - 1);
    const art = pixCanvas('icon.' + id, '#141c1e');
    const s = Math.min((kw*z*.55)/art.width, (kh*z*.45)/art.height);
    g.drawImage(art, x + (kw*z - art.width*s)/2, y + 2*z, art.width*s, art.height*s);
    g.fillStyle = '#dff0e4'; g.font = (3*z) + 'px ui-monospace,monospace';
    const label = id[0].toUpperCase() + id.slice(1);
    g.fillText(label, x + (kw*z - g.measureText(label).width)/2, y + kh*z - 3*z);
  });

  // the head: the purse and the four small keys
  const [hx, hy, hw, hh] = caseCell(CASE_CELLS.head);
  g.fillStyle = '#141d21'; g.fillRect(hx + 8*CASE_PZ, hy + 4*CASE_PZ, 22*CASE_PZ, 10*CASE_PZ);
  g.fillStyle = '#e0ac48'; g.font = (4*CASE_PZ) + 'px ui-monospace,monospace';
  g.fillText('24', hx + 18*CASE_PZ, hy + 11.5*CASE_PZ);
  for (let i = 0; i < 4; i++){
    const x = hx + (34 + i*11)*CASE_PZ, y = hy + 3*CASE_PZ;
    g.fillStyle = i === 3 ? '#2f6b49' : '#c08f43';
    g.fillRect(x, y, 9*CASE_PZ, 9*CASE_PZ);
    g.strokeStyle = '#42290a'; g.strokeRect(x + .5, y + .5, 9*CASE_PZ - 1, 9*CASE_PZ - 1);
  }
}

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

/* ---- go ------------------------------------------------------------------ */
caseWarning();
caseLoadSkin().then(pixBuild);
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
