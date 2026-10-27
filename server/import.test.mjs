import test from 'node:test';import assert from 'node:assert/strict';
import {parseListing,extractListing,listingTarget,publicAddress} from './import.mjs';import {validateDevelopment,samples} from './model.mjs';
const publicDns=async()=>[{address:'93.184.215.14',family:4}];
test('website imports reject private hosts, numeric addresses, credentials and non-HTTPS targets',async()=>{
 for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','172.16.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','0.0.0.0','100.64.0.1'])assert.equal(publicAddress(address),false,address);
 for(const url of ['http://agency.com/a','https://user:pass@agency.com/a','https://agency.com:444/a','https://127.0.0.1/a','https://[::1]/a','https://2130706433/a','https://service.local/a','https://localhost/a'])await assert.rejects(listingTarget(url,publicDns));
 await assert.rejects(listingTarget('https://public-looking.com/',async()=>[{address:'10.0.0.1',family:4}]),/public website/);
 const t=await listingTarget('https://agency.com/home',publicDns);assert.equal(t.url.hostname,'agency.com');
});
test('every website redirect is revalidated before fetching and large/non-HTML pages fail safely',async()=>{
 let calls=0;await assert.rejects(extractListing('https://agency.com/a',{resolve:publicDns,fetcher:async()=>{calls++;return new Response('',{status:302,headers:{Location:'https://169.254.169.254/'}});}}),/public HTTPS/);assert.equal(calls,1);
 await assert.rejects(extractListing('https://agency.com/a',{resolve:publicDns,fetcher:async()=>new Response('pdf',{headers:{'Content-Type':'application/pdf'}})}),/HTML/);
 await assert.rejects(extractListing('https://agency.com/a',{resolve:publicDns,fetcher:async()=>new Response('x'.repeat(3_000_001),{headers:{'Content-Type':'text/html'}})}),/3MB/);
});
test('external listing extraction strips contact and agency copy, keeps property facts, and never publishes',()=>{
 const html=`<meta property="og:site_name" content="Other Agent"><script type="application/ld+json">${JSON.stringify({'@type':'RealEstateListing',name:'Riverside Homes | Other Agent',publisher:{'@type':'RealEstateAgent',name:'Other Agent'},offers:{price:650000,priceCurrency:'GBP'},mainEntity:{'@type':'ApartmentComplex',name:'Riverside Homes',address:{postalCode:'SW8',addressLocality:'Nine Elms'},geo:{latitude:51.481,longitude:-.13},numberOfBedrooms:2,image:['/home.jpg','/logo.png'],description:'River-facing apartments with balconies. Marketed by Other Agent. Call 020 1234 5678 to book. Email sales@agency.com. Residents enjoy a gym.',amenityFeature:[{name:'Pool',value:true},{name:'Parking',value:false}]}})}</script>`;
 const draft=parseListing(html,'https://agency.com/home');assert.equal(draft.name,'Riverside Homes');assert.equal(draft.description,'River-facing apartments with balconies. Residents enjoy a gym.');assert.equal(draft.sourceUrl,'');assert.deepEqual(draft.images,['https://agency.com/home.jpg']);assert.deepEqual(draft.amenities,['Pool']);assert.equal(draft.priceFrom,650000);assert.deepEqual(draft.bedrooms,[2]);assert.equal(draft._requiresReview,true);
 assert.throws(()=>validateDevelopment(draft),/Review and confirm/);assert.equal(validateDevelopment({...draft,_reviewConfirmed:true}).name,'Riverside Homes');
});
test('imports do not invent missing bedroom, price, coordinates or property type and strip HTML',()=>{
 const d=parseListing('<title>Other homes</title><meta name="description" content="Beautiful homes. Contact our team today.">','https://developer.com/home');assert.equal(d.priceFrom,null);assert.equal(d.lat,null);assert.deepEqual(d.bedrooms,[]);assert.deepEqual(d.propertyTypes,[]);assert.equal(d.description,'Beautiful homes.');
 assert.throws(()=>validateDevelopment({...d,_reviewConfirmed:true}));
 const unsafe=parseListing('<script type="application/ld+json">'+JSON.stringify({'@type':'Apartment',description:'<p>Private gardens.</p><script>bad()</script> Email sales@agent.com.'})+'</script>','https://agent.com/a');assert.ok(!unsafe.description.includes('<'));
});
