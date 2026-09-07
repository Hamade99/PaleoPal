const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const gameURL = pathToFileURL(path.resolve(__dirname, '../index.html')).href;

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