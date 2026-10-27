import {useCallback,useEffect,useState} from 'react';
import {developmentLink} from '../shared/sharing';
export {developmentLink} from '../shared/sharing';
import {track} from './analytics';
import dictionary from './locales.json';
import type {Language} from './i18n';
import type {Development} from './types';
const KEY='jll-favourites-v1';
function parse(value:string|null):string[]{try{const data=JSON.parse(value||'[]');return Array.isArray(data)?[...new Set(data.filter((x):x is string=>typeof x==='string'&&x.length>0&&x.length<200))].slice(0,200):[];}catch{return [];}}
export function useFavourites(){
 const [ids,setIds]=useState<string[]>(()=>{try{return parse(localStorage.getItem(KEY));}catch{return [];}});
 const [persistent,setPersistent]=useState(true);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(ids));setPersistent(true);}catch{setPersistent(false);}},[ids]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{if(event.key===KEY)setIds(parse(event.newValue));};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[]);
 const toggle=useCallback((id:string)=>{track(ids.includes(id)?'favourite_remove':'favourite_add',{development_id:id});setIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id].slice(0,200));},[ids]);
 return {ids,toggle,persistent,clear:()=>setIds([])};
}
export function whatsappMessage(items:Development[],origin:string,collection?:string,language:Language='en',broker?:string){const t=(text:string)=>language==='en'?text:(dictionary as Record<string,Record<string,string>>)[language]?.[text]||text;return `${t("Hi, these are the developments I'm interested in. Could you send me some more information?")}\n\n${items.map((d,i)=>`${i+1}. ${d.name} — ${d.area}\n${developmentLink(origin,d.id,collection,broker)}`).join('\n\n')}\n\n${t('Thank you!')}`;}
