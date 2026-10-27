import {postcodeLocation} from './location.mjs';
import {extractListing} from './import.mjs';
import {fetchSource,convertSource} from './sync.mjs';
const path=value=>{try{const u=new URL(value);return u.hostname+u.pathname.replace(/\/$/,'').toLowerCase();}catch{return '';}};
export async function importForReview(url,existing,{extract=extractListing,fetchListings=fetchSource}={}){
 let u;try{u=new URL(url);}catch{throw Error('Enter a valid HTTPS development page URL.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Use a public HTTPS development page URL.');
 if(u.hostname==='residential.jll.co.uk'){
  const saved=existing.find(d=>path(d.sourceUrl)===path(u.href));
  if(saved)return {development:{...saved,_requiresReview:true},warning:'This JLL development is already published. Its saved listing data is loaded for review. Check prices and availability, then choose Review update to existing.',source:'Saved JLL portfolio record'};
  try{return {development:await extract(u.href),warning:'Unpublished JLL draft. Check all fields and photos before publishing.',source:'JLL listing page'};}catch(first){
   try{const records=await fetchListings();const raw=records.find(p=>path(new URL(p.pageUrl,'https://residential.jll.co.uk').href)===path(u.href));if(raw)return {development:{...convertSource(raw),_requiresReview:true},warning:'Loaded from the JLL website stock feed because the individual page could not be read. Check every field before publishing.',source:'JLL website stock'};}catch{}
   throw first;
  }
 }
 const development=await extract(u.href);let locationNote='';if((development.lat===null||development.lng===null)&&development.postcode){try{const point=await postcodeLocation(development.postcode);development.lat=point.lat;development.lng=point.lng;if(!development.area||development.area==='London')development.area=point.area||development.area;locationNote=' '+point.note;}catch{}}
 return {development,warning:'Unpublished draft. Check every field and photo; remove third-party branding, contact details and sales language before publishing.'+locationNote,source:'Source website'};
}
