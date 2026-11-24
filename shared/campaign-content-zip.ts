function crc32(bytes:Uint8Array){let crc=0xffffffff;for(let j=0;j<bytes.length;j++){crc^=bytes[j];for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
/** Uncompressed ZIP avoids recompressing already-compressed game media. */
export function contentZip(files:{name:string;bytes:Uint8Array}[]) {
  const parts:Uint8Array[]=[],directory:Uint8Array[]=[];let offset=0;
  for(const file of files){const name=new TextEncoder().encode(file.name),crc=crc32(file.bytes),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint32(14,crc,true);lv.setUint32(18,file.bytes.length,true);lv.setUint32(22,file.bytes.length,true);lv.setUint16(26,name.length,true);local.set(name,30);
    const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,file.bytes.length,true);cv.setUint32(24,file.bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
    parts.push(local,file.bytes);directory.push(central);offset+=local.length+file.bytes.length;
  }
  const dirSize=directory.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,dirSize,true);ev.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end] as BlobPart[],{type:'application/zip'});
}
