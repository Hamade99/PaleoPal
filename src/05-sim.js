/* ==========================================================================
   CARE SIM
   Every number runs on wall-clock time, so an animal ages identically whether
   the tab is focused, backgrounded, or closed for two days. The keeper holds a
   nest of up to six animals; all of them age, only one is on screen.
   ========================================================================== */

/* The save is the product. A player's streak, their named animals and the time
   they put in all live in this one blob, so nothing here may drop it on the
   floor. SAVE_KEY keeps its historical name so existing installs still find
   their data; the version now travels inside the save, not in the key. */
const SAVE_VERSION = 2;
const SAVE_KEY = 'paleopal:save:2';
const BACKUP_KEY = 'paleopal:save:backup';
const MAX_PETS = 6;

const FOODS = [
  { id:'fern',  name:'Fern frond',  cost:4,  fill:26, joy:3,  treat:false, note:'Cheap roughage. Herbivores love it.' },
  { id:'berry', name:'Ripe berries',cost:5,  fill:22, joy:6,  treat:false, note:'Sweet, small, gone in a second.' },
  { id:'cycad', name:'Cycad cone',  cost:7,  fill:34, joy:4,  treat:false, note:'Dense and filling. Takes a while to chew.' },
  { id:'fish',  name:'River fish',  cost:8,  fill:36, joy:5,  treat:false, note:'Oily and rich. Carnivores go quiet for it.' },
  { id:'meat',  name:'Haunch',      cost:12, fill:48, joy:7,  treat:false, note:'A full meal. Expensive.' },
  { id:'cake',  name:'Honey cake',  cost:10, fill:10, joy:22, treat:true,  note:'A treat. Three in an hour and the stomach protests.' }
];
const REMEDIES = [
  { id:'ginger', name:'Ginger root',  cost:12, cures:'bellyache', note:'Settles a churning stomach.' },
  { id:'broth',  name:'Warm broth',   cost:10, cures:'chill',     note:'For shivering and sneezing.' },
  { id:'dust',   name:'Dust bath',    cost:8,  cures:'mites',     note:'Grit works the parasites out of the skin.' },
  { id:'company',name:'Sit together', cost:0,  cures:'blues',     note:'No cure in a bottle. Just time and attention.' }
];
const ILLS = {
  bellyache:{ name:'Bellyache',  symptom:'Puffed up and turning away from food.',       drain:'hunger' },
  chill:    { name:'Chill',      symptom:'Shivering, and sneezing every few seconds.',  drain:'energy' },
  mites:    { name:'Skin mites', symptom:'Scratching constantly. The flies stay close.',drain:'hygiene' },
  blues:    { name:'The blues',  symptom:'Head low, tail still, no interest in play.',  drain:'joy' }
};
const HAT_SHOP = [
  { id:'frond',   name:'Fern sprig',   cost:20,  slot:'head' },
  { id:'goggles', name:'Dig goggles',  cost:45,  slot:'face' },
  { id:'cap',     name:'Field cap',    cost:70,  slot:'head' },
  { id:'cone',    name:'Party cone',   cost:95,  slot:'head' },
  { id:'hardhat', name:'Site helmet',  cost:130, slot:'head' },
  { id:'crown',   name:'Bone crown',   cost:200, slot:'head' }
];
const TRAITS = {
  appetite:[ {id:'greedy', name:'Bottomless', note:'Gets hungry fast and never says no.', hunger:1.35, foodJoy:1.0},
             {id:'picky',  name:'Particular', note:'Eats slowly, and only really enjoys its favourites.', hunger:.78, foodJoy:.7} ],
  tempo:   [ {id:'spirited',name:'Spirited',  note:'Never stops moving. Burns energy quickly.', energy:1.3, speed:1.35, joy:1.15},
             {id:'placid',  name:'Placid',    note:'Content to stand and watch the clouds.',    energy:.75, speed:.7,  joy:.85} ],
  social:  [ {id:'bold',   name:'Bold',       note:'Comes straight over when you reach in.',    bond:1.25, lonely:.8},
             {id:'shy',    name:'Cautious',   note:'Takes longer to trust, then never lets go.',bond:.75, lonely:1.3} ]
};
const NAMES = ['Pebble','Norbert','Tiny','Bonk','Fern','Cleo','Spike','Dot','Pip','Tank','Mochi','Juniper','Rust','Marrow','Basil','Willow','Grub','Tuck'];
const GROWTH_GATES = [20, 90, 240];      // minutes of well-cared-for time

/* sleep window, in local hours */
const BED_HOUR = 21, WAKE_HOUR = 6;
const ENERGY_AWAKE = 8.5, ENERGY_ASLEEP = 20;   // points per hour
/* How long an animal woken by hand stays up before the night rule may put it
   back under. Without it, waking a tired animal at night was undone by the
   very next tick half a second later, which is what made sleep feel like a
   state the player had no handle on at all: a starving, filthy animal could
   not be fed or washed, and nothing you pressed changed that. */
const WAKE_GRACE = 20 * MIN;

let G = null, S = null;

function freshPet(){
  return {
    sp:null, name:'', born:0, growth:0, hat:null, face:null, owned:[], skin:'wild', skinsOwned:['wild'],
    needs:{ hunger:78, energy:88, hygiene:100, joy:70 },
    health:100, bond:6, vet:false,
    traits:{ appetite:0, tempo:0, social:0 },
    asleep:false, ills:[], treats:[], mess:[], log:[],
    nightAwake:0, petBank:0, stageSeen:0, messTimer:0, wokeAt:0
  };
}
function freshGame(){
  /* The habitat is on the keeper, not on the pet: it is the enclosure, and
     every animal in the nest is standing in it. Coats and headgear are on the
     animal because they are the animal's. */
  return { v:SAVE_VERSION, pets:[freshPet()], active:0, coins:24, sound:true, dev:true, lastDay:'', streak:0,
           biome:'valley', biomesOwned:['valley'],
           lastTick:Date.now(), lastSeen:Date.now() };
}

/* --------------------------- loading a save --------------------------------
   Adding a field needs no migration: Object.assign over freshGame/freshPet
   already fills in anything a older save is missing. A migration is only for
   a change that reshapes or reinterprets existing data.

   Each entry is keyed by the version it reads and must return the save one
   version further on, with o.v updated:

     MIGRATIONS[2] = o => { o.pets.forEach(p => p.joy = p.happy); o.v = 3; return o; };

   Nothing is registered yet; version 2 is the first schema that shipped.
   -------------------------------------------------------------------------- */
const MIGRATIONS = {};

/* Returns { game, why, keep, from }. `game` is null when the save could not be
   used, and then `why` completes the sentence "Your saved nest ..." and `keep`
   holds the original text so the caller can park it somewhere safe. */
function loadSave(raw){
  const fail = why => ({ game:null, why, keep:raw, from:null });
  if (!raw) return { game:null, why:null, keep:null, from:null };

  let o;
  try { o = JSON.parse(raw); } catch(e){ return fail('could not be read'); }
  if (!o || typeof o !== 'object') return fail('was not in a shape the game understands');

  const from = o.v | 0;
  if (from > SAVE_VERSION) return fail('was written by a newer version of the game');

  let v = from;
  while (v < SAVE_VERSION){
    const step = MIGRATIONS[v];
    if (!step) return fail('is version ' + v + ', which this build cannot upgrade');
    o = step(o);
    if (!o || (o.v | 0) <= v) return fail('stalled while upgrading from version ' + v);
    v = o.v | 0;
  }

  if (!Array.isArray(o.pets) || !o.pets.length) return fail('had no animals in it');

  const g = Object.assign(freshGame(), o);
  g.pets = o.pets.map(p => Object.assign(freshPet(), p));
  g.active = clamp(o.active | 0, 0, g.pets.length - 1);
  g.v = SAVE_VERSION;
  return { game:g, why:null, keep:null, from };
}
const trait = k => TRAITS[k][S.traits[k]];
const hatched = () => !!S && !!S.sp && !!S.born;
const stageIdx = () => S.growth < GROWTH_GATES[0] ? 0 : S.growth < GROWTH_GATES[1] ? 1 : S.growth < GROWTH_GATES[2] ? 2 : 3;
const bondPips = () => clamp(Math.floor(S.bond/20), 0, 5);
const ageDays  = () => (Date.now()-S.born)/86400e3;
const hasIll   = id => S.ills.some(i => i.id === id);
const isNight  = () => { const h = new Date().getHours(); return h >= BED_HOUR || h < WAKE_HOUR; };

function logEvent(txt){
  S.log.unshift({ t:Date.now(), txt });
  if (S.log.length > 60) S.log.length = 60;
}
function careScore(){
  const n = S.needs;
  return clamp((n.hunger + n.energy + n.hygiene + n.joy) / 400, 0, 1);
}
function moodOf(){
  if (!hatched()) return { key:'egg', line:'The egg is warm.' };
  if (S.vet) return { key:'ill', line:'is too weak to stand. Take it to the vet.' };
  if (S.asleep) return { key:'sleep', line:'is fast asleep.' };
  const ill = S.ills[0];
  if (ill) return { key:'ill', line:'is unwell. ' + ILLS[ill.id].symptom };
  const n = S.needs;
  if (n.hunger < 22) return { key:'hungry', line:'is hungry enough to nose at the dirt.' };
  if (n.energy < 20) return { key:'tired',  line:'keeps blinking slowly. It needs sleep.' };
  if (n.hygiene < 25)return { key:'dirty',  line:'smells, honestly. The flies agree.' };
  if (n.joy < 25)    return { key:'bored',  line:'is bored and keeps looking at you.' };
  if (careScore() > .82 && S.bond > 55) return { key:'happy', line:'is delighted with everything.' };
  if (careScore() > .6) return { key:'content', line:'is content.' };
  return { key:'meh', line:'is getting by.' };
}

/* ------------------------------ the tick ---------------------------------- */
function simulateAll(ms, online){
  const keep = G.active;
  for (let i=0;i<G.pets.length;i++){ S = G.pets[i]; simulate(ms, online && i === keep); }
  S = G.pets[keep];
}
function simulate(ms, online){
  if (!hatched() || ms <= 0) return;
  const h = ms / HOUR, n = S.needs;
  const tA = trait('appetite'), tT = trait('tempo'), tS = trait('social');
  const asleep = S.asleep;

  n.hunger  = clamp(n.hunger  - 7.5 * tA.hunger * h * (asleep ? .45 : 1), 0, 100);
  n.hygiene = clamp(n.hygiene - 4.0 * h * (asleep ? .5 : 1), 0, 100);
  n.joy     = clamp(n.joy     - 6.0 * tT.joy * h * (asleep ? .3 : 1) * tS.lonely, 0, 100);
  n.energy  = asleep ? clamp(n.energy + ENERGY_ASLEEP * h, 0, 100)
                     : clamp(n.energy - ENERGY_AWAKE * tT.energy * h, 0, 100);

  if (!asleep && isNight()) S.nightAwake += h; else S.nightAwake = Math.max(0, S.nightAwake - h*.5);

  const roll = perHour => Math.random() < 1 - Math.pow(1 - clamp(perHour,0,.95), h);
  S.treats = S.treats.filter(t => Date.now() - t < HOUR);
  if (!hasIll('bellyache') && S.treats.length >= 3 && roll(.6)) fallIll('bellyache');
  if (!hasIll('chill')     && S.nightAwake > 2   && roll(.35)) fallIll('chill');
  if (!hasIll('mites')     && n.hygiene < 20     && roll(.5))  fallIll('mites');
  if (!hasIll('blues')     && n.joy < 15         && roll(.4))  fallIll('blues');

  const ill = S.ills.length;
  if (ill) S.health = clamp(S.health - 7 * ill * h, 0, 100);
  else if (careScore() > .55) S.health = clamp(S.health + 9 * h, 0, 100);
  else if (careScore() < .3)  S.health = clamp(S.health - 5 * h, 0, 100);
  if (S.health <= 0 && !S.vet){ S.vet = true; S.asleep = true; logEvent(S.name + ' collapsed. It needs a vet.'); }

  const worst = Math.min(n.hunger, n.energy, n.hygiene, n.joy);
  if (worst < 15) S.bond = clamp(S.bond - 3 * h, 0, 100);
  else if (careScore() > .75) S.bond = clamp(S.bond + 1.2 * tS.bond * h, 0, 100);

  const cs = careScore();
  const rate = S.vet ? 0 : cs > .6 ? 1 : cs > .35 ? .5 : .12;
  S.growth += (ms/MIN) * rate * (online ? 1 : .55);

  if (!asleep && !S.vet){
    S.messTimer = (S.messTimer || rnd(18,32)*MIN) - ms;
    if (S.messTimer <= 0 && S.mess.length < 4){
      S.mess.push({ x: rnd(28, W-28) });
      n.hygiene = clamp(n.hygiene - 11, 0, 100);
      S.messTimer = rnd(22,40)*MIN;
      if (online){ say('Oops.'); SFX.pop(); }
    }
  }

  /* Bedtime. An animal woken by hand gets WAKE_GRACE before the night rule
     may take it back, so there is time to feed, wash and play — which is the
     only reason anyone wakes one. Running the tank right down still overrules
     that: at six energy it drops wherever it stands, grace or no grace. */
  const sleepy = isNight();
  const justWoken = Date.now() - (S.wokeAt || 0) < WAKE_GRACE;
  if (!asleep && (n.energy <= 6 || (sleepy && n.energy < 30 && !justWoken))) setSleep(true, online);
  if (asleep && !S.vet && n.energy >= 99) setSleep(false, online);
  if (asleep && !S.vet && !sleepy && n.energy > 72) setSleep(false, online);

  const st = stageIdx();
  if (st !== S.stageSeen){
    S.stageSeen = st;
    logEvent(S.name + ' is now ' + article(STAGE[st].label) + STAGE[st].label.toLowerCase() + '.');
    if (online){ say(S.name + ' grew into ' + article(STAGE[st].label) + STAGE[st].label.toLowerCase() + '!'); SFX.roar(); emit('heart', dino.x, GROUND-40, 8); }
  }
}
function fallIll(id){
  S.ills.push({ id, since: Date.now() });
  logEvent(S.name + ' came down with ' + ILLS[id].name.toLowerCase() + '.');
}
function setSleep(v, online){
  if (S.asleep === v) return;
  S.asleep = v;
  if (v){ if (online){ say('Yawn.'); SFX.yawn(); } }
  else   { if (online){ say('Morning.'); } }
}

/* --------------------------- player actions -------------------------------- */
function feed(id){
  const f = FOODS.find(x => x.id === id), sp = SPECIES[S.sp];
  if (G.coins < f.cost) return refuse('Not enough coins. Dig, or win it at the games.');
  if (S.asleep) return refuse(S.name + ' is asleep.');
  if (hasIll('bellyache')) return refuse(S.name + ' turns away from it. Settle the stomach first.');
  if (S.needs.hunger > 94) return refuse(S.name + ' is full.');
  G.coins -= f.cost;
  closeScreen();                                  // back to the habitat to watch it land
  tossFood(id);                                   // the food arcs in; effects land on the bite
  refreshLight();
}
function swallow(id){
  const f = FOODS.find(x => x.id === id), sp = SPECIES[S.sp];
  const loved = sp.likes.includes(id), hated = sp.dislikes.includes(id);
  const tA = trait('appetite');
  S.needs.hunger = clamp(S.needs.hunger + f.fill * (hated ? .5 : 1), 0, 100);
  S.needs.joy = clamp(S.needs.joy + (f.joy + (loved ? 9 : hated ? -6 : 0)) * tA.foodJoy, 0, 100);
  if (loved){ S.bond = clamp(S.bond + 1.5, 0, 100); emit('heart', dino.x, dinoTop - 4, 3, {vy:-16}); }
  if (f.treat) S.treats.push(Date.now());
  S.tally = S.tally || {};
  S.tally.meals = (S.tally.meals || 0) + 1;
  say(loved ? 'Its favourite. Gone in one gulp.' : hated ? 'It eats it. Slowly. Resentfully.' : 'Nom.');
  refresh();
}
function scrub(){
  if (S.asleep) return refuse(S.name + ' is asleep.');
  const n = S.mess.length;
  S.mess.forEach(m => emit('spark', m.x, GROUND-6, 4));
  S.mess = [];
  G.coins += n;
  S.needs.hygiene = clamp(S.needs.hygiene + 22 + n*10, 0, 100);
  S.needs.joy = clamp(S.needs.joy + 4, 0, 100);
  SFX.wash();
  say(n ? 'Scrubbed clean. Found ' + n + ' coin' + (n>1?'s':'') + ' in the muck.' : 'A good rinse.');
  emit('spark', dino.x, GROUND-30, 8);
  refresh();
}
/* `at` is the point in canvas units that was actually touched. Hearts used to
   come off a fixed spot above the sprite, which read as unrelated to the tap;
   they now rise from under the finger. */
function pet(at){
  if (!hatched() || S.asleep || S.vet) return;
  const now = performance.now();
  if (now - (S.lastPetAt||0) < 320) return;
  S.lastPetAt = now;
  S.petBank++;
  const gain = clamp(1.1 - S.bond/160, .25, 1.1) * trait('social').bond;
  S.bond = clamp(S.bond + gain, 0, 100);
  S.needs.joy = clamp(S.needs.joy + 1.6, 0, 100);
  const hx = at ? at[0] : dino.x, hy = at ? at[1] : dinoTop - 4;
  emit('heart', hx - 3, hy - 6, 1, {vx:5, vy:-19, life:1000});
  SFX.purr();
  if (hasIll('blues') && S.petBank >= 8) cure('company', true);
  refreshLight();
}
function tuckIn(){
  if (!hatched()) return;
  if (S.vet) return refuse(S.name + ' is already down.');
  if (S.asleep) return refuse(S.name + ' is already asleep.');
  if (S.needs.energy > 70) return refuse('Too wide awake to settle. Try below 70 energy.');
  setSleep(true, true);
  S.bond = clamp(S.bond + 1.5, 0, 100);
  S.nightAwake = 0;
  S.wokeAt = 0;
  say(S.name + ' curls up and goes out like a light.');
  refresh();
}
/* The other half of the switch, and the one that was missing entirely: an
   animal put itself to sleep and there was no way to get it back. It could be
   starving, filthy and asleep at once, and every key that would have fixed
   that refused because it was asleep.

   Waking costs, because sleep is how energy comes back and the animal went
   under for a reason. It loses a little of what it had banked and a little
   trust, and at night it starts running up the late-hours count — the same
   field a player who keeps their animal up past bedtime fills, and the one
   that brings on a chill. The cost is a consequence of a decision, not a
   die roll. */
function wakeUp(){
  if (!hatched()) return;
  if (S.vet) return refuse(S.name + ' has not fallen asleep. It has collapsed, and needs a vet.');
  if (!S.asleep) return refuse(S.name + ' is already awake.');
  setSleep(false, true);
  S.wokeAt = Date.now();
  S.needs.energy = clamp(S.needs.energy - 4, 0, 100);
  S.bond = clamp(S.bond - 2, 0, 100);
  if (isNight()) S.nightAwake += .5;
  logEvent(S.name + ' was woken early.');
  say(S.name + ' blinks awake, and is not impressed.');
  refresh();
}
function treat(remedyId){
  const r = REMEDIES.find(x => x.id === remedyId);
  if (G.coins < r.cost) return refuse('Not enough coins.');
  if (!S.ills.length) return refuse('Nothing to treat. ' + S.name + ' is well.');
  if (hasIll(r.cures)) return cure(remedyId);
  G.coins -= r.cost;
  S.bond = clamp(S.bond - 2, 0, 100);
  SFX.bonk();
  say('That was not it. ' + S.name + ' looks no better.');
  logEvent('Tried ' + r.name.toLowerCase() + '. Wrong call.');
  refresh();
}
function cure(remedyId, free){
  const r = REMEDIES.find(x => x.id === remedyId);
  if (!free) G.coins -= r.cost;
  S.ills = S.ills.filter(i => i.id !== r.cures);
  S.health = clamp(S.health + 30, 0, 100);
  S.bond = clamp(S.bond + 4, 0, 100);
  S.petBank = 0;
  if (r.cures === 'chill') S.nightAwake = 0;
  if (r.cures === 'mites') S.needs.hygiene = clamp(S.needs.hygiene + 30, 0, 100);
  if (r.cures === 'blues') S.needs.joy = clamp(S.needs.joy + 25, 0, 100);
  SFX.hatch();
  anim.play('cheer', 1400);
  emit('heart', dino.x, GROUND-40, 6);
  say(S.name + ' shakes it off. That was the right call.');
  logEvent('Cured ' + ILLS[r.cures].name.toLowerCase() + '.');
  refresh();
}
function vetVisit(){
  if (G.coins < 30) return refuse('The vet costs 30 coins.');
  G.coins -= 30; S.vet = false; S.health = 60; S.ills = [];
  S.needs.hunger = Math.max(S.needs.hunger, 50);
  S.needs.joy = Math.max(S.needs.joy, 40);
  S.bond = clamp(S.bond - 5, 0, 100);
  setSleep(false, true);
  logEvent('Came home from the vet.');
  say(S.name + ' is home and steady again.');
  refresh();
}
function buyHat(id){
  const h = HAT_SHOP.find(x => x.id === id), slot = h.slot;
  if (S.owned.includes(id)){ S[slot] = S[slot] === id ? null : id; SFX.pop(); refresh(); return; }
  if (G.coins < h.cost) return refuse('Not enough coins.');
  G.coins -= h.cost; S.owned.push(id); S[slot] = id;
  SFX.coin(); say('Suits it.');
  refresh();
}
function buySkin(id){
  const k = skinOf(S.sp, id);
  if (S.skinsOwned.includes(id)){
    S.skin = id; SFX.pop(); say(S.name + ' tries on ' + k.name.toLowerCase() + '.');
    refresh(); return;
  }
  if (G.coins < k.cost) return refuse('Not enough coins.');
  G.coins -= k.cost; S.skinsOwned.push(id); S.skin = id;
  SFX.coin(); say('A whole new coat.');
  logEvent('Unlocked the ' + k.name.toLowerCase() + ' coat.');
  refresh();
}
/* Habitats. Bought once and then chosen, the way a coat is — except that
   there is always exactly one in use and it belongs to the whole nest, so
   switching costs nothing and cannot be undone into a state with no habitat
   at all. */
function buyHabitat(id){
  const b = BIOMES[id];
  if (!b) return;
  if (G.biomesOwned.includes(id)){
    if (G.biome === id) return refuse('Already out there.');
    G.biome = id; SFX.pop(); say('Moved everyone to the ' + b.name.toLowerCase() + '.');
    logEvent('Moved to the ' + b.name.toLowerCase() + '.');
    refresh(); save(); return;
  }
  if (G.coins < b.cost) return refuse('Not enough coins.');
  G.coins -= b.cost; G.biomesOwned.push(id); G.biome = id;
  SFX.coin(); say('A new place to live.');
  logEvent('Opened up the ' + b.name.toLowerCase() + '.');
  refresh(); save();
}

function doTrick(){
  if (bondPips() < 3) return refuse(S.name + ' does not know you well enough yet.');
  if (S.asleep) return refuse(S.name + ' is asleep.');
  S.needs.joy = clamp(S.needs.joy + 12, 0, 100);
  S.needs.energy = clamp(S.needs.energy - 3, 0, 100);
  S.bond = clamp(S.bond + .8, 0, 100);
  anim.play('cheer', 1600); SFX.roar();
  emit('note', dino.x, dinoTop, 5, {vy:-18, life:1100});
  say(pick(['It spins on the spot.','A short, proud roar.','It stamps twice and looks at you.']));
  closeSheet(); refresh();
}
function refuse(msg){ SFX.bonk(); say(msg); }

/* ------------------------------- the nest ---------------------------------- */
function switchPet(i){
  if (i === G.active || !G.pets[i]) return;
  G.active = i; S = G.pets[i];
  dino.x = W/2; dino.tx = W/2; dino.dist = 0; dino.dig = 0;
  feedFX = null;
  mode = hatched() ? 'live' : (S.sp ? 'egg' : 'choose');
  anim.play('idle', 0);
  closeSheet();
  document.title = (S.name || 'Paleopal') + ' — Paleopal';
  if (hatched()) say(S.name + ' trots over.');
  refresh(); paintChrome(); save();
}
function newEgg(){
  if (G.pets.length >= MAX_PETS) return refuse('The nest is full at ' + MAX_PETS + '.');
  G.pets.push(freshPet());
  G.active = G.pets.length - 1;
  S = G.pets[G.active];
  mode = 'choose';
  closeSheet(); refresh(); paintChrome(); save();
}
function releasePet(i){
  if (G.pets.length <= 1) return refuse('That is your only animal.');
  G.pets.splice(i, 1);
  G.active = clamp(G.active >= i ? G.active - 1 : G.active, 0, G.pets.length - 1);
  S = G.pets[G.active];
  mode = hatched() ? 'live' : (S.sp ? 'egg' : 'choose');
  closeSheet(); refresh(); paintChrome(); save();
}

/* ==========================================================================
   DEVELOPER TOOLS
   A test harness, not a cheat menu. There is no way to check a sprite across
   four growth stages, or to see what mites look like, without either playing
   for four hours or reaching in and setting the value. Everything here writes
   the same fields the simulation writes, so nothing below can produce a state
   the game could not have reached on its own.

   `G.dev` gates the button in the top bar; long-pressing the brand plate
   toggles it. It ships on. See ROADMAP.md — it comes off before release.
   ========================================================================== */
const DEV_COINS = 99999;

const DEV = {
  /* --- purse --- */
  fillPurse(){ G.coins = DEV_COINS; DEV.done('Purse filled.'); },
  addCoins(n){ G.coins = clamp(G.coins + n, 0, DEV_COINS); DEV.done('+' + n + ' coins.'); },
  emptyPurse(){ G.coins = 0; DEV.done('Purse emptied.'); },

  /* --- growth ---
     stageIdx() compares against GROWTH_GATES with <, so parking growth exactly
     on a gate lands in the stage above it. stageSeen is moved with it, or the
     next tick announces a growth spurt that did not happen. */
  setStage(i){
    if (!hatched()) return refuse('Hatch something first.');
    S.growth = i === 0 ? 0 : GROWTH_GATES[i-1];
    S.stageSeen = i;
    DEV.done(S.name + ' is now ' + article(STAGE[i].label) + STAGE[i].label.toLowerCase() + '.');
  },

  /* --- needs and health --- */
  fillNeeds(){
    for (const k in S.needs) S.needs[k] = 100;
    S.health = 100; S.vet = false; S.asleep = false;
    DEV.done('Every meter full.');
  },
  drainNeeds(){
    for (const k in S.needs) S.needs[k] = 8;
    DEV.done('Every meter down to eight.');
  },
  setBond(v){ S.bond = clamp(v, 0, 100); DEV.done('Bond set to ' + Math.round(S.bond) + '.'); },
  collapse(){ S.health = 0; S.vet = true; S.asleep = true; DEV.done(S.name + ' has collapsed.'); },
  toggleSleep(){ S.asleep = !S.asleep; DEV.done(S.asleep ? 'Asleep.' : 'Awake.'); },

  /* --- illness --- */
  toggleIll(id){
    if (hasIll(id)) S.ills = S.ills.filter(i => i.id !== id);
    else S.ills.push({ id, since: Date.now() });
    DEV.done(hasIll(id) ? ILLS[id].name + ' set.' : ILLS[id].name + ' cleared.');
  },
  cureAll(){ S.ills = []; S.vet = false; S.health = Math.max(S.health, 60); DEV.done('All clear.'); },

  /* --- world --- */
  setBiome(id){ if (!BIOMES[id]) return; if (!G.biomesOwned.includes(id)) G.biomesOwned.push(id);
                G.biome = id; DEV.done('Now in the ' + BIOMES[id].name.toLowerCase() + '.'); },
  addMess(){ if (S.mess.length < 4) S.mess.push({ x: rnd(28, W-28) }); DEV.done('Mess dropped.'); },
  clearMess(){ S.mess = []; DEV.done('Pen cleaned.'); },

  /* --- wardrobe --- */
  unlockAll(){
    S.skinsOwned = SKINS[S.sp].map(k => k.id);
    S.owned = HAT_SHOP.map(h => h.id);
    G.biomesOwned = BIOME_IDS.slice();
    DEV.done('Every coat, hat and habitat unlocked.');
  },

  /* --- species ---
     Coats are per species, so the wardrobe has to be reset with the skeleton
     or S.skin points at an id that SKINS[S.sp] has never heard of. */
  becomeSpecies(id){
    S.sp = id;
    S.skin = 'wild'; S.skinsOwned = ['wild'];
    if (!S.born){ S.born = Date.now(); S.stageSeen = stageIdx(); }
    if (!S.name) S.name = pick(NAMES);
    mode = 'live';
    DEV.done('Now ' + article(SPECIES[id].common) + SPECIES[id].common + '.');
  },
  hatchNow(){
    if (!S.sp) return refuse('Pick an egg first.');
    if (S.born) return refuse('Already hatched.');
    hatch();
  },

  /* --- time --- */
  bumpStreak(){ G.streak += 1; G.lastDay = new Date().toDateString(); DEV.done('Streak is ' + G.streak + '.'); },

  done(msg){
    save(); refresh(); paintChrome();
    if (msg) say(msg);
    if (openPanel) renderSheet(openPanel);
  }
};
