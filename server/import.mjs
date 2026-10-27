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
 let embedded;try{embedded=JSON.parse($('#__NEXT_DATA__').text()).props?.pageProps?.property;}catch{}
 if(new URL(url).hostname==='residential.jll.co.uk'&&embedded?.title){
  const p=embedded,plain=x=>cheerio.load(String(x||'').replace(/<br\s*\/?>/gi,'\n')).text().trim();
  const headline=plain(p.developmentHeadline);const bedrooms=[...new Set((p.rooms?.bedrooms||[]).flatMap(s=>/^studio$/i.test(s)?[0]:/^\d+\s*(?:bed(?:room)?s?)?$/i.test(s)?[Number(String(s).match(/^\d+/)[0])]:[]))];
  return {name:plain(p.title),area:headline.includes(',')?headline.split(',').slice(1).join(',').trim():String(p.postcode||'').split(' ')[0],postcode:p.postcode||'',lat:Number(p.lat)||null,lng:Number(p.lng)||null,priceFrom:p.price?.currencyCode==='GBP'?Number(p.price.minAmount)||null:null,description:cleanListingText(p.description),amenities:(p.amenities||[]).map(plain).filter(Boolean).slice(0,30),bedrooms,propertyTypes:[/penthouse/i.test(p.title)?'Penthouses':'New homes'],images:(p.images||[]).filter(x=>typeof x==='string'&&x.startsWith('https://')).slice(0,30),videos:(p.videos||[]).map(x=>typeof x==='string'?x:x?.url).filter(x=>typeof x==='string'&&x.startsWith('https://')).slice(0,30),status:p.showComingSoon?'Coming soon':'Available',sample:false,sourceUrl:url,importSource:url,_requiresReview:true};
 }

 function walk(x){if(Array.isArray(x))return x.forEach(walk);if(x&&typeof x==='object'){nodes.push(x);for(const [k,v]of Object.entries(x))if(k!=='@context'&&typeof v==='object')walk(v);}}
 $('script[type="application/ld+json"]').each((_,s)=>{try{walk(JSON.parse($(s).text()));}catch{}});
 const hasType=(x,types)=>types.some(t=>[].concat(x['@type']||[]).includes(t));
 const property=nodes.find(x=>hasType(x,['ApartmentComplex','Residence','House','Apartment','Accommodation','SingleFamilyResidence','GatedResidenceCommunity']))||nodes.find(x=>hasType(x,['Product','RealEstateListing']))||{};
 const listing=nodes.find(x=>hasType(x,['RealEstateListing','Product']))||property;
 const title=property.name||listing.name||$('h1').first().text()||$('meta[property="og:title"]').attr('content')||$('title').text();
 const brands=[...new Set([$('meta[property="og:site_name"]').attr('content'),...nodes.filter(x=>hasType(x,['RealEstateAgent','Organization','Corporation'])).map(x=>x.name)].filter(x=>typeof x==='string'&&x.trim()&&x.toLowerCase()!==String(title).toLowerCase()))];
 let name=String(title||'').split(/\s[|–—]\s/)[0].trim();for(const b of brands)name=name.replace(new RegExp('\\s*[-|–—]\\s*'+b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i'),'');
 const media=x=>[].concat(x||[]).map(x=>typeof x==='string'?x:x?.contentUrl||x?.url).filter(Boolean).map(x=>{try{return new URL(x,url).href;}catch{return '';}}).filter(x=>x.startsWith('https://')&&!/(?:logo|watermark|agent-headshot|broker-photo)/i.test(x)).slice(0,30);
 let images=[...new Set(media(property.image||listing.image||$('meta[property="og:image"]').attr('content')))];
 const geo=property.geo||listing.geo||{},address=property.address||listing.address||{},offers=[].concat(listing.offers||property.offers||[])[0]||{};
 const coordinate=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
 const numeric=x=>{const n=Number(String(x??'').replace(/[£,\s]/g,''));return Number.isFinite(n)&&n!==0?n:null;};
 let description=cleanListingText(property.description||listing.description||$('[itemprop="description"]').first().text()||$('meta[name="description"]').attr('content')||$('meta[property="og:description"]').attr('content'),brands);
 const bedroomsRaw=property.numberOfBedrooms;const bedroom=typeof bedroomsRaw==='object'?bedroomsRaw?.value:bedroomsRaw;
 let features=[].concat(property.amenityFeature||[]).filter(x=>x?.value!==false).map(x=>cleanListingText(x?.name,brands)).filter(Boolean).slice(0,30);
 // Inspect visible property sections when metadata only contains a teaser.
 const content=cheerio.load(html);content('script,style,nav,header,footer,form,aside,[role="navigation"],[class*="cookie"],[id*="cookie"],[class*="agent-contact"],[class*="enquiry"]').remove();
 const paragraphs=[];content('main p,article p,section p,[class*="description"] p,[class*="overview"] p,[class*="introduction"] p,[class*="content"] p,[class*="text-editor"] p').each((_,el)=>{const value=cleanListingText(content(el).text(),brands);if(value.length>=65&&value.length<=1800&&!/privacy|cookies|terms and conditions|subscribe|copyright|mortgage calculator/i.test(value))paragraphs.push(value);});
 content('[class*="description"],[id*="description"],[class*="overview"],[data-testid*="description"]').each((_,el)=>{const value=cleanListingText(content(el).text(),brands);if(value.length>description.length&&value.length<=6000)description=value;});
 if(paragraphs.join(' ').length>description.length)description=[...new Set(paragraphs)].join('\n\n').slice(0,6000);
 const bullets=[];content('[class*="feature"] li,[class*="amenit"] li,[class*="highlight"] li,[class*="key-point"] li,[class*="feature"] p,[class*="amenit"] h3,[class*="feature"] h3,[itemprop="amenityFeature"]').each((_,el)=>{const value=cleanListingText(content(el).text(),brands);if(value.length>=3&&value.length<=180)bullets.push(value);});
 content('h2,h3').each((_,el)=>{if(/^(?:key )?features|amenities|highlights/i.test(content(el).text().trim()))content(el).nextAll('ul').first().find('li').each((_,li)=>{const value=cleanListingText(content(li).text(),brands);if(value.length>=3&&value.length<=180)bullets.push(value);});});
 features=[...new Set([...features,...bullets])].slice(0,30);
 const candidates=[];$('img,source,a[href]').each((_,el)=>{const image=$(el),src=image.attr('data-src')||image.attr('data-lazy-src')||image.attr('data-srcset')?.split(',').at(-1)?.trim().split(' ')[0]||image.attr('srcset')?.split(',').at(-1)?.trim().split(' ')[0]||image.attr('src')||(/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(image.attr('href')||'')?image.attr('href'):'');if(brands.some(b=>String(image.attr('alt')||'').trim().toLowerCase()===b.trim().toLowerCase()))return;const context=[src,image.attr('alt'),image.attr('class'),image.parents().slice(0,3).map((_,p)=>$(p).attr('class')||'').get().join(' ')].join(' ');if(!src||/logo|icon|sprite|avatar|agent|broker|badge|arrow|award|map[-_]|floor[-_ ]?plan|favicon|svg|tracking|pixel|finance|partner/i.test(context))return;const w=Number(image.attr('width'));if(w&&w<250)return;const full=media(src)[0];if(full)candidates.push({url:full,score:/gallery|hero|banner|apartment|bedroom|kitchen|exterior|interior|living|development|residence|amenit/i.test(context)?2:1});});
 $('[style],[data-bg],[data-background]').each((_,el)=>{const node=$(el),context=node.attr('class')||'';if(/logo|icon|footer|partner/i.test(context))return;const src=node.attr('data-bg')||node.attr('data-background')||node.attr('style')?.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];if(src){const full=media(src)[0];if(full)candidates.push({url:full,score:/gallery|hero|banner|slide/i.test(context)?2:1});}});
 images=[...new Set([...images,...candidates.sort((a,b)=>b.score-a.score).map(x=>x.url)])].slice(0,30);
 content('p,h1,h2,h3,h4,li,div,address').append(' ');
 const allText=content('body').text().replace(/\s+/g,' ');
 const postcode=typeof address==='object'?address.postalCode||allText.match(/\b(?:GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)?.[0]?.toUpperCase()||'':'';
 const priceText=allText.match(/(?:prices?\s+(?:start(?:ing)?\s+)?from|from)\s*£\s*([\d,]+(?:\.\d+)?)\s*(million|m\b|k\b)?/i);
 const priceFallback=priceText?Math.round(Number(priceText[1].replaceAll(',',''))*(/^m/i.test(priceText[2]||'')?1000000:/^k/i.test(priceText[2]||'')?1000:1)):null;
 const bedMatch=allText.match(/\b(\d)\s*(?:,\s*(\d)\s*)?(?:(?:&|and|to|–|-)\s*(\d)\s*)?(?:bedroom|bed)[ -]*(?:apartments?|homes?|residences?)/i);
 const fallbackBeds=bedMatch?[...new Set(bedMatch.slice(1).filter(Boolean).map(Number))]:[];
 return {name,area:typeof address==='object'?address.addressLocality||'':'',postcode,description,lat:coordinate(geo.latitude??$('meta[property="place:location:latitude"]').attr('content')),lng:coordinate(geo.longitude??$('meta[property="place:location:longitude"]').attr('content')),priceFrom:offers.priceCurrency&&offers.priceCurrency!=='GBP'?null:numeric(offers.lowPrice||offers.price)||priceFallback,bedrooms:bedroom!==undefined&&Number.isInteger(Number(bedroom))?[Number(bedroom)]:fallbackBeds,propertyTypes:hasType(property,['Apartment','ApartmentComplex'])?['Apartments']:hasType(property,['House','SingleFamilyResidence'])?['Houses']:/\bapartments?\b/i.test(description)?['Apartments']:[],amenities:features,images,videos:media(property.video),status:'Available',sample:false,sourceUrl:new URL(url).hostname==='residential.jll.co.uk'?url:'',importSource:url,_requiresReview:true,_diagnostics:{schemaTypes:nodes.flatMap(x=>[].concat(x['@type']||[])).slice(0,20),scriptIds:$('script[id]').map((_,s)=>$(s).attr('id')).get().slice(0,10),headings:$('main h1,main h2,main h3,h1').map((_,h)=>$(h).text().trim().slice(0,120)).get().slice(0,16),candidateImages:candidates.length,paragraphs:paragraphs.length}};
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
