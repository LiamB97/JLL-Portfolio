import london from '../shared/london.json' with {type:'json'};
import {distance} from './types.ts';
export const areas=london.areas;
export const landmarks=london.landmarks;
export const regions=['Central','North','North east','East','South east','South','South west','West','North west'];
export function regionFor(point:{lat:number;lng:number}){const centre={lat:51.5074,lng:-.1278};if(distance(point,centre)<=2.8)return 'Central';const bearing=(Math.atan2((point.lng-centre.lng)*Math.cos(centre.lat*Math.PI/180),point.lat-centre.lat)*180/Math.PI+360)%360;return ['North','North east','East','South east','South','South west','West','North west'][Math.round(bearing/45)%8];}
export function nearArea(point:{lat:number;lng:number},name:string){const area=areas.find(a=>a.name===name);return !area||distance(point,area)<=2;}
