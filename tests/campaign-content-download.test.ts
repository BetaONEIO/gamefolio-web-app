import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadCampaignContent, downloadCampaignOriginal, exportCampaignFeedback } from '../client/src/lib/campaign-content-download';
test('original downloads, bulk archives and feedback exports preserve content', async () => {
  const originalFetch=globalThis.fetch, originalDocument=globalThis.document;
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  const downloads:{name:string;blob:Blob}[]=[];
  let pending:Blob;
  URL.createObjectURL=(blob:any)=>{pending=blob;return 'blob:test';};URL.revokeObjectURL=()=>{};
  globalThis.document={createElement:()=>({href:'',download:'',click(){downloads.push({name:this.download,blob:pending});}})} as any;
  globalThis.fetch=async()=>new Response('<svg>sample</svg>',{headers:{'content-type':'image/svg+xml'}});
  try {
    const submission={id:4,status:'approved',username:'PixelPilot',content_type:'screenshot',image_url:'/assets/sample.svg'};
    await downloadCampaignOriginal(submission);
    assert.equal(downloads[0].name,'PixelPilot-4.svg');
    assert.equal(await downloads[0].blob.text(),'<svg>sample</svg>');
    await downloadCampaignContent(9,[submission,{id:5,status:'pending',image_url:'/ignored.svg'}]);
    const zip=await downloads[1].blob.text();assert.ok(zip.includes('campaign-content.json'));assert.ok(zip.includes('PixelPilot-4.svg'));assert.ok(!zip.includes('ignored'));
    exportCampaignFeedback(9,[{username:'=FORMULA',content_type:'feedback',content_data:{text:'A "quoted" response'}}]);
    const csv=await downloads[2].blob.text();assert.ok(csv.includes("'=FORMULA"));assert.ok(csv.includes('A ""quoted"" response'));
  } finally {globalThis.fetch=originalFetch;globalThis.document=originalDocument;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
