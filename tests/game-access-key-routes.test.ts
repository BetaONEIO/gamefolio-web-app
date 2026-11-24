import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {analyseGameAccessKeys} from '../shared/game-access-key-input';
import {encryptCampaignKey,decryptCampaignKey,hashCampaignKey} from '../server/campaign-key-security';
const source=readFileSync('server/routes/campaign-programme.ts','utf8');
const file=ts.createSourceFile('campaign-programme.ts',source,ts.ScriptTarget.Latest,true);
const route=file.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(file)==='router.post'&&node.expression.arguments[0]?.getText(file)==="'/games/:gameId/keys'") as ts.ExpressionStatement;
assert.ok(route&&ts.isCallExpression(route.expression));
const callback=route.expression.arguments.at(-1)!;
const compiled=ts.transpileModule(`const handler=${callback.getText(file)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const sql=(parts:TemplateStringsArray,...values:any[])=>({text:parts.join('?').replace(/\s+/g,' '),values});
function response(){return {statusCode:200,body:null as any,status(n:number){this.statusCode=n;return this;},json(body:any){this.body=body;return this;}};}
function setup({owned=true,ready=true,fail=false}={}) {
 let writes=0,stored:any;
 const execute=async(query:any)=>{
  if(query.text.includes('SELECT catalog_game_id'))return owned?[{catalog_game_id:4}]:[];
  if(query.text.includes('pg_advisory'))return [];
  if(query.text.includes('SELECT key_hash, key_value'))return [];
  if(query.text.includes('INSERT INTO game_key_batches')){writes++;return [{id:1}];}
  if(query.text.includes('INSERT INTO game_keys')){writes++;stored=query.values;return [{id:2}];}
  if(query.text.includes('UPDATE game_key_batches')){writes++;return [];}
  if(query.text.includes('COUNT(*) FILTER'))return [{demo_available:0,full_available:1}];
  throw new Error('Unexpected query');
 };
 const deps={sql,db:{execute,transaction:async(fn:any)=>{if(fail)throw Object.assign(new Error('Private database detail'),{code:'23514'});return fn({execute});}},toRows:(r:any)=>r,analyseGameAccessKeys,campaignKeyEncryptionConfigured:()=>ready,hashCampaignKey,encryptCampaignKey};
 const handler=new Function(...Object.keys(deps),`${compiled};return handler;`)(...Object.values(deps));
 return {handler,writes:()=>writes,stored:()=>stored};
}
const request=(keys:any[])=>({user:{id:3},params:{gameId:'4'},body:{keyType:'full',keys}});
test('forced gibberish and mixed invalid uploads cannot bypass the server or write a batch',async()=>{
 for(const keys of [['dsfdsfsdfsdfsdf'],['ABCDE-FGHIJ-KLMNO','fdsfsadfsadfsadfsaf']]){const run=setup(),res=response();await run.handler(request(keys),res);assert.equal(res.statusCode,400);assert.equal(res.body.code,'INVALID_KEY_FORMAT');assert.equal(run.writes(),0);assert.ok(!JSON.stringify(res.body).includes('dsfdsfs'));}
});
test('ownership and unavailable encryption fail closed before storage',async()=>{
 for(const config of [{owned:false,ready:true,status:404},{owned:true,ready:false,status:503}]){const run=setup(config),res=response();await run.handler(request(['ABCDE-FGHIJ-KLMNO']),res);assert.equal(res.statusCode,config.status);assert.equal(run.writes(),0);}
});
test('accepted uploads are encrypted and response never exposes key material',async()=>{
 const active=process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION,secret=process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V999999998;
 try{process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION='campaign-v999999998';process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V999999998='isolated-route-test-secret';const run=setup(),res=response(),key='ABCDE-FGHIJ-KLMNO';await run.handler(request([key,key]),res);assert.equal(res.statusCode,201);assert.equal(res.body.added,1);assert.equal(res.body.duplicates,1);const values=run.stored();assert.ok(!values.includes(key));assert.equal(decryptCampaignKey({key_ciphertext:values[4],key_iv:values[5],key_auth_tag:values[6],key_version:values[8]}),key);assert.ok(!JSON.stringify(res.body).includes(key));}
 finally{if(active===undefined)delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION;else process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION=active;if(secret===undefined)delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V999999998;else process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V999999998=secret;}
});
