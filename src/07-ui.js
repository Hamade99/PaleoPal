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

function buildChrome(){
  $('needs').innerHTML = NEED_META.map(n =>
    `<div class="need" id="need-${n.k}"><b>${n.label}</b>
       <div class="track"><div class="fill" id="fill-${n.k}" style="background:${n.col}"></div><i class="seg"></i></div>
     </div>`).join('');
  $('needs').onclick = () => { if (hatched()) openSheet('vitals'); };
  $('actions').innerHTML = [
    ['feed','Feed'],['play','Play'],['wash','Wash'],['care','Care'],['shop','Shop']
  ].map(([k,l]) => `<button class="act" id="act-${k}"><span class="ico" data-ico="${k}"></span>${l}</button>`).join('');
  document.querySelectorAll('[data-ico]').forEach(sl => {
    const c = pixelIcon(sl.getAttribute('data-ico'), 12, 12);
    c.style.width = '24px'; c.style.height = '24px'; c.style.imageRendering = 'pixelated';
    sl.appendChild(c);
  });
  const coin = pixelIcon('coin', 12, 12);
  coin.style.cssText = 'width:13px;height:13px;image-rendering:pixelated';
  $('coinArt').appendChild(coin);
  const nest = pixelIcon('nest', 12, 12);
  nest.style.cssText = 'width:18px;height:18px;image-rendering:pixelated';
  $('btnNest').appendChild(nest);
  $('act-feed').onclick = () => openSheet('feed');
  $('act-play').onclick = () => openSheet('play');
  $('act-wash').onclick = () => { scrub(); };
  $('act-care').onclick = () => openSheet('care');
  $('act-shop').onclick = () => openSheet('shop');
  $('btnNest').onclick = () => openSheet('nest');
  $('btnDossier').onclick = () => openSheet('dossier');
  $('dName').onclick = beginRename;
  $('dName').onkeydown = e => { if (e.key === 'Enter') beginRename(); };
  $('scrim').onclick = closeSheet;
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
    $('mood').textContent = S && S.sp ? 'Something is moving in there.' : 'Three eggs are waiting in the nest.';
    $('bond').innerHTML = ''; $('badges').innerHTML = '';
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
  $('bond').innerHTML = 'Bond ' + Array.from({length:5}, (_,i) => `<i class="pip${i < bondPips() ? ' on' : ''}"></i>`).join('');
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
function openSheet(which){
  if (mode === 'game') return;
  if (mode !== 'live' && which !== 'dossier' && which !== 'nest') return;
  openPanel = which;
  renderSheet(which);
  $('sheet').classList.add('on'); $('scrim').classList.add('on');
}
function closeSheet(){ openPanel = null; $('sheet').classList.remove('on'); $('scrim').classList.remove('on'); }

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

function renderSheet(which){
  const b = $('sheetBody'), sp = hatched() ? SPECIES[S.sp] : null;
  let html = '';

  if (which === 'feed'){
    html = `<h2>Feed</h2><p class="lede">${sp.common} is a ${sp.diet}. Favourites fill it up and build trust; the wrong food goes down slowly. Treats are for treats.</p>`;
    html += FOODS.map(f => {
      const loved = sp.likes.includes(f.id), hated = sp.dislikes.includes(f.id);
      return rowHTML(f.id, f.name, (loved ? 'Favourite. ' : hated ? 'Dislikes this. ' : '') + f.note, f.cost + 'c');
    }).join('');
    b.innerHTML = html; mountArt(b);
    b.querySelectorAll('.row').forEach((r,i) => r.onclick = () => { feed(FOODS[i].id); });
  }

  else if (which === 'play'){
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
  }

  else if (which === 'vitals'){
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
  }

  else if (which === 'care'){
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
  }

  else if (which === 'shop'){
    html = `<h2>Shop</h2><p class="lede">Coins come from digs, cleaning up and the games. Everything here belongs to ${S.name} alone.</p>
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
  }

  else if (which === 'nest'){
    html = `<h2>The nest</h2><p class="lede">Every animal here ages and gets hungry whether or not it is the one on screen. Coins are shared.</p>`;
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
  }

  else if (which === 'dossier'){
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
      rows[0].onclick = () => { G.sound = !G.sound; save(); renderSheet('dossier'); };
      let armedR = false, armedW = false;
      rows[1].onclick = () => {
        if (G.pets.length <= 1) return;
        if (!armedR){ armedR = true; rows[1].querySelector('.px').textContent = 'sure?'; setTimeout(()=>{armedR=false; if(openPanel==='dossier') renderSheet('dossier');}, 3000); return; }
        releasePet(G.active);
      };
      rows[2].onclick = () => {
        if (!armedW){ armedW = true; rows[2].querySelector('.px').textContent = 'sure?'; setTimeout(()=>{armedW=false; if(openPanel==='dossier') renderSheet('dossier');}, 3000); return; }
        Store.del(SAVE_KEY).then(() => location.reload());
      };
    }
  }

  else if (which === 'away'){
    b.innerHTML = `<h2>While you were gone</h2><p class="lede">${G.awayText}</p>
      ${rowHTML('', 'Back to the habitat', 'Pick up where you left off.', '')}`;
    b.querySelector('.row').onclick = closeSheet;
  }
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
    const keys = ['rex','trike','brachio'], xs = [46, 112, 178];
    for (let i = 0; i < 3; i++){
      if (Math.abs(mx - xs[i]) < 20 && my > GROUND - 40 && my < GROUND + 6){ chooseEgg(keys[i]); return; }
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
    if (mx >= dinoBox[0] - 4 && mx <= dinoBox[2] + 4 && my >= dinoBox[1] - 4){ holding = true; pet(); return; }
    if (bondPips() >= 2 && !S.asleep && !S.vet){
      dino.tx = clamp(mx, 22, W-22);
      dino.until = performance.now() + 4000;
    }
  }
});
cv.addEventListener('pointermove', e => {
  const p = canvasPos(e); holdPos = p;
  if (mode === 'game' && game && game.kind === 'snack' && e.buttons) game.tx = p[0];
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
      holdPos[0] >= dinoBox[0]-4 && holdPos[0] <= dinoBox[2]+4 && holdPos[1] >= dinoBox[1]-4) pet();

  if (G) drawScene(now);
  accum += dt;
  if (accum > 1000){ accum = 0; refresh(); }
  if (now - saveAt > 6000){ saveAt = now; save(); }
  requestAnimationFrame(frame);
}

async function boot(){
  buildChrome();
  G = freshGame();
  const raw = await Store.get(SAVE_KEY);
  if (raw){
    try {
      const o = JSON.parse(raw);
      if (o && o.v === 2 && Array.isArray(o.pets) && o.pets.length){
        G = Object.assign(freshGame(), o);
        G.pets = o.pets.map(p => Object.assign(freshPet(), p));
        G.active = clamp(o.active|0, 0, G.pets.length-1);
      }
    } catch(e){}
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
  refresh(); paintChrome();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
boot();
