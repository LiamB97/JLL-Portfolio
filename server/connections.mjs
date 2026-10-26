import {distanceKm} from './model.mjs';
import {tflJson} from './transport.mjs';
export const CONNECTION_TTL=24*3600000;
export function connectionKey(d){return `connections-v1/${encodeURIComponent(d.id)}/${d.lat},${d.lng}`;}
export function parseJourney(data,mode){
 const candidates=(data.journeys||[]).filter(j=>Number.isFinite(j.duration)&&j.duration>0&&Array.isArray(j.legs)&&j.legs.length&&j.legs.every(l=>Number.isFinite(l.distance)&&l.distance>=0)&&j.legs.some(l=>l.mode?.id===mode)&&j.legs.every(l=>l.mode?.id===mode||(mode==='cycle'&&l.mode?.id==='walking')));
 candidates.sort((a,b)=>a.duration-b.duration);const j=candidates[0];if(!j)return null;
 const distanceMeters=Math.round(j.legs.reduce((sum,l)=>sum+l.distance,0));if(!distanceMeters)return null;
 return {distanceMeters,durationMinutes:Math.ceil(j.duration)};
}
export async function developmentConnections(d,network,{get=tflJson}={}){
 const nearest=network.stations.map(s=>({...s,straightLineKm:distanceKm(d,s)})).sort((a,b)=>a.straightLineKm-b.straightLineKm).slice(0,3);
 const stations=await Promise.all(nearest.map(async s=>{
  const base=`/Journey/JourneyResults/${d.lat},${d.lng}/to/${s.lat},${s.lng}`;
  const [walking,cycling]=await Promise.all(['walking','cycle'].map(mode=>get(base+'?mode='+mode+(mode==='cycle'?'&cyclePreference=AllTheWay':'')).then(data=>parseJourney(data,mode)).catch(()=>null)));
  return {...s,walking,cycling};
 }));return {source:'TfL Journey Planner',updatedAt:new Date().toISOString(),stations};
}
export function connectionsService({network,read=async()=>null,write=async()=>{},load=developmentConnections,now=Date.now}){const pending=new Map();return async d=>{
 const key=connectionKey(d),saved=await read(key);if(saved&&now()-Date.parse(saved.updatedAt)<CONNECTION_TTL)return saved;
 if(!pending.has(key))pending.set(key,Promise.resolve(network()).then(n=>load(d,n)).then(async value=>{if(value.stations.some(s=>s.walking||s.cycling))await write(key,value);return value;}).finally(()=>pending.delete(key)));
 return pending.get(key);
};}
