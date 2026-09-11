/* ==========================================================================
   SCREEN FONT
   The menus live inside the 224x168 screen, so their text has to be drawn as
   pixels rather than laid out as DOM. This is that font: 5x7 fixed width, one
   glyph per entry, seven rows of five bits each encoded as base32 so the table
   stays readable at a glance and small in the build.

   Drawing a glyph pixel by pixel would be thousands of fillRect calls a frame,
   so each colour the interface uses is baked once into a strip of every glyph
   and drawn from there. Colours are few and fixed, so the strips are built on
   first use and then never again.

   There are no image assets here either. The strips are drawn from the table
   at load, the same way every other picture in this game is made.
   ========================================================================== */

const FONT_W = 5, FONT_H = 7;
const FONT_ADV = 6;                 // glyph width plus one column of tracking
const FONT_LINE = 9;                // baseline to baseline

const B32 = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
const GLYPHS = {
  ' ':'0000000', '0':'EHJLPHE', '1':'4C4444E', '2':'EH1248V', '3':'V2421HE', '4':'26AIV22',
  '5':'VGU11HE', '6':'68GUHHE', '7':'V124888', '8':'EHHEHHE', '9':'EHHF12C', 'A':'EHHVHHH',
  'B':'UHHUHHU', 'C':'EHGGGHE', 'D':'SIHHHIS', 'E':'VGGUGGV', 'F':'VGGUGGG', 'G':'EHGNHHF',
  'H':'HHHVHHH', 'I':'E44444E', 'J':'72222IC', 'K':'HIKOKIH', 'L':'GGGGGGV', 'M':'HRLLHHH',
  'N':'HPLJHHH', 'O':'EHHHHHE', 'P':'UHHUGGG', 'Q':'EHHHLID', 'R':'UHHUKIH', 'S':'FGGE11U',
  'T':'V444444', 'U':'HHHHHHE', 'V':'HHHHHA4', 'W':'HHHLLRH', 'X':'HHA4AHH', 'Y':'HHA4444',
  'Z':'V1248GV', 'a':'00E1FHF', 'b':'GGUHHHU', 'c':'00FGGGF', 'd':'11FHHHF', 'e':'00EHVGE',
  'f':'698U888', 'g':'0FHHF1E', 'h':'GGUHHHH', 'i':'40C444E', 'j':'20622IC', 'k':'GGIKOKI',
  'l':'C44444E', 'm':'00QLLLL', 'n':'00UHHHH', 'o':'00EHHHE', 'p':'0UHHUGG', 'q':'0FHHF11',
  'r':'00MOGGG', 's':'00FGE1U', 't':'88U8896', 'u':'00HHHJD', 'v':'00HHHA4', 'w':'00HHLLA',
  'x':'00HA4AH', 'y':'0HHHF1E', 'z':'00V248V', '.':'00000CC', ',':'0000664', ':':'0CC0CC0',
  '!':'4444404', '?':'EH16404', '\'':'4400000', '-':'000E000', '+':'044V440', '/':'12448G0',
  '%':'PQ248BJ', '(':'2488842', ')':'8422248', '*':'0LEVEL0', '#':'AVAAAVA',
  '\u00b7':'000CC00', '\u25b6':'8CEFEC8', '\u25c0':'26EUE62', '\u25b2':'044EEV0',
  '\u25bc':'0VEE440'
};

const fontStrips = new Map();
function fontStrip(col){
  let strip = fontStrips.get(col);
  if (strip) return strip;
  const keys = Object.keys(GLYPHS);
  const cv = makeCv(keys.length * FONT_W, FONT_H), g = readCtx(cv);
  g.fillStyle = col;
  const index = new Map();
  keys.forEach((ch, n) => {
    const code = GLYPHS[ch], ox = n * FONT_W;
    index.set(ch, ox);
    for (let row=0; row<FONT_H; row++){
      const bits = B32.indexOf(code[row]);
      for (let bit=0; bit<FONT_W; bit++)
        if (bits & (1 << (FONT_W - 1 - bit))) g.fillRect(ox + bit, row, 1, 1);
    }
  });
  strip = { cv, index };
  fontStrips.set(col, strip);
  return strip;
}

const textW = s => s.length ? s.length * FONT_ADV - 1 : 0;

/* Draw a single line. `align` is 'left' (default), 'right' or 'centre', and x
   is the edge the alignment refers to. Returns the x the line ended at. */
function text(g, str, x, y, col, align){
  str = String(str);
  const strip = fontStrip(col || '#e9e1cb');
  let px = Math.round(align === 'right'  ? x - textW(str)
                    : align === 'centre' ? x - textW(str)/2 : x);
  const py = Math.round(y);
  for (let i=0; i<str.length; i++){
    const ox = strip.index.get(str[i]);
    if (ox !== undefined) g.drawImage(strip.cv, ox, 0, FONT_W, FONT_H, px, py, FONT_W, FONT_H);
    px += FONT_ADV;
  }
  return px;
}

/* Greedy wrap to a pixel width. Long words are broken rather than allowed to
   run off the screen, because at this size one over-long word is the whole
   line. */
function wrapText(str, maxW){
  const cols = Math.max(1, Math.floor((maxW + 1) / FONT_ADV));
  const out = [];
  for (const para of String(str).split('\n')){
    let line = '';
    for (const word of para.split(' ')){
      let w = word;
      while (w.length > cols){                     // break a word too long to fit
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, cols));
        w = w.slice(cols);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= cols) line += ' ' + w;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

/* Wrapped paragraph. Returns the y it finished at, so callers can stack. */
function textBlock(g, str, x, y, maxW, col, lineH){
  const step = lineH || FONT_LINE;
  for (const line of wrapText(str, maxW)){ text(g, line, x, y, col); y += step; }
  return y;
}

/* Cut a string to fit, with a trailing dot rather than three: at six pixels a
   character an ellipsis costs three characters of the thing being named. */
function fit(str, maxW){
  const cols = Math.max(1, Math.floor((maxW + 1) / FONT_ADV));
  str = String(str);
  return str.length <= cols ? str : str.slice(0, cols - 1) + '.';
}
