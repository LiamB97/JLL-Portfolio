// One-off source collection for the owner's sales-team list. Draft material is
// encrypted for review, never added to the public portfolio by this build step.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,publicEncrypt,createCipheriv,constants} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {extractListing} from '../../server/import.mjs';
const {requests,postcodes}=JSON.parse(await readFile(new URL('./followup-requests.json',import.meta.url),'utf8'));
const results=[],pending=requests.filter(r=>!r.existingId);let next=0;
async function worker(){while(next<pending.length){const row=pending[next++],pages=[];const result={...row,attempts:[]};for(const url of row.urls){try{const development=await extractListing(url,{supplement:false,fetcher:async(u,init)=>{const response=await fetch(u,init);if(response.ok&&response.headers.get('content-type')?.includes('text/html')){const reader=response.clone().body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3_000_000){void reader.cancel();await response.body?.cancel();throw Error('Source page exceeds the 3MB limit.');}chunks.push(Buffer.from(value));}pages.push({url:String(u),html:Buffer.concat(chunks).toString('utf8')});}return response;}});result.development=development;result.attempts.push({url,status:'parsed'});}catch(e){result.attempts.push({url,status:'unavailable',error:e.message});}}result.pages=pages;results.push(result);console.log(JSON.stringify({name:row.requestedName,status:result.development?'parsed':'unavailable',images:result.development?.images.length||0}));}}
await Promise.all(Array.from({length:5},worker));
const locations=[];for(const postcode of postcodes){try{const r=await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(postcode),{signal:AbortSignal.timeout(10000)});locations.push({postcode,result:r.ok?(await r.json()).result:null});}catch{locations.push({postcode,result:null});}}
const payload={locations,batch:'sales-team-2026-10',collectedAt:new Date().toISOString(),requests,results},key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(gzipSync(JSON.stringify(payload))),cipher.final()]);
const wrappedKey=publicEncrypt({key:await readFile(new URL('./review-public.pem',import.meta.url)),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
await mkdir('dist',{recursive:true});await writeFile('dist/sales-stock-followup.enc.json',JSON.stringify({version:1,key:wrappedKey.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')}));
console.log(JSON.stringify({sourceReviewBundle:'encrypted',requested:requests.length,existing:requests.filter(r=>r.existingId).length,parsed:results.filter(r=>r.development).length,unavailable:results.filter(r=>!r.development).length}));
