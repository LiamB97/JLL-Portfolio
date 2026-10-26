import * as cheerio from 'cheerio';
export function parseListing(html,url) {
 const $=cheerio.load(html); const nodes=[];
 function walk(x){if(Array.isArray(x))return x.forEach(walk);if(x&&typeof x==='object'){nodes.push(x);if(x['@graph'])walk(x['@graph']);if(x.mainEntity)walk(x.mainEntity);if(x.itemListElement)walk(x.itemListElement);if(x.item)walk(x.item);}}
 $('script[type="application/ld+json"]').each((_,s)=>{try{walk(JSON.parse($(s).text()));}catch{}});
 const p=nodes.find(x=>['Product','ApartmentComplex','Residence','House','Apartment','RealEstateListing','Place'].some(t=>[].concat(x['@type']||[]).includes(t)))||{};
 const title=p.name||$('meta[property="og:title"]').attr('content')||$('title').text();
 const images=[].concat(p.image||$('meta[property="og:image"]').attr('content')||[]).map(x=>typeof x==='string'?x:x.url).filter(Boolean).map(x=>{try{return new URL(x,url).href;}catch{return '';}}).filter(x=>x.startsWith('https://'));
 const geo=p.geo||{};const address=p.address||{};const offers=[].concat(p.offers||[])[0]||{};
 return {name:title||'',area:address.addressLocality||'',postcode:address.postalCode||'',description:p.description||$('meta[name="description"]').attr('content')||'',lat:Number(geo.latitude)||null,lng:Number(geo.longitude)||null,priceFrom:Number(offers.lowPrice||offers.price)||null,bedrooms:[],propertyTypes:['Apartments'],amenities:[],images,videos:[],status:'Available',sample:false,sourceUrl:url};
}
export async function extractListing(url) {
 const u=new URL(url);
 if(u.protocol!=='https:'||u.hostname!=='residential.jll.co.uk'||u.port||u.username||u.password)throw Error('Only HTTPS residential.jll.co.uk listing URLs are supported.');
 const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'JLL-Portfolio-Import/0.1','Accept':'text/html'}});
 if(!response.ok)throw Error(`The JLL website returned ${response.status}. Use the manual form or JSON import instead.`);
 if(!response.headers.get('content-type')?.includes('text/html'))throw Error('The source did not return a web page.');
 const reader=response.body.getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3_000_000){await reader.cancel();throw Error('Source page is too large.');}chunks.push(Buffer.from(value));}
 return parseListing(Buffer.concat(chunks).toString('utf8'),u.href);
}
