import {createHash} from 'node:crypto';
import {collectPendingSource} from './pending-source.mjs';
export async function preparePendingBatch({requests,readCache=async()=>null,saveCache=async()=>{},writePrepared=async()=>{},collect=collectPendingSource,log=()=>{}}){
 const revision=createHash('sha256').update('pending-source-v1:'+JSON.stringify(requests)).digest('hex'),todo=requests.filter(r=>!r.existingId);
 let prepared;try{const cached=await readCache(revision);if(cached?.revision===revision&&cached.items?.length===todo.length)prepared=cached;}catch{}
 if(!prepared){const items=[];let next=0;await Promise.all(Array.from({length:5},async()=>{while(next<todo.length){const request=todo[next++];try{items.push(await collect(request));}catch(e){items.push({row:request.row,sourceStatus:'unavailable',attempts:[{url:request.url,status:'unavailable',error:String(e.message).slice(0,500)}]});}log('Prepared pending development '+request.row+' (unpublished).');}}));prepared={revision,collectedAt:new Date().toISOString(),items};try{await saveCache(revision,prepared);}catch{log('Pending-input cache unavailable; private database persistence remains enabled.');}}
 await writePrepared(prepared);log(JSON.stringify({pendingPreparation:{requested:requests.length,existingMatches:requests.length-todo.length,read:prepared.items.filter(r=>r.sourceStatus==='read').length,unavailable:prepared.items.filter(r=>r.sourceStatus!=='read').length}}));return prepared;
}
