/* ==========================================================================
   INTERFACE
   All text lives in the DOM so it stays crisp on a phone. The canvas only ever
   draws the world.
   ========================================================================== */

const NEED_META = [
  { k:'hunger',  label:'Hunger',  col:'#c98a4a' },
  { k:'energy',  label:'Energy',  col:'#d9c04a' },
  { k:'hygiene', label:'Clean',   col:'#7fb2c9' },
  { k:'joy',     label:'Joy',     col:'#c96f86' }
];
const ICON_ART = {
  feed: g => {
    g.fillStyle='#82382a'; g.fillRect(2,2,7,8);
    g.fillStyle='#a04a34'; g.fillRect(2,2,6,7);
    g.fillStyle='#c46a4c'; g.fillRect(3,3,3,2);
    g.fillStyle='#d8d0b4'; g.fillRect(8,5,3,2); g.fillRect(10,3,2,2); g.fillRect(10,7,2,2);
  },
  play: g => {
    for (let y=0;y<12;y++) for (let x=0;x<12;x++){
      const dx=x-5.5, dy=y-5.5, d=Math.hypot(dx,dy);
      if (d > 5.4) continue;
      g.fillStyle = d > 4.3 ? '#2f6f6a' : (dx+dy < -3.2 ? '#a7dbd3' : '#5fb0a5');
      g.fillRect(x,y,1,1);
    }
    g.fillStyle='#2f6f6a'; g.fillRect(1,5,10,1); g.fillRect(5,1,1,10);
  },
  wash: g => {
    g.fillStyle='#4b7f99'; g.fillRect(4,1,3,2); g.fillRect(3,3,5,2); g.fillRect(2,5,7,4); g.fillRect(3,9,5,2);
    g.fillStyle='#7fb2c9'; g.fillRect(4,2,2,2); g.fillRect(3,4,4,4); g.fillRect(4,8,3,2);
    g.fillStyle='#d6ecf4'; g.fillRect(4,4,2,2);
    g.fillStyle='#e8f4fa'; g.fillRect(10,2,1,1); g.fillRect(11,5,1,1); g.fillRect(9,7,1,1);
  },
  care: g => {
    g.fillStyle='#8f3f26'; g.fillRect(1,3,4,1); g.fillRect(7,3,4,1); g.fillRect(0,4,12,4);
    g.fillRect(1,8,10,1); g.fillRect(2,9,8,1); g.fillRect(3,10,6,1); g.fillRect(4,11,4,1);
    g.fillStyle='#c2603c'; g.fillRect(1,4,10,3); g.fillRect(2,7,8,1); g.fillRect(3,8,6,1);
    g.fillStyle='#f2ded0'; g.fillRect(5,4,2,5); g.fillRect(3,6,6,2);
  },
  shop: g => {
    g.fillStyle='#5c4726'; g.fillRect(1,4,10,8);
    g.fillStyle='#8a6a36'; g.fillRect(1,4,9,7);
    g.fillStyle='#b08a4a'; g.fillRect(1,4,9,2);
    g.fillStyle='#5c4726'; g.fillRect(3,1,1,3); g.fillRect(8,1,1,3); g.fillRect(4,0,4,1);
    g.fillStyle='#d9a83f'; g.fillRect(5,7,2,2);
  },
  coin: g => {
    g.fillStyle='#8a6a1e'; g.fillRect(2,1,8,10); g.fillRect(1,2,10,8);
    g.fillStyle='#d9a83f'; g.fillRect(2,2,7,8); g.fillRect(3,1,5,10);
    g.fillStyle='#f0d888'; g.fillRect(3,2,2,2);
    g.fillStyle='#8a6a1e'; g.fillRect(5,3,2,6); g.fillRect(4,4,4,1); g.fillRect(4,7,4,1);
  },
  /* the meter strip: one glyph per need, the way the classic devices did it */
  hunger: g => {
    g.fillStyle='#d8d0b4'; g.fillRect(8,1,2,4); g.fillRect(7,1,1,2); g.fillRect(10,1,1,2);
    g.fillStyle='#82382a'; g.fillRect(1,4,9,7); g.fillRect(2,3,7,1);
    g.fillStyle='#a04a34'; g.fillRect(1,4,8,5);
    g.fillStyle='#c46a4c'; g.fillRect(2,5,3,3);
  },
  energy: g => {
    const bolt=[[6,0,3],[5,1,3],[4,2,3],[3,3,4],[2,4,7],[5,5,3],[4,6,3],[3,7,3],[2,8,3],[2,9,2]];
    g.fillStyle='#8a6a1e'; for (const [x,y,w] of bolt) g.fillRect(x,y+1,w,1);
    g.fillStyle='#d9c04a'; for (const [x,y,w] of bolt) g.fillRect(x,y,w,1);
    g.fillStyle='#f4e79a'; g.fillRect(5,1,2,1); g.fillRect(4,2,2,1);
  },
  hygiene: g => {
    const drop=[[5,0,2],[5,1,2],[4,2,4],[3,3,6],[3,4,6],[2,5,8],[2,6,8],[2,7,8],[3,8,6],[4,9,4]];
    g.fillStyle='#4b7f99'; for (const [x,y,w] of drop) g.fillRect(x,y,w,1);
    g.fillStyle='#7fb2c9'; g.fillRect(3,3,5,5); g.fillRect(4,2,3,1); g.fillRect(4,8,4,1);
    g.fillStyle='#d6ecf4'; g.fillRect(4,4,2,2); g.fillRect(4,3,1,1);
  },
  joy: g => {
    const heart=[[2,1,3],[7,1,3],[1,2,10],[1,3,10],[1,4,10],[2,5,8],[3,6,6],[4,7,4],[5,8,2]];
    g.fillStyle='#8f3050'; for (const [x,y,w] of heart) g.fillRect(x,y,w,1);
    g.fillStyle='#c96f86'; g.fillRect(2,2,8,2); g.fillRect(2,1,2,1); g.fillRect(7,1,2,1);
    g.fillRect(2,4,7,1); g.fillRect(3,5,5,1); g.fillRect(4,6,3,1);
    g.fillStyle='#f0a8b8'; g.fillRect(2,2,2,2);
  },
  /* the case buttons */
  sound: g => {
    g.fillStyle='#3a2408';
    g.fillRect(0,4,2,4); g.fillRect(2,3,1,6); g.fillRect(3,2,1,8); g.fillRect(4,1,1,10);
    g.fillStyle='#1d4a33';
    g.fillRect(7,4,1,4); g.fillRect(9,2,1,8); g.fillRect(8,3,1,1); g.fillRect(8,8,1,1);
    g.fillRect(10,1,1,1); g.fillRect(10,10,1,1);
  },
  mute: g => {
    g.fillStyle='#3a2408';
    g.fillRect(0,4,2,4); g.fillRect(2,3,1,6); g.fillRect(3,2,1,8); g.fillRect(4,1,1,10);
    g.fillStyle='#c2603c';
    for (let i=0;i<5;i++){ g.fillRect(7+i,3+i,1,1); g.fillRect(11-i,3+i,1,1); }
  },
  bone: g => {
    g.fillStyle='#b8ad90';
    g.fillRect(3,5,6,3); g.fillRect(1,3,3,3); g.fillRect(1,7,3,3); g.fillRect(8,3,3,3); g.fillRect(8,7,3,3);
    g.fillStyle='#efe6cf';
    g.fillRect(3,5,6,2); g.fillRect(1,3,3,2); g.fillRect(8,3,3,2); g.fillRect(1,7,2,2); g.fillRect(8,7,2,2);
  },
  nest: g => {
    g.fillStyle='#6b5230'; g.fillRect(0,7,12,4); g.fillRect(1,6,10,1);
    g.fillStyle='#8a6a3c'; g.fillRect(1,7,10,1); g.fillRect(0,9,12,1);
    g.fillStyle='#efe3c4'; g.fillRect(3,3,3,4); g.fillRect(2,4,5,3);
    g.fillStyle='#cfc3a4'; g.fillRect(7,4,3,3); g.fillRect(6,5,5,2);
  }
};
function pixelIcon(id, w, h){
  const c = makeCv(w,h), g = readCtx(c);
  ICON_ART[id](g);
  const d = g.getImageData(0,0,w,h), px = d.data, solid = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++){ if (px[i*4+3] >= 118){ px[i*4+3]=255; solid[i]=1; } else px[i*4+3]=0; }
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i=y*w+x; if (solid[i]) continue;
    if ((x>0&&solid[i-1])||(x<w-1&&solid[i+1])||(y>0&&solid[i-w])||(y<h-1&&solid[i+w])){
      px[i*4]=0x14; px[i*4+1]=0x1c; px[i*4+2]=0x1e; px[i*4+3]=255;
    }
  }
  g.putImageData(d,0,0);
  return c;
}

/* The bond row used to be five rotated CSS squares and the meters were CSS
   pills with rounded ends and a smooth gradient. Neither belonged next to a
   hard-edged pixel scene. The bond is now five pixel hearts baked the same way
   the particle hearts are, and the meters are ten hard cells behind a black
   grid — see .track in the stylesheet. */
const BOND_PIPS = 5, PIP_W = 9, PIP_H = 7;
function bondCanvas(on){
  const c = makeCv(BOND_PIPS*PIP_W, PIP_H), g = readCtx(c);
  for (let i=0;i<BOND_PIPS;i++){
    const x = i*PIP_W, lit = i < on;
    g.fillStyle = lit ? '#8f2f46' : '#232e31';
    g.fillRect(x+1,1,2,1); g.fillRect(x+4,1,2,1);
    g.fillRect(x,2,7,2); g.fillRect(x+1,4,5,1); g.fillRect(x+2,5,3,1); g.fillRect(x+3,6,1,1);
    if (lit){
      g.fillStyle = '#e2697c';
      g.fillRect(x+1,2,5,1); g.fillRect(x+2,3,3,1); g.fillRect(x+3,4,1,1);
      g.fillStyle = '#f6b3c0'; g.fillRect(x+1,2,2,1);
    }
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
    const c = pixelIcon(sl.getAttribute('data-ico'), 12, 12);
    c.style.imageRendering = 'pixelated';
    sl.appendChild(c);
  });
  document.querySelectorAll('[data-nico]').forEach(sl => {
    const c = pixelIcon(sl.getAttribute('data-nico'), 12, 12);
    c.style.imageRendering = 'pixelated';
    sl.appendChild(c);
  });
  const coin = pixelIcon('coin', 12, 12);
  coin.style.cssText = 'width:13px;height:13px;image-rendering:pixelated';
  $('coinArt').appendChild(coin);
  const nest = pixelIcon('nest', 12, 12);
  nest.style.cssText = 'width:20px;height:20px;image-rendering:pixelated';
  $('btnNest').appendChild(nest);
  const bone = pixelIcon('bone', 12, 12);
  bone.style.cssText = 'width:20px;height:20px;image-rendering:pixelated';
  $('btnDev').appendChild(bone);
  paintSound();
  $('act-feed').onclick = () => openSheet('feed');
  $('act-play').onclick = () => openSheet('play');
  $('act-wash').onclick = () => { scrub(); };
  $('act-care').onclick = () => openSheet('care');
  $('act-shop').onclick = () => openSheet('shop');
  $('btnNest').onclick = () => openSheet('nest');
  $('btnDossier').onclick = () => openSheet('dossier');
  $('btnSound').onclick = toggleSound;
  $('btnDev').onclick = () => openSheet('dev');
  $('dName').onclick = beginRename;
  $('dName').onkeydown = e => { if (e.key === 'Enter') beginRename(); };
  $('scrim').onclick = closeSheet;
  armBrandHold();
}

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
  soundIcon = pixelIcon(on ? 'sound' : 'mute', 12, 12);
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
  $('mood').innerHTML = S.name + ' <em>' + moodOf().line + '</em>';
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
/* the only sheets that mean anything before there is a hatched animal */
const SHEETS_PRE_HATCH = ['dossier', 'nest', 'trouble', 'dev'];
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
}

function rowHTML(art, title, sub, right, attrs){
  const slot = art ? `<span class="art" data-art="${art}"></span>` : '';
  return `<button class="row" ${attrs||''}>${slot}
    <span class="t"><b>${title}</b><small>${sub}</small></span><span class="px">${right||''}</span></button>`;
}
function mountArt(root){
  root.querySelectorAll('[data-art]').forEach(slot => {
    const id = slot.getAttribute('data-art');
    if (!id) return;
    if (HATS[id]){
      const c = makeCv(30,28), g = readCtx(c);
      g.imageSmoothingEnabled = false;
      g.drawImage(HATS[id], 3, 2, 24, 22);
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
  const prev = S; S = pet;
  const st = pet.born ? stageIdx() : 0;
  S = prev;
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

  feed(b, sp){
    let html = '';
    html = `<h2>Feed</h2><p class="lede">${sp.common} is a ${sp.diet}. Favourites fill it up and build trust; the wrong food goes down slowly. Treats are for treats.</p>`;
    html += FOODS.map(f => {
      const loved = sp.likes.includes(f.id), hated = sp.dislikes.includes(f.id);
      return rowHTML(f.id, f.name, (loved ? 'Favourite. ' : hated ? 'Dislikes this. ' : '') + f.note, f.cost + 'c');
    }).join('');
    b.innerHTML = html; mountArt(b);
    b.querySelectorAll('.row').forEach((r,i) => r.onclick = () => { feed(FOODS[i].id); });
  },

  play(b, sp){
    let html = '';
    const trickReady = bondPips() >= 3;
    html = `<h2>Games</h2><p class="lede">Joy drops about six points an hour and drags health down once it bottoms out. Each game costs a little energy.</p>`;
    html += Object.keys(GAMES).map(k => rowHTML('', GAMES[k].name, GAMES[k].blurb, GAMES[k].pay + 'c each')).join('');
    html += `<div class="hr"></div>`;
    html += rowHTML('', 'Ask for a trick', trickReady ? 'Free. A quick burst of joy.' : 'Unlocks at three bond pips.',
                    trickReady ? 'free' : 'locked', trickReady ? '' : 'disabled');
    html += `<p class="note">Petting works too. Press and hold on ${S.name} in the habitat.</p>`;
    b.innerHTML = html; mountArt(b);
    const rows = b.querySelectorAll('.row'), keys = Object.keys(GAMES);
    keys.forEach((k,i) => rows[i].onclick = () => startGame(k));
    rows[keys.length].onclick = doTrick;
  },

  vitals(b, sp){
    let html = '';
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
      <div class="log"><time>Energy</time>Falls about ${(ENERGY_AWAKE * trait('tempo').energy).toFixed(1)} points an hour awake, and comes back at ${ENERGY_ASLEEP} an hour asleep. At this level ${S.name} has roughly ${hoursLeft} waking hours left, and a full night takes about ${hoursFull} hours.</div>
      <div class="log"><time>Sleep</time>${S.name} settles itself between ${BED_HOUR}:00 and ${WAKE_HOUR}:00, or any time energy drops under 6. It wakes on its own once rested. Bedtime is in about ${untilBed} hours. Keeping it up more than two hours past bedtime brings on a chill.</div>
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

  care(b, sp){
    let html = '';
    if (S.vet){
      html = `<h2>Care</h2><p class="lede">${S.name} is on the ground and will not get up. A vet can bring it back.</p>`;
      html += rowHTML('', 'Call the vet', 'Restores health and clears every illness. Costs some trust.', '30c');
      b.innerHTML = html; mountArt(b);
      b.querySelector('.row').onclick = vetVisit;
    } else if (!S.ills.length){
      html = `<h2>Care</h2><p class="lede">Nothing to treat right now.</p>
        <div class="stats">
          <div class="stat"><b>Health</b><span>${Math.round(S.health)}%</span></div>
          <div class="stat"><b>Bond</b><span>${Math.round(S.bond)}%</span></div>
        </div>
        <p class="note">Illness has causes, not bad luck. Three treats in an hour upsets the stomach. Keeping ${S.name} awake past its bedtime brings on a chill. Letting the pen fall below a fifth clean invites mites. And joy sitting near zero turns into the blues.</p>`;
      b.innerHTML = html;
    } else {
      html = `<h2>Care</h2><p class="lede">Read the symptoms and pick the treatment. Guessing wrong costs coins and a little trust.</p>`;
      html += S.ills.map(i => `<div class="log"><time>Symptom</time>${ILLS[i.id].symptom}</div>`).join('');
      html += '<div class="hr"></div>';
      html += REMEDIES.map(r => rowHTML('', r.name, r.note, r.cost ? r.cost + 'c' : (hasIll('blues') ? S.petBank + '/8 pets' : 'free'))).join('');
      b.innerHTML = html; mountArt(b);
      b.querySelectorAll('.row').forEach((r,i) => r.onclick = () => {
        if (REMEDIES[i].id === 'company'){
          if (hasIll('blues')){ closeSheet(); say('Press and hold on ' + S.name + '. Eight times should do it.'); }
          else treat('company');
          return;
        }
        treat(REMEDIES[i].id);
      });
    }
  },

  shop(b, sp){
    let html = `<h2>Shop</h2><p class="lede">Coins come from digs, cleaning up and the games. Everything here belongs to ${S.name} alone.</p>
      <p class="note" style="margin-bottom:8px">Coats</p>`;
    html += SKINS[S.sp].map(k => {
      const own = S.skinsOwned.includes(k.id), worn = S.skin === k.id;
      return `<button class="row" data-skin="${k.id}"><span class="art" data-coat="${k.id}"></span>
        <span class="t"><b>${k.name}</b><small>${k.note}</small></span>
        <span class="px${own ? ' own' : ''}">${own ? (worn ? 'worn' : 'wear') : k.cost + 'c'}</span></button>`;
    }).join('');
    html += `<div class="hr"></div><p class="note" style="margin-bottom:8px">Headgear</p>`;
    html += HAT_SHOP.map(h => {
      const own = S.owned.includes(h.id), worn = S[h.slot] === h.id;
      const where = h.slot === 'face' ? 'Sits across the eyes.' : 'Sits on the head.';
      return rowHTML(h.id, h.name, own ? (worn ? 'Currently worn.' : where) : where, own ? (worn ? 'worn' : 'wear') : h.cost + 'c');
    }).join('');
    b.innerHTML = html; mountArt(b);
    b.querySelectorAll('[data-coat]').forEach(slot => {
      const id = slot.getAttribute('data-coat');
      const f = frameOf(S.sp, stageIdx(), 'idle', 0, false, id);
      const c = makeCv(34,30), g = readCtx(c);
      g.imageSmoothingEnabled = false;
      const sc = Math.min(34 / f.w, 30 / f.h) * .95;
      g.drawImage(f.cv, (34 - f.w*sc)/2, 30 - f.h*sc, f.w*sc, f.h*sc);
      c.style.imageRendering = 'pixelated';
      slot.appendChild(c);
    });
    b.querySelectorAll('.px').forEach(p => { if (p.textContent === 'worn' || p.textContent === 'wear') p.classList.add('own'); });
    b.querySelectorAll('[data-skin]').forEach(r => r.onclick = () => buySkin(r.getAttribute('data-skin')));
    const hatRows = Array.from(b.querySelectorAll('.row')).slice(SKINS[S.sp].length);
    hatRows.forEach((r,i) => r.onclick = () => buyHat(HAT_SHOP[i].id));
  },

  nest(b, sp){
    let html = `<h2>The nest</h2><p class="lede">Every animal here ages and gets hungry whether or not it is the one on screen. Coins are shared.</p>`;
    html += G.pets.map((p,i) => {
      const active = i === G.active;
      let sub;
      if (!p.sp) sub = 'An unchosen egg.';
      else if (!p.born) sub = 'Still in the shell.';
      else {
        const prev = S; S = p;
        const worst = Math.min(p.needs.hunger, p.needs.energy, p.needs.hygiene, p.needs.joy);
        sub = STAGE[stageIdx()].label + ' ' + SPECIES[p.sp].common + ' · ' +
              (p.vet ? 'needs a vet' : p.ills.length ? ILLS[p.ills[0].id].name.toLowerCase() :
               worst < 25 ? 'needs attention' : p.asleep ? 'asleep' : 'doing fine');
        S = prev;
      }
      return `<button class="row pet${active ? ' here' : ''}" data-pet="${i}">
        <span class="art" data-pet-art="${i}"></span>
        <span class="t"><b>${p.name || 'Unnamed'}</b><small>${sub}</small></span>
        <span class="px">${active ? 'here' : 'visit'}</span></button>`;
    }).join('');
    html += '<div class="hr"></div>';
    html += rowHTML('', 'Take a new egg', G.pets.length >= MAX_PETS ? 'The nest holds ' + MAX_PETS + '.' : 'Start another animal from scratch.',
                    G.pets.length >= MAX_PETS ? 'full' : 'new', G.pets.length >= MAX_PETS ? 'disabled' : '');
    b.innerHTML = html; mountArt(b);
    b.querySelectorAll('[data-pet-art]').forEach(slot => {
      const c = portrait(G.pets[+slot.getAttribute('data-pet-art')], 34);
      c.style.imageRendering = 'pixelated'; slot.appendChild(c);
    });
    b.querySelectorAll('[data-pet]').forEach(r => r.onclick = () => switchPet(+r.getAttribute('data-pet')));
    const newRow = b.querySelectorAll('.row')[G.pets.length];
    if (newRow) newRow.onclick = newEgg;
  },

  dossier(b, sp){
    let html = '';
    if (!hatched()){
      b.innerHTML = `<h2>Field dossier</h2><p class="lede">Choose an egg first. Each species is drawn from its own skeleton, so the sprite shows what the notes claim.</p>`;
    } else {
      const t = ['appetite','tempo','social'].map(k => `<span class="trait">${trait(k).name}</span>`).join('');
      html = `<h2>${S.name}</h2><p class="lede">${sp.name} · ${sp.era}</p>
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
        <p class="note" style="margin-bottom:6px">Diary</p>
        ${S.log.length ? S.log.slice(0,10).map(l => `<div class="log"><time>${new Date(l.t).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</time>${l.txt}</div>`).join('') : '<p class="note">Nothing has happened yet.</p>'}
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
        Promise.all([Store.del(SAVE_KEY), Store.del(BACKUP_KEY)]).then(() => location.reload());
      };
    }
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
    b.innerHTML = `<h2>While you were gone</h2><p class="lede">${G.awayText}</p>
      ${rowHTML('', 'Back to the habitat', 'Pick up where you left off.', '')}`;
    b.querySelector('.row').onclick = closeSheet;
  },

  trouble(b, sp){
    b.innerHTML = `<h2>Could not open your nest</h2><p class="lede">${G.loadWarning}</p>
      <p class="note">Nothing was thrown away. The unreadable save is still on this
      device under <code>${BACKUP_KEY}</code>, so a later build may be able to
      recover it.</p>
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
    if (game.kind === 'snack') game.tx = mx;
    if (game.kind === 'stomp') tapStomp(mx, my);
    if (game.kind === 'leap')  leapJump();
    return;
  }
  if (mode === 'live'){
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
    if (game.kind === 'snack') game.tx = p[0];
    if (game.kind === 'stomp') tapStomp(p[0], p[1]);
  }
});
window.addEventListener('pointerup', () => { holding = false; });
window.addEventListener('pointercancel', () => { holding = false; });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ if (openPanel) closeSheet(); else if (mode === 'game') endGame(); return; }
  if (mode === 'game' && game){
    if (game.kind === 'snack'){
      if (e.key === 'ArrowLeft' || e.key === 'a') game.kL = true;
      if (e.key === 'ArrowRight'|| e.key === 'd') game.kR = true;
    }
    if (game.kind === 'leap' && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w')) leapJump();
  }
});
window.addEventListener('keyup', e => {
  if (mode === 'game' && game && game.kind === 'snack'){
    if (e.key === 'ArrowLeft' || e.key === 'a') game.kL = false;
    if (e.key === 'ArrowRight'|| e.key === 'd') game.kR = false;
  }
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
  document.title = S.name + ' — Paleopal';
  say('Hello. Tap the name above to rename it.', 4200);
  refresh(); paintChrome(); save();
}

let saveAt = 0;
function save(){ if (!G) return; G.lastSeen = Date.now(); Store.set(SAVE_KEY, JSON.stringify(G)); }

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
      let left = Math.min(real - G.lastTick, 12*HOUR);
      G.lastTick = real;
      while (left > 0){ const chunk = Math.min(left, 5*MIN); simulateAll(chunk, true); left -= chunk; }
    }
  }

  stepBehaviour(dt, now);
  stepFeed(dt);
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
  G = freshGame();
  const loaded = loadSave(await Store.get(SAVE_KEY));
  if (loaded.game){
    G = loaded.game;
    // an upgraded save is written back at once, so a crash before the next
    // autosave cannot leave the old shape sitting on disk
    if (loaded.from !== SAVE_VERSION) await Store.set(SAVE_KEY, JSON.stringify(G));
  } else if (loaded.keep){
    // A save we cannot read is still the player's. Park it under the backup
    // key and tell them, rather than starting over in silence.
    await Store.set(BACKUP_KEY, loaded.keep);
    G.loadWarning = 'Your saved nest ' + loaded.why + ', so this is a fresh start. ' +
                    'The old save has not been deleted.';
    console.warn('paleopal: save ' + loaded.why + '; kept a copy at ' + BACKUP_KEY);
  }
  S = G.pets[G.active];
  if (hatched()){
    mode = 'live';
    const gap = clamp(Date.now() - (G.lastTick || Date.now()), 0, 14*86400e3);
    if (gap > 60e3){
      let left = Math.min(gap, 3*86400e3);
      while (left > 0){ const chunk = Math.min(left, 10*MIN); simulateAll(chunk, false); left -= chunk; }
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
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
boot();
