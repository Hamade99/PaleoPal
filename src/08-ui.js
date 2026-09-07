/* ==========================================================================
   CASE CHROME
   What is left outside the screen: the meter strip, the identity line, the
   bond row, the five keys, and the prose panels the screen cannot carry.

   This file used to hold every menu in the game, on the rule that all text
   lived in the DOM. The menus have moved onto the glass — see 07-screens.js —
   because on the device this copies the screen is the whole interface and the
   case never changes while you play. What stays here is the printed panel
   around the screen and the long-form reading.
   ========================================================================== */

const NEED_META = [
  { k:'hunger',  label:'Hunger',  col:'#c98a4a' },
  { k:'energy',  label:'Energy',  col:'#d9c04a' },
  { k:'hygiene', label:'Clean',   col:'#7fb2c9' },
  { k:'joy',     label:'Joy',     col:'#c96f86' }
];
/* The icon art is in PIX in 00-art.js and the outline pass is in pixCanvas,
   so what is left here is the call. It used to be fourteen hand-written
   fillRect functions and a private copy of the dilation loop. The `w`/`h`
   arguments are kept because two callers pass sizes; a stored sprite has its
   own, and anything else is scaled by CSS. */
function pixelIcon(id){ return pixCanvas('icon.' + id, '#141c1e'); }

/* The bond row used to be five rotated CSS squares and the meters were CSS
   pills with rounded ends and a smooth gradient. Neither belonged next to a
   hard-edged pixel scene. The bond is now five pixel hearts baked the same way
   the particle hearts are, and the meters are ten hard cells behind a black
   grid — see .track in the stylesheet. */
const BOND_PIPS = 5, PIP_W = 9, PIP_H = 7;
function bondCanvas(on){
  const c = makeCv(BOND_PIPS*PIP_W, PIP_H), g = readCtx(c);
  for (let i=0;i<BOND_PIPS;i++){
    /* One heart, drawn twice: in its own colours when the pip is earned and
       flat grey when it is not. It used to be a second hand-written copy of
       the same seven-by-six heart that the particles use. */
    pixDraw(g, 'heart', i*PIP_W, 1, 1, i < on ? null : '#232e31');
  }
  c.style.cssText = 'width:' + (BOND_PIPS*PIP_W*2) + 'px;height:' + (PIP_H*2) +
                    'px;image-rendering:pixelated;display:block';
  return c;
}

function buildChrome(){
  $('needs').innerHTML = NEED_META.map(n =>
    `<div class="need" id="need-${n.k}">
       <div class="cap"><span data-nico="${n.k}"></span><b>${n.label}</b></div>
       <div class="track"><div class="fill" id="fill-${n.k}" style="background:${n.col}"></div><i class="seg"></i></div>
     </div>`).join('');
  $('needs').onclick = () => { if (hatched()) openSheet('vitals'); };
  $('picks').innerHTML = eggChoices().map(c => {
    const sp = SPECIES[c.id];
    return `<span style="left:${(c.x / W * 100).toFixed(1)}%"><b>${sp.common}</b>${sp.lure}</span>`;
  }).join('');
  $('actions').innerHTML = [
    ['feed','Feed'],['play','Play'],['wash','Wash'],['care','Care'],['shop','Shop']
  ].map(([k,l]) => `<button class="act" id="act-${k}"><span class="ico" data-ico="${k}"></span>${l}</button>`).join('');
  document.querySelectorAll('[data-ico]').forEach(sl => {
    const c = pixelIcon(sl.getAttribute('data-ico'));
    c.style.imageRendering = 'pixelated';
    sl.appendChild(c);
  });
  document.querySelectorAll('[data-nico]').forEach(sl => {
    const c = pixelIcon(sl.getAttribute('data-nico'));
    c.style.imageRendering = 'pixelated';
    sl.appendChild(c);
  });
  const coin = pixelIcon('coin');
  coin.style.cssText = 'width:14px;height:14px;image-rendering:pixelated';
  $('coinArt').appendChild(coin);
  const nest = pixelIcon('nest');
  nest.style.cssText = 'width:20px;height:20px;image-rendering:pixelated';
  $('btnNest').appendChild(nest);
  const bone = pixelIcon('bone');
  bone.style.cssText = 'width:20px;height:20px;image-rendering:pixelated';
  $('btnDev').appendChild(bone);
  paintSound();
  /* The keys latch: one press opens the screen, the same press again closes
     it, and any other key jumps straight across. Wash is the one action with
     nothing to choose, so its key does the thing. */
  $('act-feed').onclick = () => toggleScreen('feed');
  $('act-play').onclick = () => toggleScreen('play');
  $('act-wash').onclick = () => { closeScreen(); scrub(); };
  $('act-care').onclick = () => toggleScreen('care');
  $('act-shop').onclick = () => toggleScreen('shop');
  $('btnNest').onclick = () => toggleScreen('nest');
  $('btnDossier').onclick = () => openSheet('dossier');
  $('btnSound').onclick = toggleSound;
  $('btnDev').onclick = () => openSheet('dev');
  $('dName').onclick = beginRename;
  $('dName').onkeydown = e => { if (e.key === 'Enter') beginRename(); };
  $('scrim').onclick = closeSheet;
  armBrandHold();
}

/* The screen is 224 device pixels across. Displayed at an arbitrary fraction
   of that, its pixel grid lands unevenly against the grid the case is built
   on, and every one-pixel line in the interface shows it. Whole and half steps
   keep the ratio regular, and the case is sized so that a phone gets 1.5x and
   a desktop 2x. */
const LCD_STEPS = [1, 1.5, 2, 2.5, 3];
function fitScreen(){
  const el = document.querySelector('.screen');
  if (!el) return;
  const cs = getComputedStyle(el);
  const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let best = W;
  for (const k of LCD_STEPS) if (W * k <= avail) best = W * k;
  document.documentElement.style.setProperty('--lcd-w', best + 'px');
}
/* The crown ridge.

   `border-radius: 50% 50% ... / 20% 20% ...` makes the top of the shell one
   ellipse arc running the full width, with rx = width/2 and ry = 20% of the
   height. Both move with the case, so a plate's height above the base line at
   a given x is not something style.css can express — it has no square root and
   no way to read its own box. Hand-fitted offsets are what put the old ridge
   ten pixels to the left of the crown and gave it an arc twice as steep as the
   shell's.

   So the plates declare --x, --w and --h in the stylesheet and this puts them
   on the real curve: base tucked TUCK px inside the shell so each one is
   rooted rather than balanced on the edge, and rotated to the surface normal
   so they fan the way a dorsal ridge does instead of all leaning one way. */
const CROWN_TUCK = 5;
function fitCrown(){
  const shell = document.querySelector('.shell');
  const row = document.querySelector('.scutes');
  if (!shell || !row) return;
  const rx = shell.offsetWidth / 2, ry = shell.offsetHeight * 0.20;
  if (!rx || !ry) return;
  for (const el of row.children){
    const cs = getComputedStyle(el);
    const x = parseFloat(cs.getPropertyValue('--x')) || 0;
    const h = parseFloat(cs.getPropertyValue('--h')) || 0;
    const u = clamp(x / rx, -.999, .999);
    const c = Math.sqrt(1 - u*u);
    const drop = ry * (1 - c);                    // how far the crown has fallen at x
    const slope = ry * u / (rx * c);              // d(drop)/dx, so the surface normal
    el.style.top = Math.round(drop + CROWN_TUCK - h) + 'px';
    el.style.transform = 'rotate(' + (Math.atan(slope) * 180 / Math.PI).toFixed(2) + 'deg)';
  }
}

/* The ridge is measured off the shell, so it has to be refitted whenever the
   shell changes size — a resize, but also the web font landing and the screen
   being sized, both of which move the height after boot. Watching the box
   catches all three; the plates are absolutely positioned inside a zero-height
   container, so refitting them cannot itself resize the shell. */
if (window.ResizeObserver){
  const shell = document.querySelector('.shell');
  if (shell) new ResizeObserver(fitCrown).observe(shell);
}

let fitTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => { fitScreen(); fitCrown(); }, 120);
});

/* The sound switch lives on the case, not three taps deep in the dossier. It
   swaps its own glyph so the state is readable without opening anything. */
let soundIcon = null, soundShown = null;
function toggleSound(){
  G.sound = !G.sound;
  if (G.sound) SFX.pop();
  paintSound(); save();
  if (openPanel === 'dossier' || openPanel === 'dev') renderSheet(openPanel);
}
/* paintChrome runs about once a second, so the glyph is only rebuilt on a flip */
function paintSound(){
  const btn = $('btnSound'), on = !G || !!G.sound;
  if (on === soundShown) return;
  soundShown = on;
  if (soundIcon) soundIcon.remove();
  soundIcon = pixelIcon(on ? 'sound' : 'mute');
  soundIcon.style.cssText = 'width:20px;height:20px;image-rendering:pixelated';
  btn.appendChild(soundIcon);
  btn.classList.toggle('off', !on);
  btn.setAttribute('aria-pressed', String(!on));
  btn.title = on ? 'Sound on' : 'Sound off';
}

/* Long-press the brand plate to show or hide the developer button. The flag
   lives on the save, so the choice survives a reload. */
function armBrandHold(){
  const brand = document.querySelector('.brand');
  if (!brand) return;
  let timer = 0;
  const start = () => { timer = setTimeout(() => {
    G.dev = !G.dev; save(); paintChrome();
    say(G.dev ? 'Developer tools on.' : 'Developer tools off.');
  }, 700); };
  const stop = () => clearTimeout(timer);
  brand.addEventListener('pointerdown', start);
  ['pointerup','pointerleave','pointercancel'].forEach(e => brand.addEventListener(e, stop));
}
function paintChrome(){
  const busy = mode !== 'live';
  document.querySelectorAll('.act').forEach(b => b.classList.remove('down'));
  if (screenOpen()){
    const k = $('act-' + screen);
    if (k) k.classList.add('down');           // the key that opened it stays in
  }
  /* The status badges float over the glass. A screen is the glass, so they
     have to get out of the way or they sit on top of its title bar. */
  $('badges').style.display = screenOpen() ? 'none' : '';
  ['feed','play','wash','care','shop'].forEach(k => { $('act-'+k).disabled = busy; });
  const careBtn = $('act-care');
  const old = careBtn.querySelector('.nub'); if (old) old.remove();
  if (hatched() && (S.ills.length || S.vet)){
    const n = document.createElement('i'); n.className = 'nub'; careBtn.appendChild(n);
  }
  $('nestCount').textContent = G.pets.length > 1 ? G.pets.length : '';
  $('btnDev').hidden = !G.dev;
  paintSound();
}

/* ------------------------------- refresh ---------------------------------- */
function refreshLight(){
  if (!G) return;
  $('coins').textContent = Math.floor(G.coins);
  if (!hatched()) return;
  for (const n of NEED_META){
    const v = S.needs[n.k];
    $('fill-'+n.k).style.width = v + '%';
    $('fill-'+n.k).style.background = v < 22 ? '#c2603c' : v < 45 ? '#d9a441' : n.col;
    $('need-'+n.k).classList.toggle('low', v < 22);
  }
}
function refresh(){
  refreshLight();
  $('picks').hidden = !(mode === 'choose');
  $('needs').style.display = hatched() ? '' : 'none';
  const lamp = $('lamp');
  if (!hatched()){
    $('dName').textContent = S && S.sp ? 'Nearly out' : 'A warm egg';
    $('dSub').textContent = S && S.sp ? 'Keep tapping the shell' : 'Pick one to begin';
    $('mood').textContent = S && S.sp ? 'Something is moving in there.'
      : numWord(eggChoices().length) + ' eggs are waiting in the nest.';
    $('bond').innerHTML = ''; delete $('bond').dataset.pips; $('badges').innerHTML = '';
    lamp.className = 'lamp rest';
    paintChrome();
    return;
  }
  const sp = SPECIES[S.sp], st = STAGE[stageIdx()];
  $('dName').textContent = S.name;
  const d = ageDays();
  const age = d < 1 ? Math.max(1, Math.round(d*24)) + 'h old' : Math.floor(d) + (Math.floor(d) === 1 ? ' day old' : ' days old');
  $('dSub').textContent = st.label + ' ' + sp.common + ' · ' + age;
  $('mood').innerHTML = escapeHTML(S.name) + ' <em>' + escapeHTML(moodOf().line) + '</em>';
  const bondEl = $('bond');
  const pips = bondPips();
  if (bondEl.dataset.pips !== String(pips)){
    bondEl.dataset.pips = String(pips);
    bondEl.innerHTML = '<span>Bond</span>';
    bondEl.appendChild(bondCanvas(pips));
  }
  const tags = [];
  if (S.vet) tags.push(['warn','At their limit']);
  S.ills.forEach(i => tags.push(['warn', ILLS[i.id].name]));
  if (S.asleep && !S.vet) tags.push(['', 'Asleep']);
  if (S.mess.length) tags.push(['warn', S.mess.length + ' to clean']);
  if (G.streak > 1) tags.push(['', G.streak + '-day streak']);
  $('badges').innerHTML = tags.slice(0,3).map(([c,t]) => `<span class="tag ${c}"><i class="dot"></i>${t}</span>`).join('');
  lamp.className = 'lamp' + (S.vet || S.ills.length ? ' bad' : S.asleep ? ' rest' : '');
  paintChrome();
  if (openPanel) renderSheet(openPanel);
}

/* -------------------------------- sheets ---------------------------------- */
let openPanel = null;
/* What is left in the DOM. Feed, Play, Care, Shop and the Nest are screens on
   the glass now; these are the panels that are all prose, plus the developer
   harness, and at six pixels a character prose is the one thing the screen
   cannot carry. */
const SHEETS_PRE_HATCH = ['dossier', 'trouble', 'dev'];
/* The developer panel docks rather than covering the screen: on a wide window
   it slides in at the right, on a narrow one it takes the bottom half. It
   raises no scrim either way, so the game stays visible and clickable while a
   sprite is being stepped through its stages — which is the entire point of
   having it. */
const DOCKED = ['dev'];
function openSheet(which){
  if (mode === 'game' && which !== 'dev') return;
  if (mode !== 'live' && !SHEETS_PRE_HATCH.includes(which)) return;
  const dock = DOCKED.includes(which);
  openPanel = which;
  renderSheet(which);
  $('sheet').classList.toggle('dock', dock);
  $('sheet').classList.add('on');
  $('scrim').classList.toggle('on', !dock);
}
function closeSheet(){
  openPanel = null;
  $('sheet').classList.remove('on'); $('scrim').classList.remove('on');
  closeScreen();
}

function escapeHTML(value){
  return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function rowHTML(art, title, sub, right, attrs){
  const slot = art ? `<span class="art" data-art="${art}"></span>` : '';
  return `<button class="row" ${attrs||''}>${slot}
    <span class="t"><b>${escapeHTML(title)}</b><small>${escapeHTML(sub)}</small></span><span class="px">${escapeHTML(right)}</span></button>`;
}
function mountArt(root){
  root.querySelectorAll('[data-art]').forEach(slot => {
    const id = slot.getAttribute('data-art');
    if (!id) return;
    if (PIX['hat.' + id]){
      const c = makeCv(30,28), g = readCtx(c);
      g.imageSmoothingEnabled = false;
      g.drawImage(hatArt(id), 3, 2, 24, 22);
      slot.appendChild(c);
    } else {
      const c = makeCv(30,30), g = readCtx(c);
      g.imageSmoothingEnabled = false; drawItem(g, id, 5, 9, 3);
      slot.appendChild(c);
    }
  });
}
function portrait(pet, size){
  const c = makeCv(size, size), g = readCtx(c);
  g.imageSmoothingEnabled = false;
  if (!pet.sp){ g.fillStyle = '#3a4a44'; g.fillRect(size/2-5, size/2-7, 10, 14); return c; }
  const st = pet.born ? stageIdx(pet) : 0;
  const f = frameOf(pet.sp, st, 'idle', 0, false, pet.skin || 'wild');
  const sc = Math.min(size / f.w, size / f.h) * .92;
  g.drawImage(f.cv, (size - f.w*sc)/2, size - f.h*sc - 1, f.w*sc, f.h*sc);
  return c;
}

/* One entry per sheet, each handed the body element and the active species.
   This was a single if/else chain that every new panel had to be threaded
   into; a sheet is now self-contained, the way GAMES already works in
   06-render.js. Each one builds its own HTML, mounts it, then binds. */
const SHEETS = {

  vitals(b, sp){
    let html = '';
    const petName = escapeHTML(S.name);
    const n = S.needs, hr = new Date().getHours();
    const untilBed = ((BED_HOUR - hr) + 24) % 24;
    const hoursLeft = (n.energy / (ENERGY_AWAKE * trait('tempo').energy)).toFixed(1);
    const hoursFull = ((100 - n.energy) / ENERGY_ASLEEP).toFixed(1);
    html = `<h2>Vitals</h2><p class="lede">What each meter does, and how fast it moves for this animal.</p>
      <div class="stats">
        <div class="stat"><b>Hunger</b><span>${Math.round(n.hunger)}%</span></div>
        <div class="stat"><b>Energy</b><span>${Math.round(n.energy)}%</span></div>
        <div class="stat"><b>Clean</b><span>${Math.round(n.hygiene)}%</span></div>
        <div class="stat"><b>Joy</b><span>${Math.round(n.joy)}%</span></div>
      </div>
      <div class="log"><time>Energy</time>Falls about ${(ENERGY_AWAKE * trait('tempo').energy).toFixed(1)} points an hour awake, and comes back at ${ENERGY_ASLEEP} an hour asleep. At this level ${petName} has roughly ${hoursLeft} waking hours left, and a full night takes about ${hoursFull} hours.</div>
      <div class="log"><time>Sleep</time>${petName} settles itself between ${BED_HOUR}:00 and ${WAKE_HOUR}:00, or any time energy drops under 6. It wakes on its own once rested. Bedtime is in about ${untilBed} hours. Keeping it up more than two hours past bedtime brings on a chill.</div>
      <div class="log"><time>Hunger</time>Falls about ${(7.5*trait('appetite').hunger).toFixed(1)} an hour. Under 22 it starts nosing at the dirt; at zero, health follows it down.</div>
      <div class="log"><time>Clean</time>Falls 4 an hour, and drops 11 more with every mess. Under 20 invites mites.</div>
      <div class="log"><time>Joy</time>Falls about ${(6*trait('tempo').joy*trait('social').lonely).toFixed(1)} an hour. Games, tricks and petting bring it back. Under 15 for long enough turns into the blues.</div>
      <div class="hr"></div>`;
    html += rowHTML('', 'Tuck it in', S.asleep ? S.name + ' is already asleep.' :
      n.energy > 70 ? 'Available once energy drops below 70.' : 'Settle it early and skip the late night. Builds a little trust.',
      S.asleep || n.energy > 70 ? '—' : 'free', S.asleep || n.energy > 70 ? 'disabled' : '');
    b.innerHTML = html; mountArt(b);
    const r = b.querySelector('.row'); if (r) r.onclick = tuckIn;
  },

  dossier(b, sp){
    let html = '';
    if (!hatched()){
      b.innerHTML = `<h2>Field dossier</h2><p class="lede">Choose an egg first. Each species is drawn from its own skeleton, so the sprite shows what the notes claim.</p>`;
    } else {
      const t = ['appetite','tempo','social'].map(k => `<span class="trait">${trait(k).name}</span>`).join('');
      html = `<h2>${escapeHTML(S.name)}</h2><p class="lede">${sp.name} · ${sp.era}</p>
        <div class="stats">
          <div class="stat"><b>Stage</b><span>${STAGE[stageIdx()].label}</span></div>
          <div class="stat"><b>Well-kept time</b><span>${Math.floor(S.growth)} min</span></div>
        </div>
        <p class="note" style="margin-bottom:8px">Temperament</p>${t}
        <p class="note">${['appetite','tempo','social'].map(k => trait(k).note).join(' ')}</p>
        <div class="hr"></div>
        <p class="note" style="margin-bottom:6px">Field notes</p>
        ${sp.facts.map(f => `<div class="log">${f}</div>`).join('')}
        <p class="note" style="margin:10px 0 6px">Drawn on the sprite</p>
        ${sp.checks.map(c => `<div class="log">${c}</div>`).join('')}
        <div class="hr"></div>
        <p class="note">Field journal · ${S.journal.length}/${journalEntries().length}</p>
        ${journalEntries().map(entry => `<div class="log">${S.journal.includes(entry.id) ? 'Recorded' : 'Not yet observed'} · ${entry.title}</div>`).join('')}
        <p class="note">Four studies: Fern sprig. Ten studies: Field cap.</p>
        <p class="note" style="margin-bottom:6px">Diary</p>
        ${S.log.length ? S.log.slice(0,10).map(l => `<div class="log"><time>${new Date(l.t).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</time>${escapeHTML(l.txt)}</div>`).join('') : '<p class="note">Nothing has happened yet.</p>'}
        <div class="hr"></div>
        ${rowHTML('', G.sound ? 'Sound on' : 'Sound off', 'Beeps, chomps and roars.', G.sound ? 'on' : 'off')}
        ${rowHTML('', 'Release ' + S.name, G.pets.length > 1 ? 'Removes this animal from the nest for good.' : 'You cannot release your only animal.', 'release', G.pets.length > 1 ? '' : 'disabled')}
        ${rowHTML('', 'Wipe everything', 'Deletes the whole nest and starts over.', 'reset')}`;
      b.innerHTML = html; mountArt(b);
      const rows = b.querySelectorAll('.row');
      rows[0].onclick = toggleSound;
      let armedR = false, armedW = false;
      rows[1].onclick = () => {
        if (G.pets.length <= 1) return;
        if (!armedR){ armedR = true; rows[1].querySelector('.px').textContent = 'sure?'; setTimeout(()=>{armedR=false; if(openPanel==='dossier') renderSheet('dossier');}, 3000); return; }
        releasePet(G.active);
      };
      rows[2].onclick = () => {
        if (!armedW){ armedW = true; rows[2].querySelector('.px').textContent = 'sure?'; setTimeout(()=>{armedW=false; if(openPanel==='dossier') renderSheet('dossier');}, 3000); return; }
        // a deliberate wipe clears the safety net too, which is what the row promises
        saveBlocked = true;
        saveQueue.then(() => Promise.all([Store.del(SAVE_KEY), Store.del(BACKUP_KEY)]))
          .then(() => location.reload()).catch(() => { saveBlocked = false; storageNotice('Reset failed. Your nest was not reset.'); });
      };
    }
    const backup = document.createElement('div');
    backup.innerHTML = rowHTML('', 'Export nest', 'Download a backup of this nest.', 'export') +
      rowHTML('', 'Import nest', 'Replace this nest with a validated backup.', 'import') +
      rowHTML('', 'Export recovery copy', 'The nest preserved before an import or unreadable-save recovery.', 'export');
    const buttons = backup.querySelectorAll('button');
    buttons[0].onclick = exportNest;
    buttons[1].onclick = importNest;
    buttons[2].onclick = async () => {
      try {
        const raw = await Store.get(saveBlocked ? SAVE_KEY : BACKUP_KEY);
        if (!raw) return storageNotice('No recovery copy is stored on this device.');
        exportText(raw, 'paleopal-recovery.json');
      } catch(error){ storageNotice('The recovery copy could not be read. The stored data has not been changed.'); }
    };
    b.appendChild(backup);
  },

  /* Developer tools. Chips rather than rows: every control here is a single
     switch and the whole harness has to fit on one screen so a sprite can be
     stepped through four stages without scrolling. */
  dev(b, sp){
    const chips = (rows) => `<div class="chips">` + rows.map(([label, act, cls]) =>
      `<button class="chip ${cls||''}" data-dev="${act}">${label}</button>`).join('') + `</div>`;
    const st = hatched() ? stageIdx() : -1;
    let html = `<h2>Developer tools</h2>
      <p class="lede">A test harness. Everything here writes the same fields the
      simulation writes, so nothing below can reach a state the game could not.
      Long-press the PALEOPAL plate to hide this button.</p>`;

    html += `<p class="note" style="margin-bottom:7px">Coins · ${Math.floor(G.coins)}</p>`;
    html += chips([['Fill purse','fillPurse'],['+100','add100'],['+1000','add1000'],['Empty','emptyPurse','warn']]);

    if (hatched()){
      html += `<p class="note" style="margin-bottom:7px">Growth stage</p>`;
      html += `<div class="chips">` + STAGE.map((s2,i) =>
        `<button class="chip${i === st ? ' on' : ''}" data-dev="stage${i}">${s2.label}</button>`).join('') + `</div>`;

      html += `<p class="note" style="margin-bottom:7px">Needs · health ${Math.round(S.health)} · bond ${Math.round(S.bond)}</p>`;
      html += chips([['Fill every meter','fillNeeds'],['Drain to 8','drainNeeds','warn'],
                     ['Max bond','maxBond'],['Zero bond','zeroBond','warn'],
                     [S.asleep ? 'Wake up' : 'Sleep','toggleSleep'],['Collapse','collapse','warn']]);

      html += `<p class="note" style="margin-bottom:7px">Illness</p>`;
      html += `<div class="chips">` + Object.keys(ILLS).map(id =>
        `<button class="chip${hasIll(id) ? ' on' : ''}" data-dev="ill:${id}">${ILLS[id].name}</button>`).join('') +
        `<button class="chip" data-dev="cureAll">Cure all</button></div>`;

      html += `<p class="note" style="margin-bottom:7px">Pen · ${S.mess.length} mess</p>`;
      html += chips([['Drop a mess','addMess'],['Clear','clearMess'],['Unlock every coat and hat','unlockAll']]);
    }

    html += `<p class="note" style="margin-bottom:7px">Skeleton${hatched() ? ' · ' + SPECIES[S.sp].common : ''}</p>`;
    html += `<div class="chips">` + Object.keys(SPECIES).map(id =>
      `<button class="chip${hatched() && S.sp === id ? ' on' : ''}" data-dev="sp:${id}">${SPECIES[id].common}</button>`).join('') +
      (S && S.sp && !S.born ? `<button class="chip" data-dev="hatchNow">Hatch now</button>` : '') + `</div>`;

    html += `<p class="note" style="margin-bottom:7px">Keeper · day ${G.streak}</p>`;
    html += chips([[G.sound ? 'Sound on' : 'Sound off','sound'],['Bump streak','bumpStreak']]);
    html += `<p class="tiny">Growth stages are set by parking well-kept minutes on a gate
      (${GROWTH_GATES.join(', ')}), which is exactly how the simulation moves them.</p>`;

    html += `<div class="chips" style="margin-top:12px"><button class="chip" data-dev="close">Close panel</button></div>`;
    b.innerHTML = html;
    b.querySelectorAll('[data-dev]').forEach(c => c.onclick = () => devAction(c.getAttribute('data-dev')));
  },

  away(b, sp){
    b.innerHTML = `<h2>While you were gone</h2><p class="lede">${escapeHTML(G.awayText)}</p>
      ${rowHTML('', 'Back to the habitat', 'Pick up where you left off.', '')}`;
    b.querySelector('.row').onclick = closeSheet;
  },

  trouble(b, sp){
    b.innerHTML = `<h2>Could not open your nest</h2><p class="lede">${escapeHTML(G.loadWarning)}</p>
      <p class="note">${saveBlocked ? 'The original remains at the main save key. Automatic saving is disabled.' : 'A copy of the original is stored at '+BACKUP_KEY+'.'}</p>
      ${rowHTML('', 'Start fresh', 'Choose a new egg and begin again.', '')}`;
    b.querySelector('.row').onclick = closeSheet;
  }
};

/* One switch per chip. Kept out of the sheet body so the panel stays a view. */
function devAction(a){
  if (a.startsWith('stage')) return DEV.setStage(+a.slice(5));
  if (a.startsWith('ill:'))  return DEV.toggleIll(a.slice(4));
  if (a.startsWith('sp:'))   return DEV.becomeSpecies(a.slice(3));
  switch (a){
    case 'add100':  return DEV.addCoins(100);
    case 'add1000': return DEV.addCoins(1000);
    case 'maxBond': return DEV.setBond(100);
    case 'zeroBond':return DEV.setBond(0);
    case 'sound':   return toggleSound();
    case 'close':   return closeSheet();
    default:        if (DEV[a]) DEV[a]();
  }
}

function renderSheet(which){
  const sheet = SHEETS[which];
  if (!sheet) return;
  sheet($('sheetBody'), hatched() ? SPECIES[S.sp] : null);
}

/* -------------------------------- naming ---------------------------------- */
function beginRename(){
  if (!hatched()) return;
  const inp = $('nameEdit');
  inp.hidden = false; $('dName').style.display = 'none';
  inp.value = S.name; inp.focus(); inp.select();
}
$('nameEdit').addEventListener('blur', () => {
  const inp = $('nameEdit');
  S.name = (inp.value.trim() || S.name || 'Pip').slice(0,14);
  inp.hidden = true; $('dName').style.display = '';
  document.title = S.name + ' — Paleopal';
  save(); refresh();
});
$('nameEdit').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); });

/* -------------------------------- input ----------------------------------- */
function canvasPos(e){
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}
let holding = false, holdPos = null;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const [mx, my] = canvasPos(e);
  holdPos = [mx, my];
  if (AC && AC.state === 'suspended') AC.resume();

  if (mode === 'choose'){
    for (const c of eggChoices()){
      if (Math.abs(mx - c.x) < c.hit && my > GROUND - 40 && my < GROUND + 6){ chooseEgg(c.id); return; }
    }
    return;
  }
  if (mode === 'egg'){
    egg.cracks++; egg.wob = 1; SFX.crack();
    if (egg.cracks >= 6) hatch();
    return;
  }
  if (mode === 'game'){
    gameInput({type:'point',x:mx,y:my});
    return;
  }
  /* A screen owns every tap while it is up: it is the whole display, so
     there is nothing else on the glass to hit. */
  if (screenOpen()){
    const sc = SCREENS[screen];
    if (sc.tap && screenLayout) sc.tap(mx, my, screenLayout);
    return;
  }
  if (mode === 'live'){
    const slot = HABITAT_ART[biomeId()].slot;
    if (Math.abs(mx-slot[0]) < 14 && my > slot[1]-20 && my < slot[1]+8 && !S.asleep && !S.vet){
      if (S.habitatAt && Date.now()-S.habitatAt < 30*MIN){ say('A quiet spot. More to discover later.'); return; }
      habitatTarget = {pet:S,biome:biomeId()};
      return;
    }
    if (mx >= dinoBox[0] - 4 && mx <= dinoBox[2] + 4 && my >= dinoBox[1] - 4){ holding = true; pet([mx, my]); return; }
    if (bondPips() >= 2 && !S.asleep && !S.vet){
      dino.tx = clamp(mx, 22, W-22);
      dino.until = performance.now() + 4000;
    }
  }
});
cv.addEventListener('pointermove', e => {
  const p = canvasPos(e); holdPos = p;
  if (mode === 'game' && game && e.buttons){
    gameInput({type:'point',x:p[0],y:p[1],move:true});
  }
});
window.addEventListener('pointerup', () => { holding = false; });
window.addEventListener('pointercancel', () => { holding = false; });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    if (screenOpen()) closeScreen();
    else if (openPanel) closeSheet();
    else if (mode === 'game') endGame();
    return;
  }
  if (mode === 'game' && game){
    if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) e.preventDefault();
    gameInput({type:'key',key:e.key,down:true});
  }
});
window.addEventListener('keyup', e => {
  gameInput({type:'key',key:e.key,down:false});
});

/* ------------------------------ lifecycle --------------------------------- */
function chooseEgg(id){
  S.sp = id; S.name = pick(NAMES.filter(n => !G.pets.some(p => p.name === n))) || pick(NAMES);
  S.traits = { appetite:(Math.random()*2)|0, tempo:(Math.random()*2)|0, social:(Math.random()*2)|0 };
  mode = 'egg'; egg.cracks = 0;
  SFX.pop(); say('Tap the egg until it opens.');
  refresh(); save();
}
function hatch(){
  S.born = Date.now();
  mode = 'live';
  dino.digAt = performance.now() + 40e3;
  SFX.hatch(); emit('heart', W/2, GROUND-24, 8);
  logEvent(S.name + ' hatched.');
  observePet();
  document.title = S.name + ' — Paleopal';
  say('Hello. Tap the name above to rename it.', 4200);
  refresh(); paintChrome(); save();
}

let saveAt = 0, saveBlocked = false, saveQueue = Promise.resolve();
function storageNotice(message){
  $('storageStatus').textContent = message;
  $('storageStatus').hidden = !message;
}
function save(){
  if (!G || saveBlocked) return saveQueue;
  G.lastSeen = Date.now();
  const snapshot = JSON.stringify(G);
  saveQueue = saveQueue.then(() => Store.set(SAVE_KEY, snapshot)).then(() => storageNotice(''))
    .catch(() => storageNotice('Saving failed. Export your nest from the dossier before closing.'));
  return saveQueue;
}
function exportNest(){
  exportText(JSON.stringify(G, null, 2), 'paleopal-nest.json');
}
function exportText(raw, filename){
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([raw], {type:'application/json'}));
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importNest(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const wasBlocked = saveBlocked;
    if (file.size > 1024*1024) return storageNotice('Backup is too large (maximum 1 MB).');
    try {
      const loaded = loadSave(await file.text());
      if (!loaded.game) return storageNotice('Import rejected: the backup ' + loaded.why + '.');
      if (!confirm('Replace this nest with ' + loaded.game.pets.length + ' animal(s)? The current nest will be backed up.')) return;
      saveBlocked = true;
      await saveQueue;
      await Store.set(BACKUP_KEY, JSON.stringify(G));
      await Store.set(SAVE_KEY, JSON.stringify(loaded.game));
      location.reload();
    } catch(error){ saveBlocked = wasBlocked; storageNotice('Import could not be saved. The current nest remains open.'); }
  };
  input.click();
}

function awayReport(gapMs){
  const mins = Math.round(gapMs / MIN), bits = [];
  if (mins < 90) bits.push('You were away about ' + mins + ' minutes.');
  else if (mins < 60*30) bits.push('You were away about ' + Math.round(mins/60) + ' hours.');
  else bits.push('You were away ' + Math.round(mins/1440) + ' days.');
  const trouble = G.pets.filter(p => p.born && (p.vet || p.ills.length || Math.min(p.needs.hunger, p.needs.joy, p.needs.hygiene) < 25));
  if (!trouble.length) bits.push(G.pets.length > 1 ? 'Everyone held up fine.' : 'It held up fine.');
  else bits.push(trouble.map(p => p.name + ' ' + (p.vet ? 'collapsed and needs a vet' :
      p.ills.length ? 'has ' + ILLS[p.ills[0].id].name.toLowerCase() : 'needs attention')).join(', ') + '.');
  const mess = G.pets.reduce((a,p) => a + p.mess.length, 0);
  if (mess) bits.push('There are ' + mess + ' messes to clean.');
  G.awayText = bits.join(' ');
}
function dailyCheck(){
  const today = new Date().toDateString();
  if (G.lastDay === today) return;
  const yest = new Date(Date.now() - 86400e3).toDateString();
  G.streak = G.lastDay === yest ? G.streak + 1 : 1;
  G.lastDay = today;
  if (hatched()){
    const bonus = 5 + Math.min(20, G.streak * 3);
    G.coins += bonus;
    logEvent('Day ' + G.streak + ' together. +' + bonus + ' coins.');
    setTimeout(() => say('Day ' + G.streak + ' together. +' + bonus + ' coins.'), 1400);
  }
}

/* ------------------------------- main loop -------------------------------- */
let lastFrame = performance.now(), accum = 0;
function frame(now){
  const dt = clamp(now - lastFrame, 0, 120);
  lastFrame = now;

  if (G){
    const real = Date.now();
    if (real - G.lastTick > 500){
      advanceSimulation(real, !document.hidden);
    }
  }

  if (G && hatched()) warmFrames(S.sp, stageIdx(), S.skin);
  stepBehaviour(dt, now);
  stepFeed(dt);
  stepPresentation(dt, now);
  stepWorld(dt, now);
  if (mode === 'game') stepGame(dt, now);
  stepParts(dt);
  if (holding && holdPos && mode === 'live' &&
      holdPos[0] >= dinoBox[0]-4 && holdPos[0] <= dinoBox[2]+4 && holdPos[1] >= dinoBox[1]-4) pet(holdPos);

  if (G) drawScene(now);
  accum += dt;
  if (accum > 1000){ accum = 0; refresh(); }
  if (now - saveAt > 6000){ saveAt = now; save(); }
  requestAnimationFrame(frame);
}

async function boot(){
  buildChrome();
  fitScreen();
  fitCrown();
  G = freshGame();
  let loaded;
  try { loaded = loadSave(await Store.get(SAVE_KEY)); }
  catch(error){
    saveBlocked = true;
    storageNotice('Storage is unavailable. Existing saves are protected. Export this session before closing, then reload to retry.');
    loaded = {game:null};
  }
  if (loaded.game){
    G = loaded.game;
    // an upgraded save is written back at once, so a crash before the next
    // autosave cannot leave the old shape sitting on disk
    if (loaded.from !== SAVE_VERSION) {
      try { await Store.set(SAVE_KEY, JSON.stringify(G)); }
      catch(error){ storageNotice('Upgraded nest could not be saved. Export a backup.'); }
    }
  } else if (loaded.keep){
    // A save we cannot read is still the player's. Park it under the backup
    // key and tell them, rather than starting over in silence.
    try { await Store.set(BACKUP_KEY, loaded.keep); }
    catch(error){ saveBlocked = true; storageNotice('The unreadable save could not be backed up. Automatic saving is disabled.'); }
    G.loadWarning = 'Your saved nest ' + loaded.why + ', so this is a fresh start. ' +
                    'The old save has not been deleted.';
    console.warn('paleopal: save ' + loaded.why + '; kept a copy at ' + BACKUP_KEY);
  }
  S = G.pets[G.active];
  const gap = clamp(Date.now() - G.lastTick, 0, 14*86400e3);
  advanceSimulation(Date.now(), false);
  if (hatched()){
    mode = 'live';
    if (gap > 60e3){
      awayReport(gap);
      setTimeout(() => openSheet('away'), 500);
    }
    document.title = S.name + ' — Paleopal';
  } else mode = S.sp ? 'egg' : 'choose';
  G.lastTick = Date.now();
  dailyCheck();
  if (G.loadWarning) setTimeout(() => openSheet('trouble'), 500);
  refresh(); paintChrome();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  holding = false;
  if (document.hidden) save();
  else { advanceSimulation(Date.now(), false); lastFrame = performance.now(); }
});
window.addEventListener('pagehide', save);
boot();
