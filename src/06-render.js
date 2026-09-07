/* ==========================================================================
   BEHAVIOUR + RENDER
   ========================================================================== */

const cv = $('scene'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

let mode = 'boot';            // boot | choose | egg | live | game
let dino = { x: W/2, dir: -1, tx: W/2, until: 0, walking:false, dig:0, digAt: 0, dist: 0 };
let dinoTop = GROUND - 40, dinoBox = [0,0,0,0];
let egg = { cracks: 0, wob: 0 };
let game = null, feedFX = null;
let habitatTarget = null;
let blinkAt = 0, blinking = false, blinkUntil = 0, zAt = 0;

function strideCycle(spId, stage){
  const growth = artFor(spId, stage).st, species = SPECIES[spId];
  return Math.max(3, species.strideBase * growth.limb * growth.s * species.scale);
}

function stepPresentation(dt, now){
  egg.wob = Math.max(0, egg.wob - dt * .0036);
  anim.t += dt;
  if (mode !== 'live' || !hatched()) return;
  if (now > blinkAt){ blinkUntil = now + 150; blinkAt = now + rnd(2400, 5200); }
  blinking = now < blinkUntil;
  for (const mess of S.mess) if (Math.random() < 1-Math.exp(-dt*.0006)) emit('stink', mess.x, GROUND-6, 1, {vy:-12, life:1000});
  if (S.asleep && now > zAt){ zAt = now + 1100; emit('bubbleZ', dino.x - 10*dino.dir, dinoTop+2, 1, {vy:-13, vx:3, life:2100}); }
  if (hasIll('chill') && Math.random() < 1-Math.exp(-dt*.00072)){ emit('spark', dino.x-14*dino.dir, dinoTop+8, 2, {col:'#cfe0e8'}); SFX.sneeze(); }
  if (hasIll('mites') && Math.random() < 1-Math.exp(-dt*.0012)) emit('crumb', dino.x+rnd(-10,10), dinoTop+10, 1, {col:'#8a7350', vy:-6, g:40});
}

const anim = {
  name:'idle', frame:0, t:0, until:0,
  play(n, ms){ this.name = n; this.frame = 0; this.t = 0; this.until = performance.now() + ms; },
  pick(){
    if (performance.now() < this.until) return this.name;
    if (S.vet || S.asleep) return 'sleep';
    if (S.ills.length) return 'sick';
    return dino.walking ? 'walk' : 'idle';
  }
};

let sayTimer = 0;
function say(text, ms){
  const b = $('bubble');
  b.textContent = text; b.classList.add('on');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => b.classList.remove('on'), ms || 2800);
}

/* ------------------------------ feeding ----------------------------------- */
function tossFood(id){
  feedFX = { id, t: 0, phase: 'fly', from: [dino.x - dino.dir*46, 8], id2: id };
  SFX.pop();
}
function stepFeed(dt){
  if (!feedFX) return;
  feedFX.t += dt;
  if (feedFX.phase === 'fly' && feedFX.t > 620){
    feedFX.phase = 'bite'; feedFX.t = 0;
    anim.play('eat', 1500); SFX.chomp();
    emit('crumb', dino.x - 12*dino.dir, GROUND-26, 8, {vy:12, g:90, life:600});
  } else if (feedFX.phase === 'bite' && feedFX.t > 900){
    feedFX = null;
  }
}
function drawFeed(g, mouth){
  if (!feedFX || feedFX.phase !== 'fly') return;
  const u = clamp(feedFX.t / 620, 0, 1);
  const x = lerp(feedFX.from[0], mouth[0], u);
  const y = lerp(feedFX.from[1], mouth[1], u) - Math.sin(u*Math.PI) * 22;
  drawItem(g, feedFX.id, Math.round(x) - 3, Math.round(y) - 2, 1.6);
}

/* ------------------------------ behaviour --------------------------------- */
function stepBehaviour(dt, now){
  if (mode !== 'live') return;
  if (habitatTarget && (habitatTarget.pet !== S || habitatTarget.biome !== biomeId() || S.asleep || S.vet)) habitatTarget = null;
  const busy = feedFX || performance.now() < anim.until;
  const canMove = !S.asleep && !S.vet && !S.ills.length && !busy;

  if (dino.dig > 0){
    dino.dig -= dt;
    if (Math.random() < .35) emit('crumb', dino.x - 12*dino.dir, GROUND-2, 1, {vy:-18, g:120, life:520});
    if (dino.dig <= 0){
      const found = 3 + ((Math.random()*4)|0) + (bondPips() >= 4 ? 3 : 0);
      G.coins += found;
      SFX.coin(); emit('spark', dino.x - 12*dino.dir, GROUND-8, 6);
      say('Dug up a fossil chip. +' + found + ' coins.');
      dino.digAt = now + rnd(6,11)*MIN;
      refreshLight();
    }
    dino.walking = false;
    return;
  }
  if (!canMove){ dino.walking = false; return; }

  if (habitatTarget){
    dino.tx = HABITAT_ART[habitatTarget.biome].slot[0];
    dino.until = now + 2000;
    if (Math.abs(dino.x-dino.tx) <= 4){ habitatTarget = null; visitHabitat(); return; }
  }
  if (now > dino.until){
    const cautious = trait('social').id === 'shy' && S.bond < 40;
    const radius = cautious ? 20 : trait('tempo').id === 'placid' ? 38 : W;
    dino.tx = clamp(dino.x + rnd(-radius,radius),26,W-26);
    dino.until = now + rnd(2600, 6500) / trait('tempo').speed;
  }
  const d = dino.tx - dino.x;
  if (Math.abs(d) > 3){
    dino.walking = true; dino.dir = d > 0 ? 1 : -1;
    const step = SPECIES[S.sp].speed * trait('tempo').speed * (0.6 + stageIdx()*0.14) * dt/1000;
    dino.x += dino.dir * step;
    dino.dist += step;
  } else dino.walking = false;

  if (now > dino.digAt && !dino.walking && S.needs.energy > 30){ dino.dig = 1800; say('Sniff, sniff...'); }
}

/* ------------------------------- draw ------------------------------------- */
let screenLayout = null;
function drawScene(now){

  /* A screen replaces the view rather than sliding over it. On the device this
     copies there is one display and it shows one thing at a time; leaving the
     habitat visible behind a menu is what a web overlay does. */
  if (screenOpen()){
    const sc = SCREENS[screen];
    screenLayout = sc.layout ? sc.layout() : {};
    sc.draw(ctx, screenLayout);
    return;
  }
  const phase = skyPhase(new Date());
  ctx.drawImage(bakeBg(phase), 0, 0);

  if (phase === 'night'){
    for (const s of STARS){
      const tw = Math.sin(now/520 + s.p);
      if (tw > .15){ ctx.fillStyle = tw > .8 ? '#ffffff' : 'rgba(232,228,200,.8)'; ctx.fillRect(s.x|0, s.y|0, 1, 1); }
    }
  }
  drawSkyBody(ctx, phase, now);
  // whatever this habitat has that moves: a plume, surf, a fall, an aurora
  const live = (BIOMES[biomeId()] || BIOMES.valley).live;
  if (live) live(ctx, phase, now);
  drawClouds(ctx, phase);
  drawFlyers(ctx);
  drawWater(ctx, phase, now);
  drawGrassLine(ctx, phase, now);
  if (phase !== 'night') drawMotes(ctx, phase);

  if (mode === 'choose'){ drawChoose(now); drawFronds(ctx, phase, now); return; }
  if (mode === 'egg'){ drawEgg(now); drawFronds(ctx, phase, now); return; }
  if (mode === 'game'){ drawGame(now, phase); return; }
  const habitat = HABITAT_ART[biomeId()];
  ctx.save();
  ctx.globalAlpha = S.habitatAt && Date.now()-S.habitatAt < 30*MIN ? .45 : 1;
  drawItem(ctx, habitat.item, habitat.slot[0]-6, habitat.slot[1]-10, 1.5);
  ctx.restore();
  drawLive(now);
  drawFronds(ctx, phase, now);
  const tint = skyOf(phase).tint;
  if (tint !== 'rgba(0,0,0,0)'){ ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
}

function drawChoose(now){
  eggChoices().forEach((c, i) => {
    const bounce = Math.sin(now/420 + i*2) * 2;
    drawEggArt(ctx, c.x, GROUND - 16 + bounce, c.id, 0);
    ctx.fillStyle = 'rgba(16,26,24,.55)';
    ctx.beginPath(); ctx.ellipse(c.x, GROUND + 1, 11, 3, 0, 0, 7); ctx.fill();
  });
}
function drawEggArt(g, cx, cy, spId, cracks){
  const tint = SPECIES[spId].eggTint;
  g.fillStyle = '#221a12'; g.beginPath(); g.ellipse(cx, cy, 13, 17, 0, 0, 7); g.fill();
  g.fillStyle = '#efe3c4'; g.beginPath(); g.ellipse(cx, cy, 12, 16, 0, 0, 7); g.fill();
  g.fillStyle = '#faf4de'; g.beginPath(); g.ellipse(cx - 4, cy - 6, 3.5, 4, 0, 0, 7); g.fill();
  g.fillStyle = tint;
  [[-5,1],[4,-3],[0,7],[6,5],[-6,7],[2,-8]].forEach(p => g.fillRect(cx+p[0], cy+p[1], 3, 3));
  if (cracks > 0){
    g.strokeStyle = '#221a12'; g.lineWidth = 1; g.beginPath();
    let x = cx - 6, y = cy - 9;
    g.moveTo(x, y);
    for (let i = 0; i < cracks; i++){ x += (i%2 ? 5 : 4) * (i%2?1:-1) + 4; y += 4; g.lineTo(x, y); }
    g.stroke();
  }
}
function drawEgg(now){
  const wob = egg.wob > 0 ? Math.sin(now/40) * 2 : 0;
  ctx.fillStyle = 'rgba(16,26,24,.5)';
  ctx.beginPath(); ctx.ellipse(W/2, GROUND + 1, 12, 3, 0, 0, 7); ctx.fill();
  drawEggArt(ctx, W/2 + wob, GROUND - 16, S.sp, egg.cracks);
}

/* headgear rides the anchors the sprite hands back, so it sits on the skull or
   across the eyes rather than floating at a guessed offset */
function drawGear(g, f, x, y, flip){
  const place = (id, anchor, scale) => {
    if (!id || !PIX['hat.' + id]) return;
    /* pixCanvas leaves a pixel of margin for the outline. Horizontally it
       cancels, because the hat is centred and the margin is on both sides;
       vertically the hat is hung by its bottom edge, so that pixel has to come
       back off or every hat rides one scaled pixel high. */
    const art = hatArt(id), pad = (art.pad || 0) * scale,
          w = art.width * scale, hgt = art.height * scale;
    const ax = flip ? x + (f.ox - anchor[0]) : x - f.ox + anchor[0];
    const ay = y - f.oy + anchor[1];
    g.save(); g.translate(Math.round(ax), Math.round(ay));
    if (flip) g.scale(-1, 1);
    g.drawImage(art, -w/2, -hgt + pad, w, hgt);
    g.restore();
  };
  place(S.hat, f.hat, Math.max(.6, f.hs * 1.55));
  if (S.face && PIX['hat.' + S.face]){
    const art = hatArt(S.face), pad = art.pad || 0,
          scale = Math.max(.5, f.eyeR * 3.6 / (art.width - pad*2));
    const w = art.width * scale, hgt = art.height * scale;
    const ax = flip ? x + (f.ox - f.eye[0]) : x - f.ox + f.eye[0];
    const ay = y - f.oy + f.eye[1];
    g.save(); g.translate(Math.round(ax), Math.round(ay));
    if (flip) g.scale(-1, 1);
    g.drawImage(art, -w*.42, -hgt*.55, w, hgt);
    g.restore();
  }
}

function drawLive(now, dt){
  for (const m of S.mess){
    drawMess(ctx, m.x|0, GROUND - 1);
    const fx = m.x + Math.sin(now/280 + m.x) * 5, fy = GROUND - 12 + Math.cos(now/430 + m.x) * 2;
    ctx.fillStyle = '#2f2f2f'; ctx.fillRect(fx|0, fy|0, 1, 1);
  }

  const st = stageIdx(), a = anim.pick(), sp = SPECIES[S.sp];
  // real elapsed time, not an assumed sixty frames a second. On a 120Hz phone
  // the hardcoded 16 ran eat and cheer at double speed.
  let fr;
  if (a === 'walk'){
    const cycle = strideCycle(S.sp, st);
    fr = Math.floor((dino.dist / cycle) * POSES.walk.length);
  } else {
    const fps = a === 'eat' ? 220 : a === 'cheer' ? 200 : 700;
    fr = Math.floor(anim.t / fps);
  }
  const f = frameOf(S.sp, st, a, fr, blinking && a === 'idle', S.skin);

  const flip = dino.dir > 0;
  const x = Math.round(dino.x), y = GROUND;
  ctx.fillStyle = 'rgba(16,26,24,.32)';
  ctx.beginPath(); ctx.ellipse(x, y + 1, f.w * .38, 3, 0, 0, 7); ctx.fill();

  ctx.save(); ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.cv, -f.ox, -f.oy);
  ctx.restore();

  dinoTop = y - f.oy;
  dinoBox = flip ? [x - (f.w - f.ox), dinoTop, x + f.ox, y] : [x - f.ox, dinoTop, x - f.ox + f.w, y];
  drawGear(ctx, f, x, y, flip);

  const mouth = [flip ? x + (f.ox - f.mouth[0]) : x - f.ox + f.mouth[0], y - f.oy + f.mouth[1]];
  drawFeed(ctx, mouth);

  /* Zs on a clock rather than a two-percent chance per frame: at 120Hz that
     was twice as many as at 60, and either way it could go seconds without
     one, which is a poor signal for the state it is the signal for. */
  if (dino.dig > 0){ ctx.fillStyle='#8f6f4c'; ctx.fillRect(x - 16*dino.dir, GROUND-2, 6, 2); }

  if (S.asleep){ ctx.fillStyle = 'rgba(14,16,44,.28)'; ctx.fillRect(0, 0, W, H); }
  drawParts(ctx);
  stateMark(ctx, x, dinoTop, now);
}

/* An unwell animal and a sleeping one used to be told apart only by their
   eyelids, and the sick pose kept the eyes shut for as long as the illness
   lasted — so the answer to "why are its eyes closed all day" was a bellyache
   nothing on the glass ever mentioned. The eyes differ now, and this puts the
   reason above the animal's head in the one place the player is already
   looking. Illness beats sleep, because a sick animal that is also asleep
   still needs a remedy. */
function stateMark(g, x, top, now){
  const ill = S.vet || S.ills.length;
  if (!ill && !S.asleep) return;
  const bob = Math.round(Math.sin(now/620) * 1.5);
  const px = Math.round(x) - 5, py = Math.round(top) - 15 + bob;
  if (ill){
    /* Eleven across, not nine. At nine the arms of the cross reached the
       edge of the plaque and the whole mark read as a red square. */
    g.fillStyle = '#231a16';                                  // hard edge, all round
    g.fillRect(px, py, 11, 11);
    g.fillStyle = '#f2e7cd';                                  // bone plaque
    g.fillRect(px+1, py+1, 9, 9);
    g.fillStyle = S.vet ? '#8f2f2a' : '#c2452f';              // the cross
    g.fillRect(px+4, py+2, 3, 7); g.fillRect(px+2, py+4, 7, 3);
    return;
  }
  // asleep: one steady Z over the head, with the drifting ones behind it
  g.fillStyle = '#1b2038';
  g.fillRect(px, py, 11, 11);
  g.fillStyle = '#2b3358';
  g.fillRect(px+1, py+1, 9, 9);
  g.fillStyle = '#dfe4f6';
  g.fillRect(px+2, py+2, 7, 2); g.fillRect(px+6, py+4, 2, 1);
  g.fillRect(px+5, py+5, 2, 1); g.fillRect(px+4, py+6, 2, 1);
  g.fillRect(px+2, py+7, 7, 2);
}

/* ============================== MINIGAMES ================================== */
const GAMES = {
  snack: { name:'Snack run',  blurb:'Thirty seconds. Catch the food, dodge the rocks. Five in a row and each catch counts double.', pay:1,
    start:() => ({x:W/2, tx:W/2, dir:-1, items:[], combo:0, spawn:.5, stun:0, kL:false, kR:false}),
    update:stepSnack, draw:drawSnack, input:inputSnack, finish:finishRound },
  forage:{ name:'Forage', blurb:'Food turns up around the pen and spoils where it lies. Tap to send your animal, and beat the compies to it.', pay:1,
    start:() => ({x:W/2, tx:W/2, dir:-1, dist:0, walking:false, snap:0, finds:[], thief:null, thiefAt:4, chain:0, missed:0, spawn:.4}),
    update:stepForage, draw:drawForage, input:(input) => { if (input.type === 'point') tapForage(input.x,input.y); }, finish:finishRound },
  leap: { name:'River leap', blurb:'Your animal runs. Tap anywhere to jump the logs and boulders coming at it.', pay:2,
    start:() => ({obs:[], y:0, vy:0, spawn:1.1, speed:78, run:0, stun:0}),
    update:stepLeap, draw:drawLeap, input:(input) => { if ((input.type === 'point' && !input.move) || (input.down && [' ','ArrowUp','w'].includes(input.key))) leapJump(); }, finish:finishRound }
};
function challengeWeek(now = Date.now()){ return Math.floor((now - Date.UTC(1970,0,5))/(7*24*HOUR)); }
function gameProfile(pet){
  const stage = stageIdx(pet), reach = pet.sp === 'brachio' ? 5 : pet.sp === 'trike' ? 3 : 0;
  return { speed:88-stage*6+(pet.sp === 'rex' ? 8 : pet.sp === 'brachio' ? -8 : 0),
    reach:10+stage*4+reach, catch:11+stage*2, jump:148-stage*3-(pet.sp === 'brachio' ? 6 : 0), stun:800-stage*100,
    runSpeed:78+stage*8+(pet.sp === 'rex' ? 6 : pet.sp === 'brachio' ? -6 : 0) };
}
function gameRandom(min=0, max=1){
  game.seed = (Math.imul(game.seed,1664525)+1013904223) >>> 0;
  return min + (max-min)*game.seed/4294967296;
}
function gamePick(items){ return items[Math.floor(gameRandom(0,items.length))]; }
function inputSnack(input){
  if (input.type === 'point') game.tx = clamp(input.x,18,W-18);
  if (['ArrowLeft','a'].includes(input.key)) game.kL = input.down;
  if (['ArrowRight','d'].includes(input.key)) game.kR = input.down;
  if (input.type === 'key' && !input.down) game.tx = game.x;
}
function gameInput(input){ if (game) GAMES[game.kind].input(input); }
function startGame(kind, seed){
  if (!Object.hasOwn(GAMES,kind) || game) return;
  if (S.asleep) return refuse(S.name + ' is asleep.');
  if (S.vet) return refuse(S.name + ' is in no state to play.');
  if (S.needs.energy < 12) return refuse('Too tired to run around.');
  closeSheet();
  mode = 'game'; feedFX = null;
  const week = challengeWeek();
  game = Object.assign({kind, score:0, left:30, pet:S, week, profile:gameProfile(S),
    recordKey:kind+':'+S.sp+':'+stageIdx(S), seed:seed ?? (week*97+Object.keys(GAMES).indexOf(kind)+1)}, GAMES[kind].start());
  if (kind === 'leap') game.speed = game.profile.runSpeed;
  say(GAMES[kind].blurb.split('.')[0] + '.');
  paintChrome();
}
function finishRound(round){
  if (round.left > 0) return;
  const records = round.pet.records || (round.pet.records = {});
  const previous = records[round.recordKey] || {best:0, week:round.week, weekly:0};
  records[round.recordKey] = {best:Math.max(previous.best,round.score), week:round.week,
    weekly:Math.max(previous.week === round.week ? previous.weekly : 0,round.score)};
  observePet(round.pet, 'game:'+round.kind);
}
function endGame(){
  if (!game) return;
  const player = game.pet;
  GAMES[game.kind].finish(game);
  const g = GAMES[game.kind], earned = game.score * g.pay;
  G.coins += earned;
  player.needs.joy = clamp(player.needs.joy + Math.min(34, game.score * 2.4), 0, 100);
  player.needs.energy = clamp(player.needs.energy - 7, 0, 100);
  player.bond = clamp(player.bond + (game.score > 8 ? 3 : 1), 0, 100);
  if (game.score > 8) logEvent('A good run at ' + g.name.toLowerCase() + ': ' + game.score + '.', player);
  say(game.score ? 'Scored ' + game.score + '. That is ' + earned + ' coins.' : 'Nothing scored. Next time.');
  if (game.score) SFX.coin();
  game = null; mode = 'live';
  paintChrome(); refresh();
}
function stepGame(dt, now){
  if (!game) return;
  const elapsed = Math.min(dt,game.left*1000);
  game.left = Math.max(0,game.left-elapsed/1000);
  GAMES[game.kind].update(elapsed, now);
  if (game.left <= 0) endGame();
}
function drawGame(now, phase){
  GAMES[game.kind].draw(now);
  drawParts(ctx);
  ctx.fillStyle = 'rgba(16,22,24,.78)'; ctx.fillRect(0, 0, W, 9);
  ctx.fillStyle = game.left < 6 ? '#c2603c' : '#7ea55f';
  ctx.fillRect(1, 2, Math.round((W-2) * game.left/30), 5);
}
function gameSprite(anim2, frame, scaleTo){
  const f = frameOf(S.sp, stageIdx(), anim2, frame, false, S.skin);
  return { f, sc: Math.min(1, scaleTo / f.h) };
}

/* ------ snack run ------ */
function stepSnack(dt, now){
  let vx = 0;
  const speed = game.profile.speed * 1.6;
  if (game.kL) vx -= speed; if (game.kR) vx += speed;
  if (!vx) vx = clamp((game.tx - game.x) * 7, -speed, speed);
  if (now < game.stun) vx = 0;
  /* Which way it is facing comes from which way it is actually moving. It used
     to come from `tx < x`, which is inverted — the sprite is drawn facing −x,
     so flipping it is what points it right — and which the arrow keys never
     touched at all, because they drive `vx` and leave `tx` where it was. Both
     together meant the animal moonwalked to the right and then kept facing
     the wrong way for the rest of the round. */
  if (vx) game.dir = vx > 0 ? 1 : -1;
  game.x = clamp(game.x + vx * dt/1000, 18, W-18);
  game.spawn -= dt/1000;
  if (game.spawn <= 0){
    game.spawn = gameRandom(.42, .72);
    const sp = SPECIES[game.pet.sp], rock = gameRandom() < .22;
    game.items.push({ x: gameRandom(16, W-16), y: 4, vy: gameRandom(44, 62), id: rock ? 'rock' : gamePick(sp.likes), rock });
  }
  const mouthY = GROUND - 34;
  for (const it of game.items){
    it.y += it.vy * dt/1000;
    if (it.y > mouthY - 6 && it.y < mouthY + 22 && Math.abs(it.x - game.x) < game.profile.catch){
      it.dead = true;
      if (it.rock){ game.combo = 0; game.stun = now + game.profile.stun; SFX.bonk(); emit('spark', game.x, mouthY, 4, {col:'#e8c352'}); }
      else { game.combo++; game.score += game.combo >= 5 ? 2 : 1; SFX.chomp(); emit('spark', it.x, it.y, 3); }
    }
    if (it.y > GROUND){ it.dead = true; if (!it.rock) game.combo = 0; }
  }
  game.items = game.items.filter(i => !i.dead);
}
function drawSnack(now){
  for (const it of game.items) drawItem(ctx, it.id, it.x - 3, it.y - 2, 1.5);
  const { f, sc } = gameSprite(now < game.stun ? 'sick' : 'walk', Math.floor(now/130), 44);
  const flip = game.dir > 0;                    // the sprite faces −x unflipped
  ctx.save(); ctx.translate(Math.round(game.x), GROUND);
  if (flip) ctx.scale(-1,1);
  ctx.drawImage(f.cv, -f.ox*sc, -f.oy*sc, f.w*sc, f.h*sc);
  ctx.restore();
  scoreTag('Caught ' + game.score + (game.combo >= 5 ? '  x2' : ''));
}

/* ------ forage ------

   This replaces Bug hunt, which had two faults and only one of them was a bug.

   The bug: critters spawned in two bands, one in the air and one on the
   ground *below* the grass line, and catching one meant bringing the animal's
   mouth anchor within eleven pixels of it in both axes. An adult's mouth sits
   around thirty pixels above the ground line, so nothing walking on the floor
   of the pen was ever reachable — half the quarry in the game could not be
   caught by any player at any skill.

   The design fault, which mattered more: the quarry was insects, and two of
   the three animals in this game are obligate herbivores. Nothing about
   Triceratops or Brachiosaurus makes chasing dragonflies across a pen a thing
   they would do, and no amount of fixing the hitbox was going to change that.

   So the quarry is food, and which food comes from the species' own `likes` —
   ferns and cycad cones for the ceratopsian, berries and cones for the
   sauropod, river fish and carrion for the tyrannosaur. Everything sits ON
   the ground line, where the animal's own feet are, so reach is a horizontal
   distance and nothing can spawn somewhere unreachable by construction.

   What makes it a game rather than a queue is the compsognathids. They come
   in from the edges and go for whatever has been sitting longest, and they
   are faster than any of the three animals you can raise. So it is not "walk
   to each thing in turn": it is a choice, every few seconds, between the
   close one and the one about to be stolen — and the walk cycle, the growth
   stage and the animal's own speed all decide whether you make it.
   -------------------------------------------------------------------------- */
const FORAGE_H = 50;                           // drawn sprite height in the pen
const FORAGE_LIFE = 3600;                      // how long a find sits before it spoils

function forageSprite(now){
  const snapping = now < game.snap;
  const sp = SPECIES[S.sp], st = stageIdx();
  if (snapping) return gameSprite('eat', Math.floor(now/150), FORAGE_H);
  if (!game.walking) return gameSprite('idle', Math.floor(now/700), FORAGE_H);
  // one sprite stride to one stride of ground, the same rule the habitat uses
  const probe = gameSprite('walk', 0, FORAGE_H);
  const cycle = strideCycle(S.sp, st);
  const frame = Math.floor((game.dist / probe.sc) / cycle * POSES.walk.length);
  return gameSprite('walk', frame, FORAGE_H);
}

/* Somewhere to put a new find: on the ground, inside the pen, and not on top
   of one that is already there. */
function forageSlot(){
  for (let tries=0; tries<12; tries++){
    const x = gameRandom(18, W-18);
    if (game.finds.every(f => Math.abs(f.x - x) > 26)) return x;
  }
  return gameRandom(18, W-18);
}

function stepForage(dt, now){
  const sec = dt / 1000;

  // run toward the last place the player pointed
  const speed = game.profile.speed;
  const d = game.tx - game.x;
  if (Math.abs(d) > 1.5){
    const step = clamp(d, -speed*sec, speed*sec);
    game.x = clamp(game.x + step, 12, W - 12);
    game.dist += Math.abs(step);
    game.dir = step < 0 ? -1 : 1;
    game.walking = true;
  } else game.walking = false;

  // new finds
  game.spawn -= sec;
  if (game.spawn <= 0 && game.finds.length < 5){
    game.spawn = gameRandom(.6, 1.05);
    // what turns up is what this species eats, and nothing else
    game.finds.push({ x: forageSlot(), id: gamePick(SPECIES[game.pet.sp].likes), age: 0 });
  }
  for (const f of game.finds){
    f.age += dt;
    if (f.age > FORAGE_LIFE){ f.dead = true; game.missed++; game.chain = 0; }
  }

  /* Thieves. One at a time, aimed at whatever has been down longest — the
     thing the player is most likely to have written off, which is what makes
     ignoring a find a decision rather than an oversight. */
  game.thiefAt -= sec;
  if (!game.thief && game.thiefAt <= 0 && game.finds.length){
    const mark = game.finds.reduce((a, b) => (b.age > a.age ? b : a));
    game.thief = { x: mark.x < W/2 ? -10 : W+10, mark, p:0, carry:false };
  }
  if (game.thief){
    const t = game.thief;
    t.p += dt;
    const goal = t.carry ? (t.x < W/2 ? -14 : W+14) : t.mark.x;
    const dir = goal > t.x ? 1 : -1;
    t.x += dir * 74 * sec;
    if (!t.carry && Math.abs(t.x - t.mark.x) < 3){
      if (t.mark.dead){ game.thief = null; game.thiefAt = gameRandom(2.2, 4.2); }
      else { t.mark.dead = true; t.carry = true; game.missed++; game.chain = 0; SFX.pop(); }
    } else if (t.carry && (t.x < -12 || t.x > W+12)){
      game.thief = null; game.thiefAt = gameRandom(2.2, 4.2);
    }
  }

  /* Reach. A horizontal distance along the ground, because everything here is
     on the ground — the old game measured to a mouth anchor thirty pixels up
     and then spawned half its quarry on the floor. */
  const reach = game.profile.reach;
  for (const f of game.finds){
    if (f.dead) continue;
    if (Math.abs(f.x - game.x) < reach){
      f.dead = true;
      game.chain++;
      game.score += game.chain >= 4 ? 2 : 1;
      game.snap = now + 260;
      if (game.thief && game.thief.mark === f && !game.thief.carry){
        game.thief = null; game.thiefAt = gameRandom(2.2, 4.2);
      }
      SFX.chomp();
      emit('spark', f.x, GROUND - 4, 4, {col:'#cfe0a8'});
      emit('crumb', f.x, GROUND - 4, 3, {col:'#7d9c5a', vy:-14, g:110});
    }
  }
  game.finds = game.finds.filter(f => !f.dead);
  if (game.thief && game.thief.mark.dead && !game.thief.carry){
    game.thief = null; game.thiefAt = gameRandom(2.2, 4.2);
  }
}

/* A find: a scrape of turned earth with the item standing on it, over a bar
   that runs down as it spoils.

   Both parts have to fight the habitat for attention. Drawn small and flat on
   the grass line, among cycads and boulders and a watering hole, a fern frond
   is one more piece of scenery — so the earth is a mound in a colour nothing
   else in the pen uses, and the item stands clear above it at twice size.
   The bar is the only information the game gives, so it is under every find
   rather than only under the urgent one. */
function drawFind(g, f, now){
  const x = Math.round(f.x), u = clamp(f.age / FORAGE_LIFE, 0, 1);
  // the mound
  g.fillStyle = '#6b4a2a';
  g.fillRect(x-6, GROUND-1, 13, 4);
  g.fillRect(x-4, GROUND-3, 9, 2);
  g.fillStyle = '#8a6438';
  g.fillRect(x-4, GROUND-3, 9, 1);
  g.fillStyle = '#3a2716';
  g.fillRect(x-6, GROUND+2, 13, 1);
  /* The find itself, standing clear of the grass and bobbing once it starts
     to go over. It is drawn four more times underneath in near-black, one
     pixel out in each direction, which gives it the same hard outline every
     animal in this game has — a green fern frond on a green grass line is
     otherwise invisible, and the item is the thing the player is aiming at. */
  const bob = u > .70 ? Math.round(Math.sin(now/90)) : 0;
  const ix = x - 4 + bob, iy = GROUND - 12;   // standing on the mound, not over it
  for (const d of [[-1,0],[1,0],[0,-1],[0,1]])
    drawItem(g, f.id, ix + d[0], iy + d[1], 1.6, '#1c160e');
  drawItem(g, f.id, ix, iy, 1.6);
  // freshness
  const w = Math.max(1, Math.round(13 * (1 - u)));
  g.fillStyle = '#101a18'; g.fillRect(x - 8, GROUND + 4, 17, 5);
  g.fillStyle = '#2b3a3f'; g.fillRect(x - 7, GROUND + 5, 15, 3);
  g.fillStyle = u > .70 ? '#e2704a' : u > .45 ? '#e8bd4e' : '#8cc46a';
  g.fillRect(x - 7 + (13 - w), GROUND + 5, w + 2, 3);
}

/* Compsognathus: a metre of animal and mostly tail, which at this size is a
   body three pixels deep, a neck and a tail as long as the rest of it. It is
   painted light with a hard dark edge, because the one thing it must not do
   is disappear into the treeline it walks out of. */
function drawThief(g, t){
  const x = Math.round(t.x), y = GROUND - 8, run = Math.sin(t.p/70) > 0;
  const face = t.x < W/2 ? 1 : -1;                           // it faces where it is going
  g.fillStyle = '#241d13';                                   // the hard edge, drawn under
  g.fillRect(x - 6, y + 1, 11, 6);
  g.fillRect(x + face*3 - 1, y - 1, 5, 5);
  g.fillStyle = '#c9a355';
  g.fillRect(x - 4, y + 2, 8, 4);                            // body
  g.fillRect(x + face*3, y, 3, 3);                           // head
  g.fillStyle = '#e6cf94';
  g.fillRect(x - 4, y + 2, 8, 1);
  g.fillStyle = '#8a6c34';
  for (let i=0;i<6;i++) g.fillRect(x - 5 - face*i*2, y + 3 + (i>3?1:0), 2, 1);   // tail
  g.fillStyle = '#c9a355';
  g.fillRect(x - 2, y + 6, 2, run ? 3 : 2);                  // legs
  g.fillRect(x + 2, y + 6, 2, run ? 2 : 3);
  g.fillStyle = '#241d13'; g.fillRect(x + face*4, y + 1, 1, 1);
  if (t.carry){ g.fillStyle = '#cfe0a8'; g.fillRect(x + face*5, y + 3, 3, 3); }
}

function drawForage(now){
  for (const f of game.finds) drawFind(ctx, f, now);

  const { f, sc } = forageSprite(now);
  const flip = game.dir > 0;
  const x = Math.round(game.x);
  ctx.fillStyle = 'rgba(16,26,24,.32)';
  ctx.beginPath(); ctx.ellipse(x, GROUND + 1, f.w*sc*.38, 3, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, GROUND);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.cv, -f.ox*sc, -f.oy*sc, f.w*sc, f.h*sc);
  ctx.restore();

  if (game.thief) drawThief(ctx, game.thief);

  // a marker where the animal has been told to go, so the order reads
  if (game.walking){
    const tx = Math.round(game.tx);
    ctx.fillStyle = 'rgba(207,224,168,.5)';
    ctx.fillRect(tx-3, GROUND+3, 7, 1); ctx.fillRect(tx, GROUND+1, 1, 5);
  }
  scoreTag('Found ' + game.score + (game.chain >= 4 ? '  x2' : ''));
}

function tapForage(mx, my){
  // tapping a find aims at the find; tapping the pen aims at the pen
  let best = null, bd = 30;
  for (const f of game.finds){
    const d = Math.abs(f.x - mx) + Math.abs(GROUND - 6 - my) * .35;
    if (d < bd){ bd = d; best = f; }
  }
  game.tx = clamp(best ? best.x : mx, 12, W - 12);
}

/* ------ river leap ------
   Three faults: the obstacles were plain rectangles whose bases sat a pixel
   above the grass line, so they appeared to hover; the habitat props sat
   there unmoving behind an animal that was supposed to be running; and there
   were only two obstacles in the deck.

   The pen is now overdrawn from the grass line down with a ground that
   scrolls, silhouette scrub behind the runner and tufts in front of it, all
   at different rates, so the animal is running through somewhere rather than
   on the spot. Obstacles are bedded two pixels into the grass and carry a
   contact shadow, and the water hazard the game is named for now exists.
   -------------------------------------------------------------------------- */
const LEAP_OBS = {
  log:   { half:12, clear:14 },
  rock:  { half:9,  clear:18 },
  water: { half:20, clear:8  }
};
const LEAP_KINDS = ['log','rock','water','log','rock'];

function stepLeap(dt, now){
  game.run += dt/1000 * game.speed;
  game.speed = Math.min(game.profile.runSpeed+45, game.speed + dt/1000 * 3);
  game.vy += 340 * dt/1000;
  game.y = Math.min(0, game.y + game.vy * dt/1000);
  if (game.y === 0) game.vy = 0;
  game.spawn -= dt/1000;
  if (game.spawn <= 0){
    game.spawn = Math.max(.95,gameRandom(1.1, 1.7) * 110/game.speed);
    game.obs.push({ x: W + 14, kind: gamePick(LEAP_KINDS), hit:false, past:false });
  }
  for (const o of game.obs){
    o.x -= game.speed * dt/1000;
    const cfg = LEAP_OBS[o.kind];
    if (!o.hit && Math.abs(o.x - 54) < cfg.half && game.y > -cfg.clear){
      o.hit = true; game.speed = Math.max(70, game.speed * .7);
      game.stun = now + game.profile.stun; SFX.bonk();
      if (o.kind === 'water') emit('spark', 54, GROUND-2, 8, {col:'#9fd2e0', vy:-30, g:150});
      else emit('crumb', 54, GROUND-8, 6, {col:'#9b7a52', vy:-20, g:120});
    }
    if (!o.past && o.x < 40){
      o.past = true;
      if (!o.hit){ game.score++; SFX.coin(); emit('spark', 54, GROUND-26, 3, {col:'#f0d888'}); }
    }
    if (o.x < -24) o.dead = true;
  }
  game.obs = game.obs.filter(o => !o.dead);
}
function leapJump(){
  if (!game || game.kind !== 'leap') return;
  if (game.y < -1) return;
  game.vy = -game.profile.jump; SFX.purr();
}

/* The track, overdrawn so the habitat props do not sit still behind a running
   animal. Three scroll rates: scrub, ground, fringe. */
function drawLeapGround(){
  const S_ = skyOf(skyPhase(new Date()));
  const grass = S_.grass, grassLit = mixHex(S_.grass, S_.low, .40);
  const grassDark = mixHex(S_.grass, '#000000', .34);
  const d0 = S_.dirt, d1 = mixHex(S_.dirt,'#000000',.26), d2 = mixHex(S_.dirt, S_.low,.22);
  const scrub = mixHex(S_.tree, '#000000', .18), scrubLit = mixHex(S_.tree, S_.low, .30);

  /* Scrub on the far side of the track. As a rectangle with a wider rectangle
     across it, in a colour a third of the way to the sky, this read as broken
     masonry — the whole strip looked like a ruin the animal was running past.
     It is built as a clump of fronds off a short stem now, in a colour that
     stays on the vegetation side of the palette. */
  for (let i=0;i<10;i++){
    const x = Math.round(((((i*47.3) - game.run*.42) % (W+70)) + W+70) % (W+70) - 35);
    const h = 7 + (i % 4) * 4, spread = 4 + (i % 3) * 2;
    ctx.fillStyle = scrub;
    ctx.fillRect(x, GROUND-1-h, 1, h);                       // stem
    for (let k=-spread;k<=spread;k++){                       // fronds arching off it
      const t = Math.abs(k)/spread;
      const top = Math.round(GROUND-1-h + t*t*h*.62);
      ctx.fillRect(x+k, top, 1, Math.round(h*.42*(1-t*.5)));
    }
    ctx.fillStyle = scrubLit;
    ctx.fillRect(x-1, GROUND-1-h, 2, 2);
  }

  // the track itself
  for (let x=0;x<W;x++){
    const wx = x + game.run;
    const t = (Math.sin(wx*.7) > .3 ? 1 : 0) + (Math.sin(wx*.31 + 2) > .55 ? 1 : 0);
    ctx.fillStyle = grass;    ctx.fillRect(x, GROUND-1-t, 1, 5+t);
    ctx.fillStyle = grassLit; ctx.fillRect(x, GROUND-1-t, 1, 1);
  }
  ctx.fillStyle = grassDark; ctx.fillRect(0, GROUND+3, W, 1);
  ctx.fillStyle = d0;        ctx.fillRect(0, GROUND+4, W, H-GROUND-4);
  for (let i=0;i<34;i++){
    const x = ((((i*17.7) - game.run) % (W+26)) + W+26) % (W+26) - 13;
    const y = GROUND + 6 + ((i*11) % (H-GROUND-9));
    ctx.fillStyle = d1; ctx.fillRect(x|0, y, 2 + (i%2), 1);
    if (i % 3 === 0){ ctx.fillStyle = d2; ctx.fillRect(x|0, y-1, 1, 1); }
  }
}
/* The near fringe.

   This used to be fourteen one-pixel tufts scattered at random heights across
   the whole dirt band, which is not what a foreground is: they read as green
   specks sprinkled over bare earth, drifting past for no reason. Grass grows
   in a continuous mat, and a foreground is a band along the bottom edge that
   the animal runs behind. It is one unbroken fringe rooted off the bottom of
   the screen now, every blade a different height, scrolling fastest of the
   three layers — which is the layer that actually sells the speed. */
function drawLeapTufts(){
  const S_ = skyOf(skyPhase(new Date()));
  const near = mixHex(S_.grass, '#000000', .52);
  const nearLit = mixHex(S_.grass, '#000000', .34);
  for (let x=0;x<W;x++){
    const wx = x + game.run*1.45;
    // three offset waves, so no two blades next to each other are the same
    const h = 4 + Math.round(3.2*Math.abs(Math.sin(wx*.9))
                           + 2.6*Math.abs(Math.sin(wx*.31 + 1.7))
                           + 1.4*Math.abs(Math.sin(wx*2.3 + .4)));
    ctx.fillStyle = near;
    ctx.fillRect(x, H - h, 1, h);
    ctx.fillStyle = nearLit;
    ctx.fillRect(x, H - h, 1, 1);
  }
}
/* Obstacles are built column by column so they have a silhouette. Drawn as
   plain fillRects they came out as a wooden crate and a cardboard box; a log
   is a cylinder lying on its side, so it needs rounded ends, grain that runs
   along the trunk rather than across it, and top-to-bottom cylinder shading,
   and a boulder needs an irregular profile. */
const BOULDER_PROF = [3,7,11,14,16,17,17,16,15,13,10,6,3];

function drawObstacle(g, o){
  const x = Math.round(o.x), base = GROUND + 2;   // bedded into the grass

  if (o.kind === 'water'){
    /* A stream cut through the track, not a puddle laid on top of it.

       The old one was a cosine lens of flat blue starting a pixel under the
       grass line, so it read as a blue dish resting on the dirt — nothing was
       cut, nothing had a bank, and the thing the game is named for looked
       like spilled paint. It is a channel now: the grass stops at a lip on
       each side, the earth under the lip is exposed and darker, the water
       sits down inside it, and the far wall is in shadow. Depth is what makes
       a hazard read as something to jump rather than something to step in. */
    const S_ = skyOf(skyPhase(new Date()));
    const soil = mixHex(S_.dirt, '#000000', .52);            // the cut bank
    const deep = mixHex(S_.water, '#000000', .34);
    const body = S_.water;
    const lit  = mixHex(S_.water, S_.low, .50);
    const HW = 21;
    for (let i=-HW;i<=HW;i++){
      const t = Math.abs(i)/HW;
      const lip = Math.round(Math.pow(t, 4) * 4);            // steep banks, flat bed
      const top = GROUND - 1 + lip;
      const dep = Math.round((1 - Math.pow(t, 4)) * 8) + 2;
      g.fillStyle = soil; g.fillRect(x+i, top, 1, 2);        // exposed earth at the lip
      g.fillStyle = deep; g.fillRect(x+i, top+2, 1, dep);    // the channel
      g.fillStyle = body; g.fillRect(x+i, top+2, 1, Math.max(1, dep-3));
      g.fillStyle = lit;  g.fillRect(x+i, top+2, 1, 1);      // the surface, catching sky
    }
    // ripples riding the surface, sliding with the track
    g.fillStyle = mixHex(S_.water, '#ffffff', .55);
    for (let k=0;k<3;k++){
      const off = ((game.run*.6 + k*15) % 30) - 15;
      const rx = Math.round(x + off), t = Math.abs(off)/HW;
      if (t >= 1) continue;
      const top = GROUND - 1 + Math.round(Math.pow(t, 4) * 4);
      g.fillRect(rx - 2, top + 3 + (k % 2), 5, 1);
    }
    // grass overhanging both lips, so the cut has an edge rather than a border
    g.fillStyle = mixHex(S_.grass, '#000000', .30);
    g.fillRect(x-HW-1, GROUND-2, 3, 3); g.fillRect(x-HW-3, GROUND-1, 2, 2);
    g.fillRect(x+HW-1, GROUND-2, 3, 3); g.fillRect(x+HW+1, GROUND-1, 2, 2);
    return;
  }

  g.fillStyle = 'rgba(16,26,24,.34)';
  g.beginPath(); g.ellipse(x, base, o.kind === 'log' ? 15 : 10, 3, 0, 0, 7); g.fill();

  if (o.kind === 'log'){
    const HW = 12, H0 = 11;
    for (let i=-HW;i<=HW;i++){
      const t = Math.abs(i)/HW, cut = Math.round(t*t*t*4);
      const top = base - H0 + cut, hh = H0 - cut*2;
      for (let r=0;r<hh;r++){
        const v = hh > 1 ? r/(hh-1) : 0;                                // cylinder shading
        g.fillStyle = v < .20 ? '#8a6540' : v < .58 ? '#65482a' : '#3f2c19';
        g.fillRect(x+i, top+r, 1, 1);
      }
    }
    g.fillStyle = '#4d371f';                                            // grain along the trunk
    g.fillRect(x-9, base-8, 8, 1); g.fillRect(x-1, base-6, 9, 1);
    g.fillRect(x-10, base-4, 6, 1); g.fillRect(x+1, base-3, 7, 1);
    g.fillStyle = '#5c7a45';                                            // moss on the lit top
    g.fillRect(x-8, base-11, 5, 1); g.fillRect(x-1, base-11, 4, 1); g.fillRect(x+4, base-10, 3, 1);
    g.fillStyle = '#3f2c19'; g.fillRect(x+8, base-10, 5, 9);            // sawn end, facing out
    g.fillStyle = '#a8814c'; g.fillRect(x+9, base-9, 4, 7);
    g.fillStyle = '#8a6a3e'; g.fillRect(x+10, base-7, 2, 3);
    g.fillStyle = '#c8a06a'; g.fillRect(x+10, base-8, 1, 1);
    return;
  }

  for (let i=0;i<BOULDER_PROF.length;i++){
    const px = x - 6 + i, hh = BOULDER_PROF[i], lit = i < BOULDER_PROF.length * .45;
    for (let r=0;r<hh;r++){
      const v = r/hh;
      g.fillStyle = v < .18 ? (lit ? '#948d7c' : '#6b6558')
                  : v < .55 ? (lit ? '#6f6a5c' : '#514c42')
                            : '#3a372f';
      g.fillRect(px, base - hh + r, 1, 1);
    }
  }
  g.fillStyle = '#7b7566'; g.fillRect(x-4, base-14, 3, 2);              // facet
  g.fillStyle = '#33312b'; g.fillRect(x+2, base-9, 3, 1); g.fillRect(x+3, base-8, 2, 4);
  g.fillStyle = '#6d7d55'; g.fillRect(x-5, base-16, 2, 1);              // lichen
}
function drawLeap(now){
  drawLeapGround();
  for (const o of game.obs) drawObstacle(ctx, o);

  const airborne = game.y < -2;
  const { f, sc } = gameSprite(now < game.stun ? 'sick' : airborne ? 'cheer' : 'walk',
                               airborne ? 0 : Math.floor(game.run / 9), 42);
  const shrink = clamp(1 + game.y/70, .35, 1);               // the shadow shrinks as it rises
  ctx.fillStyle = 'rgba(16,26,24,.30)';
  ctx.beginPath(); ctx.ellipse(54, GROUND + 1, f.w*sc*.36*shrink, 3*shrink, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(54, GROUND + Math.round(game.y));
  ctx.scale(-1, 1);
  ctx.drawImage(f.cv, -f.ox*sc, -f.oy*sc, f.w*sc, f.h*sc);
  ctx.restore();

  drawLeapTufts();
  scoreTag('Cleared ' + game.score);
}

function scoreTag(text){
  ctx.font = '9px monospace';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(16,26,24,.82)'; ctx.fillRect(4, H - 17, w, 13);
  ctx.fillStyle = '#e9e1cb'; ctx.fillText(text, 9, H - 7);
}
