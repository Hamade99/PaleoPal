/* Editor plumbing: serialising the art data back out, and the file it goes to.

   Everything the editor can change lives in one file, src/00-art.js, and that
   file carries `<data:NAME>` markers around each declaration. So saving is
   not surgery on six source files and not a regeneration that would throw the
   prose away: the text between markers is replaced and everything outside them
   is kept exactly as written.

   This is the whole reason the data was consolidated. An editor that has to
   patch a value out of the middle of a working source file is an editor that
   will eventually corrupt one. */

/* Two files now, and only two. Backdrops are 280x210 characters each and would
   bury everything else in 00-art.js, so they have a file of their own with the
   same markers, written the same way. Everything here works a file at a time;
   the only thing that knows there is more than one is the loop in saveData. */
const DATA_FILES = [
  { path: '../src/00-art.js',    name: '00-art.js',
    blocks: ['PIX','PART_PIX','PART_MATS','RIG_PARTS','STAGE','SPECIES_STAGE','POSE_ART','HABITAT_ART','GEAR_FIT',
             'REX_TUNE','TRI_TUNE','BRA_TUNE',
             'REX_SPEC','TRI_SPEC','BRA_SPEC','SKINS','BIOME_ART'] },
  { path: '../src/00-bg-art.js', name: '00-bg-art.js', blocks: ['BG_PIX'] }
];
const fileOf = name => DATA_FILES.find(f => f.blocks.indexOf(name) >= 0);

/* ---- pretty-printing values back to JavaScript --------------------------- */

const isHex = v => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v);

function q(s){ return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

function num(n){
  // keep the source style: .5 rather than 0.5, and no trailing zeros
  const s = Number(n.toFixed(6)).toString();
  return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s;
}

/* One line if it fits, otherwise one entry per line. Written by hand rather
   than with JSON.stringify because the file is meant to stay readable and
   hand-editable — single quotes, no quoted keys, numbers in the file's own
   style. */
function js(v, indent, width){
  indent = indent || 0; width = width || 78;
  const pad = ' '.repeat(indent);
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return num(v);
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return q(v);
  if (Array.isArray(v)){
    const parts = v.map(x => js(x, indent + 2, width));
    const flat = '[' + parts.join(', ') + ']';
    if (indent + flat.length <= width && !flat.includes('\n')) return flat;
    return '[\n' + parts.map(p => pad + '  ' + p).join(',\n') + '\n' + pad + ']';
  }
  const keys = Object.keys(v);
  const parts = keys.map(k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k)) + ':' + js(v[k], indent + 2, width));
  const flat = '{ ' + parts.join(', ') + ' }';
  if (indent + flat.length <= width && !flat.includes('\n')) return flat;
  return '{\n' + parts.map(p => pad + '  ' + p).join(',\n') + '\n' + pad + '}';
}

/* PIX gets its own printer. A sprite is meant to be legible as a picture in
   the source file, so its rows are one string per line, padded to width, and
   the palette stays on one line however long it gets. */
function jsPIX(pix){
  const out = ['const PIX = {'];
  for (const id in pix){
    const p = pix[id];
    let head = "  " + q(id) + ": { w:" + p.w + ", h:" + p.h;
    if (p.ox || p.oy) head += ", ox:" + (p.ox||0) + ", oy:" + (p.oy||0);
    out.push(head + ',');
    out.push("    pal:[" + p.pal.map(q).join(',') + "], rows:[");
    out.push(p.rows.map(r => "      " + q(r.padEnd(p.w))).join(',\n'));
    out.push("    ] },");
  }
  out.push('};');
  return out.join('\n');
}

/* A backdrop is the PIX format at scene size: a palette and 210 rows of 280
   characters. The palette goes on one line however long it gets, and the rows
   one per line, for the same reason PIX does it — the file is meant to stay
   something a person can open. `quiet` is written only when it has anything in
   it, so a backdrop that suppresses nothing does not carry an empty list. */
function jsBG_PIX(pix){
  const out = ['const BG_PIX = {'];
  for (const id in pix){
    const p = pix[id];
    let head = "  " + q(id) + ": { w:" + p.w + ", h:" + p.h;
    if (p.quiet && p.quiet.length) head += ", quiet:[" + p.quiet.map(q).join(',') + "]";
    out.push(head + ',');
    out.push("    pal:[" + p.pal.map(q).join(',') + "], rows:[");
    out.push(p.rows.map(r => "      " + q(r.padEnd(p.w))).join(',\n'));
    out.push("    ] },");
  }
  out.push('};');
  return out.join('\n');
}

/* A hand-drawn part is rows too, but of material characters rather than
   palette indices, so there is no palette line and the origin is always
   written — it is the anchor the drawing hangs from, and a part with it at
   0,0 is a part hanging by its top-left corner, which is a thing someone
   might mean. */
function jsPART_PIX(pix){
  const out = ['const PART_PIX = {'];
  for (const id in pix){
    const p = pix[id];
    out.push("  " + q(id) + ": { w:" + p.w + ", h:" + p.h
             + ", ox:" + (p.ox||0) + ", oy:" + (p.oy||0) + ", rows:[");
    out.push(p.rows.map(r => "    " + q(r.padEnd(p.w))).join(',\n'));
    out.push("  ] },");
  }
  out.push('};');
  return out.join('\n');
}

/* ---- the file ------------------------------------------------------------ */

/* Named here rather than looked up on `window`, because a top-level `const`
   in a classic script goes into the global lexical scope and never becomes a
   property of the window — `window.PIX` is undefined while `PIX` is right
   there. Listing them also means a block that stops being editable fails
   loudly at load instead of silently saving stale text. */
const LIVE = { PIX, PART_PIX, PART_MATS, RIG_PARTS, STAGE, SPECIES_STAGE, POSE_ART, HABITAT_ART, GEAR_FIT,
               REX_TUNE, TRI_TUNE, BRA_TUNE,
               REX_SPEC, TRI_SPEC, BRA_SPEC, SKINS, BIOME_ART, BG_PIX };
const BLOCKS = Object.keys(LIVE);

/* Every block has to be claimed by exactly one file, or a save quietly drops
   it. Checked at load rather than at save, because the moment to find out that
   a new block was added to LIVE and nowhere else is not while writing over the
   file it belongs in. */
(() => {
  const owned = [].concat(...DATA_FILES.map(f => f.blocks));
  const stray = BLOCKS.filter(n => owned.indexOf(n) < 0);
  const ghost = owned.filter(n => BLOCKS.indexOf(n) < 0);
  if (stray.length) throw new Error('no file owns: ' + stray.join(', '));
  if (ghost.length) throw new Error('claimed but not live: ' + ghost.join(', '));
})();

function blockText(name){
  if (name === 'PIX') return jsPIX(PIX);
  if (name === 'PART_PIX') return jsPART_PIX(PART_PIX);
  if (name === 'BG_PIX') return jsBG_PIX(BG_PIX);
  return 'const ' + name + ' = ' + js(LIVE[name], 0) + ';';
}

/* Replace each marked region and leave everything else — the file is mostly
   explanation, and the explanation is the part worth keeping. */
function rewrite(template, file){
  file = file || DATA_FILES[0];
  let out = template;
  for (const name of file.blocks){
    const open = '/*<data:' + name + '>*/', close = '/*</data>*/';
    const a = out.indexOf(open);
    if (a < 0) throw new Error('no <data:' + name + '> marker — is that file really src/' + file.name + '?');
    const b = out.indexOf(close, a);
    if (b < 0) throw new Error('unclosed marker for ' + name);
    out = out.slice(0, a + open.length) + '\n' + blockText(name) + '\n' + out.slice(b);
  }
  return out;
}

/* ---- reading and writing it ---------------------------------------------- */

/* Per file, not global: each has its own cached text and its own handle, so a
   browser that has been given permission to write one is not asked again for
   the other, and a failure on one does not lose the other's. */
DATA_FILES.forEach(f => { f.text = null; f.handle = null; });

/* One hook on the window, so the editor's own state can be reached from a
   console or a test harness. Everything else stays in the lexical scope it
   shares with the game's modules. */
window.EDIT = { LIVE, DATA_FILES,
                rewrite: (t, f) => rewrite(t, f || DATA_FILES[0]),
                template: () => DATA_FILES[0].text, launcherPresent };

/* A save keeps everything outside the markers, so it needs the file's current
   text before it can write a word. Fetching that text is the only thing here
   that ever wanted a local server: `fetch` refuses a sibling file on a
   `file://` page, and double-clicking the editor is the entire point of it.

   Writing never wanted one. A `file://` page is already a secure context, so
   the writable-handle API is there too — it was only the read that was
   blocked. So one handle does both jobs now: asked for once, then read through
   on every save rather than trusting text cached at load, which also means
   prose edited by hand in 00-art.js between two saves survives. */

const canWrite = () => typeof window.showSaveFilePicker === 'function';

/* A file handle is one of the few things structured clone can put in
   IndexedDB, so the browser hands the same one back after a reload and the
   second save is a permission prompt rather than a trip through the dialog.
   Best effort throughout: a browser that refuses storage to a `file://` page
   just gets the dialog again, which is what it would have got anyway. */
function idb(run){
  return new Promise(resolve => {
    let req;
    try { req = indexedDB.open('paleopal-editor', 1); }
    catch (e){ return resolve(null); }
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('handles', 'readwrite');
        const r = run(tx.objectStore('handles'));
        tx.oncomplete = () => resolve(r ? r.result : null);
        tx.onerror = () => resolve(null);
      } catch (e){ resolve(null); }
    };
  });
}

/* Recalled at load and not on the click. A browser opens a file dialog only
   while the click that asked for it is still fresh, and waiting on storage
   first is a good way to spend that. */
const recalled = Promise.all(DATA_FILES.map(f => idb(s => s.get(f.name))));

async function allowed(h){
  if (!h || !h.queryPermission) return !!h;
  const opt = { mode: 'readwrite' };
  return await h.queryPermission(opt) === 'granted'
      || await h.requestPermission(opt) === 'granted';
}

/* Firefox has no writable handles at all. There the file comes in through an
   <input>, which a `file://` page is allowed to use, and goes back out as a
   download to be moved into src/ by hand. */
function askForFile(file){
  return new Promise((resolve, reject) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = '.js';
    i.title = 'Choose ' + file.name;
    i.oncancel = () => reject(Object.assign(new Error('Save cancelled.'),
                                            { name: 'AbortError' }));
    i.onchange = () => i.files[0] ? resolve(i.files[0])
                                  : reject(new Error('No file chosen.'));
    i.click();
  });
}

/* Re-read on every save, never cached from page load.

   This is not caution, it is a bug that has already happened. The editor sits
   open for hours while 00-art.js is also being edited in a text editor, and a
   save that writes back the copy taken at load silently reverts everything
   that happened in between — it reverted a change to `pixCanvas`, in this file's
   own repository, within an hour of this path being written. The marked blocks
   are meant to come from the editor; everything around them is meant to come
   from the file as it is now.

   `no-store` because the fetch is the read: a 200-from-cache is exactly the
   stale copy this is here to avoid. Only the file:// path caches, because
   there a re-read means another file dialog. */
async function loadTemplate(file){
  if (location.protocol === 'file:'){
    if (!file.text) file.text = await (await askForFile(file)).text();
    return file.text;
  }
  const r = await fetch(file.path, { cache: 'no-store' });
  if (!r.ok) throw new Error('could not read ' + file.path + ' (' + r.status + ')');
  file.text = await r.text();
  return file.text;
}

/* At load, warm the template only where that is free. Over http:// it is a
   fetch; on a `file://` page it would be a file dialog in the face before the
   editor has even been looked at, so there it waits for Save. */
async function warmTemplate(){
  if (location.protocol !== 'file:')
    for (const f of DATA_FILES) await loadTemplate(f);
}

/* The launcher, tools/edit.py, answers POST /save by writing the file itself.
   That is the only way Firefox can save at all — it has no writable-file API
   and is not getting one — and it is the least ceremony anywhere else too: no
   dialog, no permission prompt, nothing to move afterwards.

   Nothing has to detect it. A plain static server answers 501 to a POST and a
   file:// page cannot POST at all, so anything other than a clean 200 just
   falls through to the browser's own machinery below. */
/* Is this page being served by tools/edit.py, or was it just opened? The
   difference decides whether Save writes src/00-art.js or opens a file dialog,
   and the editor should say which before you press it rather than after. */
async function launcherPresent(){
  if (location.protocol === 'file:') return false;
  try {
    const r = await fetch('/save', { method:'GET' });
    return r.ok && (await r.text()).trim() === 'paleopal-editor';
  } catch (e){ return false; }
}

async function saveToLauncher(text, file){
  if (location.protocol === 'file:') return null;
  let r;
  try {
    r = await fetch('/save?file=' + encodeURIComponent(file.name), {
      method: 'POST', body: text,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  } catch (e){ return null; }
  const said = (await r.text()).trim();
  if (!r.ok) throw new Error(said || ('save endpoint said ' + r.status));
  return said || 'Saved.';
}

/* One file, straight over the source. Three ways, best first: the launcher,
   then a writable handle asked for once, then a download to move by hand. */
async function saveFile(file, index){
  if (location.protocol !== 'file:'){
    const text = rewrite(await loadTemplate(file), file);
    const done = await saveToLauncher(text, file);
    if (done){ file.text = text; return done; }
  }
  if (canWrite()){
    try {
      if (!file.handle){
        const kept = (await recalled)[index];
        if (kept && await allowed(kept)) file.handle = kept;
      }
      if (!file.handle){
        file.handle = await window.showSaveFilePicker({
          id: 'paleopal_' + file.name.replace(/\W/g, '_'),   // reopens where it was
          suggestedName: file.name,
          types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }]
        });
        idb(s => s.put(file.handle, file.name));
      }
      const text = rewrite(await (await file.handle.getFile()).text(), file);
      const w = await file.handle.createWritable();
      await w.write(text); await w.close();
      file.text = text;                          // the markers moved with it
      return 'Saved to ' + file.handle.name + '.';
    } catch (e){
      file.handle = null;
      if (e.name === 'AbortError') return 'Save cancelled.';
      if (/marker/.test(e.message)) throw e;     // wrong file picked; say so
      // anything else: fall through to the download
    }
  }
  let text;
  try { text = rewrite(await loadTemplate(file), file); }
  catch (e){ if (e.name === 'AbortError') return 'Save cancelled.'; throw e; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
  return 'Downloaded ' + file.name + ' — move it into src/ over the old one.';
}

/* Both files, in order, skipping any second file that has nothing in it.

   A backdrop file with no backdrops in it is the common case and will be for a
   long time. Rewriting it would produce the bytes it already holds, so nothing
   is lost by leaving it alone — and something real is gained: without this, a
   browser on the file-dialog path asks for a second file, and hands over a
   second download, every single time anyone saves a sprite. That is the kind
   of ceremony that makes a Save button something you hesitate over. The moment
   the file has a backdrop in it, it saves like anything else. */
const fileEmpty = file =>
  file.blocks.every(n => { const v = LIVE[n]; return v && !Object.keys(v).length; });

async function saveData(){
  const said = [];
  for (let i = 0; i < DATA_FILES.length; i++){
    if (i > 0 && fileEmpty(DATA_FILES[i])) continue;
    said.push(await saveFile(DATA_FILES[i], i));
  }
  return said.join('  ');
}
