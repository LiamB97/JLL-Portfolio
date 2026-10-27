import test from 'node:test';import assert from 'node:assert/strict';
import {resolveOrigins,journeySearchService,journeyDuration} from './journey-search.mjs';
import {regionFor,nearArea,parseJourneyQuery} from '../src/explore.ts';import {samples} from './model.mjs';
const itinerary=(duration,modes=['walking','tube','walking'])=>({journeys:[{duration,legs:modes.map(id=>({mode:{id}}))}]});
const clock=Date.UTC(2026,9,27,9);
const request={origin:{lat:51.5328,lng:-.1058},mode:'transit',date:'20261027',time:'0900',developmentIds:samples.slice(0,3).map(d=>d.id)};
test('journey phrases and area filters distinguish travel time from geography',()=>{
 assert.deepEqual(parseJourneyQuery('20 minutes from Angel'),{minutes:20,place:'Angel',mode:'transit'});assert.deepEqual(parseJourneyQuery('within 30 mins of Harrods by bike'),{minutes:30,place:'Harrods',mode:'cycle'});assert.equal(parseJourneyQuery('Battersea'),null);
 assert.equal(regionFor({lat:51.51,lng:-.14}),'Central');assert.equal(regionFor({lat:51.6,lng:0}),'North east');assert.equal(nearArea({lat:51.5,lng:-.16},'Knightsbridge'),true);assert.equal(nearArea({lat:51.55,lng:.1},'Knightsbridge'),false);
});
test('origin resolution prefers exact stations and landmarks and lets buyers disambiguate other TfL places',async()=>{
 const network={stations:[{name:'Angel',lat:51.5328,lng:-.1058}]};let calls=0;const get=async()=>{calls++;return {fromLocationDisambiguation:{disambiguationOptions:[{place:{commonName:'London place',lat:51.5,lon:-.12}},{place:{commonName:'Outside London',lat:52,lon:1}}]}};};
 assert.equal((await resolveOrigins('Angel Station',network,{get}))[0].name,'Angel');assert.equal((await resolveOrigins('Harvey Nics',network,{get}))[0].name,'Harvey Nichols');assert.equal(calls,0);assert.equal((await resolveOrigins('Some place',network,{get})).length,1);
 const postcode=await resolveOrigins('SW1X 7XL',network,{get:async()=>({journeys:[{legs:[{departurePoint:{commonName:'SW1X 7XL',lat:51.5,lon:-.16}}]}]})});assert.equal(postcode[0].name,'SW1X 7XL');
});
test('journey durations use complete route durations including walking and never invent unavailable timings',()=>{
 assert.equal(journeyDuration(itinerary(19),'transit'),19);assert.equal(journeyDuration(itinerary(19),'walking'),null);assert.equal(journeyDuration(itinerary(24,['walking']),'walking'),24);assert.equal(journeyDuration({journeys:[]},'transit'),null);assert.equal(journeyDuration(itinerary(10,['car']),'transit'),null);
});
test('route searches batch published stock, preserve unavailable routes, cache verified results and expire',async()=>{
 let calls=0,time=clock;const get=async path=>{calls++;assert.ok(path.includes('timeIs=Departing'));assert.ok(path.includes('51.53280,-0.10580'));if(path.includes('/to/51.477,-0.147'))throw Error('TfL timeout');return itinerary(18);};const search=journeySearchService({get,now:()=>time});
 const first=await search(request,samples);assert.equal(first.results.length,3);assert.equal(first.results.filter(x=>x.status==='verified').length,2);assert.equal(first.results.find(x=>x.status==='unavailable').minutes,null);assert.equal(calls,3);
 await search(request,samples);assert.equal(calls,4);time+=16*60000;await search(request,samples);assert.equal(calls,7);
 await assert.rejects(search({...request,origin:{lat:10,lng:0}},samples));await assert.rejects(search({...request,developmentIds:['missing']},samples));await assert.rejects(search({...request,developmentIds:Array(7).fill(samples[0].id)},samples));await assert.rejects(search({...request,time:'2570'},samples));
});
