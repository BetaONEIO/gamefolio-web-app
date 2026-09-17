import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { exportFilename, exportRequestSchema } from '../shared/creative-studio';
import { allowedAssetUrl, rasterAsset, validateBackground } from '../server/creative-studio/assets';
import { adminMiddleware } from '../server/middleware/admin';
import { profileThemeStyle } from '../shared/profile-theme';

test('export input permits existing records only and rejects arbitrary render URLs/HTML', () => {
  assert.equal(exportRequestSchema.parse({ type: 'profile', id: 1 }).top, 3);
  for (const body of [{type:'profile',id:0}, {type:'profile',id:1,url:'http://localhost'}, {type:'game',id:1,background:'../private.png'}, {type:'leaderboard',id:1,top:100}]) assert.equal(exportRequestSchema.safeParse(body).success, false);
  assert.equal(exportFilename('profile', '../../Some User\r\n"'), 'gamefolio-profile-some-user.png');
});
test('admin authorization rejects anonymous and ordinary users before executing export work', () => {
  for (const [authenticated, role, status] of [[false, undefined, 401], [true,'user',403], [true,'moderator',403], [true,'admin',200]] as const) {
    let observed = 200, called = false;
    const response = { status(code: number) { observed = code; return this; }, json() { return this; } };
    adminMiddleware({isAuthenticated:()=>authenticated,user:{role}} as any,response as any,()=>{called=true;});
    assert.equal(observed,status); assert.equal(called,status===200);
  }
});
test('asset fetches exclude arbitrary hosts, credentials, redirects and local traversal', async () => {
  for (const url of ['http://images.igdb.com/x','https://localhost/a','https://169.254.169.254/x','https://images.igdb.com.evil.com/a','https://user:pass@images.igdb.com/a','https://images.igdb.com:444/a']) assert.equal(allowedAssetUrl(url),false);
  assert.equal(allowedAssetUrl('https://images.igdb.com/a'),true);
  assert.equal(allowedAssetUrl('https://project.supabase.co/storage/a','https://project.supabase.co'),true);
  await assert.rejects(rasterAsset('/../../package.json'));
  assert.equal(await rasterAsset(undefined),undefined);
});
test('backgrounds are decoded and constrained to a still 1920 × 1080 image', async () => {
  const valid = await sharp({create:{width:1920,height:1080,channels:3,background:'#123456'}}).png().toBuffer();
  const normalized = await validateBackground(valid,'image/png');
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.width,1920);assert.equal(metadata.height,1080);assert.equal(metadata.format,'png');
  await assert.rejects(validateBackground(valid,'text/html'));
  await assert.rejects(validateBackground(Buffer.from('not an image'),'image/png'));
  await assert.rejects(validateBackground(Buffer.alloc(10*1024*1024+1),'image/png'));
  const wrong = await sharp(valid).resize(960,540).png().toBuffer();
  await assert.rejects(validateBackground(wrong,'image/png'), /1920/);
});
test('profile and export surfaces resolve the same equipped theme tokens', () => {
  assert.notEqual(profileThemeStyle({profileBackgroundTheme:'ice'})['--profile-theme-text'],profileThemeStyle({profileBackgroundTheme:'void'})['--profile-theme-text']);
  assert.equal(profileThemeStyle({profileBackgroundTheme:'neo'})['--profile-theme-accent'],'#00ff41');
});

test('slow images are fully decoded before returning; remote redirects are disabled', async () => {
  const source = await sharp({create:{width:30,height:30,channels:3,background:'#b7ff18'}}).png().toBuffer();
  const originalFetch = globalThis.fetch;
  let completed = false;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.redirect,'error'); assert.ok(options?.signal);
    return new Response(new ReadableStream({async start(controller) {
      await new Promise(resolve=>setTimeout(resolve,40));controller.enqueue(source.subarray(0,10));
      await new Promise(resolve=>setTimeout(resolve,40));controller.enqueue(source.subarray(10));completed=true;controller.close();
    }}));
  };
  try { const result = await rasterAsset('https://images.igdb.com/slow.png');assert.equal(completed,true);assert.ok(result?.startsWith('data:image/png;base64,')); }
  finally { globalThis.fetch=originalFetch; }
});
