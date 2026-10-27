import reviewedFacts from './data/pending-input-reviewed-facts.json' with {type:'json'};
import {extractListing,cleanListingText} from './import.mjs';
import {postcodeLocation} from './location.mjs';

// Corrections and review notes from the owner's supplied list and source review.
// They describe identity, not a promise of current unit availability.
const identities={
 1:['Chelsea Waterfront','Chelsea'],2:['Postmark','Clerkenwell'],4:['Silkstream','Hendon'],5:['Bow Green','Bow'],6:['Peninsula Gardens','Greenwich Peninsula'],8:['Royal Arsenal Riverside','Woolwich'],10:['Legacy Wharf','Stratford'],11:['Hurlingham Waterfront','Fulham'],12:['Hurlingham Place','Fulham'],13:['The Brentford Project','Brentford'],15:['Holland Park Gate','Kensington'],17:['Angel Gate','Islington'],18:['Aspen','Canary Wharf'],19:['The Stage','Shoreditch'],20:['One Crown Place','Shoreditch'],21:['Principal Tower','Shoreditch'],22:['One Bishopsgate Plaza','City of London'],23:['Kidbrooke Village','Greenwich'],24:['Vabel Blackheath','Blackheath'],25:['Fitzroy Walk','Fitzrovia'],26:['Cavendish Grove','Raynes Park'],27:['18 Porchester Gardens','Bayswater'],28:['The Whiteley','Bayswater'],30:['The Capston','Nine Elms'],31:['Cerulean Quarter','Canning Town'],32:['Hertford Mill','Hackney Wick'],33:['Rivermark','Poplar'],34:['Coronation Square','Leyton'],35:['The Tramworks','North Finchley'],37:['Wimbledon Bridge House','Wimbledon'],39:['W1 Place','Fitzrovia'],40:['Marylebone Square','Marylebone'],45:['Oval Village','Oval'],46:['The Hexon','Nine Elms'],47:['Twickenham Green','Twickenham'],48:['County Hall Kingston','Kingston upon Thames'],49:['London Square Bermondsey','Bermondsey'],50:['Twickenham Square','Twickenham'],51:['Westminster Tower','Lambeth'],52:['Ransome’s Wharf','Battersea'],53:['London Square Woolwich','Woolwich'],54:['Pearson Building','Croydon'],55:['London Square Wandsworth Common','Wandsworth Common'],56:['Fifty Brook Green','Brook Green'],57:['Broadoaks Park','West Byfleet, Surrey'],58:['Lillie Square','West Brompton'],59:['Chelsea Finery','Chelsea'],60:['The Broadley','Marylebone'],61:['The Edit','Southwark'],63:['Queen’s Cross','Royal Docks'],67:['West End Gate','Marylebone'],71:['Alexandra Gate','Haringey'],74:['TwelveTrees Park','West Ham'],81:['Parkside Collection at Chelsea Bridge Wharf','Battersea']
};
export function intakeNotes(row){return [
 ...(reviewedFacts[row]?['Includes facts recovered from the 27 October 2026 source review. Confirm current prices, stock and photo suitability before publishing.']:[]),
 ...(row===19?['Use the residential tower details, not the commercial offices also advertised on this website.']:[]),
 ...(row===6?['Confirm the development pin rather than the developer’s Mitre Passage office address. Peninsula Gardens must not be confused with Peninsula Riverfront.']:[]),
 ...(row===32?['The supplied line names Hertford Mill and Copper Yard. Confirm whether Copper Yard needs a separate entry.']:[]),
 ...(row===34?['The source includes shared-ownership pricing. Supply the full outright-sale starting price, not a share price.']:[]),
 ...(row===35?['Check bedroom options against the development itself; the source page also contains customer stories about other schemes.']:[]),
 ...(row===49?['London Square Bermondsey is separate from Berkeley’s Bermondsey Place.']:[]),
 ...(row===57?['Named out-of-London exception approved by the owner: West Byfleet, Surrey. Keep the actual area and address.']:[]),
 ...(row===65?['Check Camden Goods Yard’s exact map pin against its NW1 postcode; the earlier source coordinates need confirmation. Use Developments to edit the existing record.']:[]),
 ...(row===76?['South Quay Plaza is represented by Harcourt Gardens. Confirm whether other buildings or phases need separate entries.']:[]),
 ...(row===67?['Source previously said Development Completed. Confirm sellable stock and whether it is already represented by The Residences on Paddington Green.']:[]),
 ...(row===71?['Source advertises future phases with prices not released. Confirm which sale homes are available; exclude the separate rental community.']:[])
];}
export function emptyPendingData(request){const identity=identities[request.row]||[request.requestedName,''];return {name:identity[0],area:identity[1],postcode:'',lat:null,lng:null,priceFrom:null,bedrooms:[],propertyTypes:[],description:'',amenities:[],images:[],videos:[],status:'Available',sample:false,sourceUrl:'',importSource:request.url,_requiresReview:true,...(reviewedFacts[request.row]?.data||{})};}
export function curatePendingSource(request,raw){
 const base=emptyPendingData(request),data={...base,...raw,...(identities[request.row]?{name:base.name,area:base.area}:{})};
 if(!raw.description&&base.description)data.description=base.description;
 delete data._diagnostics;delete data.id;delete data.createdBy;delete data.updatedBy;delete data.translations;
 data.sample=false;data._requiresReview=true;delete data._reviewConfirmed;
 data.description=String(data.description||'').split(/\n\s*\n/).map(p=>cleanListingText(p)).filter(p=>p.length>30&&!/privacy policy|cookie policy|terms and conditions|floorplans shown|maps are not to scale|products or materials referred|in line with our policy|reserves the right|our dedicated team/i.test(p)).join('\n\n').slice(0,6000);
 data.images=(data.images||[]).filter(u=>typeof u==='string'&&u.startsWith('https://')&&!/logo|watermark|market-your-property|lsq-og|development-by|rockwell-black|30x\d+|\.(?:mp4|webm|ogg|svg|pdf)(?:[?%]|$)/i.test(u));
 // Berkeley galleries include global navigation and related-site images.
 if(new URL(request.url).hostname==='www.berkeleygroup.co.uk'){
  const slug=new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
  data.images=data.images.filter(u=>u.includes('/developments/'+slug+'/'));
 }
 // Keep only project-specific photography from the builder's schema/gallery.
 if([32,33,34,35].includes(request.row))data.images=data.images.filter(u=>/\/Sales\//i.test(u));
 if(['NK85TH','JN8T6PC','KH9T3VV'].includes(String(data.postcode||'').replaceAll(' ','')))data.postcode='';
 if(!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(data.postcode||''))data.postcode='';
 if([32,33,34,35].includes(request.row)&&String(data.postcode).replaceAll(' ','')==='HP109AS')data.postcode='';
 if(request.row===6&&String(data.postcode).replaceAll(' ','')==='SE100ER'){data.postcode='';data.lat=null;data.lng=null;}

 // Retain useful, explicitly dated review facts when sparse metadata or an
 // unavailable gallery would otherwise blank them. Fresh prices are not guessed.
 if(base.description)data.description=base.description;
 if(!data.images.length&&base.images?.length)data.images=base.images;
 if(!data.postcode&&base.postcode)data.postcode=base.postcode;
 if([22,27].includes(request.row)&&/^W1G/i.test(data.postcode)&&base.postcode)data.postcode=base.postcode;
 if((data.lat===null||data.lng===null)&&base.lat!==null&&base.lng!==null&&String(base.postcode).replaceAll(' ','')===String(data.postcode).replaceAll(' ','')){data.lat=base.lat;data.lng=base.lng;}
 for(const field of ['bedrooms','propertyTypes','amenities'])if(!data[field]?.length&&base[field]?.length)data[field]=base[field];
 if(request.row===34)data.priceFrom=null;
 if(request.row===35)data.bedrooms=[];
 if(data.priceFrom!==null&&(!Number.isSafeInteger(data.priceFrom)||data.priceFrom<100000))data.priceFrom=null;
 return data;
}
export async function collectPendingSource(request,{extract=extractListing,locate=postcodeLocation}={}){
 const attempts=[],deadline=Date.now()+24000;
 const outcomes=await Promise.all(request.urls.map(async url=>{try{const raw=await extract(url,{supplement:false,deadline});return {url,raw};}catch(e){return {url,error:String(e.message).slice(0,500)};}}));
 const score=d=>['description','postcode','lat','lng','priceFrom'].filter(k=>d[k]!==null&&d[k]!==undefined&&d[k]!=='').length+(d.images?.length?2:0)+(d.bedrooms?.length?1:0);
 const readable=outcomes.filter(o=>o.raw).map(o=>({...o,data:curatePendingSource({...request,url:o.url},o.raw)})).sort((a,b)=>score(b.data)-score(a.data));
 for(const o of outcomes)attempts.push({url:o.url,status:o.raw?'read':'unavailable',...(o.error?{error:o.error}:{})});
 const data=readable[0]?.data||emptyPendingData(request);
 let locationNote='';if((data.lat===null||data.lng===null)&&data.postcode){try{const point=await locate(data.postcode);data.lat=point.lat;data.lng=point.lng;data.postcode=point.postcode;data._locationApproximate=true;locationNote=point.note;}catch{}}
 return {row:request.row,data,sourceStatus:readable.length?'read':'unavailable',attempts,locationNote,collectedAt:new Date().toISOString()};
}
