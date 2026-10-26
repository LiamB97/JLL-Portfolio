export interface Development {id:string;name:string;area:string;postcode:string;lat:number;lng:number;priceFrom:number;bedrooms:number[];propertyTypes:string[];amenities:string[];images:string[];videos:string[];description:string;sample:boolean;status:string;sourceUrl:string}
export interface Station {name:string;lat:number;lng:number;lines:string}
export const money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
export const bedroomLabel=(b:number[])=>b.map(x=>x===0?'Studio':String(x)).join(', ');
export function distance(a:{lat:number;lng:number},b:{lat:number;lng:number}){const r=(x:number)=>x*Math.PI/180;const h=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lng-a.lng)/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
