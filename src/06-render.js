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
let blinkAt = 0, blinking = false;

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
    swallow(feedFX.id);
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

  if (now > dino.until){ dino.tx = rnd(26, W-26); dino.until = now + rnd(2600, 6500) / trait('tempo').speed; }
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
let lastSceneAt = 0;
function drawScene(now){
  const dt = clamp(now - lastSceneAt, 0, 120); lastSceneAt = now;
  const phase = skyPhase(new Date());
  ctx.drawImage(bakeBg(phase), 0, 0);

  if (phase === 'night'){
    for (const s of STARS){
      const tw = Math.sin(now/520 + s.p);
      if (tw > .15){ ctx.fillStyle = tw > .8 ? '#ffffff' : 'rgba(232,228,200,.8)'; ctx.fillRect(s.x|0, s.y|0, 1, 1); }
    }
  }
  drawSkyBody(ctx, phase, now);
  drawClouds(ctx, phase, dt);
  drawFlyers(ctx, dt, now);
  drawWater(ctx, phase, now);
  if (phase !== 'night') drawMotes(ctx, dt, phase);

  if (mode === 'choose'){ drawChoose(now); drawFronds(ctx, phase, now); return; }
  if (mode === 'egg'){ drawEgg(now); drawFronds(ctx, phase, now); return; }
  if (mode === 'game'){ drawGame(now, phase); return; }
  drawLive(now);
  drawFronds(ctx, phase, now);
  const tint = SKY_SPECS[phase].tint;
  if (tint !== 'rgba(0,0,0,0)'){ ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
}

function drawChoose(now){
  const keys = ['rex','trike','brachio'], xs = [46, 112, 178];
  keys.forEach((k, i) => {
    const bounce = Math.sin(now/420 + i*2) * 2;
    drawEggArt(ctx, xs[i], GROUND - 16 + bounce, k, 0);
    ctx.fillStyle = 'rgba(16,26,24,.55)';
    ctx.beginPath(); ctx.ellipse(xs[i], GROUND + 1, 11, 3, 0, 0, 7); ctx.fill();
  });
}
function drawEggArt(g, cx, cy, spId, cracks){
  const tint = { rex:'#7e9c54', trike:'#ab7040', brachio:'#71958a' }[spId];
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
  egg.wob = Math.max(0, egg.wob - .06);
  ctx.fillStyle = 'rgba(16,26,24,.5)';
  ctx.beginPath(); ctx.ellipse(W/2, GROUND + 1, 12, 3, 0, 0, 7); ctx.fill();
  drawEggArt(ctx, W/2 + wob, GROUND - 16, S.sp, egg.cracks);
}

/* headgear rides the anchors the sprite hands back, so it sits on the skull or
   across the eyes rather than floating at a guessed offset */
function drawGear(g, f, x, y, flip){
  const place = (id, anchor, scale) => {
    if (!id || !HATS[id]) return;
    const art = HATS[id], w = art.width * scale, hgt = art.height * scale;
    const ax = flip ? x + (f.ox - anchor[0]) : x - f.ox + anchor[0];
    const ay = y - f.oy + anchor[1];
    g.save(); g.translate(Math.round(ax), Math.round(ay));
    if (flip) g.scale(-1, 1);
    g.drawImage(art, -w/2, -hgt, w, hgt);
    g.restore();
  };
  place(S.hat, f.hat, Math.max(.6, f.hs * 1.55));
  if (S.face && HATS[S.face]){
    const art = HATS[S.face], scale = Math.max(.5, f.eyeR * 3.6 / art.width);
    const w = art.width * scale, hgt = art.height * scale;
    const ax = flip ? x + (f.ox - f.eye[0]) : x - f.ox + f.eye[0];
    const ay = y - f.oy + f.eye[1];
    g.save(); g.translate(Math.round(ax), Math.round(ay));
    if (flip) g.scale(-1, 1);
    g.drawImage(art, -w*.42, -hgt*.55, w, hgt);
    g.restore();
  }
}

function drawLive(now){
  for (const m of S.mess){
    drawMess(ctx, m.x|0, GROUND - 1);
    const fx = m.x + Math.sin(now/280 + m.x) * 5, fy = GROUND - 12 + Math.cos(now/430 + m.x) * 2;
    ctx.fillStyle = '#2f2f2f'; ctx.fillRect(fx|0, fy|0, 1, 1);
    if (Math.random() < .01) emit('stink', m.x, GROUND - 6, 1, {vy:-12, life:1000});
  }
  if (now > blinkAt){ blinking = true; blinkAt = now + rnd(2400, 5200); setTimeout(() => blinking = false, 150); }

  const st = stageIdx(), a = anim.pick(), sp = SPECIES[S.sp];
  anim.t += 16;
  let fr;
  if (a === 'walk'){
    const cycle = Math.max(3, sp.strideBase * STAGE[st].limb * STAGE[st].s * sp.scale);
    fr = Math.floor((dino.dist / cycle) * POSES.walk.length);
  } else {
    const fps = a === 'eat' ? 220 : a === 'cheer' ? 200 : 900;
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

  if (S.asleep && Math.random() < .02) emit('bubbleZ', x + 10*(flip?-1:1), dinoTop + 4, 1, {vy:-14, vx:4, life:1500});
  if (hasIll('chill') && Math.random() < .012){ emit('spark', x - 14*dino.dir, dinoTop + 8, 2, {col:'#cfe0e8'}); SFX.sneeze(); }
  if (hasIll('mites') && Math.random() < .02) emit('crumb', x + rnd(-10,10), dinoTop + 10, 1, {col:'#8a7350', vy:-6, g:40});
  if (dino.dig > 0){ ctx.fillStyle='#8f6f4c'; ctx.fillRect(x - 16*dino.dir, GROUND-2, 6, 2); }

  if (S.asleep){ ctx.fillStyle = 'rgba(14,16,44,.28)'; ctx.fillRect(0, 0, W, H); }
  drawParts(ctx);
}

/* ============================== MINIGAMES ================================== */
const GAMES = {
  snack: { name:'Snack run',  blurb:'Thirty seconds. Catch the food, dodge the rocks. Five in a row and each catch counts double.', pay:2 },
  stomp: { name:'Bug hunt',   blurb:'Critters scurry across the pen. Tap each one before it reaches the edge.', pay:2 },
  leap:  { name:'River leap', blurb:'Your animal runs. Tap anywhere to jump the logs and boulders coming at it.', pay:3 }
};
function startGame(kind){
  if (S.asleep) return refuse(S.name + ' is asleep.');
  if (S.vet) return refuse(S.name + ' is in no state to play.');
  if (S.needs.energy < 12) return refuse('Too tired to run around.');
  closeSheet();
  mode = 'game'; feedFX = null;
  if (kind === 'snack') game = { kind, x:W/2, tx:W/2, items:[], score:0, combo:0, left:30, spawn:.5, stun:0, kL:false, kR:false };
  if (kind === 'stomp') game = { kind, bugs:[], score:0, missed:0, left:30, spawn:.6 };
  if (kind === 'leap')  game = { kind, obs:[], score:0, left:30, y:0, vy:0, spawn:1.1, speed:78, run:0, stun:0 };
  say(GAMES[kind].blurb.split('.')[0] + '.');
  paintChrome();
}
function endGame(){
  if (!game) return;
  const g = GAMES[game.kind], earned = game.score * g.pay;
  G.coins += earned;
  S.needs.joy = clamp(S.needs.joy + Math.min(34, game.score * 2.4), 0, 100);
  S.needs.energy = clamp(S.needs.energy - 7, 0, 100);
  S.bond = clamp(S.bond + (game.score > 8 ? 3 : 1), 0, 100);
  if (game.score > 8) logEvent('A good run at ' + g.name.toLowerCase() + ': ' + game.score + '.');
  say(game.score ? 'Scored ' + game.score + '. That is ' + earned + ' coins.' : 'Nothing scored. Next time.');
  if (game.score) SFX.coin();
  game = null; mode = 'live';
  paintChrome(); refresh();
}
function stepGame(dt, now){
  if (!game) return;
  game.left -= dt/1000;
  if (game.left <= 0) return endGame();
  if (game.kind === 'snack') return stepSnack(dt, now);
  if (game.kind === 'stomp') return stepStomp(dt, now);
  if (game.kind === 'leap')  return stepLeap(dt, now);
}
function drawGame(now, phase){
  if (game.kind === 'snack') drawSnack(now);
  if (game.kind === 'stomp') drawStomp(now);
  if (game.kind === 'leap')  drawLeap(now);
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
  if (game.kL) vx -= 110; if (game.kR) vx += 110;
  if (!vx) vx = clamp((game.tx - game.x) * 7, -135, 135);
  if (now < game.stun) vx = 0;
  game.x = clamp(game.x + vx * dt/1000, 18, W-18);
  game.spawn -= dt/1000;
  if (game.spawn <= 0){
    game.spawn = rnd(.42, .72);
    const sp = SPECIES[S.sp], rock = Math.random() < .22;
    game.items.push({ x: rnd(16, W-16), y: 4, vy: rnd(44, 62), id: rock ? 'rock' : pick(sp.likes.concat(['berry','fern'])), rock });
  }
  const mouthY = GROUND - 34;
  for (const it of game.items){
    it.y += it.vy * dt/1000;
    if (it.y > mouthY - 6 && it.y < mouthY + 22 && Math.abs(it.x - game.x) < 15){
      it.dead = true;
      if (it.rock){ game.combo = 0; game.stun = now + 750; SFX.bonk(); emit('spark', game.x, mouthY, 4, {col:'#e8c352'}); }
      else { game.combo++; game.score += game.combo >= 5 ? 2 : 1; SFX.chomp(); emit('spark', it.x, it.y, 3); }
    }
    if (it.y > GROUND){ it.dead = true; if (!it.rock) game.combo = 0; }
  }
  game.items = game.items.filter(i => !i.dead);
}
function drawSnack(now){
  for (const it of game.items) drawItem(ctx, it.id, it.x - 3, it.y - 2, 1.5);
  const { f, sc } = gameSprite(now < game.stun ? 'sick' : 'walk', Math.floor(now/130), 44);
  const flip = game.tx < game.x;
  ctx.save(); ctx.translate(Math.round(game.x), GROUND);
  if (flip) ctx.scale(-1,1);
  ctx.drawImage(f.cv, -f.ox*sc, -f.oy*sc, f.w*sc, f.h*sc);
  ctx.restore();
  scoreTag('Caught ' + game.score + (game.combo >= 5 ? '  x2' : ''));
}

/* ------ bug hunt ------ */
function drawBug(g, b, now){
  const wig = Math.sin(now/90 + b.x) * 1;
  if (b.type === 0){                            // millipede
    g.fillStyle = '#4a3a24';
    for (let i=0;i<5;i++) g.fillRect(b.x - i*3, b.y + (i%2?0:1) + wig, 3, 3);
    g.fillStyle = '#6f5836'; g.fillRect(b.x, b.y + wig, 3, 2);
    g.fillStyle = '#2a2118'; g.fillRect(b.x+3, b.y + wig, 1, 1);
  } else {                                      // dragonfly
    g.fillStyle = '#3a5c52'; g.fillRect(b.x - 6, b.y + wig, 9, 2);
    g.fillStyle = '#8fc4b8'; g.fillRect(b.x - 1, b.y + wig, 3, 2);
    const up = Math.sin(now/60) > 0;
    g.fillStyle = 'rgba(200,230,235,.75)';
    g.fillRect(b.x - 4, b.y - (up?3:-2) + wig, 6, 2);
  }
}
function stepStomp(dt, now){
  game.spawn -= dt/1000;
  if (game.spawn <= 0){
    game.spawn = rnd(.35, .7);
    const type = Math.random() < .5 ? 0 : 1;
    const dir = Math.random() < .5 ? 1 : -1;
    game.bugs.push({ x: dir > 0 ? -8 : W+8, y: type ? rnd(GROUND-38, GROUND-14) : rnd(GROUND+2, H-8),
                     vx: dir * rnd(28, 52) * (type ? 1.35 : 1), type });
  }
  for (const b of game.bugs){ b.x += b.vx * dt/1000; if (b.x < -14 || b.x > W+14) b.dead = true; }
  game.bugs = game.bugs.filter(b => !b.dead);
}
function drawStomp(now){
  const { f, sc } = gameSprite('idle', Math.floor(now/700), 44);
  ctx.save(); ctx.translate(34, GROUND); ctx.scale(-1, 1);
  ctx.drawImage(f.cv, -f.ox*sc, -f.oy*sc, f.w*sc, f.h*sc); ctx.restore();
  for (const b of game.bugs) drawBug(ctx, b, now);
  scoreTag('Caught ' + game.score);
}
function tapStomp(mx, my){
  for (const b of game.bugs){
    if (Math.abs(b.x - mx) < 11 && Math.abs(b.y - my) < 11){
      b.dead = true; game.score++; SFX.chomp();
      emit('spark', b.x, b.y, 4, {col:'#cfe0a8'});
      return;
    }
  }
  SFX.bonk();
}

/* ------ river leap ------ */
function stepLeap(dt, now){
  game.run += dt/1000 * game.speed;
  game.speed = Math.min(140, game.speed + dt/1000 * 3);
  game.vy += 340 * dt/1000;
  game.y = Math.min(0, game.y + game.vy * dt/1000);
  if (game.y === 0) game.vy = 0;
  game.spawn -= dt/1000;
  if (game.spawn <= 0){
    game.spawn = rnd(.85, 1.5) * (110 / game.speed);
    game.obs.push({ x: W + 12, kind: Math.random() < .5 ? 'log' : 'rock', hit:false, past:false });
  }
  for (const o of game.obs){
    o.x -= game.speed * dt/1000;
    if (!o.hit && Math.abs(o.x - 54) < 13 && game.y > -14){
      o.hit = true; game.speed = Math.max(70, game.speed * .7);
      game.stun = now + 500; SFX.bonk(); emit('crumb', 54, GROUND-8, 6, {col:'#9b7a52', vy:-20, g:120});
    }
    if (!o.past && o.x < 40){ o.past = true; if (!o.hit){ game.score++; SFX.coin(); } }
    if (o.x < -20) o.dead = true;
  }
  game.obs = game.obs.filter(o => !o.dead);
}
function leapJump(){
  if (!game || game.kind !== 'leap') return;
  if (game.y < -1) return;
  game.vy = -132; SFX.purr();
}
function drawLeap(now){
  // scrolling ground streaks sell the speed
  ctx.fillStyle = 'rgba(60,44,28,.5)';
  for (let i=0;i<14;i++){
    const x = ((i*22 - game.run) % (W+30) + W+30) % (W+30) - 15;
    ctx.fillRect(x, GROUND + 6 + (i%3)*6, 9, 2);
  }
  for (const o of game.obs){
    const x = Math.round(o.x);
    if (o.kind === 'log'){
      ctx.fillStyle = '#5d4426'; ctx.fillRect(x-11, GROUND-7, 22, 7);
      ctx.fillStyle = '#7b5c33'; ctx.fillRect(x-11, GROUND-7, 22, 2);
      ctx.fillStyle = '#3d2c18'; ctx.fillRect(x+8, GROUND-7, 3, 7);
    } else {
      ctx.fillStyle = '#5f5a4e'; ctx.fillRect(x-8, GROUND-11, 16, 11);
      ctx.fillStyle = '#7b7566'; ctx.fillRect(x-6, GROUND-11, 11, 3);
      ctx.fillStyle = '#3c382f'; ctx.fillRect(x+4, GROUND-8, 4, 8);
    }
  }
  const airborne = game.y < -2;
  const { f, sc } = gameSprite(now < game.stun ? 'sick' : airborne ? 'cheer' : 'walk',
                               airborne ? 0 : Math.floor(game.run / 9), 42);
  ctx.save(); ctx.translate(54, GROUND + Math.round(game.y));
  ctx.scale(-1, 1);
  ctx.drawImage(f.cv, -f.ox*sc, -f.oy*sc, f.w*sc, f.h*sc);
  ctx.restore();
  scoreTag('Cleared ' + game.score);
}

function scoreTag(text){
  ctx.font = '9px monospace';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(16,26,24,.82)'; ctx.fillRect(4, H - 17, w, 13);
  ctx.fillStyle = '#e9e1cb'; ctx.fillText(text, 9, H - 7);
}
