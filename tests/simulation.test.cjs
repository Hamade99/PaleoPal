const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  const context = vm.createContext({ console, Date, Math, performance, setTimeout, clearTimeout,
    document: { getElementById: () => ({getContext: () => ({})}) } });
  for (const file of ['00-core.js', '00-art.js', '05-sim.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), context, { filename: file });
  }
  vm.runInContext('const drawRex = () => {}, drawTrike = () => {}, drawBrachio = () => {};', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/species/registry.js'), 'utf8'), context);
  vm.runInContext(`
    const BIOMES = BIOME_ART;
    const biomeId = () => G.biome;
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
            const target = game.finds.reduce((best,item) => Math.abs(item.x-game.x)<Math.abs(best.x-game.x) ? item : best);
            gameInput({type:'point',x:target.x,y:GROUND});
          }
          if (kind === 'snack'){
            const candidates=game.items.filter(item => !item.rock && item.y<122).sort((first,second) => second.y-first.y);
            if (candidates[0]) gameInput({type:'point',x:candidates[0].x,y:100});
            const rock=game.items.find(item => item.rock && item.y>80 && item.y<130 && Math.abs(item.x-game.x)<game.profile.catch+5);
            if (rock) gameInput({type:'point',x:rock.x<W/2 ? rock.x+40 : rock.x-40,y:100});
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

test('art data markers match the declaration they own', () => {
  const source=fs.readFileSync(path.join(__dirname,'../src/00-art.js'),'utf8');
  const names=[];
  for (const match of source.matchAll(/\/\*<data:(\w+)>\*\/\s*const (\w+)/g)) {
    assert.equal(match[1],match[2]); names.push(match[1]);
  }
  assert.equal(names.length,new Set(names).size);
  assert.ok(names.includes('HABITAT_ART') && names.includes('POSE_ART'));
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