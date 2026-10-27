import * as cheerio from 'cheerio';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import ipaddr from 'ipaddr.js';
import {Agent,EnvHttpProxyAgent} from 'undici';

export function publicAddress(address){try{return ipaddr.process(address).range()==='unicast';}catch{return false;}}
export async function listingTarget(value,resolve=lookup){
 let u;try{u=new URL(value);}catch{throw Error('Enter a valid HTTPS development page URL.');}
 if(u.protocol!=='https:'||u.port||u.username||u.password||isIP(u.hostname.replace(/[\[\]]/g,''))||!u.hostname.includes('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(u.hostname))throw Error('Use a public HTTPS website URL without credentials or a custom port.');
 const addresses=await resolve(u.hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw Error('This URL does not resolve to a public website.');
 u.hash='';return {url:u,addresses};
}
export function cleanListingText(value,brands=[]){
 const $=cheerio.load(String(value||''));$('script,style,form,iframe').remove();let text=$.root().text().replace(/\s+/g,' ').trim();
 const sentences=text.split(/(?<=[.!?])\s+|[\r\n]+/).filter(sentence=>{
  if(/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+44|\b0)[\d ()-]{8,}\d)/i.test(sentence))return false;
  if(/\b(?:contact|enquire|inquire|call|email|register your interest|book (?:a |your )?(?:viewing|appointment)|our (?:sales|team|office)|selling agent|sales agent|marketed by|developed by|brought to you by|visit our|speak to)\b/i.test(sentence))return false;
  return !brands.some(b=>b.length>2&&sentence.toLowerCase().includes(b.toLowerCase()));
 });return sentences.join(' ').slice(0,6000);
}
export function parseListing(html,url){
 const $=cheerio.load(html),nodes=[];
 function walk(x){if(Array.isArray(x))return x.forEach(walk);if(x&&typeof x==='object'){nodes.push(x);for(const [k,v]of Object.entries(x))if(k!=='@context'&&typeof v==='object')walk(v);}}
 $('script[type="application/ld+json"]').each((_,s)=>{try{walk(JSON.parse($(s).text()));}catch{}});
 const hasType=(x,types)=>types.some(t=>[].concat(x['@type']||[]).includes(t));
 const property=nodes.find(x=>hasType(x,['ApartmentComplex','Residence','House','Apartment','Accommodation','SingleFamilyResidence']))||nodes.find(x=>hasType(x,['Product','RealEstateListing']))||{};
 const listing=nodes.find(x=>hasType(x,['RealEstateListing','Product']))||property;
 const title=property.name||listing.name||$('h1').first().text()||$('meta[property="og:title"]').attr('content')||$('title').text();
 const brands=[...new Set([$('meta[property="og:site_name"]').attr('content'),...nodes.filter(x=>hasType(x,['RealEstateAgent','Organization','Corporation'])).map(x=>x.name)].filter(x=>typeof x==='string'&&x.trim()&&x.toLowerCase()!==String(title).toLowerCase()))];
 let name=String(title||'').split(/\s[|–—]\s/)[0].trim();for(const b of brands)name=name.replace(new RegExp('\\s*[-|–—]\\s*'+b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i'),'');
 const media=x=>[].concat(x||[]).map(x=>typeof x==='string'?x:x?.contentUrl||x?.url).filter(Boolean).map(x=>{try{return new URL(x,url).href;}catch{return '';}}).filter(x=>x.startsWith('https://')&&!/(?:logo|watermark|agent-headshot|broker-photo)/i.test(x)).slice(0,30);
 const images=[...new Set(media(property.image||listing.image||$('meta[property="og:image"]').attr('content')))];
 const geo=property.geo||listing.geo||{},address=property.address||listing.address||{},offers=[].concat(listing.offers||property.offers||[])[0]||{};
 const numeric=x=>{const n=Number(String(x??'').replace(/[£,\s]/g,''));return Number.isFinite(n)&&n!==0?n:null;};
 const description=cleanListingText(property.description||listing.description||$('[itemprop="description"]').first().text()||$('meta[name="description"]').attr('content')||$('meta[property="og:description"]').attr('content'),brands);
 const bedroomsRaw=property.numberOfBedrooms;const bedroom=typeof bedroomsRaw==='object'?bedroomsRaw?.value:bedroomsRaw;
 const features=[].concat(property.amenityFeature||[]).filter(x=>x?.value!==false).map(x=>cleanListingText(x?.name,brands)).filter(Boolean).slice(0,30);
 return {name,area:typeof address==='object'?address.addressLocality||'':'',postcode:typeof address==='object'?address.postalCode||'':'',description,lat:numeric(geo.latitude),lng:numeric(geo.longitude),priceFrom:offers.priceCurrency&&offers.priceCurrency!=='GBP'?null:numeric(offers.lowPrice||offers.price),bedrooms:bedroom!==undefined&&Number.isInteger(Number(bedroom))?[Number(bedroom)]:[],propertyTypes:hasType(property,['Apartment','ApartmentComplex'])?['Apartments']:hasType(property,['House','SingleFamilyResidence'])?['Houses']:[],amenities:features,images,videos:media(property.video),status:'Available',sample:false,sourceUrl:new URL(url).hostname==='residential.jll.co.uk'?url:'',_requiresReview:true};
}
export async function extractListing(value,{resolve=lookup,fetcher=fetch}={}){
 let target=value;
 for(let redirects=0;redirects<=3;redirects++){
  const {url,addresses}=await listingTarget(target,resolve);
  // Pin direct production DNS to the validated addresses. An environment's outbound
  // proxy, when configured, handles its own DNS and network access policy.
  const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
  const dispatcher=proxy?new EnvHttpProxyAgent():new Agent({connect:{lookup:(host,options,callback)=>{if(host!==url.hostname)return callback(Error('Unexpected import host.'));callback(null,options.all?addresses:addresses[0].address,addresses[0].family);}}});
  try{
   const response=await fetcher(url,{dispatcher,redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'JLL-Portfolio/0.1 (https://subtle-malabi-144145.netlify.app/)','Accept':'text/html'}});
   if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();const next=response.headers.get('location');if(!next||redirects===3)throw Error('Too many website redirects. Paste the final development page URL.');target=new URL(next,url).href;continue;}
   if(!response.ok){await response.body?.cancel();throw Error(`The website returned ${response.status}. It may block imports; use the manual form instead.`);}
   if(!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();throw Error('The source must be an HTML development page.');}
   const reader=response.body.getReader();let size=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3_000_000){await reader.cancel();throw Error('Source page exceeds the 3MB import limit.');}chunks.push(Buffer.from(value));}
   return parseListing(Buffer.concat(chunks).toString('utf8'),url.href);
  }finally{await dispatcher.close();}
 }
}
