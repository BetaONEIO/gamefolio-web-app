import test from 'node:test';
import assert from 'node:assert/strict';
import { contentZip } from '../client/src/lib/campaign-content-zip';
test('download archive contains named content and a valid directory with matching CRC and size',async()=>{
  const bytes=new Uint8Array(await contentZip([{name:'feedback.txt',bytes:new TextEncoder().encode('hello')}]).arrayBuffer());const view=new DataView(bytes.buffer);
  assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(14,true),0x3610a686);assert.equal(view.getUint32(18,true),5);
  const nameLength=view.getUint16(26,true);assert.equal(new TextDecoder().decode(bytes.slice(30,30+nameLength)),'feedback.txt');assert.equal(new TextDecoder().decode(bytes.slice(30+nameLength,35+nameLength)),'hello');
  assert.equal(view.getUint32(35+nameLength,true),0x02014b50);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);assert.equal(view.getUint16(bytes.length-14,true),1);
});
