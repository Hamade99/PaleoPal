const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  const context = vm.createContext({ console, Date, Math, performance, setTimeout, clearTimeout,
    document: { getElementById: () => ({getContext: () => ({}),
      classList: {add(){}, remove(){}, toggle(){}}}) } });
  for (const file of ['00-core.js', '00-art.js', '05-sim.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), context, { filename: file });
  }
  vm.runInContext('const drawRex = () => {}, drawTrike = () => {}, drawBrachio = () => {};', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/species/registry.js'), 'utf8'), context);
  vm.runInContext(`
    const BIOMES = BIOME_ART;
    const biomeId = (pet = S) => (pet && BIOMES[pet.biome] ? pet.biome : 'valley');
    const emit = () => {};
    G = freshGame(); S = G.pets[0]; S.sp = 'rex'; S.born = 1;
    G.sound = false;
  `, context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/06-render.js'), 'utf8'), context);
  vm.runInContext(`say = () => {}; const closeSheet = () => {}, closeScreen = () => {}, paintChrome = () => {}, refresh = () => {}, refreshLight = () => {};`, context);
  return code => vm.runInContext(code, context);
}

test('stride follows resolved species growth overrides', () => {
  const run = harness();
  assert.equal(run('Number.isFinite(strideCycle("rex", 0))'), true);
  assert.equal(run(`SPECIES_STAGE.rex[0] = {limb:2}; stageCache.clear();
    strideCycle('rex',0) === SPECIES.rex.strideBase * 2 * STAGE[0].s * .82`), true);
});

test('sleep window uses the historical timestamp', () => {
  const run = harness();
  assert.equal(run('isNight(new Date(2026, 8, 7, 23).getTime())'), true);
  assert.equal(run('isNight(new Date(2026, 8, 7, 12).getTime())'), false);
});

test('offline and active pets grow at the same rate', () => {
  const run = harness();
  const result = JSON.parse(run(`
    G.pets.push(JSON.parse(JSON.stringify(S)));
    simulateAll(MIN, true, new Date(2026, 8, 7, 12).getTime());
    JSON.stringify(G.pets.map(pet => pet.growth));
  `));
  assert.equal(result[0], result[1]);
  assert.equal(run('S === G.pets[G.active]'), true);
});

test('partial nested saves receive valid defaults', () => {
  const run = harness();
  assert.equal(run(`loadSave(JSON.stringify({v:2,pets:[{sp:'rex',needs:{hunger:25}}]})).game.pets[0].needs.energy`), 88);
});

test('unknown species save is rejected without losing the original', () => {
  const run = harness();
  assert.equal(run(`loadSave(JSON.stringify({v:2,pets:[{sp:'unknown'}]})).game`), null);
  assert.equal(run(`typeof loadSave('{broken').keep`), 'string');
});

test('overnight catch-up matches minute updates and dates its events historically', () => {
  const run = harness();
  const result = JSON.parse(run(`
    const start = new Date(2026, 8, 6, 20).getTime();
    G.lastTick = start; S.needs.energy = 32;
    const initial = JSON.stringify(G);
    advanceSimulation(start + 12*HOUR, false);
    const offline = JSON.stringify(G.pets);
    G = JSON.parse(initial); S = G.pets[0];
    for (let minute=1; minute<=720; minute++) advanceSimulation(start + minute*MIN, false);
    JSON.stringify({equal:offline === JSON.stringify(G.pets), dated:S.log.every(entry => entry.t <= start + 12*HOUR)});
  `));
  assert.equal(result.equal, true);
  assert.equal(result.dated, true);
});

test('invalid numeric fields cannot poison simulation', () => {
  const run = harness();
  assert.equal(run(`
    G = loadSave(JSON.stringify({v:2,coins:'bad',pets:[{sp:'rex',born:1,needs:{hunger:'oops'},traits:{tempo:99},ills:[{id:'fake'}]}]})).game;
    S = G.pets[0]; simulateAll(MIN, false);
    Object.values(S.needs).every(Number.isFinite) && Number.isFinite(G.coins) && S.ills.length === 0;
  `), true);
});

test('journal recovers juvenile studies and rewards once', () => {
  const run = harness();
  assert.equal(run(`S.growth=240; observePet(); observePet(); S.journal.length`),4);
  assert.equal(run(`S.owned.filter(id => id === 'frond').length`),1);
});

test('seeded games distinguish active and idle players for every species and age', () => {
  const run = harness();
  const results = JSON.parse(run(`
    function round(kind,species,growth,active,seed){
      S = freshPet(); S.sp=species; S.born=1; S.growth=growth; G.pets=[S]; G.coins=0; mode='live';
      startGame(kind,seed);
      for (let frame=0; game && frame<1802;frame++){
        if (active){
          if (kind === 'forage' && game.finds.length){
            const near=(item)=>Math.hypot(item.x-game.x,item.y-game.y);
            const target = game.finds.reduce((best,item) => near(item)<near(best) ? item : best);
            gameInput({type:'point',x:target.x,y:target.y});
          }
          if (kind === 'snack'){
            const candidates=game.items.filter(item => !item.rock && item.y<122).sort((first,second) => second.y-first.y);
            if (candidates[0]) gameInput({type:'point',x:candidates[0].x,y:100});
            const rock=game.items.find(item => item.rock && item.y>80 && item.y<130 && Math.abs(item.x-game.x)<game.profile.catch+5);
            if (rock) gameInput({type:'point',x:rock.x<W/2 ? rock.x+40 : rock.x-40,y:100});
          }
          if (kind === 'guard' && game.raiders.length){
            /* Go for whichever raider reaches the clutch first, which is the
               whole decision the game is made of. */
            const eta=(r)=>Math.hypot(r.x-W/2,r.y-(PEN.y0+PEN.y1)/2)/r.speed;
            const target=game.raiders.reduce((best,r) => eta(r)<eta(best) ? r : best);
            gameInput({type:'point',x:target.x,y:target.y});
          }
          if (kind === 'tug'){
            const half=(.20+stageIdx(S)*.03)/2;
            const cursor=game.grip<.5 ? game.grip*2 : 2-game.grip*2;
            if (Math.abs(cursor-game.winAt)<half*.8) gameInput({type:'point',x:100,y:100});
          }
          if (kind === 'leap'){
            const obstacle=game.obs.find(item => !item.past && item.x>54);
            if (obstacle && (obstacle.x-54)/game.speed<.34) gameInput({type:'point',x:100,y:100});
          }
        }
        stepGame(1000/60,frame*1000/60);
      }
      if (game) throw new Error('Round did not finish');
      return {coins:G.coins,score:S.records[kind+':'+species+':'+stageIdx(S)].best};
    }
    JSON.stringify([1,12345,89231].flatMap(seed => Object.keys(GAMES).flatMap(kind => Object.keys(SPECIES).flatMap(species => [0,240].map(growth =>
      ({kind,species,growth,seed,active:round(kind,species,growth,true,seed),idle:round(kind,species,growth,false,seed)}))))));
  `));
  for (const result of results) {
    assert.ok(result.active.score > result.idle.score + 4, JSON.stringify(result));
  }
  const totals = results.filter(result => result.seed === 1).map(result => {
    const rounds = results.filter(other => other.kind===result.kind && other.species===result.species && other.growth===result.growth);
    return {game:result.kind,species:result.species,stage:result.growth ? 'adult':'hatchling',
      active:rounds.reduce((sum,round) => sum+round.active.score,0), idle:rounds.reduce((sum,round) => sum+round.idle.score,0),
      coins:rounds.reduce((sum,round) => sum+round.active.coins,0)};
  });
  for (const juvenile of totals.filter(result => result.stage==='hatchling')) {
    const adult=totals.find(result => result.game===juvenile.game && result.species===juvenile.species && result.stage==='adult');
    assert.notEqual(juvenile.active,adult.active,juvenile.game+' '+juvenile.species+' growth must affect aggregate score');
  }
  console.table(totals);
});

/* The age badge is the one number on the glass that only goes up, so the
   awkward moments are worth pinning: the first hour, the day boundary, a clock
   that has gone backwards, and the point where the number needs grouping. */
test('the age badge reads in hours, then days, and never goes backwards', () => {
  const run=harness();
  const at=hours=>run(`S.born=Date.now()-${hours}*3600e3; ageLabel()`);
  assert.equal(at(0),'1 H','a just-hatched animal is never 0');
  assert.equal(at(0.4),'1 H');
  assert.equal(at(5),'5 H');
  assert.equal(at(23.9),'23 H','still hours right up to the day line');
  assert.equal(at(24),'1 D','and days from it');
  assert.equal(at(47.9),'1 D','a day is a whole day, not a rounded one');
  assert.equal(at(48),'2 D');
  assert.equal(at(24*1230),'1,230 D','grouped past a thousand');
  assert.equal(run(`S.born=Date.now()+9e6; ageLabel()`),'1 H','a clock nudged back cannot go negative');
  assert.equal(run(`S.born=Date.now()+9e6; ageDays()`),0);
  // and it is per pet, because the nest asks about animals that are not on screen
  assert.equal(run(`const other=freshPet(); other.born=Date.now()-72*3600e3;
    S.born=Date.now()-3600e3; ageLabel(other)+'/'+ageLabel()`),'3 D/1 H');
});

test('records reset weekly best without erasing lifetime best', () => {
  const run=harness();
  assert.equal(run(`
    const key='snack:rex:0';
    finishRound({pet:S,kind:'snack',left:0,week:1,recordKey:key,score:20});
    finishRound({pet:S,kind:'snack',left:0,week:2,recordKey:key,score:5});
    finishRound({pet:S,kind:'snack',left:1,week:2,recordKey:key,score:99});
    S.records[key].best===20 && S.records[key].weekly===5 && loadSave(JSON.stringify(G)).game.pets[0].records[key].weekly===5;
  `),true);
});

test('weekly challenge RNG is independent of cosmetic randomness', () => {
  const run=harness();
  assert.equal(run(`
    mode='live'; startGame('snack',77); const first=gameRandom(); game=null;
    Math.random(); Math.random(); startGame('snack',77); first===gameRandom();
  `),true);
});

/* Every art block claimed by the file the editor writes. A block the editor
   holds live but no file claims is written nowhere and silently lost on the
   next save, which is why edit-core checks the other direction at load. */
test('art data markers match the declaration they own', () => {
  const file='00-art.js';
  const source=fs.readFileSync(path.join(__dirname,'../src',file),'utf8');
  const names=[];
  for (const match of source.matchAll(/\/\*<data:(\w+)>\*\/\s*(?:const|let) (\w+)/g)) {
    assert.equal(match[1],match[2],file+' marker names its own declaration');
    names.push(match[1]);
  }
  assert.ok(names.length,file+' has marked data blocks');
  assert.equal(names.length,new Set(names).size,'no block is claimed twice');
  for (const required of ['HABITAT_ART','POSE_ART','PIX','STAGE'])
    assert.ok(names.includes(required),required+' is editable');

  const core=fs.readFileSync(path.join(__dirname,'../tools/edit-core.js'),'utf8');
  for (const name of names)
    assert.ok(core.includes("'"+name+"'"),name+' is claimed by a file in DATA_FILES');
});

/* The case is a 96x160 grid and the boxes on it are fractions of that grid.
   Written in two places — the art is drawn against cells, the stylesheet in
   percentages — and a hand-drawn faceplate is only worth drawing if they agree.
   Nothing at runtime would notice if they stopped: the screen would simply sit
   a little off the recess, which reads as a badly drawn case rather than as a
   bug in the game. */
test('the case grid and the boxes placed on it agree', () => {
  const art = fs.readFileSync(path.join(__dirname, '../src/00-art.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../src/style.css'), 'utf8');
  const head = /'case': \{ w:(\d+), h:(\d+),/.exec(art);
  assert.ok(head, 'PIX.case exists');
  const W = +head[1], H = +head[2];
  assert.deepEqual([W, H], [96, 155], 'the case grid is the size the layout assumes');
  const body = art.slice(art.indexOf("'case': {"));
  const rows = body.slice(body.indexOf('rows:['), body.indexOf('] },'))
    .split('\n').map(line => /'(.*)'/.exec(line)).filter(Boolean).map(m => m[1]);
  assert.equal(rows.length, H, 'the art has one row per cell');
  assert.ok(rows.every(r => r.length === W), 'every row is the full width');

  /* Every block for the selector, joined. A selector has more than one rule —
     `.bezel` is placed in one and emptied of its old paint in another — and
     they are not written the same way, so looking only at the first block found
     reads whichever happens to come first in the file. */
  const rule = sel => {
    const out = [];
    for (let at = css.indexOf(sel); at >= 0; at = css.indexOf(sel, at + 1)){
      const brace = css.indexOf('{', at);
      if (brace < 0 || css.slice(at + sel.length, brace).trim() !== '') continue;
      out.push(css.slice(brace, css.indexOf('}', brace)));
    }
    assert.ok(out.length, sel + ' has a rule');
    return out.join(';');
  };
  /* Literal patterns, built once. A pattern assembled from a string needs its
     backslashes doubled and it is the kind of thing that silently degrades into
     matching nothing — which in a test means passing for the wrong reason. */
  const PROP_RE = { left:/left\s*:\s*([\d.]+)%/, top:/top\s*:\s*([\d.]+)%/,
                    width:/width\s*:\s*([\d.]+)%/, height:/height\s*:\s*([\d.]+)%/ };
  const pct = (sel, prop) => {
    const m = PROP_RE[prop].exec(rule(sel));
    assert.ok(m, sel + ' sets ' + prop + ' as a percentage of the case');
    return parseFloat(m[1]);
  };
  const near = (got, want, what) =>
    assert.ok(Math.abs(got - want) < 0.01, what + ': ' + got + '% should be ' + want.toFixed(4) + '%');

  near(pct('.shellhead', 'left'),   5 / W * 100, 'head left');
  near(pct('.shellhead', 'top'),   14 / H * 100, 'head top');
  near(pct('.shellhead', 'width'), 86 / W * 100, 'head width');
  near(pct('.bezel', 'left'),    8 / W * 100, 'panel left');
  near(pct('.bezel', 'top'),    39 / H * 100, 'panel top');
  near(pct('.bezel', 'width'),  80 / W * 100, 'panel width');
  near(pct('.bezel', 'height'), 78 / H * 100, 'panel height');
  near(pct('.keys', 'left'),    7 / W * 100, 'keys left');
  near(pct('.keys', 'top'),   121 / H * 100, 'keys top');
  near(pct('.keys', 'width'),  82 / W * 100, 'keys width');

  /* The key row has to stay on the moulding. The shell's base is an ellipse
     with rx 42 and ry 24 centred at (54,136), and the row used to run to x92 at
     y152 where the curve had already pulled in to x85 — the outer keys hung off
     the case entirely. */
  const keyRight = 7 + 4*17 + 14, keyFoot = 121 + 4 + 16 + 1;
  const rx = 96*0.44, ry = (153-4)*0.15, cy = 153 - ry, cx = 96 - rx;
  const half = rx * Math.sqrt(1 - Math.pow((keyFoot - cy) / ry, 2));
  assert.ok(keyRight <= cx + half,
    'at y' + keyFoot + ' the shell reaches x' + (cx + half).toFixed(1)
    + ' but the keys run to x' + keyRight);
  assert.ok(7 >= 96 - (cx + half), 'and the left of the row is inside it too');
  // the recess is a fraction of the panel, which is 80 cells square
  near(pct('.stage', 'left'),    6 / 80 * 100, 'recess left');
  near(pct('.stage', 'top'),    21 / 78 * 100, 'recess top');
  near(pct('.stage', 'width'),  68 / 80 * 100, 'recess width');
  near(pct('.stage', 'height'), 52 / 78 * 100, 'recess height');

  /* The canvas must fit the recess at 1:1 on the smallest case anyone can be
     shown, or the glass would have to take a fractional scale — the one thing
     the pixel grid cannot survive. */
  const ui = fs.readFileSync(path.join(__dirname, '../src/08-ui.js'), 'utf8');
  const pxMin = parseFloat(/PX_MIN = ([\d.]+)/.exec(ui)[1]);
  assert.ok(68 * pxMin >= 224 && 52 * pxMin >= 168,
    'at PX_MIN=' + pxMin + ' the recess is ' + (68 * pxMin) + 'x' + (52 * pxMin)
    + ', too small for a 224x168 canvas');
});

/* Every crop has to be 4:3 and has to put the world's ground line on the
   screen's, or the animal walks above or below the grass at that stage. The
   numbers are also required to be whole: a fractional source rect samples on
   half pixels and softens the entire backdrop rather than only reducing it. */
test('every background crop is 4:3, whole-pixel, and lands on the ground line', () => {
  const core=fs.readFileSync(path.join(__dirname,'../src/00-core.js'),'utf8');
  const read=name=>Number(new RegExp(name+'\\s*=\\s*(-?\\d+)').exec(core)[1]);
  const W=read('const W'),H=read('H'),GROUND=read('GROUND'),BG_W=read('const BG_W'),BG_H=read('BG_H');
  const BG_G=GROUND+read('const BG_PAD_X = 28, BG_PAD_Y');
  const crops=JSON.parse('['+/const BG_CROP = \[([^\]]*(?:\][^\]]*)*?)\n\];/.exec(core)[1]
    .replace(/\/\/[^\n]*/g,'').replace(/\s+/g,'').replace(/,$/,'')+']');
  assert.equal(crops.length,4);
  assert.equal(BG_G,175);
  crops.forEach(([sx,sy,sw,sh],i)=>{
    assert.ok([sx,sy,sw,sh].every(Number.isInteger),'stage '+i+' crop is whole pixels');
    assert.equal(sw*H,sh*W,'stage '+i+' crop is 4:3');
    assert.equal((BG_G-sy)*H/sh,GROUND,'stage '+i+' puts the ground line at GROUND');
    assert.equal(sx*2+sw,BG_W,'stage '+i+' crop is horizontally centred');
    assert.ok(sx>=0&&sy>=0&&sx+sw<=BG_W&&sy+sh<=BG_H,'stage '+i+' crop is inside the world');
  });
  assert.deepEqual(crops[0],[BG_W-W>>1,BG_H-H-7,W,H],"the hatchling sees today's picture at 1:1");
  assert.deepEqual(crops[3],[0,0,BG_W,BG_H],'the adult sees all of it');
});

test('version values cannot wrap into the current version', () => {
  const run = harness();
  for (const version of [4294967298, -4294967294, 2.5, '2']) {
    assert.equal(run(`loadSave(JSON.stringify({v:${JSON.stringify(version)},pets:[{sp:'rex'}]})).game`),null);
  }
});

test('an active egg does not stop the inactive roster growing', () => {
  const run=harness();
  assert.equal(run(`
    const grownPet=S; G.pets=[freshPet(),grownPet];S=G.pets[0];
    G.lastTick=new Date(2026,8,7,12).getTime();advanceSimulation(G.lastTick+MIN,false);
    grownPet.growth>0 && S===G.pets[0] && !hatched(S);
  `),true);
});

test('canceling a food animation cannot lose or duplicate paid nutrition', () => {
  const run=harness();
  assert.equal(run(`
    mode='live';G.coins=100;S.needs.hunger=20;feed('meat');
    const hunger=S.needs.hunger,coins=G.coins;
    feedFX=null;stepFeed(2000);
    hunger>20 && S.needs.hunger===hunger && G.coins===coins && coins===100-FOODS.find(food => food.id==='meat').cost;
  `),true);
});