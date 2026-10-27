import test from 'node:test';import assert from 'node:assert/strict';
import {translateText,translationsService,translationKey} from './translations.mjs';import {samples} from './model.mjs';
test('translations send only text to a fixed provider and validate supported languages',async()=>{
 const text=await translateText('Public description','tr',{fetcher:async url=>{assert.equal(url.hostname,'translate.googleapis.com');assert.equal(url.searchParams.get('q'),'Public description');assert.equal(url.searchParams.get('tl'),'tr');return Response.json([[['Türkçe açıklama','Public description']]]);}});assert.equal(text,'Türkçe açıklama');await assert.rejects(translateText('Hello','unknown'));
 await assert.rejects(translateText('Hello','ar',{fetcher:async()=>new Response('',{status:429})}),/unavailable/);
});
test('translation caches invalidate when source copy changes and prefer reviewed staff copy',async()=>{
 const cache=new Map();let calls=0;const translate=async(text,lang)=>{calls++;return lang+': '+text;};const service=translationsService({read:async k=>cache.get(k),write:async(k,v)=>cache.set(k,v),translate});const d={...samples[0],amenities:[]};
 const [a,b]=await Promise.all([service(d,'tr'),service(d,'tr')]);assert.equal(calls,1);assert.deepEqual(a,b);await service(d,'tr');assert.equal(calls,1);
 assert.notEqual(translationKey(d,'tr'),translationKey({...d,description:'Changed'},'tr'));await service({...d,description:'Changed'},'tr');assert.equal(calls,2);
 const manual=await service({...d,translations:{ar:{description:'نص معتمد',amenities:[]}}},'ar');assert.equal(manual.source,'Staff translation');assert.equal(calls,2);
});
