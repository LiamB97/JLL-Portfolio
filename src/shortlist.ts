import {useCallback,useEffect,useState} from 'react';
import type {Development} from './types';
const KEY='jll-favourites-v1';
function parse(value:string|null):string[]{try{const data=JSON.parse(value||'[]');return Array.isArray(data)?[...new Set(data.filter((x):x is string=>typeof x==='string'&&x.length>0&&x.length<200))].slice(0,200):[];}catch{return [];}}
export function useFavourites(){
 const [ids,setIds]=useState<string[]>(()=>{try{return parse(localStorage.getItem(KEY));}catch{return [];}});
 const [persistent,setPersistent]=useState(true);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(ids));setPersistent(true);}catch{setPersistent(false);}},[ids]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{if(event.key===KEY)setIds(parse(event.newValue));};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[]);
 const toggle=useCallback((id:string)=>setIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id].slice(0,200)),[]);
 return {ids,toggle,persistent,clear:()=>setIds([])};
}
export function developmentLink(origin:string,id:string,collection?:string){const url=new URL('/',origin);url.searchParams.set('development',id);if(collection)url.searchParams.set('collection',collection);return url.href;}
export function whatsappMessage(items:Development[],origin:string,collection?:string){return `Hi, these are the developments I'm interested in. Could you send me some more information?\n\n${items.map((d,i)=>`${i+1}. ${d.name} — ${d.area}\n${developmentLink(origin,d.id,collection)}`).join('\n\n')}\n\nThank you!`;}
