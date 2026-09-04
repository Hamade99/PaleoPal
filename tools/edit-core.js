/* Editor plumbing: serialising the art data back out, and the file it goes to.

   Everything the editor can change lives in one file, src/00-art.js, and that
   file carries `<data:NAME>` markers around each declaration. So saving is
   not surgery on six source files and not a regeneration that would throw the
   prose away: the text between markers is replaced and everything outside them
   is kept exactly as written.

   This is the whole reason the data was consolidated. An editor that has to
   patch a value out of the middle of a working source file is an editor that
   will eventually corrupt one. */

const DATA_FILE = '../src/00-art.js';

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

/* ---- the file ------------------------------------------------------------ */

/* Named here rather than looked up on `window`, because a top-level `const`
   in a classic script goes into the global lexical scope and never becomes a
   property of the window — `window.PIX` is undefined while `PIX` is right
   there. Listing them also means a block that stops being editable fails
   loudly at load instead of silently saving stale text. */
const LIVE = { PIX, STAGE, SPECIES_STAGE, REX_TUNE, TRI_TUNE, BRA_TUNE,
               REX_SPEC, TRI_SPEC, BRA_SPEC, SKINS, BIOME_ART };
const BLOCKS = Object.keys(LIVE);

function blockText(name){
  if (name === 'PIX') return jsPIX(PIX);
  return 'const ' + name + ' = ' + js(LIVE[name], 0) + ';';
}

/* Replace each marked region and leave everything else — the file is mostly
   explanation, and the explanation is the part worth keeping. */
function rewrite(template){
  let out = template;
  for (const name of BLOCKS){
    const open = '/*<data:' + name + '>*/', close = '/*</data>*/';
    const a = out.indexOf(open);
    if (a < 0) throw new Error('no marker for ' + name + ' in ' + DATA_FILE);
    const b = out.indexOf(close, a);
    if (b < 0) throw new Error('unclosed marker for ' + name);
    out = out.slice(0, a + open.length) + '\n' + blockText(name) + '\n' + out.slice(b);
  }
  return out;
}

/* ---- reading and writing it ---------------------------------------------- */

let templateText = null, fileHandle = null;

/* One hook on the window, so the editor's own state can be reached from a
   console or a test harness. Everything else stays in the lexical scope it
   shares with the game's modules. */
window.EDIT = { LIVE, rewrite: t => rewrite(t), template: () => templateText };

async function loadTemplate(){
  if (templateText) return templateText;
  const r = await fetch(DATA_FILE);
  if (!r.ok) throw new Error('could not read ' + DATA_FILE + ' (' + r.status + ')');
  templateText = await r.text();
  return templateText;
}

/* Save straight over src/00-art.js where the browser allows it. The first save
   asks for the file once and then remembers it, so the loop is edit, save,
   reload the game. Where it is not allowed, the same text downloads instead
   and has to be moved into place by hand. */
async function saveData(){
  const text = rewrite(await loadTemplate());
  if (window.showSaveFilePicker){
    try {
      if (!fileHandle){
        fileHandle = await window.showSaveFilePicker({
          suggestedName: '00-art.js',
          types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }]
        });
      }
      const w = await fileHandle.createWritable();
      await w.write(text); await w.close();
      templateText = text;                       // the markers moved with it
      return 'Saved to ' + fileHandle.name + '.';
    } catch (e){
      if (e.name === 'AbortError') return 'Save cancelled.';
      fileHandle = null;
      // fall through to the download
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  a.download = '00-art.js';
  a.click();
  URL.revokeObjectURL(a.href);
  return 'Downloaded 00-art.js — move it into src/ over the old one.';
}
