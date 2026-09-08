const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const gameURL = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
/* The material layers a species always has, before any colour of its own. */
const LAYERS_BUILTIN = 15;

async function boot(page, failure) {
  await page.addInitScript(failure => {
    window.storage = {
      async get(key) { if (failure === 'read') throw Error('unavailable'); const value=sessionStorage.getItem(key); return value===null ? null : {value}; },
      async set(key, value) { if (failure === 'write') throw Error('quota'); sessionStorage.setItem(key,value); },
      async delete(key) { sessionStorage.removeItem(key); }
    };
  }, failure);
  await page.goto(gameURL);
  await page.waitForFunction(() => typeof mode !== 'undefined' && mode === 'choose');
}

async function adult(page) {
  await page.evaluate(() => {
    G.sound = false; S.sp = 'rex'; S.name = 'Test'; S.born = Date.now(); S.growth = 240;
    S.asleep = false; S.wokeAt = Date.now(); mode = 'live'; observePet(); refresh();
  });
}

test('desktop and mobile screens remain usable with clean console', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  await adult(page);
  for (const width of [1280,375]) {
    await page.setViewportSize({width,height:900});
    for (const screenName of ['feed','play','care','shop','nest']) {
      await page.evaluate(name => { openScreen(name); drawScene(performance.now()); },screenName);
      await expect(page.locator('#scene')).toBeVisible();
      if (screenName==='play') await page.screenshot({path:info.outputPath('play-'+width+'.png'),fullPage:true});
    }
    await page.evaluate(() => { closeScreen(); drawScene(performance.now()); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('habitat-'+width+'.png'),fullPage:true});
  }
  await page.evaluate(() => openSheet('dossier'));
  await expect(page.locator('#sheet p.note').filter({hasText:'Field journal'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Export nest/})).toBeVisible();
  expect(errors).toEqual([]);
});

test('every species, growth stage, coat and pose bakes without clipping', async ({ page }, info) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const failures = []; let count = 0;
    for (const species of Object.keys(SPECIES)) for (let stage=0;stage<4;stage++) {
      const sleeping = frameOf(species,stage,'sleep',0,false).cv.toDataURL();
      if (sleeping === frameOf(species,stage,'sick',0,false).cv.toDataURL()) failures.push(species+stage+' sleep equals sick');
      for (const skin of SKINS[species]) for (const animation of Object.keys(POSES)) for (let frame=0;frame<POSES[animation].length;frame++) {
        const sprite = frameOf(species,stage,animation,frame,false,skin.id);
        const pixels = sprite.cv.getContext('2d').getImageData(0,0,sprite.w,sprite.h).data;
        if (!pixels.some((value,index) => index%4 === 3 && value>0)) failures.push(species+stage+animation+' blank');
        const baked = bakeOnce(species,stage,POSES[animation][frame],POSES[animation][frame].eye || 0,skin.id);
        if (baked.clipped) failures.push(species+stage+animation+' clipped');
        for (const anchor of [sprite.eye,sprite.hat,sprite.mouth]) if (!anchor.every(Number.isFinite)) failures.push('invalid anchor');
        count++;
      }
    }
    return {failures,count};
  });
  expect(result.failures).toEqual([]);
  expect(result.count).toBeGreaterThan(1000);
  await page.evaluate(() => {
    const sheet = document.createElement('div'); sheet.id = 'art-check';
    document.querySelector('#sheet').style.display = 'none';
    sheet.style.cssText = 'display:grid;grid-template-columns:repeat(4,280px);background:#cddbd2;color:#17241d;gap:8px;padding:8px';
    for (const species of Object.keys(SPECIES)) for (let stage=0;stage<4;stage++) {
      const cell = document.createElement('div'); cell.textContent = species+' '+STAGE[stage].label;
      for (const pose of ['idle','eat','cheer','sleep','sick','wary','inspect']) {
        const sprite = frameOf(species,stage,pose,0,false);
        const canvas = makeCv(180,115); canvas.style.cssText = 'display:block;width:270px;height:172px;image-rendering:pixelated';
        const context = canvas.getContext('2d'); context.fillStyle='#cddbd2';context.fillRect(0,0,180,115);
        context.drawImage(sprite.cv,90-sprite.ox,105-sprite.oy);context.fillStyle='#17241d';context.fillText(pose,4,12);
        cell.appendChild(canvas);
      }
      sheet.appendChild(cell);
    }
    document.body.appendChild(sheet);
  });
  await page.locator('#art-check').screenshot({path:info.outputPath('poses.png')});
});

/* The editor rather than the game, because a hand-drawn part is data the game
   only ever reads. The load-bearing check is `traced`: a drawing copied off the
   procedural shape has to bake back to the very same picture, which is only
   true if the anchor, the origin and the grid alignment are all exact. It
   failed on an off-by-one for a while and looked, on the screen, like a part
   that was simply drawn slightly wrong. */
test('a hand-drawn part replaces its layer, rides the pose, and falls back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../tools/editor.html')).href);
  await page.click('.tab[data-tab="draw"]');
  const result = await page.evaluate(() => {
    const shot = canvas => canvas.toDataURL();
    const bake = (stage, animation, frame) => frameOf('rex',stage,animation||'idle',frame||0,false,'wild').cv;
    const procedural = shot(bake(3));
    const failures = [];

    for (const species of Object.keys(SPECIES)) for (let stage=0;stage<4;stage++) {
      const raw = drawLayers(species,stage,POSES.idle[0],0);
      for (const unit in PART_UNITS)
        if (!PART_UNITS[unit].at.some(name => raw.anchors.parts && raw.anchors.parts[name]))
          failures.push(species+'|'+unit+'|'+stage+' has no anchor');
    }

    drawSp='rex'; drawStage=3; drawUnit='head'; drawAnim='idle'; drawFrame=0;
    drawTrace();
    const traced = shot(bake(3)) === procedural;

    const grid = PART_PIX['rex|head|3'];
    grid.rows = grid.rows.map(row => '   '+row.slice(0,-3));
    artChanged();
    const stamped = shot(bake(3)) !== procedural;
    const ridesPose = shot(bake(3,'walk',0)) !== shot(bake(3,'walk',6));
    const statesDiffer = shot(bake(3,'sleep',0)) !== shot(bake(3,'sick',0));
    const legsWalk = shot(bake(3,'walk',0)) !== shot(bake(3,'walk',3));

    grid.rows[2] = PART_CH[LAYERS.indexOf('horn')]+grid.rows[2].slice(1);
    artChanged();
    const spansLayers = shot(bake(3)) !== procedural;

    delete PART_PIX['rex|head|3']; artChanged();
    return {failures,traced,stamped,ridesPose,statesDiffer,legsWalk,spansLayers,
            restored: shot(bake(3)) === procedural};
  });
  expect(result.failures).toEqual([]);
  expect(result.traced, 'a traced part bakes back to what it copied').toBe(true);
  expect(result.stamped, 'moving the drawing moves the sprite').toBe(true);
  expect(result.ridesPose, 'a drawn part travels with the pose').toBe(true);
  expect(result.statesDiffer, 'sleep and sick stay different pictures').toBe(true);
  expect(result.legsWalk, 'an undrawn leg still walks').toBe(true);
  expect(result.spansLayers, 'one grid can claim another material').toBe(true);
  expect(result.restored, 'clearing a part returns it to procedural exactly').toBe(true);
  expect(errors).toEqual([]);
});

/* Sampled pixels rather than a hash of the canvas, because bakeBg is not
   deterministic — the pebbles and the ground cover are scattered with rnd() at
   bake time, so two bakes of one habitat never match and only the cache holds
   a backdrop still between frames. */
/* The horn test, which is the whole reason the rig exists. The owner's own
   statement of what "full control" means was: *I could add another horn to the
   T. rex if I wanted to, and stuff would work still.*

   So: choose a shape, a material and a joint in the editor, press the button,
   and the part must draw at every growth stage, grow with the animal, turn
   with a joint that rotates, move through the walk, and be lit and outlined as
   the material it claims to be — with no code written for it. If any of that
   needs a special case, the model is wrong and this test is where it says so. */
test('a part added from the editor grows, turns and lights with no code', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../tools/editor.html')).href);
  await page.click('.tab[data-tab="rig"]');
  // exactly the path a person takes: press the shape, then click the animal
  await page.click('#rigAdd button:has-text("+ spike")');
  const spot = await page.evaluate(() => {
    const c = document.querySelector('#rigCanvas canvas');
    const r = c.getBoundingClientRect();
    const info = rigFrameOf(), j = info.joints.frill;
    // just above the crown of the frill, in canvas units, then in CSS pixels
    const x = (RIG_OX + (j.x + j.sx*0.1) * info.k) * RIG_Z * (r.width / c.width);
    const y = (RIG_OY + (j.y - j.sy*1.1) * info.k) * RIG_Z * (r.height / c.height);
    return { x, y };
  });
  await page.locator('#rigCanvas canvas').click({ position: spot });

  const result = await page.evaluate(() => {
    const hornInk = stage => {
      const raw = drawLayers('trike', stage, POSES.idle[0], 0);
      const canvas = raw.canvases[LAYERS.indexOf('horn')];
      const d = readCtx(canvas).getImageData(0,0,canvas.width,canvas.height).data;
      let n = 0; for (let i=0;i<d.length;i+=4) if (d[i+3] > 8) n++;
      return n;
    };
    const digest = (pose, frame) => {
      const f = frameOf('trike',3,pose,frame,false,'wild');
      const d = readCtx(f.cv).getImageData(0,0,f.w,f.h).data;
      let h = 2166136261;
      for (let i=0;i<d.length;i++) h = Math.imul(h ^ d[i], 16777619);
      return h>>>0;
    };
    const part = RIG_PARTS.trike[0];
    part.v = [['frill',0.10,-0.95],['frill',0.16,-1.5],['frill',0.20,-2.05]];
    part.w = [5,2.6,.7];
    part.off = true; artChanged();
    const without = [0,1,2,3].map(hornInk);
    part.off = false; artChanged();
    const withPart = [0,1,2,3].map(hornInk);

    const walks = digest('walk',0) !== digest('walk',6);
    // the frill carries a tilt, so a part bound to it must turn, not merely move
    const turned = (() => {
      const j = drawLayers('trike',3,POSES.idle[0],0).anchors.joints;
      const flat = Object.assign({}, j, { frill: Object.assign({}, j.frill, { rot: 0 }) });
      const a = rigOutline(j, part), b = rigOutline(flat, part);
      return a.some((p,i) => Math.abs(p[0]-b[i][0]) > 1 || Math.abs(p[1]-b[i][1]) > 1);
    })();
    /* Every marker the first file owns, because rewrite replaces all of them
       and a template missing one is refused — which is the point of it. */
    const template = DATA_FILES[0].blocks
      .map(name => '/*<data:'+name+'>*/\nconst '+name+' = {};\n/*</data>*/')
      .join('\n') + '\ntail';
    const printed = EDIT.rewrite(template, DATA_FILES[0]);

    /* Every species must publish a skeleton whose joints are all finite and
       positively scaled — a joint with a scale of zero or NaN collapses every
       part hung on it to a point, silently. */
    const everySpecies = [];
    for (const sp of Object.keys(SPECIES)){
      const j = drawLayers(sp,3,POSES.idle[0],0).anchors.joints;
      if (!j || Object.keys(j).length < 10){ everySpecies.push(sp + ' has no skeleton'); continue; }
      for (const name in j){
        const v = j[name];
        if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !(v.sx > 0) || !(v.sy > 0) || !(v.sw > 0))
          everySpecies.push(sp + '.' + name);
      }
    }

    /* Growing up: a part is one shape at every age, can be switched off for
       ages the animal has not grown it yet, and can be given its own shape at
       one age without disturbing the others. */
    const shared = [0,1,2,3].map(hornInk);
    part.stages = [2,3]; artChanged();
    const gatedInk = [0,1,2,3].map(hornInk);
    const gated = [gatedInk[0] - without[0], gatedInk[1] - without[1],
                   gatedInk[2] === shared[2], gatedInk[3] === shared[3]];
    delete part.stages;
    part.at = { adult: { v: part.v.map(x => x.slice()), w: part.w.map(n => n*2.2) } };
    artChanged();
    const override = hornInk(3) > shared[3];
    const overrideLeavesOthers = hornInk(1) === shared[1];
    delete part.at;
    RIG_PARTS.trike = []; artChanged();
    return { gain: withPart.map((n,i) => n - without[i]), walks, turned,
             everySpecies, gated, override, overrideLeavesOthers,
             joints: Object.keys(drawLayers('trike',3,POSES.idle[0],0).anchors.joints).length,
             saves: printed.indexOf("'frill'") > 0 && printed.endsWith('tail'),
             restored: hornInk(3) === without[3] };
  });
  expect(result.everySpecies, 'all three publish a usable skeleton').toEqual([]);
  expect(result.joints, 'the Triceratops publishes a skeleton').toBeGreaterThan(10);
  expect(result.gated, 'has-it-at removes a part from the ages it is switched off for')
    .toEqual([0, 0, true, true]);
  expect(result.override, 'one age can have its own shape').toBe(true);
  expect(result.overrideLeavesOthers, 'and the other ages keep the shared one').toBe(true);
  expect(result.gain.every(n => n > 5), 'the part draws at every growth stage').toBe(true);
  expect(result.gain[3], 'and is bigger on an adult than a hatchling').toBeGreaterThan(result.gain[0]);
  expect(result.walks, 'the animal still walks with it on').toBe(true);
  expect(result.turned, 'a part on a rotating joint turns with it').toBe(true);
  expect(result.saves, 'added parts serialise into 00-art.js').toBe(true);
  expect(result.restored, 'removing the part restores the animal').toBe(true);
  expect(errors).toEqual([]);
});

/* A drawn leg is a fixed picture and a fixed picture cannot step, so drawing
   the limb unit froze the near legs while the far ones walked on — which on
   the screen read as one foreleg being stuck. One drawing per walk frame is
   the answer, and tracing them off the gait solver is what makes twelve of
   them a button rather than an afternoon. */
test('a limb drawn per frame walks, and other poses keep the one drawing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../tools/editor.html')).href);
  await page.click('.tab[data-tab="draw"]');
  const result = await page.evaluate(() => {
    /* How far the NEAR legs travel across the walk, measured on their own
       layer after any drawing has been stamped over it. Measuring the finished
       sprite instead catches the far legs, which keep stepping whatever the
       near ones do — which is exactly why the frozen foreleg was hard to see
       in a number and obvious in a picture. */
    const stride = () => {
      const seen = [];
      for (let i=0;i<POSES.walk.length;i++){
        const raw = drawLayers('trike',3,POSES.walk[i],0);
        stampParts(raw.M,'trike',3,raw.anchors,raw.k,'walk',i);
        const cv = raw.canvases[LAYERS.indexOf('limb')];
        const d = readCtx(cv).getImageData(0,0,cv.width,cv.height).data;
        let bottom = -1;
        for (let y=cv.height-1;y>=0&&bottom<0;y--)
          for (let x=0;x<cv.width;x++) if (d[(y*cv.width+x)*4+3]>8){ bottom=y; break; }
        let lead = 1e9;
        for (let y=Math.max(0,bottom-5);y<=bottom;y++)
          for (let x=0;x<cv.width;x++) if (d[(y*cv.width+x)*4+3]>8){ if (x<lead) lead=x; break; }
        seen.push(lead);
      }
      return Math.max(...seen) - Math.min(...seen);
    };
    for (const key of partKeys('trike','limb',3)) delete PART_PIX[key];
    artChanged();
    const procedural = stride();

    drawSp='trike'; drawStage=3; drawUnit='limb'; drawAnim='walk'; drawFrame=0; drawBuild();
    drawTrace();                       // one drawing for every pose: the frozen case
    const frozen = stride();

    drawTraceAll();                    // one per frame: the walking case
    const walking = stride();
    const distinct = new Set();
    for (let i=0;i<POSES.walk.length;i++) distinct.add(PART_PIX['trike|limb|3|walk|'+i].rows.join(''));

    const routing = partsFor('trike',3,'walk',5).limb === PART_PIX['trike|limb|3|walk|5']
                 && partsFor('trike',3,'idle',0).limb === PART_PIX['trike|limb|3'];
    const keys = partKeys('trike','limb',3).length;
    for (const key of partKeys('trike','limb',3)) delete PART_PIX[key];
    artChanged();
    return { procedural, frozen, walking, distinct: distinct.size, routing, keys,
             cleared: partKeys('trike','limb',3).length };
  });
  expect(result.procedural, 'the solved gait swings the near leg').toBeGreaterThan(6);
  expect(result.frozen, 'one drawing for every pose cannot step').toBeLessThan(result.procedural);
  expect(result.walking, 'per-frame drawings step again').toBeGreaterThanOrEqual(result.procedural - 1);
  expect(result.distinct, 'every frame is its own picture').toBe(12);
  expect(result.routing, 'walk takes its frame, idle takes the plain drawing').toBe(true);
  expect(result.keys, 'one plain drawing plus twelve walk frames').toBe(13);
  expect(result.cleared, 'clearing takes the frames with it').toBe(0);
  expect(errors).toEqual([]);
});

/* The case this exists for, in full: a rust-red band across a Triceratops
   frill. No material on that animal is rust-red, so the material palette
   cannot express it honestly and a species carries its own colours instead.
   The band still has to be lit like everything else and still has to pass
   behind the horns, or it is a sticker rather than a marking. */
test('a species colour paints a lit detail and costs nothing when unused', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../tools/editor.html')).href);
  await page.click('.tab[data-tab="draw"]');
  const result = await page.evaluate(() => {
    const shades = canvas => {
      const d = readCtx(canvas).getImageData(0,0,canvas.width,canvas.height).data;
      const seen = new Set();
      for (let i=0;i<d.length;i+=4) if (d[i+3]>0) seen.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);
      return seen;
    };
    const bake = () => frameOf('trike',3,'idle',0,false,'wild').cv;
    const digest = (pose,frame) => {
      const d = readCtx(frameOf('trike',3,pose,frame,false,'wild').cv).getImageData(0,0,200,140).data;
      let h=2166136261; for (let i=0;i<d.length;i+=4) h=Math.imul(h^(d[i]*7+d[i+1]*3+d[i+2]+d[i+3]),16777619);
      return h>>>0;
    };
    const plain = shades(bake());
    const bare = drawLayers('trike',3,POSES.idle[0],0).canvases.filter(Boolean).length;

    drawSp='trike'; drawStage=3; drawUnit='shield'; drawBuild();
    PART_MATS['trike'] = [{ col:'#c2603c', lit:1 }];
    artChanged();
    const withOne = drawLayers('trike',3,POSES.idle[0],0).canvases.filter(Boolean).length;

    drawTrace();
    const grid = PART_PIX['trike|shield|3'], mark = PART_CH[INK_FIRST];
    for (let y=6;y<12;y++){
      const row = grid.rows[y].split('');
      for (let x=0;x<grid.w;x++) if (row[x] !== ' ') row[x] = mark;
      grid.rows[y] = row.join('');
    }
    artChanged();
    const lit = [...shades(bake())].filter(c => !plain.has(c));
    const rides = digest('walk',0) !== digest('walk',6);

    PART_MATS['trike'][0].lit = 0;
    artChanged();
    const flat = [...shades(bake())].filter(c => !plain.has(c));

    PART_MATS['trike'] = []; delete PART_PIX['trike|shield|3']; artChanged();
    const restored = [...shades(bake())].filter(c => !plain.has(c)).length === 0;
    return { chars: PART_CH.length >= LAYERS.length, bare, withOne, slots: INKS,
             lit: lit.length, flat: flat.length, rides, restored };
  });
  expect(result.chars, 'every layer has a character').toBe(true);
  expect(result.withOne - result.bare, 'a colour costs exactly one layer').toBe(1);
  expect(result.bare, 'unused colours are never allocated').toBe(LAYERS_BUILTIN);
  expect(result.slots).toBe(8);
  expect(result.lit, 'a lit colour arrives as a ramp of shades').toBeGreaterThan(2);
  expect(result.flat, 'light 0 paints one flat shade').toBeLessThanOrEqual(2);
  expect(result.rides, 'a painted detail travels with the pose').toBe(true);
  expect(result.restored, 'removing the colour restores the animal').toBe(true);
  expect(errors).toEqual([]);
});

test('a hand-drawn backdrop covers, tints, lets blanks through and falls back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../tools/editor.html')).href);
  await page.click('.tab[data-tab="backdrop"]');
  const result = await page.evaluate(() => {
    const at = (canvas, x, y) => {
      const d = readCtx(canvas).getImageData(x, y, 1, 1).data;
      return '#' + [d[0],d[1],d[2]].map(v => v.toString(16).padStart(2,'0')).join('');
    };
    bdBio = 'valley'; bdPhase = 'base';
    bdTrace();
    const art = BG_PIX['valley'];
    const size = { w: art.w, h: art.h, rows: art.rows.length, width: art.rows[0].length };

    // a trace is a quantised copy of the computed habitat, so putting it back
    // has to land within a shade of what it copied
    const traced = readCtx(bakeBg('day','valley')).getImageData(0,0,BG_W,BG_H).data;
    delete BG_PIX['valley']; artChanged();
    const source = readCtx(bakeBg('day','valley')).getImageData(0,0,BG_W,BG_H).data;
    BG_PIX['valley'] = art; artChanged();
    let moved = 0;
    for (let i=0;i<BG_W*BG_H;i++)
      if (traced[i*4] !== source[i*4] || traced[i*4+1] !== source[i*4+1] || traced[i*4+2] !== source[i*4+2]) moved++;

    const slot = Math.min(art.pal.length, BG_CH.length - 1);
    art.pal[slot] = '#ff00ff';
    for (let y=100;y<110;y++)
      art.rows[y] = art.rows[y].slice(0,20) + BG_CH[slot].repeat(10) + art.rows[y].slice(30);
    artChanged();
    const painted = at(bakeBg('day','valley'), 25, 105);
    const phases = ['dawn','day','dusk','night'].map(p => at(bakeBg(p,'valley'), 25, 105));

    art.rows[105] = ' '.repeat(BG_W);
    artChanged();
    const blank = at(bakeBg('day','valley'), 25, 105) !== '#ff00ff';

    const quietOff = bgQuiet('valley','day').length;
    art.quiet = ['clouds','grass'];
    const quietOn = bgQuiet('valley','day').join(',');

    BG_PIX['valley|night'] = { w:2, h:2, pal:['#00ff00'], rows:['00','00'] };
    const phaseWins = bgArtFor('valley','night').pal[0] === '#00ff00'
                   && bgArtFor('valley','dusk').pal[0] !== '#00ff00';
    delete BG_PIX['valley|night'];

    const printed = jsBG_PIX(BG_PIX);
    const owner = DATA_FILES.find(f => f.blocks.indexOf('BG_PIX') >= 0).name;
    const partOwner = DATA_FILES.find(f => f.blocks.indexOf('PART_PIX') >= 0).name;
    const rewritten = EDIT.rewrite('/*<data:BG_PIX>*/\nconst BG_PIX = {\n};\n/*</data>*/\ntail',
                                   DATA_FILES[1]);

    delete BG_PIX['valley']; artChanged();
    return { size, moved, painted, phases, blank, quietOff, quietOn, phaseWins, owner, partOwner,
             printsQuiet: printed.indexOf("quiet:['clouds','grass']") > 0,
             rewrote: rewritten.indexOf("'valley'") > 0 && rewritten.endsWith('tail'),
             cleared: bgArtFor('valley','day') === null
                   && at(bakeBg('day','valley'), 25, 106) !== '#ff00ff' };
  });
  expect(result.size).toEqual({ w:280, h:210, rows:210, width:280 });
  expect(result.moved, 'a traced backdrop redraws what it copied').toBeLessThan(2000);
  expect(result.painted, 'a painted pixel reaches the habitat bake').toBe('#ff00ff');
  expect(new Set(result.phases).size, 'one drawing, four times of day').toBe(4);
  expect(result.blank, 'a blank cell lets the computed scene through').toBe(true);
  expect(result.quietOff).toBe(0);
  expect(result.quietOn).toBe('clouds,grass');
  expect(result.phaseWins, 'a phase drawing beats the base one').toBe(true);
  expect(result.printsQuiet).toBe(true);
  expect(result.owner, 'backdrops live in their own file').toBe('00-bg-art.js');
  expect(result.partOwner, 'and parts stay in the first').toBe('00-art.js');
  expect(result.rewrote, 'the marker rewriter targets one file at a time').toBe(true);
  expect(result.cleared, 'clearing a backdrop returns the habitat').toBe(true);
  expect(errors).toEqual([]);
});

test('storage failures remain visible and read failures block overwrites', async ({ page }) => {
  await boot(page,'read');
  await expect(page.locator('#storageStatus')).toContainText('Storage is unavailable');
  expect(await page.evaluate(() => saveBlocked)).toBe(true);
});

test('write failure warns and imported markup stays inert', async ({ page }) => {
  await boot(page,'write');
  await adult(page);
  await page.evaluate(async () => {
    S.name='<b>name</b>'; S.log=[{t:Date.now(),txt:'<img src=x onerror="window.injected=true">'}];
    openSheet('dossier'); await save();
  });
  await expect(page.locator('#storageStatus')).toContainText('Saving failed');
  expect(await page.evaluate(() => Boolean(window.injected))).toBe(false);
  await expect(page.locator('#sheet h2')).toHaveText('<b>name</b>');
  await expect(page.locator('#sheet img')).toHaveCount(0);
});

test('habitat arrival rewards once and survives a round trip', async ({ page }) => {
  await boot(page); await adult(page);
  expect(await page.evaluate(() => {
    S.needs.joy=30; dino.x=HABITAT_ART.valley.slot[0]; dino.dig=0; anim.until=0;
    habitatTarget={pet:S,biome:'valley'}; stepBehaviour(16,performance.now());
    const joy=S.needs.joy;
    const restored=loadSave(JSON.stringify(G)).game.pets[0];
    return joy===38 && !visitHabitat() && S.needs.joy===joy && restored.habitatAt===S.habitatAt && restored.journal.includes('habitat:valley');
  })).toBe(true);
});

test('extra draws do not advance presentation or scenery', async ({ page }) => {
  await boot(page); await adult(page);
  expect(await page.evaluate(() => {
    const before=JSON.stringify({clouds:CLOUDS,motes:MOTES,flyer,animation:anim,egg});
    drawScene(1000); drawScene(1000);
    return before===JSON.stringify({clouds:CLOUDS,motes:MOTES,flyer,animation:anim,egg});
  })).toBe(true);
});

test('export and confirmed import preserve a recoverable previous nest', async ({ page }) => {
  await boot(page); await adult(page);
  await page.evaluate(() => openSheet('dossier'));
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:/Export nest/}).click();
  expect((await downloadPromise).suggestedFilename()).toBe('paleopal-nest.json');
  const backup=await page.evaluate(() => { const copy=JSON.parse(JSON.stringify(G));copy.pets[0].name='Imported';return JSON.stringify(copy); });
  page.once('dialog',dialog => dialog.accept());
  const chooserPromise=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:/Import nest/}).click();
  await (await chooserPromise).setFiles({name:'nest.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await page.waitForFunction(() => typeof S!=='undefined' && S?.name==='Imported');
  expect(await page.evaluate(async () => JSON.parse(await Store.get(BACKUP_KEY)).pets[0].name)).toBe('Test');
  await page.evaluate(() => openSheet('dossier'));
  const recovery=page.waitForEvent('download');
  await page.getByRole('button',{name:/Export recovery copy/}).click();
  expect((await recovery).suggestedFilename()).toBe('paleopal-recovery.json');
});

test('each minigame draws and routes input without browser errors', async ({ page }, info) => {
  const errors=[]; page.on('pageerror',error => errors.push(error.message));
  await boot(page); await adult(page);
  for (const kind of ['snack','forage','leap']) {
    await page.evaluate(kind => {
      closeSheet(); S.needs.energy=90; startGame(kind,12345);
      gameInput({type:'point',x:160,y:120});stepGame(16,performance.now());drawScene(performance.now());
    },kind);
    await page.locator('#scene').screenshot({path:info.outputPath(kind+'.png')});
    await page.evaluate(() => endGame());
  }
  expect(errors).toEqual([]);
});

test('invalid and canceled imports leave the current nest untouched', async ({ page }) => {
  await boot(page); await adult(page);
  await page.evaluate(() => openSheet('dossier'));
  const invalidChooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:/Import nest/}).click();
  await (await invalidChooser).setFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await expect(page.locator('#storageStatus')).toContainText('Import rejected');
  const backup=await page.evaluate(() => JSON.stringify(G));
  page.once('dialog',dialog => dialog.dismiss());
  const cancelChooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:/Import nest/}).click();
  await (await cancelChooser).setFiles({name:'nest.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  expect(await page.evaluate(() => S.name)).toBe('Test');
});

test('failed import does not remove existing save protection', async ({ page }) => {
  await boot(page,'read');
  await page.evaluate(() => { Store.set=async () => {throw Error('blocked')}; openSheet('dossier'); });
  const backup=await page.evaluate(() => JSON.stringify(G));
  page.once('dialog',dialog => dialog.accept());
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:/Import nest/}).click();
  await (await chooser).setFiles({name:'nest.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await expect(page.locator('#storageStatus')).toContainText('Import could not be saved');
  expect(await page.evaluate(() => saveBlocked)).toBe(true);
});