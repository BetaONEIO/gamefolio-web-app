/** A format check only; redeemability must be established by the issuing store. */
export function isPlausibleGameAccessKey(value:unknown):value is string {
  if(typeof value!=='string')return false;
  const key=value.trim();
  if(key.length<8||key.length>256||/[\u0000-\u001f\u007f]/.test(key))return false;
  if(/^[a-z0-9]{15} [a-z0-9]{2}$/i.test(key))return true;
  if(/\s/.test(key))return false;
  // Grouped activation codes, compact mixed alphanumeric codes, numeric licences.
  if(/^[a-z0-9]{3,8}(?:-[a-z0-9]{3,8}){1,5}$/i.test(key))return true;
  if(/^(?=.{16,128}$)(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(key))return true;
  return /^\d{16,64}$/.test(key);
}
export function analyseGameAccessKeys(values:unknown[]) {
  const unique=new Set<string>(),keys:string[]=[],invalidLines:number[]=[];
  let duplicates=0;
  values.forEach((value,index)=>{
    if(!isPlausibleGameAccessKey(value)){invalidLines.push(index+1);return;}
    const key=value.trim();
    if(unique.has(key)){duplicates++;return;}
    unique.add(key);keys.push(key);
  });
  return {keys,invalidLines,duplicates};
}
