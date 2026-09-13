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
/* One or two panes, each its own sprite and its own pen. Two because a sprite
   is often only half of something: `top.compy.a` is one stride of a run, and
   whether it runs is only visible next to `.b`. The list picks for the active
   pane, which is the one last clicked. */
const pixPanes = [{ id: Object.keys(PIX)[0], pen: 0 }];
let pixActive = 0, painting = 0, paintPane = -1;
/* Zoom is per sprite, not a constant. A twelve-pixel icon wants every cell the
   size of a thumbnail; the case is 96x160 and at the same zoom would be a grid
   two thousand pixels across. Both axes are checked, because the case is far
   taller than it is wide and only fitting the width would still run it off the
   bottom of the window.

   With two panes open both share the smaller zoom. A cell has to be the same
   size in both, or comparing two sprites side by side compares their zooms
   rather than their sizes.

   The width is measured: the pane area is the flexible part of the row beside
   the sprite list, so its width is what is left for grids, split between the
   panes. A fixed budget put two panes of 400 next to a list in a column that
   had 650, and both wrapped under the list, off the bottom of the first
   screen. */
const pixZoomOne = (p, wide) => Math.max(2, Math.min(22, Math.floor(Math.min(wide / p.w, 820 / p.h))));
const pixZoom = () => {
  if (pixView.zoom) return pixView.zoom;               // chosen by hand: the toolbar's − and +
  const room = $('pixPanes').clientWidth || 760;
  const n = pixPanes.length;
  const wide = Math.max(80, (Math.min(room, 760 * n) - 18*(n - 1)) / n - 24);   // 24: card padding and border
  return Math.min(...pixPanes.map(pn => pixZoomOne(PIX[pn.id], wide)));
};

/* ---- undo ----------------------------------------------------------------
   A snapshot of a whole sprite is small (the case, the biggest, is 155 short
   strings), so history is snapshots rather than a diff per cell. One entry per
   gesture, not per cell: a stroke is begun on mouse down and committed on
   mouse up, a slider or a colour picker on its first move and on `change`. An
   entry that changed nothing is dropped, so clicking a cell that was already
   that colour costs no undo step.

   History is one stack across every sprite, in the order things were done.
   Undoing a sprite that is not open opens it in the active pane: an undo you
   cannot see happen is an undo you will press twice. */
const PIX_UNDO_MAX = 300;
const pixUndo = [], pixRedo = [];
let pixPending = null;
const pixSnap = id => { const p = PIX[id];
  return { id, w: p.w, h: p.h, ox: p.ox||0, oy: p.oy||0, pal: p.pal.slice(), rows: p.rows.slice() }; };
const pixSame = (a, b) => a.w === b.w && a.h === b.h && a.ox === b.ox && a.oy === b.oy &&
  a.pal.join() === b.pal.join() && a.rows.join('\n') === b.rows.join('\n');
/* `keepFloat` is for moving a selection. Anything else that is about to change
   the sprite settles a floating selection first: the float restamps over the
   base it was lifted from, so a flip or a fill made under it would be undone by
   the next nudge. */
function pixBegin(id, keepFloat){
  if (!keepFloat && pixSel && pixSel.float) pixSel.float = null;
  if (pixPending && pixPending.id !== id) pixCommit();
  if (!pixPending) pixPending = pixSnap(id);
}
function pixCommit(){
  const before = pixPending; pixPending = null;
  if (!before || !PIX[before.id] || pixSame(before, pixSnap(before.id))) return;
  pixUndo.push(before);
  if (pixUndo.length > PIX_UNDO_MAX) pixUndo.shift();
  pixRedo.length = 0;
  pixHistoryButtons();
}
function pixRestore(from, to){
  pixCommit();
  const s = from.pop();
  if (!s || !PIX[s.id]) return;
  to.push(pixSnap(s.id));
  const target = PIX[s.id];
  Object.assign(target, { w: s.w, h: s.h, pal: s.pal.slice(), rows: s.rows.slice() });
  // an origin of 0,0 is written as no origin at all, so it is removed, not zeroed
  if (s.ox || s.oy){ target.ox = s.ox; target.oy = s.oy; } else { delete target.ox; delete target.oy; }
  if (!pixPanes.some(pn => pn.id === s.id)) pixPanes[pixActive].id = s.id;
  pixPanes.forEach(pn => { if (pn.pen >= PIX[pn.id].pal.length) pn.pen = 0; });
  note((from === pixUndo ? 'Undid' : 'Redid') + ' a change to ' + s.id + '.');
  rebuild();
}
/* ---- tools and view --------------------------------------------------------
   One tool at a time, shared by both panes; the right button always erases,
   whatever the tool, because reaching for the eraser in the middle of a stroke
   is the single most common thing anyone does while drawing. Line and box show
   where they will land while the button is held and write on release. */
const PIX_TOOLS = [
  { id:'select', label:'Select',  key:'s', tip:'Drag a box to select. Drag inside it to move it, Alt-drag to move a copy. '
                                            + 'Arrows nudge (Shift: 4 cells), Delete clears, Esc deselects, Ctrl+A selects all. '
                                            + 'Ctrl+C / X / V copy, cut and paste — into the other pane too.' },
  { id:'pen',   label:'Pencil',  key:'b', tip:'Paint cells. Drags join up, however fast.' },
  { id:'erase',  label:'Eraser',  key:'e', tip:'Clear cells. The right button erases with any tool.' },
  { id:'fill',   label:'Fill',    key:'g', tip:'Flood a connected area of one colour.' },
  { id:'line',   label:'Line',    key:'l', tip:'Drag from end to end.' },
  { id:'rect',   label:'Box',     key:'r', tip:'Drag corner to corner. Shift for a filled box.' },
  { id:'pick',   label:'Pick',    key:'i', tip:'Take the colour under the pointer. Alt-click does it with any tool.' },
  { id:'origin', label:'Origin',  key:'o', tip:'Set the cell the game places this sprite by.' }
];
const pixView = { tool:'pen', grid:true, onion:false, zoom:0 };   // zoom 0: fit to the room
let pixDrag = null;          // { pane, x0, y0, x1, y1, erase, fillBox } while a line or box is held
let pixHover = null;         // { pane, x, y } under the pointer
let pixLast = null;          // the last cell a pencil stroke touched, to join the next one to

const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) &&
  document.activeElement.type !== 'range' && document.activeElement.type !== 'color';
window.addEventListener('keydown', e => {
  if (tab !== 'pix' || painting || typing()) return;       // a number box keeps its own keys
  const k = e.key.toLowerCase();
  if (e.ctrlKey || e.metaKey){
    if (k === 'z' && !e.shiftKey){ e.preventDefault(); pixSel = null; pixRestore(pixUndo, pixRedo); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)){ e.preventDefault(); pixSel = null; pixRestore(pixRedo, pixUndo); }
    else if (k === 'a'){
      e.preventDefault();
      const p = PIX[pixPanes[pixActive].id];
      pixSel = { pane: pixActive, x: 0, y: 0, w: p.w, h: p.h };
      pixSetTool('select'); pixPaint();
    }
    else if (k === 'c'){ if (pixCopy()) e.preventDefault(); }
    else if (k === 'x'){ if (pixCopy()){ e.preventDefault(); pixSelClear(); } }
    else if (k === 'v'){ if (pixClip){ e.preventDefault(); pixPaste(); } }
    return;
  }
  if (e.altKey) return;
  if (pixSel){
    const step = e.shiftKey ? 4 : 1;
    const arrow = { arrowleft:[-step,0], arrowright:[step,0], arrowup:[0,-step], arrowdown:[0,step] }[k];
    if (arrow){ e.preventDefault(); pixNudge(...arrow); return; }
    if (k === 'delete' || k === 'backspace'){ e.preventDefault(); pixSelClear(); return; }
    if (k === 'escape'){ pixSel = null; pixPaint(); return; }
  }
  const t = PIX_TOOLS.find(x => x.key === k);
  if (t){ pixSetTool(t.id); e.preventDefault(); return; }
  // 1-9 and 0 choose a palette colour in the active pane; [ and ] step through it
  const pn = pixPanes[pixActive], n = PIX[pn.id].pal.length;
  if (/^[0-9]$/.test(k)){ const c = (+k + 9) % 10; if (c < n) pixSetPen(pixActive, c); e.preventDefault(); }
  else if (k === '[' || k === ']'){ pixSetPen(pixActive, (pn.pen + (k === ']' ? 1 : n - 1)) % n); e.preventDefault(); }
  else if (k === '#'){ pixView.grid = !pixView.grid; pixToolbar(); pixPaint(); }
  else if (k === '=' || k === '+' || k === '-'){ pixZoomStep(k === '-' ? -1 : 1); e.preventDefault(); }
});
function pixSetTool(id){
  pixView.tool = id;
  // a selection belongs to the select tool; kept under a pencil it would look like a mask, and is not one
  if (id !== 'select' && pixSel){ pixSel = null; pixPaint(); }
  pixToolbar();
}
function pixZoomStep(d){
  pixView.zoom = Math.max(2, Math.min(40, (pixView.zoom || pixZoom()) + d * 2));
  pixToolbar(); pixPaint();
}

/* The case is the one sprite whose size is a contract. The game's boxes are
   fractions of a 96x160 grid, and the recess, the key plates and the head are
   at cells the layout relies on, so it cannot be resized from here. */
const CASE_ID = 'case', CASE_W = 96, CASE_H = 155;
const CASE_CELLS = { recess:[3,45,90,67], screenBox:[3,32,90,86], keys:[7,125,14,16], keyStep:17,
                     head:[5,10,86,19], glass:[5,46,86,65] };

/* The sprite a second pane opens on. Frames come in pairs named .a and .b, so
   the partner of one is the other; anything else opens on itself, and the list
   is right there to change it. */
function pixPartner(id){
  const m = /^(.*\.)([ab])$/.exec(id), other = m && m[1] + (m[2] === 'a' ? 'b' : 'a');
  return other && PIX[other] ? other : id;
}

/* Which pane is active is shown in place, not by rebuilding: the click that
   makes a pane active is usually the first cell of a stroke, and a rebuild
   would take the canvas out from under it. */
function pixMarks(){
  const two = pixPanes.length > 1;
  [...$('pixPanes').children].forEach((c, k) => c.classList.toggle('on', two && k === pixActive));
  [...$('pixList').children].forEach(b => {
    b.classList.toggle('on', b.textContent === pixPanes[pixActive].id);
    b.classList.toggle('two', two && pixPanes.some((pn, k) => k !== pixActive && pn.id === b.textContent));
  });
}

function pixToolbar(){
  const host = $('pixTools'); host.innerHTML = '';
  const group = label => { const g = mk('div', 'tgroup'); if (label) g.appendChild(mk('span', null, label)); host.appendChild(g); return g; };
  const button = (g, text, on, tip, fn, key) => {
    const b = mk('button', 'tbtn' + (on ? ' on' : ''), text);
    if (key){ const k = mk('kbd', null, key.toUpperCase()); b.appendChild(k); }
    b.title = tip || ''; b.onclick = fn; g.appendChild(b); return b;
  };
  const tools = group();
  PIX_TOOLS.forEach(t => button(tools, t.label, pixView.tool === t.id, t.tip, () => pixSetTool(t.id), t.key));

  const view = group('view');
  button(view, 'Grid', pixView.grid, 'Cell lines on the grid (#)', () => { pixView.grid = !pixView.grid; pixToolbar(); pixPaint(); });
  const onion = button(view, 'Onion', pixView.onion && pixPanes.length > 1,
    'Show the other pane’s sprite faintly under this one, lined up on their origins',
    () => { pixView.onion = !pixView.onion; pixToolbar(); pixPaint(); });
  onion.disabled = pixPanes.length < 2;

  const zoom = group('zoom');
  button(zoom, '−', false, 'Zoom out (−)', () => pixZoomStep(-1));
  const z = mk('span', null, pixZoom() + 'x'); z.style.cssText = 'min-width:34px;text-align:center;color:var(--bone);margin:0';
  zoom.appendChild(z);
  button(zoom, '+', false, 'Zoom in (+)', () => pixZoomStep(1));
  button(zoom, 'Fit', !pixView.zoom, 'Size the grid to the room', () => { pixView.zoom = 0; pixToolbar(); pixPaint(); });

  const hist = group();
  const u = button(hist, 'Undo', false, 'Ctrl+Z', () => pixRestore(pixUndo, pixRedo));
  const r = button(hist, 'Redo', false, 'Ctrl+Y', () => pixRestore(pixRedo, pixUndo));
  u.id = 'pixUndoBtn'; r.id = 'pixRedoBtn';
  pixHistoryButtons();
}
function pixHistoryButtons(){
  if ($('pixUndoBtn')) $('pixUndoBtn').disabled = !pixUndo.length;
  if ($('pixRedoBtn')) $('pixRedoBtn').disabled = !pixRedo.length;
}
function pixSetPen(i, c){
  pixPanes[i].pen = c;
  pixBuild();
}

function pixBuild(){
  pixCommit();
  // a selection that no longer fits its sprite, or its pane, goes
  if (pixSel && (!pixPanes[pixSel.pane] || pixSel.x >= PIX[pixPanes[pixSel.pane].id].w
                 || pixSel.y >= PIX[pixPanes[pixSel.pane].id].h)) pixSel = null;
  pixToolbar();
  pickList($('pixList'), Object.keys(PIX), () => pixPanes[pixActive].id,
           id => { pixCommit(); if (pixSel && pixSel.pane === pixActive) pixSel = null;
                   Object.assign(pixPanes[pixActive], { id, pen: 0 }); pixBuild(); });
  const host = $('pixPanes'); host.innerHTML = '';
  pixPanes.forEach((pn, i) => host.appendChild(pixPaneEl(pn, i)));
  pixMarks();
  pixPaint();
}

function pixPaneEl(pn, i){
  const p = PIX[pn.id];
  const card = mk('div', 'card pane');
  card.addEventListener('pointerdown', () => { if (pixActive !== i){ pixActive = i; pixMarks(); } }, true);

  const head = mk('div', 'panehead');
  head.appendChild(mk('b', null, pn.id));
  head.appendChild(mk('span', null, p.w + ' x ' + p.h + (p.ox || p.oy ? ', origin ' + (p.ox||0) + ',' + (p.oy||0) : '')));
  /* Food, hearts and the mess are drawn into places laid out for a set size.
     Bigger grids are fine, and are shrunk to fit — say so, so a finer grid
     reads as more detail rather than as a bigger sprite. */
  const box = pixBoxOf(pn.id);
  if (box && (p.w > box.w || p.h > box.h)){
    const fits = mk('span', null, 'shown in ' + box.w + ' x ' + box.h);
    fits.style.color = 'var(--gold)';
    fits.title = 'The game fits this sprite into the ' + box.w + ' x ' + box.h + ' box its menus and slots were '
               + 'laid out for, keeping its shape. A bigger grid adds detail, not size.';
    head.appendChild(fits);
  }
  const btn = mk('button', 'tab', pixPanes.length > 1 ? 'Close' : 'Open beside');
  btn.style.padding = '2px 10px';
  btn.onclick = () => {
    pixCommit();
    if (pixPanes.length > 1){ pixPanes.splice(i, 1); pixActive = 0; }
    else { pixPanes.push({ id: pixPartner(pn.id), pen: 0 }); pixActive = 1; }
    rebuild();
  };
  head.appendChild(btn);
  card.appendChild(head);

  /* Whole-sprite actions. Each is one undo step. Shifting wraps round rather
     than pushing pixels off the edge, so nudging a drawing back and forth
     never loses any of it. */
  const ops = mk('div', 'ops');
  const op = (text, tip, fn) => {
    const b = mk('button', 'tbtn', text); b.title = tip;
    b.onclick = () => { pixBegin(pn.id); fn(p); pixCommit(); rebuild(); };
    ops.appendChild(b); return b;
  };
  op('Clear', 'Empty every cell. The palette stays.', q => { q.rows = q.rows.map(() => ' '.repeat(q.w)); });
  op('Flip ↔', 'Mirror left to right', q => { q.rows = pixRows(q).map(r => [...r].reverse().join('')); });
  op('Flip ↕', 'Mirror top to bottom', q => { q.rows = pixRows(q).reverse(); });
  op('←', 'Shift one cell left, wrapping round', q => pixShift(q, -1, 0));
  op('→', 'Shift one cell right, wrapping round', q => pixShift(q, 1, 0));
  op('↑', 'Shift one cell up, wrapping round', q => pixShift(q, 0, -1));
  op('↓', 'Shift one cell down, wrapping round', q => pixShift(q, 0, 1));
  if (pixPanes.length > 1){
    const other = pixPanes[1 - i].id;
    op('Copy from ' + other, 'Replace this drawing with the other pane’s, lined up on their origins. '
       + 'Colours this palette lacks are added to it.', q => pixCopyFrom(q, PIX[other]));
  }
  card.appendChild(ops);

  // the palette, as chips, each with how many cells use it
  const counts = pixCounts(p);
  const pal = mk('div', 'pal');
  p.pal.forEach((c, k) => {
    const chip = mk('div', 'chip' + (k === pn.pen ? ' on' : ''));
    chip.style.background = c;
    chip.title = 'colour ' + ((k + 1) % 10 === 0 && k < 10 ? 0 : k + 1) + ' · ' + c + ' · ' + counts[k] + ' cells';
    chip.appendChild(mk('i', null, counts[k] ? String(counts[k]) : ''));
    chip.onclick = () => pixSetPen(i, k);
    pal.appendChild(chip);
  });
  const add = mk('div', 'chip', '+');
  add.title = 'Add a colour: a copy of the selected one, to adjust';
  add.style.cssText += ';display:flex;align-items:center;justify-content:center;color:#8fa39a';
  add.onclick = () => {
    if (p.pal.length >= PIX_CH.length) return note('A sprite holds at most ' + PIX_CH.length + ' colours.', true);
    pixBegin(pn.id); p.pal.push(p.pal[pn.pen] || '#ffffff'); pn.pen = p.pal.length - 1; pixCommit(); rebuild();
  };
  pal.appendChild(add);
  card.appendChild(pal);

  /* The selected colour, edited in one place: a picker for feel, a hex box for
     a colour you already know. Dragging the picker is one undo step, begun on
     its first `input` in the capture phase and committed on `change`. */
  const ed = mk('div', 'coled');
  ed.addEventListener('input', ev => { if (ev.target.type === 'color') pixBegin(pn.id); }, true);
  ed.addEventListener('change', ev => { if (ev.target.type === 'color') pixCommit(); });
  ed.appendChild(mk('span', null, 'colour ' + (pn.pen + 1)));
  const pick = mk('input'); pick.type = 'color'; pick.value = p.pal[pn.pen] || '#ffffff';
  const hex = mk('input'); hex.type = 'text'; hex.value = p.pal[pn.pen] || ''; hex.maxLength = 7; hex.spellcheck = false;
  pick.oninput = () => { p.pal[pn.pen] = pick.value; hex.value = pick.value; pal.children[pn.pen].style.background = pick.value; changed(); };
  hex.onchange = () => {
    const v = hex.value.trim().toLowerCase().replace(/^([0-9a-f]{6})$/, '#$1');
    if (!/^#[0-9a-f]{6}$/.test(v)){ hex.value = p.pal[pn.pen]; return note('A colour is #rrggbb.', true); }
    pixBegin(pn.id); p.pal[pn.pen] = v; pixCommit(); rebuild();
  };
  ed.appendChild(pick); ed.appendChild(hex);
  const dup = mk('button', 'tbtn', 'Duplicate'); dup.title = 'Add a copy of this colour and select it';
  dup.onclick = () => add.onclick();
  const del = mk('button', 'tbtn', 'Remove');
  del.title = counts[pn.pen] ? 'Remove this colour. Its ' + counts[pn.pen] + ' cells become empty.' : 'Remove this unused colour';
  del.disabled = p.pal.length < 2;
  del.onclick = () => { pixBegin(pn.id); pixRemoveColour(p, pn.pen); pn.pen = Math.max(0, pn.pen - 1); pixCommit(); rebuild(); };
  const sel = mk('button', 'tbtn', 'Replace in drawing…');
  sel.title = 'Repaint every cell of this colour with another palette colour, then pick which';
  sel.onclick = () => {
    const to = prompt('Repaint colour ' + (pn.pen + 1) + ' as which colour number (1–' + p.pal.length + ')? 0 empties it.');
    if (to === null) return;
    const n = +to;
    if (!Number.isInteger(n) || n < 0 || n > p.pal.length) return note('No colour ' + to + '.', true);
    pixBegin(pn.id);
    const from = PIX_CH[pn.pen], ch = n === 0 ? ' ' : PIX_CH[n - 1];
    p.rows = pixRows(p).map(r => r.split(from).join(ch));
    pixCommit(); rebuild();
  };
  ed.appendChild(dup); ed.appendChild(del); ed.appendChild(sel);
  card.appendChild(ed);

  const cv = mk('canvas');
  cv.addEventListener('mousedown', e => pixDown(e, i));
  cv.addEventListener('mousemove', e => pixMove(e, i));
  cv.addEventListener('mouseleave', () => { if (pixHover && pixHover.pane === i){ pixHover = null; pixRepaintPane(i); pixReadout(i); } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  card.appendChild(cv);
  card.appendChild(mk('div', 'readout', p.w + ' x ' + p.h));

  /* Size and origin. Sliders are one undo step per drag, the same way the
     colour picker is. */
  const sw = mk('div'); sw.style.marginTop = '6px';
  sw.addEventListener('input', () => pixBegin(pn.id), true);
  sw.addEventListener('change', () => pixCommit());
  if (pn.id === CASE_ID){
    sw.appendChild(mk('div', null, CASE_W + ' x ' + CASE_H + ', fixed.'));
    sw.lastChild.style.cssText = 'color:#8fa39a;font-size:11px';
  } else {
    /* Rows and columns one side at a time. The sliders under them still grow
       and shrink from the right and the bottom, for big changes. */
    const edges = mk('div', 'edges');
    [['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']].forEach(([side, name]) => {
      const cellEl = mk('div', 'edge');
      cellEl.appendChild(mk('span', null, name));
      [[1, '+', 'Add a ' + (side === 'top' || side === 'bottom' ? 'row' : 'column') + ' on the ' + side],
       [-1, '−', 'Remove the ' + side + ' ' + (side === 'top' || side === 'bottom' ? 'row' : 'column')]].forEach(([d, t, tip]) => {
        const b = mk('button', 'tbtn', t);
        b.title = tip + (side === 'top' || side === 'left' ? '. A sprite with an origin keeps its art where the game draws it.' : '');
        b.onclick = () => { pixBegin(pn.id); pixEdge(p, side, d); pixCommit(); rebuild(); };
        cellEl.appendChild(b);
      });
      edges.appendChild(cellEl);
    });
    sw.appendChild(edges);
    slider(sw, 'width', () => p.w, v => pixResize(p, v, p.h), 1, 48, 1);
    slider(sw, 'height', () => p.h, v => pixResize(p, p.w, v), 1, 48, 1);
    slider(sw, 'origin x', () => p.ox || 0, v => pixSetOrigin(p, v, p.oy || 0), 0, 47, 1);
    slider(sw, 'origin y', () => p.oy || 0, v => pixSetOrigin(p, p.ox || 0, v), 0, 47, 1);
  }
  card.appendChild(sw);
  return card;
}

/* ---- sprite helpers ------------------------------------------------------ */
const pixRows = p => Array.from({length:p.h}, (_, y) => (p.rows[y] || '').padEnd(p.w).slice(0, p.w));
function pixCounts(p){
  const n = p.pal.map(() => 0);
  for (const r of p.rows) for (const ch of r){ const k = PIX_CH.indexOf(ch); if (k >= 0 && k < n.length) n[k]++; }
  return n;
}
function pixShift(p, dx, dy){
  const src = pixRows(p);
  p.rows = src.map((_, y) => {
    const row = src[((y - dy) % p.h + p.h) % p.h];
    return Array.from({length:p.w}, (_, x) => row[((x - dx) % p.w + p.w) % p.w]).join('');
  });
}
function pixSetOrigin(p, x, y){
  x = Math.max(0, Math.min(p.w - 1, x)); y = Math.max(0, Math.min(p.h - 1, y));
  if (x || y){ p.ox = x; p.oy = y; } else { delete p.ox; delete p.oy; }
}
function pixRemoveColour(p, k){
  const gone = PIX_CH[k];
  p.rows = pixRows(p).map(r => [...r].map(ch => {
    if (ch === gone) return ' ';
    const j = PIX_CH.indexOf(ch);
    return j > k ? PIX_CH[j - 1] : ch;
  }).join(''));
  p.pal.splice(k, 1);
}
/* The other frame, placed by origin: cell (x, y) here is the cell the same
   distance from the other sprite's origin. Palettes are matched by colour, not
   by index, since two frames drawn apart rarely number theirs the same. */
function pixCopyFrom(p, src){
  const rows = pixRows(src), dx = (src.ox||0) - (p.ox||0), dy = (src.oy||0) - (p.oy||0);
  const map = {};
  p.rows = Array.from({length:p.h}, (_, y) => Array.from({length:p.w}, (_, x) => {
    const ch = (rows[y + dy] || '')[x + dx] || ' ';
    if (ch === ' ') return ' ';
    if (!(ch in map)){
      const col = src.pal[PIX_CH.indexOf(ch)];
      let k = p.pal.indexOf(col);
      if (k < 0 && p.pal.length < PIX_CH.length){ p.pal.push(col); k = p.pal.length - 1; }
      map[ch] = k < 0 ? ' ' : PIX_CH[k];
    }
    return map[ch];
  }).join(''));
}

/* One pane's grid. Layered bottom to top: the checkerboard, the other frame
   faint underneath (onion skin), this drawing, cell lines, the origin, the line
   or box being dragged, and the cell under the pointer. */
function pixGridPaint(cv, i, Z){
  const pn = pixPanes[i], p = PIX[pn.id];
  if (cv.width !== p.w * Z || cv.height !== p.h * Z){ cv.width = p.w * Z; cv.height = p.h * Z; }
  const g = cv.getContext('2d');
  g.globalAlpha = 1;
  g.fillStyle = '#101a1c'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#162124';
  for (let y=0;y<p.h;y++) for (let x=0;x<p.w;x++) if ((x + y) & 1) g.fillRect(x*Z, y*Z, Z, Z);

  if (pixView.onion && pixPanes.length > 1){
    g.globalAlpha = .28;
    pixDraw(g, pixPanes[1 - i].id, (p.ox||0)*Z, (p.oy||0)*Z, Z);
    g.globalAlpha = 1;
  }
  for (let y=0;y<p.h;y++) for (let x=0;x<p.w;x++){
    const ch = (p.rows[y] || '')[x] || ' ';
    if (ch !== ' '){ g.fillStyle = p.pal[PIX_CH.indexOf(ch)] || '#f0f'; g.fillRect(x*Z, y*Z, Z, Z); }
  }
  if (pixView.grid && Z >= 4){
    g.strokeStyle = 'rgba(143,163,154,.22)'; g.lineWidth = 1;
    for (let x=0;x<=p.w;x++){ g.beginPath(); g.moveTo(x*Z+.5,0); g.lineTo(x*Z+.5,cv.height); g.stroke(); }
    for (let y=0;y<=p.h;y++){ g.beginPath(); g.moveTo(0,y*Z+.5); g.lineTo(cv.width,y*Z+.5); g.stroke(); }
  }
  // the origin, for the sprites that are drawn around a point
  if (p.ox || p.oy || pixView.tool === 'origin'){
    g.strokeStyle = '#e0ac48'; g.lineWidth = 2;
    g.strokeRect((p.ox||0)*Z+1, (p.oy||0)*Z+1, Z-2, Z-2);
    g.lineWidth = 1;
  }
  if (pixDrag && pixDrag.pane === i){
    g.fillStyle = pixDrag.erase ? 'rgba(194,96,60,.55)' : (p.pal[pn.pen] || '#fff');
    for (const [x, y] of pixDragCells()) if (x >= 0 && y >= 0 && x < p.w && y < p.h) g.fillRect(x*Z, y*Z, Z, Z);
  }
  if (pixHover && pixHover.pane === i && !pixDrag){
    g.strokeStyle = '#e9e1cb';
    g.strokeRect(pixHover.x*Z+.5, pixHover.y*Z+.5, Z-1, Z-1);
  }
  // the selection, or the box being dragged out: marching ants, two tones so it shows on any colour
  const box = pixMarquee && pixMarquee.pane === i
    ? { x: Math.min(pixMarquee.x0, pixMarquee.x1), y: Math.min(pixMarquee.y0, pixMarquee.y1),
        w: Math.abs(pixMarquee.x1 - pixMarquee.x0) + 1, h: Math.abs(pixMarquee.y1 - pixMarquee.y0) + 1 }
    : pixSel && pixSel.pane === i ? pixSel : null;
  if (box){
    g.lineWidth = 2;
    g.setLineDash([Math.max(3, Z/2), Math.max(3, Z/2)]);
    g.strokeStyle = '#05090a'; g.lineDashOffset = 0;
    g.strokeRect(box.x*Z+1, box.y*Z+1, box.w*Z-2, box.h*Z-2);
    g.strokeStyle = '#e0ac48'; g.lineDashOffset = Math.max(3, Z/2);
    g.strokeRect(box.x*Z+1, box.y*Z+1, box.w*Z-2, box.h*Z-2);
    g.setLineDash([]); g.lineWidth = 1;
  }
}

function pixPaint(){
  const Z = pixZoom(), cards = $('pixPanes').children;
  pixPanes.forEach((pn, i) => {
    const cv = cards[i] && cards[i].querySelector('canvas');
    if (cv) pixGridPaint(cv, i, Z);
  });

  // how each actually appears in the game, at one, two and four times
  const pv = $('pixPreview'); pv.innerHTML = '';
  pixPanes.forEach(pn => {
    const id = pn.id, p = PIX[id];
    /* The case skips the zoom strip. Three more copies of a 96x160 sprite is
       most of the width of the window, and the assembled preview beside it
       says everything they would have said and more. */
    if (id === CASE_ID) return;
    if (pixPanes.length > 1) pv.appendChild(mk('div', 'hint', id)).style.margin = '6px 0 2px';
    const strip = mk('div', 'strip');
    const outline = id.slice(0,5) === 'icon.' ? '#141c1e' : id.slice(0,4) === 'hat.' ? '#241d13' : null;
    const bare = makeCv(p.w, p.h);
    pixDraw(readCtx(bare), id, p.ox||0, p.oy||0, 1);
    [1,2,4].forEach(z => strip.appendChild(shot(bare, z, z + 'x')));
    if (outline) strip.appendChild(shot(pixCanvas(id, outline), 4, 'outlined'));
    pv.appendChild(strip);
  });

  const hasCase = pixPanes.some(pn => pn.id === CASE_ID);
  $('caseCard').hidden = !hasCase;
  if (hasCase){ casePaint(); $('caseWearing').textContent = caseLive(); }
  $('pixAnimCard').hidden = pixPanes.length < 2;
  pixAnimDraw();
}

/* Both sprites, one after the other, each placed by its own origin — which is
   how the game draws them, so a frame whose origin is a cell off shows here as
   the animal twitching sideways rather than as a number in a header. */
let pixAnimFrame = 0;
function pixAnimDraw(){
  if (pixPanes.length < 2 || tab !== 'pix') return;
  const ps = pixPanes.map(pn => PIX[pn.id]);
  const x0 = Math.min(...ps.map(p => -(p.ox||0))), y0 = Math.min(...ps.map(p => -(p.oy||0)));
  const x1 = Math.max(...ps.map(p => p.w - (p.ox||0))), y1 = Math.max(...ps.map(p => p.h - (p.oy||0)));
  const bw = x1 - x0, bh = y1 - y0, Z = Math.max(2, Math.min(8, Math.floor(260 / bw))), gap = 8;
  const cv = $('pixAnim');
  const W_ = bw*Z + gap + bw, H_ = bh*Z;
  if (cv.width !== W_ || cv.height !== H_){ cv.width = W_; cv.height = H_; }
  const g = cv.getContext('2d');
  g.fillStyle = '#101a1c'; g.fillRect(0, 0, W_, H_);
  const id = pixPanes[pixAnimFrame % 2].id;
  pixDraw(g, id, -x0*Z, -y0*Z, Z);                    // big
  pixDraw(g, id, bw*Z + gap - x0, -y0, 1);            // and at the size the game draws it
}
function pixAnimTick(){
  pixAnimFrame++;
  pixAnimDraw();
  setTimeout(pixAnimTick, 1000 / +$('pixFps').value);
}

function pixResize(p, w, h){
  p.rows = Array.from({length:h}, (_, y) => ((p.rows[y] || '').padEnd(w)).slice(0, w));
  p.w = w; p.h = h;
}
/* ---- selection -------------------------------------------------------------
   A box of cells, `pixSel = { pane, x, y, w, h }`, which may hang partly off
   the grid after a move so that a drawing pushed to the edge can be pulled
   back. Moving lifts the cells out, leaving a hole (or not, for a copy), and
   restamps them over that base at every step — so dragging across other
   pixels does not eat them until you let go. One drag or one nudge is one
   undo step. */
let pixSel = null, pixMarquee = null, pixMoving = null, pixClip = null;

function pixSelCells(p, s){
  const rows = pixRows(p);
  return Array.from({length:s.h}, (_, y) => Array.from({length:s.w}, (_, x) => (rows[s.y + y] || '')[s.x + x] || ' '));
}
const pixInSel = (s, x, y) => x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h;
function pixHole(p, s){
  return pixRows(p).map((r, y) => [...r].map((ch, x) => pixInSel(s, x, y) ? ' ' : ch).join(''));
}
function pixStamp(base, p, cells, x0, y0){
  const r = base.map(s => [...s]);
  cells.forEach((row, y) => row.forEach((ch, x) => {
    const X = x0 + x, Y = y0 + y;
    if (ch !== ' ' && X >= 0 && Y >= 0 && X < p.w && Y < p.h) r[Y][X] = ch;
  }));
  return r.map(a => a.join(''));
}
/* Lifted pixels stay lifted. The first move of a selection takes its cells off
   the canvas into `pixSel.float`, with `base` the canvas under them; every move
   after that restamps the float over the base. The first version put the cells
   back on the canvas at the end of each drag and lifted them again from the
   canvas at the start of the next — so any cells that had been dragged past the
   edge were clipped at the first release and were simply gone when the
   selection was pulled back. Now they are kept until the selection is let go:
   deselecting, another tool, or any edit that is not a move. */
function pixLift(dup){
  const pn = pixPanes[pixSel.pane], p = PIX[pn.id];
  pixBegin(pn.id, true);
  if (!pixSel.float)
    pixSel.float = { cells: pixSelCells(p, pixSel), base: dup ? pixRows(p) : pixHole(p, pixSel) };
  else if (dup)
    pixSel.float.base = pixRows(p);           // leave a copy of what shows where it is
  pixMoving = { pane: pixSel.pane };
}
function pixPlace(x, y){
  const p = PIX[pixPanes[pixSel.pane].id], f = pixSel.float;
  // keep at least one cell of the box on the grid, or there is nothing left to grab
  pixSel.x = Math.max(1 - pixSel.w, Math.min(p.w - 1, x));
  pixSel.y = Math.max(1 - pixSel.h, Math.min(p.h - 1, y));
  p.rows = pixStamp(f.base, p, f.cells, pixSel.x, pixSel.y);
  changed();
}
function pixDrop(){ pixMoving = null; pixCommit(); }
function pixNudge(dx, dy){
  if (!pixSel) return;
  pixLift(false); pixPlace(pixSel.x + dx, pixSel.y + dy); pixDrop();
}
function pixSelClear(){
  if (!pixSel) return;
  const id = pixPanes[pixSel.pane].id, p = PIX[id], f = pixSel.float;
  pixBegin(id, true);
  p.rows = f ? f.base : pixHole(p, pixSel);   // a floating selection takes all of itself away, off-grid cells too
  pixSel.float = null;
  pixCommit(); changed();
}
/* The clipboard holds colours, not palette letters, so a copy pasted into the
   other pane lands in that sprite's own colours, adding any it lacks. A
   floating selection copies all of itself, including cells off the grid. */
function pixCopy(){
  if (!pixSel) return false;
  const p = PIX[pixPanes[pixSel.pane].id];
  const cells = pixSel.float ? pixSel.float.cells : pixSelCells(p, pixSel);
  pixClip = { x: pixSel.x, y: pixSel.y, w: pixSel.w, h: pixSel.h,
              cells: cells.map(r => r.map(ch => ch === ' ' ? null : p.pal[PIX_CH.indexOf(ch)])) };
  note('Copied ' + pixSel.w + ' x ' + pixSel.h + '.');
  return true;
}
/* A paste arrives floating, so it can be dragged into place without losing
   anything. It is centred on the pointer when the pointer is over this grid,
   and otherwise lands where it was copied from — either way pulled inside the
   grid when it fits. Put down with its corner at the pointer, as it first was,
   anything pasted near the right or bottom came in hanging off the edge. */
function pixPaste(){
  if (!pixClip) return;
  const i = pixActive, pn = pixPanes[i], p = PIX[pn.id];
  pixBegin(pn.id);                            // settles any selection already floating
  const cells = pixClip.cells.map(r => r.map(col => {
    if (!col) return ' ';
    let k = p.pal.indexOf(col);
    if (k < 0 && p.pal.length < PIX_CH.length){ p.pal.push(col); k = p.pal.length - 1; }
    return k < 0 ? ' ' : PIX_CH[k];
  }));
  const { w, h } = pixClip;
  const want = pixHover && pixHover.pane === i
    ? [pixHover.x - Math.floor((w - 1) / 2), pixHover.y - Math.floor((h - 1) / 2)]
    : [pixClip.x, pixClip.y];
  const fit = (v, size, room) => size <= room ? Math.max(0, Math.min(room - size, v)) : 0;
  pixSel = { pane: i, x: fit(want[0], w, p.w), y: fit(want[1], h, p.h), w, h,
             float: { cells, base: pixRows(p) } };
  p.rows = pixStamp(pixSel.float.base, p, cells, pixSel.x, pixSel.y);
  pixCommit();
  pixView.tool = 'select';
  rebuild();
}
/* How many painted cells of a floating selection are past the grid's edge,
   so the readout can say they are still there. */
function pixOffGrid(){
  const f = pixSel && pixSel.float;
  if (!f) return 0;
  const p = PIX[pixPanes[pixSel.pane].id];
  let n = 0;
  f.cells.forEach((row, y) => row.forEach((ch, x) => {
    const X = pixSel.x + x, Y = pixSel.y + y;
    if (ch !== ' ' && (X < 0 || Y < 0 || X >= p.w || Y >= p.h)) n++;
  }));
  return n;
}

/* Grow or shrink the grid on one side. A row or column added at the top or
   left moves the drawing down or right inside its box, so a sprite that has an
   origin has it moved by the same amount: the art stays where the game puts it
   and only the box around it changes. A sprite without one is placed by its
   corner, and there nothing is moved. */
function pixEdge(p, side, d){
  const rows = pixRows(p), had = !!(p.ox || p.oy);
  let ox = p.ox || 0, oy = p.oy || 0;
  if (side === 'top' || side === 'bottom'){
    if (d < 0 && p.h <= 1 || d > 0 && p.h >= 48) return;
    if (side === 'top'){ if (d > 0) rows.unshift(' '.repeat(p.w)); else rows.shift(); oy += d; }
    else { if (d > 0) rows.push(' '.repeat(p.w)); else rows.pop(); }
    p.h += d;
  } else {
    if (d < 0 && p.w <= 1 || d > 0 && p.w >= 48) return;
    const left = side === 'left';
    for (let y = 0; y < rows.length; y++)
      rows[y] = d > 0 ? (left ? ' ' + rows[y] : rows[y] + ' ') : (left ? rows[y].slice(1) : rows[y].slice(0, -1));
    if (left) ox += d;
    p.w += d;
  }
  p.rows = rows;
  if (had) pixSetOrigin(p, ox, oy); else pixSetOrigin(p, Math.min(p.ox||0, p.w-1), Math.min(p.oy||0, p.h-1));
  pixSel = null;
}

/* ---- drawing -------------------------------------------------------------- */
const pixCanvasOf = i => $('pixPanes').children[i] && $('pixPanes').children[i].querySelector('canvas');
/* The cell under the pointer, measured off the canvas as laid out, so a grid
   the page has scaled still paints the cell you pointed at. May be outside
   the sprite: a stroke dragged off the edge still has to join up on return. */
function pixCell(ev, i){
  const p = PIX[pixPanes[i].id], r = pixCanvasOf(i).getBoundingClientRect();
  return [Math.floor((ev.clientX - r.left) / (r.width / p.w)), Math.floor((ev.clientY - r.top) / (r.height / p.h))];
}
function pixSet(p, x, y, ch){
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return false;
  const row = (p.rows[y] || '').padEnd(p.w);
  if (row[x] === ch) return false;
  p.rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
  return true;
}
/* Every cell on the straight line between two, so a fast drag is a stroke
   rather than a trail of dots with gaps where the mouse outran the events. */
function pixLine(x0, y0, x1, y1){
  const out = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;){
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy){ err += dy; x0 += sx; }
    if (e2 <= dx){ err += dx; y0 += sy; }
  }
}
function pixDragCells(){
  const d = pixDrag;
  if (d.kind === 'line') return pixLine(d.x0, d.y0, d.x1, d.y1);
  const xa = Math.min(d.x0, d.x1), xb = Math.max(d.x0, d.x1), ya = Math.min(d.y0, d.y1), yb = Math.max(d.y0, d.y1);
  const out = [];
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++)
    if (d.filled || x === xa || x === xb || y === ya || y === yb) out.push([x, y]);
  return out;
}
// four-way flood: diagonal neighbours are a different area, the way they look
function pixFlood(p, x, y, ch){
  const rows = pixRows(p).map(r => [...r]), want = rows[y][x];
  if (want === ch) return;
  const stack = [[x, y]];
  while (stack.length){
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= p.w || cy >= p.h || rows[cy][cx] !== want) continue;
    rows[cy][cx] = ch;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  p.rows = rows.map(r => r.join(''));
}
function pixRepaintPane(i){ const cv = pixCanvasOf(i); if (cv) pixGridPaint(cv, i, pixZoom()); }
function pixReadout(i){
  const card = $('pixPanes').children[i], el = card && card.querySelector('.readout');
  if (!el) return;
  const p = PIX[pixPanes[i].id];
  let text = p.w + ' x ' + p.h;
  if (pixHover && pixHover.pane === i){
    const { x, y } = pixHover, ch = (p.rows[y] || '')[x] || ' ';
    text += '   cell ' + x + ',' + y + '   ' + (ch === ' ' ? 'empty' : 'colour ' + (PIX_CH.indexOf(ch) + 1) + ' ' + p.pal[PIX_CH.indexOf(ch)]);
  }
  if (pixDrag && pixDrag.pane === i)
    text += '   ' + (Math.abs(pixDrag.x1 - pixDrag.x0) + 1) + ' x ' + (Math.abs(pixDrag.y1 - pixDrag.y0) + 1);
  if (pixMarquee && pixMarquee.pane === i)
    text += '   selecting ' + (Math.abs(pixMarquee.x1 - pixMarquee.x0) + 1) + ' x ' + (Math.abs(pixMarquee.y1 - pixMarquee.y0) + 1);
  else if (pixSel && pixSel.pane === i)
    text += '   selected ' + pixSel.w + ' x ' + pixSel.h + ' at ' + pixSel.x + ',' + pixSel.y
          + (pixOffGrid() ? '   ' + pixOffGrid() + ' cells held off the grid' : '');
  el.textContent = text;
}

function pixDown(e, i){
  e.preventDefault();
  const pn = pixPanes[i], p = PIX[pn.id], [x, y] = pixCell(e, i);
  const inside = x >= 0 && y >= 0 && x < p.w && y < p.h;
  const right = e.button === 2, tool = pixView.tool;
  if (!inside) return;
  if (!right && tool === 'select'){
    paintPane = i; painting = 1;
    if (pixSel && pixSel.pane === i && pixInSel(pixSel, x, y)){
      pixLift(e.altKey);
      Object.assign(pixMoving, { gx: x, gy: y, sx: pixSel.x, sy: pixSel.y });
    } else {
      pixSel = null;
      pixMarquee = { pane: i, x0: x, y0: y, x1: x, y1: y };
      pixRepaintPane(i);
    }
    return;
  }
  if (!right && (e.altKey || tool === 'pick')){
    const k = PIX_CH.indexOf((p.rows[y] || '')[x] || ' ');
    if (k >= 0 && k < p.pal.length) pixSetPen(i, k);
    return;
  }
  if (!right && tool === 'origin'){
    pixBegin(pn.id); pixSetOrigin(p, x, y); pixCommit(); rebuild();
    return;
  }
  const ch = right || tool === 'erase' ? ' ' : PIX_CH[pn.pen];
  paintPane = i;
  pixBegin(pn.id);
  if (!right && tool === 'fill'){
    pixFlood(p, x, y, ch); pixCommit(); changed();
    return;
  }
  painting = right ? 2 : 1;
  if (!right && (tool === 'line' || tool === 'rect')){
    pixDrag = { pane: i, kind: tool, x0: x, y0: y, x1: x, y1: y, erase: false, filled: e.shiftKey };
    pixRepaintPane(i); pixReadout(i);
    return;
  }
  pixLast = [x, y];
  if (pixSet(p, x, y, ch)) changed();
}
function pixMove(e, i){
  const pn = pixPanes[i], p = PIX[pn.id], [x, y] = pixCell(e, i);
  const inside = x >= 0 && y >= 0 && x < p.w && y < p.h;
  const was = pixHover;
  pixHover = inside ? { pane: i, x, y } : null;
  if (painting && paintPane === i){
    if (pixMoving){
      pixPlace(pixMoving.sx + x - pixMoving.gx, pixMoving.sy + y - pixMoving.gy);
    } else if (pixMarquee){
      pixMarquee.x1 = Math.max(0, Math.min(p.w - 1, x)); pixMarquee.y1 = Math.max(0, Math.min(p.h - 1, y));
      pixRepaintPane(i);
    } else if (pixDrag){
      pixDrag.x1 = Math.max(0, Math.min(p.w - 1, x)); pixDrag.y1 = Math.max(0, Math.min(p.h - 1, y));
      pixDrag.filled = e.shiftKey;
      pixRepaintPane(i);
    } else if (pixLast){
      const ch = painting === 2 || pixView.tool === 'erase' ? ' ' : PIX_CH[pn.pen];
      let any = false;
      for (const [cx, cy] of pixLine(pixLast[0], pixLast[1], x, y)) any = pixSet(p, cx, cy, ch) || any;
      pixLast = [x, y];
      if (any) changed(); else pixRepaintPane(i);
    }
  } else if (!was || !pixHover || was.x !== x || was.y !== y || was.pane !== i){
    pixRepaintPane(i);
  }
  pixReadout(i);
}
// released anywhere, even off the grid: that is the end of the stroke
window.addEventListener('mouseup', () => {
  if (!painting) return;
  if (pixMoving){ painting = 0; paintPane = -1; pixDrop(); return; }
  if (pixMarquee){
    const m = pixMarquee; pixMarquee = null; painting = 0; paintPane = -1;
    // a click without a drag deselects, the way it does everywhere else
    if (m.x0 !== m.x1 || m.y0 !== m.y1)
      pixSel = { pane: m.pane, x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1),
                 w: Math.abs(m.x1 - m.x0) + 1, h: Math.abs(m.y1 - m.y0) + 1 };
    pixRepaintPane(m.pane); pixReadout(m.pane);
    return;
  }
  const d = pixDrag;
  if (d){
    const pn = pixPanes[d.pane], p = PIX[pn.id];
    for (const [x, y] of pixDragCells()) pixSet(p, x, y, PIX_CH[pn.pen]);
    pixDrag = null;
  }
  painting = 0; paintPane = -1; pixLast = null;
  pixCommit();
  changed();
});
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
  drawHabitatView(g, 'day', 'valley', 3);
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
/* The pinned previews sit just under the header, and the header wraps to two
   rows on a narrow window, so its height is measured rather than assumed. */
{
  const head = document.querySelector('header');
  const setHead = () => document.documentElement.style.setProperty('--head', head.offsetHeight + 'px');
  new ResizeObserver(setHead).observe(head);
  setHead();
}
$('pixFps').oninput = () => { $('pixFpsOut').textContent = $('pixFps').value; };
// the grid zoom follows the room beside the list, which a browser zoom changes
window.addEventListener('resize', () => { if (tab === 'pix' && !painting) pixPaint(); });
pixAnimTick();
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
