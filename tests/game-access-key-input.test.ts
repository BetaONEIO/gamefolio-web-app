import test from 'node:test';
import assert from 'node:assert/strict';
import {analyseGameAccessKeys,isPlausibleGameAccessKey} from '../shared/game-access-key-input';
import {campaignKeyEncryptionConfigured,encryptCampaignKey,decryptCampaignKey} from '../server/campaign-key-security';
test('format checks reject random plain text, headers, controls and oversized input',()=>{
 for(const input of ['dsfdsfsdfsdfsdf','fdsfsadfsadfsadfsaf','sdf','key','hello world','ABCD-1234\u0000-EFGH','A'.repeat(257),null,42])assert.equal(isPlausibleGameAccessKey(input),false,String(input));
});
test('supports grouped, compact and numeric activation code formats without claiming redeemability',()=>{
 for(const input of ['ABCDE-FGHIJ-KLMNO','ABCD-1234-EFGH','AB12C-DE34F-GH56I-JK78L-MN90O','a1b2c3d4e5f6g7h8','1234567890123456','ABCDEFGHIJKLMNO AB'])assert.equal(isPlausibleGameAccessKey(input),true,input);
});
test('client and server share trimming, duplicate counts and invalid line numbers',()=>{
 assert.deepEqual(analyseGameAccessKeys([' ABCDE-FGHIJ-KLMNO ','gibberish','ABCDE-FGHIJ-KLMNO','ABCD-1234-EFGH']),{keys:['ABCDE-FGHIJ-KLMNO','ABCD-1234-EFGH'],invalidLines:[2],duplicates:1});
});
test('encryption readiness fails closed and the configured version round trips safely',()=>{
 const name='CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION',version=process.env[name];
 const testName='CAMPAIGN_KEY_ENCRYPTION_KEY_V999999999',secret=process.env[testName];
 try{process.env[name]='campaign-v999999999';delete process.env[testName];assert.equal(campaignKeyEncryptionConfigured(),false);process.env[testName]='isolated-unit-test-secret';assert.equal(campaignKeyEncryptionConfigured(),true);const encrypted=encryptCampaignKey('ABCDE-FGHIJ-KLMNO');assert.equal(decryptCampaignKey({key_ciphertext:encrypted.ciphertext,key_iv:encrypted.iv,key_auth_tag:encrypted.authTag,key_version:encrypted.keyVersion}),'ABCDE-FGHIJ-KLMNO');}
 finally{if(version===undefined)delete process.env[name];else process.env[name]=version;if(secret===undefined)delete process.env[testName];else process.env[testName]=secret;}
});
