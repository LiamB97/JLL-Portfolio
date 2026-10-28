import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {videoSource} from '../src/video-source.ts';
import {buildBrochure,brochureFilename} from '../src/brochure.ts';
import seed from './data/initial-portfolio.json' with {type:'json'};
const assets={regular:readFileSync(new URL('../public/fonts/source-sans-3-regular.ttf',import.meta.url)).toString('base64'),semibold:readFileSync(new URL('../public/fonts/source-sans-3-semibold.ttf',import.meta.url)).toString('base64'),photos:{}};
const input={title:'Homes for your next chapter',intro:'An introduction from your broker.',notes:{},items:seed.developments.slice(0,2),broker:{name:'Test Broker',whatsapp:'+447900000001'},origin:'https://portfolio.example',brokerSlug:'own-broker',date:new Date('2026-10-28T12:00:00Z')};
test('all bundled stock video URLs resolve to in-app media sources',()=>{for(const d of seed.developments)for(const url of d.videos)assert.ok(videoSource(url),url);});
test('provider URLs preserve video identity and privacy hashes without arbitrary iframe destinations',()=>{
 assert.equal(videoSource('https://youtu.be/M7lc1UVf-VE?t=20').src,'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0&start=20');
 assert.equal(videoSource('https://www.youtube.com/shorts/M7lc1UVf-VE').kind,'embed');
 assert.equal(videoSource('https://vimeo.com/123456/abc123').src,'https://player.vimeo.com/video/123456?h=abc123&dnt=1');
 assert.equal(videoSource('https://player.vimeo.com/video/123456?h=abc123').src,'https://player.vimeo.com/video/123456?h=abc123&dnt=1');
 assert.equal(videoSource('https://players.brightcove.net/123/default_default/index.html?videoId=456&autoplay=true').src,'https://players.brightcove.net/123/default_default/index.html?videoId=456&playsinline=true');
 assert.equal(videoSource('https://cdn.example/video.mp4?signature=abc').kind,'file');
 for(const url of ['javascript:alert(1)','http://youtu.be/M7lc1UVf-VE','https://www.youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://evil.test/embed/123','https://user:secret@youtu.be/M7lc1UVf-VE'])assert.equal(videoSource(url),null);
});
test('brochure PDFs paginate long notes, retain input and attach links to the correct broker',()=>{
 const value={...input,intro:'A longer introduction. '.repeat(70),notes:{[input.items[0].id]:'A detailed broker recommendation. '.repeat(48)}};
 const before=JSON.stringify(value);const doc=buildBrochure(value,assets);assert.equal(JSON.stringify(value),before);assert.ok(doc.getNumberOfPages()>=3);assert.match(doc.output(),/^%PDF-/);assert.match(doc.output(),/https:\/\/wa.me\/447900000001/);assert.match(doc.output(),/broker=own-broker/);
 assert.equal(buildBrochure(input,assets).getNumberOfPages(),6);
 const collection=buildBrochure({...input,collection:'selected-collection'},assets);assert.match(collection.output(),/collection=selected-collection/);assert.doesNotMatch(collection.output(),/broker=own-broker/);
 assert.throws(()=>buildBrochure({...input,items:[]},assets));assert.throws(()=>buildBrochure({...input,title:' '},assets));assert.equal(brochureFilename('London / Homes: 2026'),'London-Homes-2026.pdf');
});

test('PDF portraits use an active circular clipping path on the cover and contact pages',()=>{
 const photo='data:image/jpeg;base64,'+readFileSync(new URL('./fixtures/profile-square.jpg',import.meta.url)).toString('base64');
 const doc=buildBrochure({...input,broker:{...input.broker,photo}},assets);
 const operations=doc.internal.pages.slice(1).flat().join('\n');
 assert.equal((operations.match(/ c\nW\nn/g)||[]).length,2);
 assert.ok(Math.abs(doc.internal.pageSize.getWidth()-doc.internal.pageSize.getHeight())<.01);
});
