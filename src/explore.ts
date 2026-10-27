import london from '../shared/london.json' with {type:'json'};
import {distance} from './types.ts';
export const areas=london.areas;
export const landmarks=london.landmarks;
export const regions=['Central','North','North east','East','South east','South','South west','West','North west'];
export function regionFor(point:{lat:number;lng:number}){const centre={lat:51.5074,lng:-.1278};if(distance(point,centre)<=2.8)return 'Central';const bearing=(Math.atan2((point.lng-centre.lng)*Math.cos(centre.lat*Math.PI/180),point.lat-centre.lat)*180/Math.PI+360)%360;return ['North','North east','East','South east','South','South west','West','North west'][Math.round(bearing/45)%8];}
export function nearArea(point:{lat:number;lng:number},name:string){const area=areas.find(a=>a.name===name);return !area||distance(point,area)<=2;}
export function parseJourneyQuery(text:string){const m=text.trim().match(/^(?:within\s+)?(\d{1,3})\s*(?:minutes?|mins?)\s+(?:from|of)\s+(.+?)(?:\s+(?:by\s+)?(walking|walk|cycling|cycle|bike|tube|transit|public transport))?\s*$/i);if(!m)return null;return {minutes:Math.min(120,Math.max(1,Number(m[1]))),place:m[2].trim(),mode:/^(?:walk)/i.test(m[3]||'')?'walking':/^(?:cycl|bike)/i.test(m[3]||'')?'cycle':'transit'};}
export function londonDeparture(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;}
export interface JourneyPlace {name:string;lat:number;lng:number;category?:string}
export interface JourneyResult {id:string;minutes:number|null;status:'verified'|'unavailable'}
export interface JourneyState {origin:JourneyPlace;limit:number;mode:string;departure:string;results:JourneyResult[];total:number;running:boolean;error:string}
