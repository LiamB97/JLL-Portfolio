import {createHash} from 'node:crypto';
export const translationKey=(d,language)=>'translation-v1/'+language+'/'+createHash('sha256').update(JSON.stringify([d.description,d.amenities])).digest('hex');
export async function translateText(text,language,{fetcher=fetch}={}){
 if(!['ar','zh-CN','tr'].includes(language))throw Error('Unsupported translation language.');
 const paragraphs=String(text).match(/[\s\S]{1,1100}(?:\s|$)|[\s\S]{1,1100}/g)||[];const output=[];
 for(const part of paragraphs){const u=new URL('https://translate.googleapis.com/translate_a/single');u.search=new URLSearchParams({client:'gtx',sl:'en',tl:language,dt:'t',q:part}).toString();const r=await fetcher(u,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('Automatic translation is temporarily unavailable.');const data=await r.json();const translated=Array.isArray(data?.[0])?data[0].map(row=>typeof row?.[0]==='string'?row[0]:'').join(''):'';if(!translated.trim())throw Error('Automatic translation returned no text.');output.push(translated);}
 return output.join(' ').trim();
}
export function translationsService({read=async()=>null,write=async()=>{},translate=translateText}={}){const pending=new Map();return async(d,language)=>{
 if(!['ar','zh-CN','tr'].includes(language))throw Error('Choose Arabic, Simplified Chinese or Turkish.');
 if(d.translations?.[language]?.description)return {...d.translations[language],source:'Staff translation'};
 const key=translationKey(d,language),cached=await read(key);if(cached)return cached;
 if(!pending.has(key))pending.set(key,(async()=>{const description=await translate(d.description,language);const raw=d.amenities?.length?await translate(d.amenities.map(a=>'• '+a).join('\n'),language):'';const amenities=raw.split(/\s*•\s*/).map(x=>x.trim()).filter(Boolean);const data={description,amenities,source:'Automatic translation',originalLanguage:'en'};await write(key,data);return data;})().finally(()=>pending.delete(key)));
 return pending.get(key);
};}
const memory=new Map();export const translations=translationsService({read:async k=>memory.get(k),write:async(k,v)=>{if(memory.size>400)memory.delete(memory.keys().next().value);memory.set(k,v);}});
