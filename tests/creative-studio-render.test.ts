// Explicit browser integration suite. No application server, database or storage writes.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { rasterAsset } from '../server/creative-studio/assets';
import { renderExport } from '../server/creative-studio/renderer';
import { exportRequestSchema, type StudioComposition, type StudioProfile } from '../shared/creative-studio';
const profile: StudioProfile = {id:1,username:'render_test_missing_avatar',displayName:'Render Test',level:42,xp:123456789012345,profileBackgroundTheme:'neo',stats:{views:876543210,posts:321,followers:654}};
const base: StudioComposition = {request:exportRequestSchema.parse({type:'profile',id:1}),title:'Render Test',subtitle:'',filename:'test.png',profile,warnings:[]};
test('real Chromium exports are deterministic, full HD, and fit edge-case compositions', {timeout:180000}, async () => {
  const directory = process.env.STUDIO_TEST_ARTIFACTS || '/tmp/gamefolio-studio-renders';
  await mkdir(directory,{recursive:true});
  const first = await renderExport(base);
  assert.deepEqual(await renderExport(base),first,'unchanged data must produce identical PNG bytes');
  const art = `data:image/png;base64,${(await sharp({create:{width:1920,height:1080,channels:3,background:'#203020'}}).png().toBuffer()).toString('base64')}`;
  const variants: [string,StudioComposition][] = [
    ['profile',base],
    ['long-profile',{...base,profile:{...profile,username:'An_Unusually_Long_Username_01234567890123456789',displayName:'A Very Long Display Name That Still Must Be Readable In The Export',profileBackgroundTheme:'ice'}}],
    ['equipped-assets',{...base,background:art,profile:{...profile,avatar:art,banner:art,avatarBorder:await rasterAsset('/attached_assets/Profile-border-v2.png'),profileFont:'bangers',profileFontEffect:'hard-shadow'}}],
    ['pixel-profile',{...base,profile:{...profile,profileBackgroundTheme:'blocks'}}],
    ['leaderboard',{...base,request:exportRequestSchema.parse({type:'leaderboard',id:9,top:10}),title:'AUTUMN ASSAULT – COMMUNITY LEADERBOARD',subtitle:'SEASON 5 · LIVE LEADERBOARD',entries:Array.from({length:10},(_,i)=>({rank:i+1,xp:99999999999999-i,profile:{...profile,id:i+1,displayName:`Long Display Name For Participant ${i+1}`}}))}],
    ['game',{...base,request:exportRequestSchema.parse({type:'game',id:1}),game:{id:1,name:'A Very Long Game Title: The Definitive Anniversary Collection and Expansion'}}],
  ];
  for (const [name,data] of variants) {
    const image = name === 'profile' ? first : await renderExport(data);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width,1920);assert.equal(metadata.height,1080);assert.equal(metadata.format,'png');
    await writeFile(`${directory}/${name}.png`,image);
  }
});

test('a broken image fails explicitly and releases the renderer for the next export', {timeout:60000}, async () => {
  await assert.rejects(renderExport({...base,profile:{...profile,avatar:'data:image/png;base64,aW52YWxpZA=='}}));
  assert.equal((await sharp(await renderExport(base)).metadata()).width,1920);
});
