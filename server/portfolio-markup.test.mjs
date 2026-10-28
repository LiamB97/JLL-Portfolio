import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import seed from './data/initial-portfolio.json' with {type:'json'};
// Render-only checks: no browser, network requests, layout or device claims.
test('rendered buyer enquiries preserve attribution and broker screens start with the relevant task',async()=>{
 const previous={location:globalThis.location,window:globalThis.window,document:globalThis.document};
 globalThis.location=new URL('https://portfolio.example/?collection=chosen');
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true}});
 try{
  const Detail=(await server.ssrLoadModule('/src/Detail.tsx')).default;
  const base={d:seed.developments[0],stations:[],network:null,saved:false,toggleFavourite(){},close(){}};
  const broker={name:'Test Broker',slug:'owner-link',whatsapp:'+447900000001'};
  const $=load(renderToStaticMarkup(createElement(Detail,{...base,broker,collection:'chosen'})));
  const links=$('a[href^="https://wa.me/"]');assert.equal(links.length,2);
  for(const el of links){const url=new URL($(el).attr('href'));assert.equal(url.pathname,'/447900000001');assert.ok(url.searchParams.get('text').includes('book a viewing'));assert.ok(url.searchParams.get('text').includes('collection=chosen'));}
  assert.ok($('body').text().includes('Book your viewing now'));
  const generic=load(renderToStaticMarkup(createElement(Detail,base)));assert.ok(generic('button').toArray().some(el=>generic(el).text().includes('Copy viewing request')));assert.equal(generic('a[href^="https://wa.me/"]').length,0);
  const Stock=(await server.ssrLoadModule('/src/Admin.tsx')).default;
  const staff={id:'qa',name:'QA',role:'admin',whatsapp:'+447900000001',shareSlug:'qa'},request=async()=>[];
  const stock=load(renderToStaticMarkup(createElement(Stock,{items:seed.developments,user:staff,request,onChange:async()=>{}})));assert.notEqual(stock('.admin-grid').attr('hidden'),undefined);assert.ok(stock('.admin-row').length>0);
  const Collections=(await server.ssrLoadModule('/src/StaffCollections.tsx')).default;
  const collections=load(renderToStaticMarkup(createElement(Collections,{items:seed.developments,request})));assert.notEqual(collections('.collection-form-panel').attr('hidden'),undefined);assert.equal(collections('.collection-saved-panel').attr('hidden'),undefined);
  const Home=(await server.ssrLoadModule('/src/StaffHome.tsx')).default;
  const home=load(renderToStaticMarkup(createElement(Home,{user:staff,navigate(){}})));assert.equal(home('.workspace-task').length,3);
 }finally{await server.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
