import {createHash} from 'node:crypto';
export const translationKey=(d,language)=>'translation-v1/'+language+'/'+createHash('sha256').update(JSON.stringify([d.description,d.amenities])).digest('hex');
export {translateText} from '../shared/translate.ts';
import {translateText} from '../shared/translate.ts';
export function translationsService({read=async()=>null,write=async()=>{},translate=translateText}={}){const pending=new Map();return async(d,language)=>{
 if(!['ar','zh-CN','tr'].includes(language))throw Error('Choose Arabic, Simplified Chinese or Turkish.');
 if(d.translations?.[language]?.description)return {...d.translations[language],source:'Staff translation'};
 const key=translationKey(d,language),cached=await Promise.resolve().then(()=>read(key)).catch(()=>null);if(cached)return cached;
 if(!pending.has(key))pending.set(key,(async()=>{const description=await translate(d.description,language);const raw=d.amenities?.length?await translate(d.amenities.map(a=>'• '+a).join('\n'),language):'';const amenities=raw.split(/\s*•\s*/).map(x=>x.trim()).filter(Boolean);const data={description,amenities,source:'Automatic translation',originalLanguage:'en'};await Promise.resolve().then(()=>write(key,data)).catch(()=>{});return data;})().finally(()=>pending.delete(key)));
 return pending.get(key);
};}
const memory=new Map();export const translations=translationsService({read:async k=>memory.get(k),write:async(k,v)=>{if(memory.size>400)memory.delete(memory.keys().next().value);memory.set(k,v);}});
