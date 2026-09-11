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
/* Wherever the player is actually looking. With a screen open that is the
   screen, and the message goes into its title bar rather than over the rows
   being chosen from; in a game it is the game, and it goes in a strip along the
   top; otherwise it is the habitat, where a bubble over the sky covers nothing
   that matters. `bad` marks a refusal, which is drawn red on all three. */
const hideBubble = () => { clearTimeout(sayTimer); $('bubble').classList.remove('on'); };
function say(text, ms, bad){
  if (screenOpen() || mode === 'game'){ hideBubble(); noteOnGlass(text, bad, ms); return; }
  const b = $('bubble');
  b.textContent = text;
  b.classList.toggle('bad', !!bad);
  b.classList.add('on');
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

/* The egg, the choosing screen and the minigames are laid out in screen space
   against GROUND and tuned to it, so they always take the closest crop — which
   is the view they were built in, at the scale they were built at. */
const bgStage = () => mode === 'live' ? stageIdx() : 0;

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
  /* A game that looks down at the pen paints every pixel of the screen itself,
     so baking and blitting a habitat behind it is work nobody sees. */
  if (mode === 'game' && GAMES[game.kind].top){ drawGame(now, phase); return; }
  const [sx, sy, sw, sh] = BG_CROP[bgStage()];
  ctx.drawImage(bakeBg(phase), sx, sy, sw, sh, 0, 0, W, H);

  /* Everything below is drawn live over the backdrop and knows nothing about
     it, which is what makes the place move. */
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
  drawGear(ctx, f, x, y, flip, S.hat, S.sp);

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
  snack: { name:'Snack run',  blurb:'Thirty seconds. Catch the food, dodge the rocks. Five in a row and each catch counts double.', hint:'Catch the food, dodge the rocks.', pay:1,
    start:() => ({x:W/2, tx:W/2, dir:-1, items:[], combo:0, spawn:.5, stun:0, kL:false, kR:false}),
    update:stepSnack, draw:drawSnack, input:inputSnack, finish:finishRound },
  /* `top` says the game paints the whole screen itself, looking down. Without
     it drawScene would bake and blit a habitat nobody is going to see. */
  forage:{ name:'Forage', blurb:'Food turns up across the pen and spoils where it lies. Tap to send your animal, and beat the compies to it.', hint:'Tap to send it. Beat the compies.', pay:1, top:true,
    start:() => ({x:W/2, y:(PEN.y0+PEN.y1)/2, tx:W/2, ty:(PEN.y0+PEN.y1)/2, head:0, dist:0,
                  walking:false, snap:0, boost:0, finds:[], thief:null, thiefAt:4,
                  chain:0, missed:0, spawn:.4, ground:'clearing'}),
    update:stepForage, draw:drawForage, input:(input) => { if (input.type === 'point') tapForage(input.x,input.y); }, finish:finishRound },
  guard:{ name:'Nest guard', blurb:'Compies come for the clutch from every side. Tap one to send your animal at it, and get the egg back off any that gets one.', hint:'Send it at the raiders.', pay:2, top:true,
    /* The animal starts in a corner, not on the clutch. Parked beside the nest
       its reach covers every approach, so standing still intercepted the whole
       round — the game has to be played from somewhere, and where you leave it
       standing is part of the decision. */
    start:() => ({x:PEN.x0 + 20, y:PEN.y1 - 18, tx:PEN.x0 + 20, ty:PEN.y1 - 18, head:0, dist:0,
                  walking:false, raiders:[], eggs:5, ends:0, chain:0, spawn:1.1, ground:'clearing'}),
    update:stepGuard, draw:drawGuard, input:(input) => { if (input.type === 'point') tapGuard(input.x,input.y); }, finish:finishRound },
  tug:  { name:'Tug of war', blurb:'A rival takes the other end of the vine. Pull when the grip is in the green, and do not slip.', hint:'Pull when the grip is green.', pay:2,
    start:() => ({pull:0, grip:0, winAt:.5, ends:0, chain:0, ready:0, hit:-999, slip:0, want:false}),
    update:stepTug, draw:drawTug,
    /* A tap only asks for a pull; stepTug decides when it happens. The input
       handler has no clock of its own, and reaching for the wall clock here put
       the cooldown on a different timebase from the round — which on a machine
       running faster than real time swallowed every pull after the first. */
    input:(input) => { if ((input.type === 'point' && !input.move) || (input.down && [' ','ArrowUp','w'].includes(input.key))) game.want = true; },
    finish:finishRound },
  leap: { name:'River leap', blurb:'Your animal runs. Tap anywhere to jump the logs and boulders coming at it.', hint:'Tap to jump.', pay:2,
    start:() => ({obs:[], y:0, vy:0, spawn:1.1, speed:78, run:0, stun:0}),
    update:stepLeap, draw:drawLeap, input:(input) => { if ((input.type === 'point' && !input.move) || (input.down && [' ','ArrowUp','w'].includes(input.key))) leapJump(); }, finish:finishRound }
};
function challengeWeek(now = Date.now()){ return Math.floor((now - Date.UTC(1970,0,5))/(7*24*HOUR)); }
function gameProfile(pet){
  const stage = stageIdx(pet), reach = pet.sp === 'brachio' ? 5 : pet.sp === 'trike' ? 3 : 0;
  return { speed:88-stage*6+(pet.sp === 'rex' ? 8 : pet.sp === 'brachio' ? -8 : 0),
    reach:10+stage*4+reach, catch:11+stage*2, jump:148-stage*3-(pet.sp === 'brachio' ? 6 : 0), stun:800-stage*100,
    runSpeed:78+stage*8+(pet.sp === 'rex' ? 6 : pet.sp === 'brachio' ? -6 : 0),
    /* What one well-timed pull is worth. A tyrannosaur hauls, a sauropod has
       the weight to anchor, and a hatchling of either has neither yet. */
    pull:.19+stage*.05+(pet.sp === 'rex' ? .025 : pet.sp === 'brachio' ? .015 : 0) };
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
  closeSheet(); hideBubble();
  mode = 'game'; feedFX = null;
  const week = challengeWeek();
  game = Object.assign({kind, score:0, left:30, pet:S, week, profile:gameProfile(S),
    recordKey:kind+':'+S.sp+':'+stageIdx(S), seed:seed ?? (week*97+Object.keys(GAMES).indexOf(kind)+1)}, GAMES[kind].start());
  if (kind === 'leap') game.speed = game.profile.runSpeed;
  /* Which floor, from the seed rather than from gameRandom: start() runs before
     `game` exists, and the weekly challenge compares scores, which it could not
     do if one player got the open clearing and another the reed beds. */
  if (kind === 'forage' || kind === 'guard') game.ground = FORAGE_GROUNDS[game.seed % FORAGE_GROUNDS.length];
  if (kind === 'tug') tugNewEnd();
  say(GAMES[kind].hint);
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
  if (game.score) SFX.coin();
  const said = game.score ? 'Scored ' + game.score + '. That is ' + earned + ' coins.'
                          : 'Nothing scored. Next time.';
  game = null; mode = 'live';
  say(said);              // after the mode flips, or it lands on a game that has stopped drawing
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
  /* A message during a round goes under the clock, in the bitmap font, on a
     plate the width of the line. The DOM bubble sat in the middle of the glass
     and covered the thing being played. */
  if (screenNote && Date.now() < screenNote.until){
    const line = fit(screenNote.text, W - 8);
    const wide = textW(line) + 6;
    ctx.fillStyle = screenNote.bad ? 'rgba(58,23,16,.92)' : 'rgba(16,26,24,.88)';
    ctx.fillRect(Math.round((W - wide)/2), 10, wide, 11);
    text(ctx, line, W/2, 12, screenNote.bad ? '#f0bba4' : '#e9e1cb', 'centre');
  }
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

   Looking down at the pen rather than across it.

   Side-on, this game had one axis. Every find sat on the same ground line, so
   "which one next" was only ever left or right, and the animal walked past two
   of them to reach the third. From above it is a floor: a find can be behind
   you, the compies come in from any edge, and the route between two finds is a
   decision rather than a direction.

   The animals are PIX sprites here, not the procedural side view, because a
   top-down animal is a different projection and no amount of turning the side
   one produces it. They live in `top.<species>.<a|b>`, which means the Pixels
   tab edits every one of them like any other sprite. They are drawn facing +x
   and rotated to the heading — a top-down sprite is the one kind that can be
   rotated honestly, because from directly above, turning the animal really is
   turning the picture.
   -------------------------------------------------------------------------- */
const FORAGE_LIFE = 3600;                      // how long a find sits before it spoils
const FORAGE_BOOST = 4200;                     // how long a burst of speed lasts
/* The floor, in screen pixels. Clear of the timer bar above and the score tag
   below, so nothing the player has to read sits under something drawn over it. */
const PEN = { x0: 6, y0: 12, x1: W - 6, y1: H - 20 };
const FORAGE_GROUNDS = ['clearing', 'mudflat', 'shore'];
const STAGE_TOP = [.62, .76, .9, 1.0];         // how big the animal draws, by age

/* Three floors, so a round does not always look like the last one. Which one
   comes up is drawn from the round's seed: a replayed seed is the same place,
   which the weekly challenge needs, since it compares scores and would not
   survive one player getting the open clearing and another the reed beds.

   Scatter is hash1 on a quantised input, never a thresholded sine — sampling a
   sine per column gives evenly spaced detail, and the eye reads even spacing as
   manufactured. Quantising the input is what makes a tuft a block a few pixels
   across rather than hatching. */
const penCache = new Map();
const PEN_ART = {
  clearing: { base:'#5b7a3f', dark:'#48642f', lit:'#6f9150', grit:'#3c5428',
              prop:'#3f5f2c', propLit:'#7ba455', rim:'#33481f' },
  mudflat:  { base:'#6b5637', dark:'#55432a', lit:'#84693f', grit:'#3f3120',
              prop:'#46603f', propLit:'#6d8a52', rim:'#3a2d1c' },
  shore:    { base:'#b3a276', dark:'#94855e', lit:'#c9b98d', grit:'#7a6c4b',
              prop:'#8d9a86', propLit:'#d6d2b4', rim:'#6d6045' }
};

function penCanvas(kind){
  if (penCache.has(kind)) return penCache.get(kind);
  const c = makeCv(W, H), g = readCtx(c), P = PEN_ART[kind];
  g.fillStyle = P.base; g.fillRect(0, 0, W, H);

  /* Patches first, so everything else lies on them: blocks of the darker and
     lighter ground on a six-pixel grid, which reads as areas of turf rather
     than as noise over a flat fill. */
  for (let i = 0; i < 170; i++){
    const r = hash1(i*2.3 + 11);
    if (r < .32) continue;
    const x = Math.floor(hash1(i*3.1) * (W/6)) * 6, y = Math.floor(hash1(i*7.7 + 40) * (H/6)) * 6;
    g.fillStyle = r < .64 ? P.dark : P.lit;
    g.fillRect(x, y, r > .88 ? 12 : 6, 6);
  }
  for (let i = 0; i < 430; i++){
    const x = Math.floor(hash1(i*1.7 + 3) * W), y = Math.floor(hash1(i*5.3 + 91) * H);
    g.fillStyle = hash1(i*9.1) < .5 ? P.grit : P.lit;
    g.fillRect(x, y, 1, 1);
  }

  /* One kind of prop each, scattered the same way and drawn differently: fern
     clumps on the clearing, reed tufts on the mud, shells on the sand. They are
     what tells you which place you are in at a glance. */
  for (let i = 0; i < 30; i++){
    const x = 10 + Math.floor(hash1(i*4.7) * (W - 20));
    const y = 16 + Math.floor(hash1(i*8.3 + 5) * (H - 40));
    if (kind === 'shore'){
      g.fillStyle = P.prop;    g.fillRect(x, y, 3, 2); g.fillRect(x+1, y-1, 2, 1);
      g.fillStyle = P.propLit; g.fillRect(x+1, y, 1, 1);
    } else {
      const n = 2 + Math.floor(hash1(i*1.9) * 3);
      for (let b = 0; b < n; b++){
        const len = 3 + Math.floor(hash1(i*3.3 + b*1.4) * 4);
        const bx = x + (b - (n-1)/2) * 3;
        g.fillStyle = P.prop;    g.fillRect(bx, y - len, 2, len + 1);
        g.fillStyle = P.propLit; g.fillRect(bx, y - len, 1, 2);
      }
    }
  }

  /* Boulders, the only thing on the floor with real weight: a flat fill, one
     hard lit edge along the top and a contact shadow under it. Nothing here is
     mirrored and no two are the same size. */
  for (let i = 0; i < 5; i++){
    const x = 16 + Math.floor(hash1(i*11.3 + 2) * (W - 40));
    const y = 24 + Math.floor(hash1(i*6.1 + 17) * (H - 60));
    const bw = 7 + Math.floor(hash1(i*2.9) * 7), bh = 5 + Math.floor(hash1(i*4.1 + 8) * 5);
    g.fillStyle = 'rgba(12,16,10,.30)'; g.fillRect(x+1, y+2, bw, bh);
    g.fillStyle = '#6c6a5e'; g.fillRect(x, y, bw, bh);
    g.fillStyle = '#8a887a'; g.fillRect(x, y, bw, 1);
    g.fillStyle = '#4c4b42'; g.fillRect(x, y+bh-1, bw, 1);
  }

  /* The rim. A pen needs an edge or the floor reads as a texture that happens
     to stop, and the player needs to know where the animal cannot go. */
  g.fillStyle = P.rim;
  g.fillRect(0, 0, W, PEN.y0 - 2); g.fillRect(0, PEN.y1 + 2, W, H - PEN.y1);
  g.fillRect(0, 0, PEN.x0 - 2, H);  g.fillRect(PEN.x1 + 2, 0, W - PEN.x1, H);
  g.fillStyle = P.grit;
  g.fillRect(PEN.x0 - 2, PEN.y0 - 2, PEN.x1 - PEN.x0 + 4, 1);
  g.fillRect(PEN.x0 - 2, PEN.y1 + 1, PEN.x1 - PEN.x0 + 4, 1);
  g.fillRect(PEN.x0 - 2, PEN.y0 - 2, 1, PEN.y1 - PEN.y0 + 4);
  g.fillRect(PEN.x1 + 1, PEN.y0 - 2, 1, PEN.y1 - PEN.y0 + 4);

  penCache.set(kind, c);
  return c;
}

/* Somewhere to put a new find: inside the pen, and not on top of one already
   there or under the animal's nose as it arrives. */
function forageSlot(){
  for (let tries = 0; tries < 16; tries++){
    const x = gameRandom(PEN.x0 + 10, PEN.x1 - 10), y = gameRandom(PEN.y0 + 10, PEN.y1 - 10);
    const clear = game.finds.every(f => Math.hypot(f.x - x, f.y - y) > 26)
               && Math.hypot(game.x - x, game.y - y) > 30;
    if (clear) return [x, y];
  }
  return [gameRandom(PEN.x0 + 10, PEN.x1 - 10), gameRandom(PEN.y0 + 10, PEN.y1 - 10)];
}

function stepForage(dt, now){
  const sec = dt / 1000;

  /* Run toward the last place the player pointed. Straight line, because the
     floor has nothing on it that blocks — the boulders are painted into the
     ground and an animal walking over one is cheaper to accept than a path
     solver is to write and to explain. */
  const boosting = now < game.boost;
  const speed = game.profile.speed * (boosting ? 1.55 : 1);
  const dx = game.tx - game.x, dy = game.ty - game.y;
  const d = Math.hypot(dx, dy);
  if (d > 1.5){
    const step = Math.min(d, speed * sec);
    game.x += dx/d * step;
    game.y += dy/d * step;
    game.head = Math.atan2(dy, dx);
    game.dist += step;
    game.walking = true;
  } else game.walking = false;
  game.x = clamp(game.x, PEN.x0 + 6, PEN.x1 - 6);
  game.y = clamp(game.y, PEN.y0 + 6, PEN.y1 - 6);

  // new finds. One in eight is a burst: worth a point like anything else, and
  // four seconds of speed on top, which is what makes a detour worth taking.
  game.spawn -= sec;
  if (game.spawn <= 0 && game.finds.length < 6){
    game.spawn = gameRandom(.55, 1.0);
    const [fx, fy] = forageSlot();
    const burst = gameRandom() < .13;
    game.finds.push({ x:fx, y:fy, id: burst ? 'cake' : gamePick(SPECIES[game.pet.sp].likes),
                      burst, age:0 });
  }
  for (const f of game.finds){
    f.age += dt;
    if (f.age > FORAGE_LIFE){ f.dead = true; game.missed++; game.chain = 0; }
  }

  /* Thieves. One at a time, aimed at whatever has been down longest — the find
     the player is most likely to have written off, which is what makes ignoring
     one a decision rather than an oversight. They come in from the nearest edge
     to their mark and leave the same way, and they are faster than any of the
     three animals you can raise. */
  game.thiefAt -= sec;
  if (!game.thief && game.thiefAt <= 0 && game.finds.length){
    const mark = game.finds.reduce((a, b) => (b.age > a.age ? b : a));
    const fromX = mark.x < W/2 ? PEN.x0 - 12 : PEN.x1 + 12;
    game.thief = { x:fromX, y:mark.y, mark, p:0, carry:false, head:0 };
  }
  if (game.thief){
    const t = game.thief;
    t.p += dt;
    const gx = t.carry ? (t.home < W/2 ? PEN.x0 - 16 : PEN.x1 + 16) : t.mark.x;
    const gy = t.carry ? t.y : t.mark.y;
    const tdx = gx - t.x, tdy = gy - t.y, td = Math.hypot(tdx, tdy) || 1;
    t.head = Math.atan2(tdy, tdx);
    t.x += tdx/td * 92 * sec;
    t.y += tdy/td * 92 * sec;
    if (!t.carry && td < 4){
      if (t.mark.dead){ game.thief = null; game.thiefAt = gameRandom(2.2, 4.2); }
      else { t.mark.dead = true; t.carry = true; t.home = t.x; game.missed++; game.chain = 0; SFX.pop(); }
    } else if (t.carry && (t.x < PEN.x0 - 14 || t.x > PEN.x1 + 14)){
      game.thief = null; game.thiefAt = gameRandom(2.2, 4.2);
    }
  }

  /* Reach, now a radius rather than a distance along a line. Everything is on
     one floor, so there is no axis a find can hide in. */
  const reach = game.profile.reach;
  for (const f of game.finds){
    if (f.dead) continue;
    if (Math.hypot(f.x - game.x, f.y - game.y) < reach){
      f.dead = true;
      game.chain++;
      game.score += game.chain >= 4 ? 2 : 1;
      game.snap = now + 260;
      if (f.burst){ game.boost = now + FORAGE_BOOST; SFX.coin(); }
      if (game.thief && game.thief.mark === f && !game.thief.carry){
        game.thief = null; game.thiefAt = gameRandom(2.2, 4.2);
      }
      SFX.chomp();
      emit('spark', f.x, f.y, 4, {col: f.burst ? '#e8d27a' : '#cfe0a8', vy:-8, g:0});
    }
  }
  game.finds = game.finds.filter(f => !f.dead);
  if (game.thief && game.thief.mark.dead && !game.thief.carry){
    game.thief = null; game.thiefAt = gameRandom(2.2, 4.2);
  }
}

/* A find: a scrape of turned earth with the item standing on it, and a ring
   that closes as it spoils. The ring rather than a bar, because from above a
   bar has no up to sit above — it is drawn around the thing it is about. */
function drawFind(g, f, now){
  const x = Math.round(f.x), y = Math.round(f.y), u = clamp(f.age / FORAGE_LIFE, 0, 1);
  g.fillStyle = '#5a3f22'; g.fillRect(x-6, y-3, 13, 7); g.fillRect(x-5, y-4, 11, 9);
  g.fillStyle = '#7a5a33'; g.fillRect(x-5, y-4, 11, 1);
  /* The item, drawn four times in near-black one pixel out before it is drawn
     properly. A green frond on green turf is otherwise invisible, and the item
     is the thing the player is aiming at. */
  const bob = u > .70 ? Math.round(Math.sin(now/90)) : 0;
  const ix = x - 4 + bob, iy = y - 9;
  for (const d of [[-1,0],[1,0],[0,-1],[0,1]]) drawItem(g, f.id, ix + d[0], iy + d[1], 1.5, '#16120b');
  drawItem(g, f.id, ix, iy, 1.5);
  if (f.burst){
    g.fillStyle = Math.sin(now/110) > 0 ? '#f2dd93' : '#e0ac48';
    for (const d of [[-8,0],[8,0],[0,-9],[0,7]]) g.fillRect(x + d[0], y + d[1], 1, 1);
  }
  // freshness: a square ring that loses a side as it goes
  const left = Math.round(20 * (1 - u));
  g.fillStyle = u > .70 ? '#e2704a' : u > .45 ? '#e8bd4e' : '#8cc46a';
  for (let i = 0; i < left; i++){
    const s = i % 20, hx = s < 6 ? x - 5 + s*2 : s < 10 ? x + 6 : s < 16 ? x + 5 - (s-10)*2 : x - 6;
    const hy = s < 6 ? y - 7 : s < 10 ? y - 7 + (s-6)*3 : s < 16 ? y + 5 : y + 5 - (s-16)*3;
    g.fillRect(hx, hy, 1, 1);
  }
}

/* A sprite seen from above, turned to face where it is going.

   The heading is snapped to sixteenths of a turn. Rotating pixel art by a free
   angle makes the outline crawl as the animal turns, which at this size looks
   like the sprite is boiling; sixteen steps is under twelve degrees of error,
   which nobody reads as wrong, and holds the picture still between steps. */
function drawTop(g, id, x, y, head, sc){
  const art = pixCanvas(id);
  const step = Math.PI/8;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.rotate(Math.round(head/step) * step);
  g.imageSmoothingEnabled = false;
  g.drawImage(art, -art.width/2*sc, -art.height/2*sc, art.width*sc, art.height*sc);
  g.restore();
}

function drawForage(now){
  ctx.drawImage(penCanvas(game.ground), 0, 0);
  for (const f of game.finds) drawFind(ctx, f, now);

  if (game.thief){
    const t = game.thief;
    drawTop(ctx, 'top.compy.' + (Math.floor(t.p/90) % 2 ? 'b' : 'a'), t.x, t.y, t.head, 1);
    if (t.carry){ ctx.fillStyle = '#cfe0a8'; ctx.fillRect(Math.round(t.x)-1, Math.round(t.y)-1, 3, 3); }
  }

  /* The animal. One sprite stride to one stride of ground, the same rule the
     habitat walk uses, so the legs do not skate when a burst speeds it up. */
  const sc = STAGE_TOP[stageIdx()];
  const frame = game.walking ? (Math.floor(game.dist / (11 * sc)) % 2 ? 'b' : 'a')
              : (now < game.snap ? 'b' : 'a');
  ctx.fillStyle = 'rgba(12,18,10,.26)';
  ctx.beginPath(); ctx.ellipse(Math.round(game.x), Math.round(game.y) + 2, 13*sc, 8*sc, 0, 0, 7); ctx.fill();
  if (now < game.boost){
    // a burst shows on the animal, not only in the speed
    ctx.fillStyle = Math.sin(now/70) > 0 ? 'rgba(240,214,120,.5)' : 'rgba(240,214,120,.22)';
    ctx.beginPath(); ctx.ellipse(Math.round(game.x), Math.round(game.y), 17*sc, 12*sc, 0, 0, 7); ctx.fill();
  }
  drawTop(ctx, 'top.' + S.sp + '.' + frame, game.x, game.y, game.head, sc);

  // where the animal has been told to go, so the order reads as an order
  if (game.walking){
    const tx = Math.round(game.tx), ty = Math.round(game.ty);
    ctx.fillStyle = 'rgba(223,236,190,.62)';
    ctx.fillRect(tx-4, ty, 3, 1); ctx.fillRect(tx+2, ty, 3, 1);
    ctx.fillRect(tx, ty-4, 1, 3); ctx.fillRect(tx, ty+2, 1, 3);
  }
  scoreTag('Found ' + game.score + (game.chain >= 4 ? '  x2' : '')
           + (now < game.boost ? '  fast' : ''));
}

function tapForage(mx, my){
  // tapping a find aims at the find; tapping the floor aims at the floor
  let best = null, bd = 16;
  for (const f of game.finds){
    const d = Math.hypot(f.x - mx, f.y - my);
    if (d < bd){ bd = d; best = f; }
  }
  game.tx = clamp(best ? best.x : mx, PEN.x0 + 6, PEN.x1 - 6);
  game.ty = clamp(best ? best.y : my, PEN.y0 + 6, PEN.y1 - 6);
}

/* ------ nest guard ------

   The other side of forage: the same floor, seen the same way, but the compies
   are not after the food any more and there is something behind you worth
   losing. Foraging is a routing problem — visit these in the best order before
   they spoil. This is triage: three are coming, you can reach two, and the one
   you ignore takes an egg.

   It shares the pen art and the top-down sprites with forage, which is most of
   why both exist: the projection was the expensive part and it now carries two
   games.
   -------------------------------------------------------------------------- */
const GUARD_EGGS = 5;
const NEST = { x: W/2, y: (PEN.y0 + PEN.y1)/2 };

function guardRaider(){
  /* In from an edge, aimed at the nest. Which edge is seeded, so a replayed
     round is the same round. */
  const side = Math.floor(gameRandom(0, 4));
  const along = gameRandom(.18, .82);
  const x = side === 0 ? PEN.x0 - 10 : side === 1 ? PEN.x1 + 10 : PEN.x0 + (PEN.x1-PEN.x0)*along;
  const y = side === 2 ? PEN.y0 - 10 : side === 3 ? PEN.y1 + 10 : PEN.y0 + (PEN.y1-PEN.y0)*along;
  /* Fast enough that not everything can be caught, which is what makes how
     much ground your animal covers matter at all. The ramp is capped: past a
     point a raider nothing can catch is not difficulty, it is a cutscene. */
  return { x, y, home:[x, y], p:0, head:0, carry:false,
           speed: gameRandom(70, 88) + Math.min(16, game.ends * 1.5) };
}

function stepGuard(dt, now){
  const sec = dt / 1000;

  /* `runSpeed`, not the pottering-about-the-pen speed. Guarding a nest is
     running, and it has to be a stat that grows: the pen speed falls with age
     while reach rises, the two cancel almost exactly, and a hatchling and an
     adult scored the same round — which is the definition of growth not
     mattering. Running and reach both grow, so age is worth something here. */
  const speed = game.profile.runSpeed;
  const dx = game.tx - game.x, dy = game.ty - game.y, d = Math.hypot(dx, dy);
  if (d > 1.5){
    const step = Math.min(d, speed * sec);
    game.x += dx/d * step; game.y += dy/d * step;
    game.head = Math.atan2(dy, dx);
    game.dist += step;
    game.walking = true;
  } else game.walking = false;
  game.x = clamp(game.x, PEN.x0 + 6, PEN.x1 - 6);
  game.y = clamp(game.y, PEN.y0 + 6, PEN.y1 - 6);

  /* They come faster as the round goes on, which is what stops a good player
     simply standing on the nest for thirty seconds. */
  game.spawn -= sec;
  if (game.spawn <= 0 && game.raiders.length < 4){
    game.spawn = Math.max(.85, gameRandom(1.5, 2.2) - game.ends * .045);
    game.ends++;
    game.raiders.push(guardRaider());
  }

  const reach = game.profile.reach;
  for (const r of game.raiders){
    r.p += dt;
    const gx = r.carry ? r.home[0] : NEST.x, gy = r.carry ? r.home[1] : NEST.y;
    const rdx = gx - r.x, rdy = gy - r.y, rd = Math.hypot(rdx, rdy) || 1;
    r.head = Math.atan2(rdy, rdx);
    r.x += rdx/rd * r.speed * sec;
    r.y += rdy/rd * r.speed * sec;

    // driven off: your animal got to it, carrying or not — and one with an egg
    // drops it, which is the save worth making
    if (Math.hypot(r.x - game.x, r.y - game.y) < reach){
      if (r.carry){ game.eggs = Math.min(GUARD_EGGS, game.eggs + 1); SFX.coin(); }
      else SFX.pop();
      r.gone = true;
      game.chain++;
      game.score += game.chain >= 4 ? 2 : 1;
      emit('spark', r.x, r.y, 4, {col:'#e8d27a', vy:-8, g:0});
      continue;
    }
    if (!r.carry && rd < 7){
      if (game.eggs > 0){ game.eggs--; r.carry = true; game.chain = 0; SFX.bonk();
                          emit('crumb', NEST.x, NEST.y, 5, {col:'#d8cfae', vy:-14, g:90}); }
      else r.carry = true;                       // nothing left to take; it leaves anyway
    }
    if (r.carry && (r.x < PEN.x0 - 12 || r.x > PEN.x1 + 12 || r.y < PEN.y0 - 12 || r.y > PEN.y1 + 12))
      r.gone = true;
  }
  game.raiders = game.raiders.filter(r => !r.gone);
}

function drawGuard(now){
  ctx.drawImage(penCanvas(game.ground), 0, 0);

  /* The nest: a ring of banked earth with the clutch in it. The eggs are the
     score you are protecting, so they are drawn as themselves and counted by
     being there rather than by a number somewhere else. */
  const nx = Math.round(NEST.x), ny = Math.round(NEST.y);
  ctx.fillStyle = '#4a3520';
  ctx.beginPath(); ctx.ellipse(nx, ny, 17, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b4f2e';
  ctx.beginPath(); ctx.ellipse(nx, ny, 14, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.ellipse(nx, ny + 1, 11, 7, 0, 0, 7); ctx.fill();
  for (let i = 0; i < game.eggs; i++){
    const a = i/GUARD_EGGS * Math.PI*2 + .4;
    const ex = nx + Math.round(Math.cos(a) * 6) - 2, ey = ny + Math.round(Math.sin(a) * 4) - 3;
    ctx.fillStyle = '#e4dcc0'; ctx.fillRect(ex, ey, 4, 5);
    ctx.fillStyle = '#f4efdb'; ctx.fillRect(ex, ey + 1, 1, 3);
    ctx.fillStyle = '#b3a888'; ctx.fillRect(ex, ey + 4, 4, 1);
  }

  for (const r of game.raiders){
    drawTop(ctx, 'top.compy.' + (Math.floor(r.p/90) % 2 ? 'b' : 'a'), r.x, r.y, r.head, 1);
    if (r.carry){ ctx.fillStyle = '#e4dcc0'; ctx.fillRect(Math.round(r.x)-1, Math.round(r.y)-1, 3, 4); }
  }

  const sc = STAGE_TOP[stageIdx()];
  const frame = game.walking ? (Math.floor(game.dist / (11 * sc)) % 2 ? 'b' : 'a') : 'a';
  ctx.fillStyle = 'rgba(12,18,10,.26)';
  ctx.beginPath(); ctx.ellipse(Math.round(game.x), Math.round(game.y) + 2, 13*sc, 8*sc, 0, 0, 7); ctx.fill();
  drawTop(ctx, 'top.' + S.sp + '.' + frame, game.x, game.y, game.head, sc);

  if (game.walking){
    const tx = Math.round(game.tx), ty = Math.round(game.ty);
    ctx.fillStyle = 'rgba(223,236,190,.62)';
    ctx.fillRect(tx-4, ty, 3, 1); ctx.fillRect(tx+2, ty, 3, 1);
    ctx.fillRect(tx, ty-4, 1, 3); ctx.fillRect(tx, ty+2, 1, 3);
  }
  scoreTag('Saw off ' + game.score + (game.chain >= 4 ? ' x2' : '') + '   eggs ' + game.eggs);
}

function tapGuard(mx, my){
  // tapping a raider aims at the raider; tapping the floor aims at the floor
  let best = null, bd = 18;
  for (const r of game.raiders){
    const d = Math.hypot(r.x - mx, r.y - my);
    if (d < bd){ bd = d; best = r; }
  }
  game.tx = clamp(best ? best.x : mx, PEN.x0 + 6, PEN.x1 - 6);
  game.ty = clamp(best ? best.y : my, PEN.y0 + 6, PEN.y1 - 6);
}

/* ------ tug ------

   The competitive one. Everything else in the pen is the animal against the
   clock; this is the animal against another animal, which is the only kind of
   score that means anything to anybody.

   The opponent is a rival of the same species at the same age in a different
   coat, so it is a fair match by construction and needs no art of its own —
   and so that when your animal wins it is because of what you did, not because
   it was given a smaller opponent.

   It is not a mash. Mashing rewards a fast finger and nothing else, is
   miserable on a phone, and cannot tell a hatchling from an adult. Instead the
   grip sweeps back and forth and a pull only counts for its full weight if it
   lands in the window: timing decides whether you pull, and the animal's own
   strength decides how much that pull is worth. Growing up widens the window
   and adds weight, so an adult both pulls harder and is easier to pull with.
   -------------------------------------------------------------------------- */
const TUG_SWEEP = 1000;            // ms for the grip to travel and come back
const TUG_COOLDOWN = 120;          // ms between pulls, so mashing cannot beat timing
const TUG_ROUND = 1.0;             // how far the knot has to travel to win an end

/* Where the window sits this end, from the round's own seed: a fixed window
   would be learned once and never looked at again. */
function tugNewEnd(){
  game.pull = 0;
  game.winAt = gameRandom(.18, .82);
  game.ends++;
}

function stepTug(dt, now){
  const P = game.profile;
  game.grip = (game.grip + dt / TUG_SWEEP) % 1;
  if (game.want){ game.want = false; tugPull(now); }
  /* The rival hauls steadily, and a little harder after every end it loses, so
     a good player meets a real opponent rather than running away with it. */
  game.pull += (0.14 + game.ends * 0.022) * dt / 1000;
  if (game.slip > 0) game.slip -= dt;

  if (game.pull >= TUG_ROUND){                    // dragged over: the rival takes the end
    SFX.bonk(); game.chain = 0;
    emit('crumb', 54, GROUND - 10, 6, {col:'#9b7a52', vy:-20, g:120});
    tugNewEnd();
  } else if (game.pull <= -TUG_ROUND){            // hauled in: the end is yours
    SFX.coin();
    game.chain++;
    game.score += game.chain >= 3 ? 2 : 1;
    emit('spark', W - 54, GROUND - 10, 7, {col:'#e8d27a'});
    tugNewEnd();
  }
}

/* One pull per tap, and never more often than the cooldown, so the game cannot
   be won by tapping faster than a person reasonably can. */
function tugPull(now){
  if (now < game.ready) return;
  game.ready = now + TUG_COOLDOWN;
  const half = tugWindow() / 2;
  const cursor = tugCursor();
  const good = Math.abs(cursor - game.winAt) < half;
  if (good){
    game.pull -= game.profile.pull;
    game.hit = now;
    SFX.pop();
  } else {
    /* A mistimed pull is a slip, and it costs. Without that, tapping at random
       is a slow win rather than a loss, and the window may as well not exist. */
    game.pull += game.profile.pull * .42;
    game.slip = 260;
    SFX.bonk();
  }
}
/* The cursor travels out and back rather than wrapping, so it is a grip
   tightening and loosening and not a bar that teleports home. */
const tugCursor = () => game.grip < .5 ? game.grip * 2 : 2 - game.grip * 2;
const tugWindow = () => .20 + stageIdx() * .03;

function drawTug(now){
  const phase = skyPhase(new Date());
  const midX = Math.round(W/2 - game.pull * 30);

  /* Both animals, leaning away from the vine. The rival is the same species at
     the same age in its second coat: a fair match, and no art of its own. */
  const st = stageIdx(), sp = S.sp;
  const coats = SKINS[sp] || [];
  const rivalCoat = (coats[1] || coats[0] || {id:'wild'}).id;
  const strain = now < game.hit + 180 ? 2 : 0;
  const mine  = frameOf(sp, st, 'wary', 0, false, S.skin);
  const yours = frameOf(sp, st, 'wary', 0, false, rivalCoat);

  const myX = 46 - Math.round(game.pull * 18) - strain;
  const rvX = W - 46 - Math.round(game.pull * 18);
  // yours faces +x, the rival faces −x: the sprite is drawn facing −x unflipped
  ctx.save(); ctx.translate(myX, GROUND); ctx.scale(-1, 1);
  ctx.drawImage(mine.cv, -mine.ox, -mine.oy);
  ctx.restore();
  ctx.drawImage(yours.cv, rvX - yours.ox, GROUND - yours.oy);

  /* The vine. Held at the height of the animal holding it, so a hatchling has
     it at its own head rather than over it, and it sags between the two of them
     and pulls straighter the harder the knot is being dragged — which is the
     whole state of the game in one line. */
  const y0 = GROUND - Math.round(mine.h * .52), sag = 7 * (1 - Math.abs(game.pull));
  ctx.strokeStyle = '#7a6134'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(myX + 6, y0);
  ctx.quadraticCurveTo(midX, y0 + sag * 2, rvX - 6, y0);
  ctx.stroke();
  ctx.fillStyle = game.slip > 0 ? '#c2603c' : '#d8c48a';
  ctx.fillRect(midX - 3, y0 + Math.round(sag) - 2, 7, 5);
  ctx.fillStyle = '#6b5430';
  ctx.fillRect(midX - 3, y0 + Math.round(sag) - 2, 7, 1);

  /* The centre line, so "which way is it going" is a fact and not a feeling. */
  ctx.fillStyle = 'rgba(233,225,203,.35)';
  ctx.fillRect(W/2, GROUND - 6, 1, 8);

  /* The grip. A track with the window marked on it and the cursor sweeping
     across, drawn along the bottom where the thumb already is — and starting
     clear of the score tag, which it was drawing straight through. */
  const tx = 62, tw = W - 70, ty = H - 15;
  ctx.fillStyle = 'rgba(16,26,24,.85)'; ctx.fillRect(tx - 2, ty - 2, tw + 4, 11);
  ctx.fillStyle = '#2b3a3f'; ctx.fillRect(tx, ty, tw, 7);
  const half = tugWindow() / 2;
  const wx = Math.round(tx + (game.winAt - half) * tw), ww = Math.max(3, Math.round(half * 2 * tw));
  ctx.fillStyle = '#3f7a4a'; ctx.fillRect(wx, ty, ww, 7);
  ctx.fillStyle = '#8cc46a'; ctx.fillRect(wx, ty, ww, 1);
  const cx = Math.round(tx + tugCursor() * tw);
  ctx.fillStyle = now < game.hit + 160 ? '#e8d27a' : '#e9e1cb';
  ctx.fillRect(cx - 1, ty - 2, 3, 11);

  scoreTag('Won ' + game.score + (game.chain >= 3 ? ' x2' : ''));
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
