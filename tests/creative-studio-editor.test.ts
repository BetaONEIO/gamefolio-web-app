import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import sharp from 'sharp';

test('editor stays responsive, rejects stale previews, downloads preview bytes and recovers from failure', {timeout:90000}, async () => {
  const vite = await createServer({ configFile:false, root:path.resolve('tests/fixtures/creative-studio'), server:{host:'127.0.0.1',port:0,fs:{allow:[process.cwd(),path.resolve('node_modules')]}}, resolve:{alias:{'@':path.resolve('client/src'),'@shared':path.resolve('shared')}}, esbuild:{jsx:'automatic'} });
  await vite.listen();
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors: string[] = []; page.on('pageerror',e=>errors.push(e.message));
    const png = await sharp({create:{width:1920,height:1080,channels:3,background:'#163b12'}}).png().toBuffer();
    let fail = false, calls = 0, active = 0, maxActive = 0;
    await page.route('**/api/admin/creative-studio/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/options')) return route.fulfill({json:[{id:1,name:'Editor fixture one'},{id:2,name:'Editor fixture two'}]});
      if (url.pathname.endsWith('/backgrounds')) return route.fulfill({json:[]});
      calls++; active++; maxActive = Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,700)); active--;
      if(fail) return route.fulfill({status:500,json:{message:'Render failed; retry.'}});
      return route.fulfill({contentType:'image/png',headers:{'Content-Disposition':`attachment; filename="gamefolio-profile-${route.request().postDataJSON().id}.png"`},body:png});
    });
    await page.goto(vite.resolvedUrls!.local[0]);
    await page.getByLabel('SELECT PROFILE',{exact:true}).selectOption('1');
    await page.waitForRequest(request=>request.url().endsWith('/export'));
    await page.getByLabel('SELECT PROFILE',{exact:true}).selectOption('2');
    const downloadButton = page.getByRole('button',{name:'DOWNLOAD HIGH-QUALITY PNG'});
    await downloadButton.waitFor();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='DOWNLOAD HIGH-QUALITY PNG' && !b.disabled));
    assert.equal(maxActive,1,'rapid changes serialize expensive renders');
    const downloaded = page.waitForEvent('download'); await downloadButton.click();
    const download = await downloaded; assert.equal(download.suggestedFilename(),'gamefolio-profile-2.png');
    const stream = await download.createReadStream(); const chunks: Buffer[]=[]; for await(const chunk of stream!)chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks),png);
    for(const width of [1440,768,390]) {
      await page.setViewportSize({width,height:1100});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`no horizontal overflow at ${width}`);
    }
    fail=true; await page.getByRole('button',{name:'Refresh live data'}).click();
    await page.getByRole('alert').filter({hasText:'Render failed'}).waitFor(); assert.equal(await downloadButton.isDisabled(),true);
    fail=false; await page.getByRole('button',{name:'Retry',exact:true}).click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='DOWNLOAD HIGH-QUALITY PNG' && !b.disabled));
    assert.equal(errors.length,0,errors.join('\n')); assert.ok(calls>=4);
    await page.screenshot({path:'/tmp/gamefolio-studio-renders/editor-mobile.png',fullPage:true});
  } finally { await browser.close(); await vite.close(); }
});
