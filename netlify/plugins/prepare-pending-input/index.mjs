import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {preparePendingBatch} from '../../../server/prepare-pending.mjs';
import requests from '../../../scripts/stock-intake/requests.json' with {type:'json'};
export async function onPreBuild({utils}){
 await preparePendingBatch({requests,
  readCache:async revision=>{const path='.netlify/pending-input-cache/'+revision+'.json';await utils.cache.restore(path);return JSON.parse(await readFile(path,'utf8'));},
  saveCache:async(revision,prepared)=>{const path='.netlify/pending-input-cache/'+revision+'.json';await mkdir('.netlify/pending-input-cache',{recursive:true});await writeFile(path,JSON.stringify(prepared));await utils.cache.save(path);},
  // Candidates are included only in the private server bundle, never dist.
  writePrepared:prepared=>writeFile('server/data/pending-input-prepared.json',JSON.stringify(prepared)),log:console.log
 });
}
