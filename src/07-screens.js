/* ==========================================================================
   SCREENS
   The menus are drawn inside the 224x168 screen, not slid over the top of the
   case as web sheets. On the hardware this is copied from, the screen is the
   whole interface: the case never changes while you play, and everything you
   can do to the animal happens on the glass in front of it.

   A key on the case opens a screen; a tap on the screen picks something in it.
   The keys are direct jumps and nothing else, which is why there is no cursor
   here — the pointer is the cursor.

   Each screen is an entry in SCREENS with `draw`, which paints it, and `tap`,
   which is handed a canvas-space point and decides what was hit. Both are
   given a layout object built by `screenLayout`, so hit boxes are computed
   once and drawn and tested from the same numbers. Nothing here computes a
   rectangle twice.

   Long prose has nowhere to go at six pixels a character, so the dossier's
   field notes still open as a DOM panel. That is the only text left outside
   the glass.
   ========================================================================== */

/* the screen palette, and the one place any of it is named */
const SC = {
  ink:    '#0b1113',   // the recess behind a panel
  panel:  '#16211f',   // a panel face
  edge:   '#2f4640',   // panel border
  line:   '#24332f',   // rules and inactive cells
  bone:   '#e9e1cb',   // primary text
  dim:    '#8fa39a',   // secondary text
  gold:   '#e0ac48',   // coins and prices
  moss:   '#8cb765',   // affirmative, owned, worn
  rust:   '#cf6a44',   // refusals, warnings, costs you cannot meet
  sel:    '#3d5c4e'    // the selected cell's fill
};

/* one grid unit. Everything on a screen is a whole number of these, which is
   what keeps the interface on the same pixel grid as the world behind it. */
const U = 4;

let screen = null;          // null when the habitat is showing
let screenState = {};       // per-screen scratch: which item is selected, scroll

function openScreen(which){
  if (!SCREENS[which]) return;
  if (mode === 'game') return;
  if (mode !== 'live' && !SCREENS[which].preHatch) return;
  screen = which;
  screenState = { pick: 0, scroll: 0 };
  SFX.pop();
  paintChrome();
}
function closeScreen(){
  if (!screen) return;
  screen = null;
  paintChrome();
}
/* A key is a latch, not a one-way door. It stays pressed in while its screen
   is up, so pressing it again is the obvious way to let it out — the close tab
   in the corner of the screen was the only way back, and on a case with five
   physical keys under the glass that is the last place anyone looks. Pressing
   a different key still jumps straight to that screen. */
function toggleScreen(which){
  if (screen === which) return closeScreen();
  openScreen(which);
}
const screenOpen = () => screen !== null;

/* ------------------------------ chrome ------------------------------------
   Every screen wears the same frame: a title bar with the purse in it, a body,
   and a close tab. Drawing it in one place is what stops six screens drifting
   apart by two pixels each.
   -------------------------------------------------------------------------- */
const BAR_H = 13, PAD = 3;

function panel(g, x, y, w, h, fill){
  g.fillStyle = fill || SC.panel;
  g.fillRect(x, y, w, h);
  g.fillStyle = SC.edge;
  g.fillRect(x, y, w, 1); g.fillRect(x, y+h-1, w, 1);
  g.fillRect(x, y, 1, h); g.fillRect(x+w-1, y, 1, h);
}

function screenFrame(g, title){
  g.fillStyle = SC.ink;
  g.fillRect(0, 0, W, H);
  g.fillStyle = SC.panel;
  g.fillRect(0, 0, W, BAR_H);
  g.fillStyle = SC.edge;
  g.fillRect(0, BAR_H - 1, W, 1);
  text(g, title, PAD, 3, SC.bone);
  const purse = Math.floor(G.coins) + 'c';
  text(g, purse, W - PAD - 11, 3, SC.gold, 'right');
  // close tab, top right, always in the same place on every screen
  g.fillStyle = SC.line;
  g.fillRect(W - 11, 2, 9, 9);
  g.fillStyle = SC.dim;
  for (let i=0;i<5;i++){ g.fillRect(W - 9 + i, 4 + i, 1, 1); g.fillRect(W - 5 - i, 4 + i, 1, 1); }
  return { close: [W - 12, 1, 11, 11] };
}

/* The animal, small, on its own screen. A menu about the animal that does not
   show the animal is a form. */
function petOnScreen(g, cx, baseY, maxH){
  if (!hatched()) return null;
  const f = frameOf(S.sp, stageIdx(), 'idle', 0, false, S.skin);
  const sc = Math.min(1, maxH / f.h);
  const w = Math.round(f.w * sc), h = Math.round(f.h * sc);
  const x = Math.round(cx - w/2), y = Math.round(baseY - h);
  g.fillStyle = 'rgba(10,20,18,.45)';
  g.beginPath(); g.ellipse(cx, baseY + 1, w*.34, 2, 0, 0, 7); g.fill();
  g.drawImage(f.cv, x, y, w, h);
  return [x, y, w, h];
}

const hit = (box, mx, my) =>
  mx >= box[0] && mx < box[0] + box[2] && my >= box[1] && my < box[1] + box[3];

/* ------------------------------- item grid --------------------------------
   The shape almost every screen wants: a row of picture cells across the top
   of the body, and the selected one's name, price and note written out
   underneath. It replaced a vertical list of text rows, which is the shape a
   settings page has, not a shelf of things.
   -------------------------------------------------------------------------- */
const CELL = 30, CELL_GAP = 3;

function gridLayout(items, top, cols){
  cols = cols || Math.floor((W - PAD*2 + CELL_GAP) / (CELL + CELL_GAP));
  const rows = Math.ceil(items.length / cols);
  const wide = cols * CELL + (cols - 1) * CELL_GAP;
  const x0 = Math.round((W - wide) / 2);
  return {
    items, cols, rows, x0, top, cell: CELL,
    box(i){
      const r = Math.floor(i / cols), c = i % cols;
      return [x0 + c * (CELL + CELL_GAP), top + r * (CELL + CELL_GAP), CELL, CELL];
    },
    bottom: top + rows * CELL + (rows - 1) * CELL_GAP
  };
}

/* Draw one cell: a recessed square, a picture in it, and a price or state
   along the bottom edge. `art` is handed the centre of the cell. */
function gridCell(g, box, opts){
  const [x, y, w, h] = box;
  panel(g, x, y, w, h, opts.on ? SC.sel : SC.panel);
  if (opts.art) opts.art(g, x + w/2, y + h/2 - 2);
  /* The tag sits over the art, so it gets a strip to sit on. A coat thumbnail
     leaves the bottom of its cell empty and never noticed; a habitat is the
     whole view scaled down, and the price was written across the sky. */
  if (opts.tag){
    g.fillStyle = SC.ink;
    g.fillRect(x + 1, y + h - 10, w - 2, 9);
    text(g, opts.tag, x + w/2, y + h - 9, opts.tagCol || SC.dim, 'centre');
  }
  if (opts.on){
    g.fillStyle = SC.moss;
    g.fillRect(x, y, w, 1); g.fillRect(x, y+h-1, w, 1);
    g.fillRect(x, y, 1, h); g.fillRect(x+w-1, y, 1, h);
  }
}

/* the caption block under a grid: name on the left, price on the right, then
   the note wrapped underneath */
function caption(g, y, name, right, rightCol, note){
  g.fillStyle = SC.line;
  g.fillRect(PAD, y, W - PAD*2, 1);
  y += 4;
  text(g, name, PAD, y, SC.bone);
  if (right) text(g, right, W - PAD, y, rightCol || SC.gold, 'right');
  if (note) textBlock(g, note, PAD, y + 10, W - PAD*2, SC.dim, 8);
  return y;
}

/* a full-width action strip at the foot of a screen */
function actionBar(g, label, col, dim){
  const y = H - 14, box = [PAD, y, W - PAD*2, 11];
  panel(g, box[0], box[1], box[2], box[3], dim ? SC.line : SC.panel);
  text(g, label, W/2, y + 2, dim ? SC.dim : (col || SC.moss), 'centre');
  return box;
}

/* ------------------------------ the screens ------------------------------- */
const SCREENS = {};

/* -------------------------------- feed ------------------------------------ */
SCREENS.feed = {
  layout(){
    const g = gridLayout(FOODS, BAR_H + 6);
    return { grid: g };
  },
  draw(g, L){
    const frame = screenFrame(g, 'FEED');
    const sp = SPECIES[S.sp];
    FOODS.forEach((f, i) => {
      const loved = sp.likes.includes(f.id), hated = sp.dislikes.includes(f.id);
      gridCell(g, L.grid.box(i), {
        on: i === screenState.pick,
        art: (gg, cx, cy) => drawItem(gg, f.id, Math.round(cx) - 4, Math.round(cy) - 4, 2),
        tag: loved ? 'love' : hated ? 'no' : '',
        tagCol: loved ? SC.moss : SC.rust
      });
    });
    const f = FOODS[screenState.pick];
    const afford = G.coins >= f.cost;
    caption(g, L.grid.bottom + 4, f.name, f.cost + 'c', afford ? SC.gold : SC.rust, f.note);
    petOnScreen(g, W/2, H - 18, 34);
    L.act = actionBar(g, afford ? 'FEED IT' : 'NOT ENOUGH COINS', SC.moss, !afford);
    L.close = frame.close;
  },
  tap(mx, my, L){
    if (hit(L.close, mx, my)) return closeScreen();
    for (let i = 0; i < FOODS.length; i++)
      if (hit(L.grid.box(i), mx, my)){ screenState.pick = i; SFX.pop(); return; }
    if (hit(L.act, mx, my)) feed(FOODS[screenState.pick].id);
  }
};

/* ------------------------------- list rows --------------------------------
   Not everything is a picture. A game or a remedy is a name and a price, and
   forcing those into a grid of blank squares would be a grid for its own sake.
   -------------------------------------------------------------------------- */
const ROW_H = 15;

function rowsLayout(items, top, h){
  const rh = h || ROW_H;
  return {
    items, top, rh,
    box(i){ return [PAD, top + i * (rh + 2), W - PAD*2, rh]; },
    bottom: top + items.length * (rh + 2)
  };
}
function listRow(g, box, label, right, opts){
  opts = opts || {};
  const [x, y, w, h] = box;
  panel(g, x, y, w, h, opts.on ? SC.sel : SC.panel);
  text(g, fit(label, w - 60), x + 4, y + 4, opts.dim ? SC.dim : SC.bone);
  if (right) text(g, right, x + w - 4, y + 4, opts.rightCol || SC.gold, 'right');
  if (opts.on){
    g.fillStyle = SC.moss;
    g.fillRect(x, y, w, 1); g.fillRect(x, y+h-1, w, 1);
    g.fillRect(x, y, 1, h); g.fillRect(x+w-1, y, 1, h);
  }
}

/* -------------------------------- play ------------------------------------ */
SCREENS.play = {
  layout(){
    const keys = Object.keys(GAMES);
    return { keys, rows: rowsLayout(keys.concat(['trick']), BAR_H + 5) };
  },
  draw(g, L){
    const frame = screenFrame(g, 'PLAY');
    L.keys.forEach((k, i) => listRow(g, L.rows.box(i), GAMES[k].name, GAMES[k].pay + 'c/pt',
                                     { on: i === screenState.pick }));
    const trickReady = bondPips() >= 3;
    listRow(g, L.rows.box(L.keys.length), 'Ask for a trick', trickReady ? 'free' : 'bond 3',
            { on: screenState.pick === L.keys.length, dim: !trickReady,
              rightCol: trickReady ? SC.moss : SC.dim });
    const pick = screenState.pick;
    const record = pick < L.keys.length ? S.records[L.keys[pick]+':'+S.sp+':'+stageIdx()] : null;
    const note = pick < L.keys.length ? 'Best '+(record?.best || 0)+' / Week '+(record?.week === challengeWeek() ? record.weekly : 0)+'\n'+GAMES[L.keys[pick]].blurb
               : trickReady ? 'A quick burst of joy, and it costs nothing.'
                            : 'Unlocks at three bond hearts. Petting is what builds them.';
    caption(g, L.rows.bottom + 3, '', '', null, note);
    L.act = actionBar(g, pick < L.keys.length ? 'WEEKLY CHALLENGE' : 'ASK',
                      SC.moss, pick === L.keys.length && !trickReady);
    L.close = frame.close;
  },
  tap(mx, my, L){
    if (hit(L.close, mx, my)) return closeScreen();
    for (let i = 0; i < L.rows.items.length; i++)
      if (hit(L.rows.box(i), mx, my)){ screenState.pick = i; SFX.pop(); return; }
    if (hit(L.act, mx, my)){
      if (screenState.pick < L.keys.length){ closeScreen(); startGame(L.keys[screenState.pick]); }
      else doTrick();
    }
  }
};

/* -------------------------------- care ------------------------------------
   Care is everything about the animal's condition, and sleep is part of that.
   `tuckIn()` had existed for sessions with nothing anywhere that called it,
   and there was no way to wake an animal at all — so an animal that put
   itself to bed hungry and filthy stayed hungry and filthy, because feeding
   and washing both refuse while it is asleep, and nothing on the case
   answered. Rest is the last row on this list now, next to the remedies,
   with the rule written underneath it.
   -------------------------------------------------------------------------- */

/* The rest row's label, its price column and the sentence explaining it, all
   from the one state, so the row and its caption cannot disagree. */
function restRow(){
  if (S.asleep) return {
    id:'wake', label:'Wake ' + S.name, right:'costs trust', col:SC.rust,
    note:'Sleep is how energy comes back. Waking early costs some of it, some '
       + 'trust, and after dark it risks a chill.'
  };
  const tooAwake = S.needs.energy > 70;
  return {
    id:'bed', label:'Settle ' + S.name + ' down', right: tooAwake ? 'not tired' : 'free',
    col: tooAwake ? SC.rust : SC.moss,
    note: tooAwake
      ? 'Too wide awake to settle. Below seventy energy it goes down willingly.'
      : 'Goes down early and wakes rested. A night in bed clears the late-hours '
      + 'count that brings on a chill.'
  };
}

/* The line at the top of the screen, and the only place it is written. The
   layout has to reserve room for exactly the lines the draw is going to put
   there — with the row list starting at a fixed offset instead, the first
   remedy was drawn straight over the sentence saying what was wrong. */
function careStatus(){
  if (S.ills.length) return S.ills.map(i => ILLS[i.id].symptom);
  if (S.asleep) return [S.name + ' is asleep, and will not eat, wash or play until it wakes.'];
  return ['Nothing to treat. ' + S.name + ' is well.'];
}

SCREENS.care = {
  layout(){
    const lines = careStatus().reduce((n, t) => n + wrapText(t, W - PAD*2).length, 0);
    const top = BAR_H + 4 + lines * 8 + 3;
    const ids = S.vet ? ['vet'] : REMEDIES.map(r => r.id).concat(['rest']);
    /* Twelve rather than the default fifteen: rest makes five rows, and at
       the default the caption under them ran into the action bar. Eleven is
       one too few — a row is a seven-pixel line drawn four pixels down, so
       below twelve the labels lose their last row of pixels to the border. */
    return { rows: rowsLayout(ids, top, 12), ids };
  },
  draw(g, L){
    const frame = screenFrame(g, 'CARE');
    L.close = frame.close;
    let y = BAR_H + 4;
    if (S.vet){
      textBlock(g, S.name + ' is on the ground and will not get up.', PAD, y, W - PAD*2, SC.rust, 8);
      listRow(g, L.rows.box(0), 'Call the vet', '30c', { on: true });
      caption(g, L.rows.bottom + 3, '', '', null,
              'Restores health and clears every illness. It costs some trust.');
      L.act = actionBar(g, G.coins >= 30 ? 'CALL' : 'NOT ENOUGH COINS', SC.moss, G.coins < 30);
      return;
    }
    /* The state line: asleep before well, because a sleeping animal is why
       someone opens this screen with nothing wrong with the animal. */
    const col = S.ills.length ? SC.rust : S.asleep ? SC.dim : SC.moss;
    careStatus().forEach(t => { y = textBlock(g, t, PAD, y, W - PAD*2, col, 8); });

    const rest = restRow();
    REMEDIES.forEach((r, i) => listRow(g, L.rows.box(i), r.name,
      r.cost ? r.cost + 'c' : (hasIll('blues') ? S.petBank + '/8' : 'free'),
      { on: i === screenState.pick, dim: !S.ills.length,
        rightCol: r.cost ? SC.gold : SC.moss }));
    const ri = REMEDIES.length;
    listRow(g, L.rows.box(ri), rest.label, rest.right,
            { on: screenState.pick === ri, rightCol: rest.col });

    const onRest = screenState.pick === ri;
    caption(g, L.rows.bottom + 3, '', '', null,
            onRest ? rest.note
          : S.ills.length ? REMEDIES[screenState.pick].note
          : 'Illness has causes, not luck. Treats upset the stomach, late '
          + 'nights bring a chill, a filthy pen invites mites, and joy at '
          + 'zero turns into the blues.');
    L.act = onRest
      ? actionBar(g, S.asleep ? 'WAKE' : 'SETTLE DOWN', rest.col, !S.asleep && S.needs.energy > 70)
      : actionBar(g, 'TREAT', SC.moss, !S.ills.length);
  },
  tap(mx, my, L){
    if (hit(L.close, mx, my)) return closeScreen();
    if (!L.act) return;
    if (S.vet){ if (hit(L.act, mx, my)) vetVisit(); return; }
    for (let i = 0; i < L.ids.length; i++)
      if (hit(L.rows.box(i), mx, my)){ screenState.pick = i; SFX.pop(); return; }
    if (!hit(L.act, mx, my)) return;
    if (screenState.pick === REMEDIES.length) return S.asleep ? wakeUp() : tuckIn();
    const r = REMEDIES[screenState.pick];
    if (r.id === 'company' && hasIll('blues')){
      closeScreen();
      say('Press and hold on ' + S.name + '. Eight times should do it.');
      return;
    }
    treat(r.id);
  }
};

/* -------------------------------- shop ------------------------------------
   Three shelves — coats, headgear, habitats — one at a time behind a row of
   tabs.

   Two shelves stacked used most of the screen and left the caption running
   into the action bar; a third would not have fitted at all. One shelf at a
   time is also how a shop with a counter works: you look at the coats, or you
   look at the hats. The tabs are the only navigation in this game that is not
   a physical key, and they are here because the alternative is four keys for
   one screen.

   A habitat is shown as the view itself rather than as a swatch or a name,
   for the same reason a coat is shown as the animal wearing it: the thing
   being sold is what you will be looking at.
   -------------------------------------------------------------------------- */
const SHELVES = ['coat', 'hat', 'land'];
const SHELF_NAME = { coat:'COATS', hat:'HEADGEAR', land:'HABITAT' };

function shelfTabs(g, active){
  const w = Math.floor((W - PAD*2 - 4) / SHELVES.length), y = BAR_H + 2, h = 11;
  const boxes = [];
  SHELVES.forEach((k, i) => {
    const box = [PAD + i*(w+2), y, w, h];
    boxes.push(box);
    const on = k === active;
    panel(g, box[0], box[1], box[2], box[3], on ? SC.sel : SC.ink);
    text(g, SHELF_NAME[k], box[0] + box[2]/2, y + 2, on ? SC.bone : SC.dim, 'centre');
    if (on){
      g.fillStyle = SC.moss;
      g.fillRect(box[0], y, box[2], 1); g.fillRect(box[0], y+h-1, box[2], 1);
      g.fillRect(box[0], y, 1, h); g.fillRect(box[0]+box[2]-1, y, 1, h);
    }
  });
  return boxes;
}

/* One row per shelf: what is on it, how wide the row is, and the three
   questions the caption and the action bar both need answered. Keeping them
   in one place is what stops the label saying "owned" over a button that
   says "buy it". */
function shelfItems(which){
  if (which === 'coat'){
    const items = SKINS[S.sp];
    return { items, cols:4, cell:[24,17],
      art: (g, it, cx, cy) => thumb(g, frameOf(S.sp, stageIdx(), 'idle', 0, false, it.id).cv, cx, cy, 24, 17),
      own: it => S.skinsOwned.includes(it.id), worn: it => S.skin === it.id,
      note: it => it.note, take:false, here:'worn' };
  }
  if (which === 'hat'){
    return { items: HAT_SHOP, cols:6, cell:[14,13],
      art: (g, it, cx, cy) => thumb(g, hatArt(it.id), cx, cy, 14, 13),
      own: it => S.owned.includes(it.id), worn: it => S[GEAR_FIELD[it.slot]] === it.id,
      note: () => 'Sits on the head.',
      take:true, here:'worn' };
  }
  return { items: BIOME_IDS.map(id => BIOMES[id]), cols:5, cell:[26,20],
    art: (g, it, cx, cy) => thumb(g, biomeThumb(it.id), cx, cy, 26, 20),
    own: it => G.biomesOwned.includes(it.id), worn: it => G.biome === it.id,
    note: it => it.note, take:false, here:'here' };
}

SCREENS.shop = {
  layout(){
    if (!SHELVES.includes(screenState.shelf)) screenState.shelf = 'coat';
    const sh = shelfItems(screenState.shelf);
    if (typeof screenState.pick !== 'number' || screenState.pick >= sh.items.length) screenState.pick = 0;
    return { sh, grid: gridLayout(sh.items, BAR_H + 16, sh.cols) };
  },
  draw(g, L){
    const frame = screenFrame(g, 'SHOP');
    L.close = frame.close;
    L.tabs = shelfTabs(g, screenState.shelf);
    const sh = L.sh;
    sh.items.forEach((it, i) => {
      const own = sh.own(it), worn = sh.worn(it);
      gridCell(g, L.grid.box(i), {
        on: i === screenState.pick,
        art: (gg, cx, cy) => sh.art(gg, it, cx, cy),
        tag: worn ? sh.here : own ? 'own' : it.cost + 'c',
        tagCol: worn ? SC.moss : own ? SC.dim : SC.gold
      });
    });
    const item = sh.items[screenState.pick];
    const own = sh.own(item), worn = sh.worn(item);
    caption(g, L.grid.bottom + 4, item.name, own ? (worn ? 'in use' : 'owned') : item.cost + 'c',
            own ? SC.moss : (G.coins >= item.cost ? SC.gold : SC.rust), sh.note(item));
    /* An animal is always wearing a coat and always standing somewhere, so a
       coat and a habitat in use have nothing to toggle off; headgear does. */
    L.act = actionBar(g,
      own ? (worn ? (sh.take ? 'TAKE IT OFF' : 'IN USE') : (screenState.shelf === 'land' ? 'MOVE HERE' : 'WEAR IT'))
          : 'BUY IT',
      SC.moss, (!own && G.coins < item.cost) || (worn && !sh.take));
  },
  tap(mx, my, L){
    if (hit(L.close, mx, my)) return closeScreen();
    for (let i = 0; i < L.tabs.length; i++)
      if (hit(L.tabs[i], mx, my)){
        if (screenState.shelf !== SHELVES[i]){ screenState.shelf = SHELVES[i]; screenState.pick = 0; SFX.pop(); }
        return;
      }
    for (let i = 0; i < L.sh.items.length; i++)
      if (hit(L.grid.box(i), mx, my)){ screenState.pick = i; SFX.pop(); return; }
    if (!hit(L.act, mx, my)) return;
    const item = L.sh.items[screenState.pick];
    if (screenState.shelf === 'coat') buySkin(item.id);
    else if (screenState.shelf === 'hat') buyHat(item.id);
    else buyHabitat(item.id);
  }
};

function thumb(g, cv, cx, cy, maxW, maxH){
  const sc = Math.min(maxW / cv.width, maxH / cv.height, 1);
  const w = Math.max(1, Math.round(cv.width * sc)), h = Math.max(1, Math.round(cv.height * sc));
  g.drawImage(cv, Math.round(cx - w/2), Math.round(cy - h/2), w, h);
}

/* -------------------------------- nest ------------------------------------ */
SCREENS.nest = {
  preHatch: true,
  layout(){
    const slots = G.pets.slice();
    if (G.pets.length < MAX_PETS) slots.push(null);          // the empty cup
    return { slots, grid: gridLayout(slots, BAR_H + 11, 6) };
  },
  draw(g, L){
    const frame = screenFrame(g, 'NEST');
    L.close = frame.close;
    text(g, numWord(G.pets.length) + ' in the nest', PAD, BAR_H + 2, SC.dim);
    L.slots.forEach((p, i) => {
      gridCell(g, L.grid.box(i), {
        on: i === screenState.pick,
        art: (gg, cx, cy) => {
          if (!p){ text(gg, '+', cx, cy - 3, SC.dim, 'centre'); return; }
          if (!p.sp || !p.born){
            gg.save(); gg.translate(cx, cy); gg.scale(.62, .62);
            drawEggArt(gg, 0, 0, p.sp || Object.keys(SPECIES)[0], 0);
            gg.restore(); return;
          }
          const prev = S; S = p;
          const f = frameOf(p.sp, stageIdx(), 'idle', 0, false, p.skin || 'wild');
          S = prev;
          thumb(gg, f.cv, cx, cy, 24, 17);
        },
        tag: p ? (i === G.active ? 'here' : '') : 'new',
        tagCol: p ? SC.moss : SC.gold
      });
    });
    const p = L.slots[screenState.pick];
    let name = 'Take a new egg', right = 'new';
    let note = 'Start another animal from scratch. Everything in the nest ages and gets hungry whether or not it is the one on screen. Coins are shared.';
    if (p){
      name = p.name || 'Unnamed';
      if (!p.sp){ note = 'An egg nobody has chosen yet.'; right = 'egg'; }
      else if (!p.born){ note = 'Still in the shell.'; right = 'egg'; }
      else {
        const prev = S; S = p;
        const worst = Math.min(p.needs.hunger, p.needs.energy, p.needs.hygiene, p.needs.joy);
        note = STAGE[stageIdx()].label + ' ' + SPECIES[p.sp].common + '. '
             + (p.vet ? 'Needs a vet.' : p.ills.length ? ILLS[p.ills[0].id].name + '.'
                : worst < 25 ? 'Needs attention.' : p.asleep ? 'Asleep.' : 'Doing fine.');
        S = prev;
        right = screenState.pick === G.active ? 'here' : 'visit';
      }
    }
    caption(g, L.grid.bottom + 4, name, right, SC.moss, note);
    L.act = actionBar(g, p ? (screenState.pick === G.active ? 'ALREADY HERE' : 'VISIT') : 'TAKE AN EGG',
                      SC.moss, !!p && screenState.pick === G.active);
  },
  tap(mx, my, L){
    if (hit(L.close, mx, my)) return closeScreen();
    for (let i = 0; i < L.slots.length; i++)
      if (hit(L.grid.box(i), mx, my)){ screenState.pick = i; SFX.pop(); return; }
    if (hit(L.act, mx, my)){
      const p = L.slots[screenState.pick];
      if (!p){ closeScreen(); newEgg(); }
      else if (screenState.pick !== G.active){ closeScreen(); switchPet(screenState.pick); }
    }
  }
};
