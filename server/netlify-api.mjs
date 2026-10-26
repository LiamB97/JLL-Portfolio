import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {stations,validateDevelopment} from './model.mjs';
import {extractListing} from './import.mjs';
import {fetchSource} from './sync.mjs';
import {ConflictError,refreshPortfolio} from './netlify-store.mjs';
const hash=x=>createHash('sha256').update(x).digest();
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createNetlifyApi({repository,password,fetchListings=fetchSource,extract=extractListing}){
 return async(request)=>{
  const url=new URL(request.url);const route=url.pathname.replace(/^\/\.netlify\/functions\/api/,'/api');const method=request.method;
  try{
   if(method==='GET'&&route==='/api/health'){await repository.read();return json({ok:true});}
   if(method==='GET'&&route==='/api/developments')return json((await repository.read()).developments);
   if(method==='GET'&&route==='/api/stations')return json(stations);
   if(!route.startsWith('/api/admin/'))return json({error:'API endpoint not found.'},404);
   if(!password||password.length<12)return json({error:'Administrator access is not configured for this deployment.'},503);
   const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
   if(!timingSafeEqual(hash(supplied),hash(password)))return json({error:'Enter a valid administrator password.'},401);
   if(method==='POST'&&route==='/api/admin/login')return json({ok:true});
   if(method==='GET'&&route==='/api/admin/sync')return json((await repository.read()).lastSync||{syncedAt:null});
   if(method==='POST'&&route==='/api/admin/sync')return json(await refreshPortfolio(repository,await fetchListings()));
   if(method==='DELETE'&&route.startsWith('/api/admin/developments/')){
    const id=decodeURIComponent(route.slice('/api/admin/developments/'.length));
    const found=await repository.update(state=>{const before=state.developments.length;state.developments=state.developments.filter(d=>d.id!==id);return before!==state.developments.length;});return json(found?{ok:true}:{error:'Development not found.'},found?200:404);
   }
   if(!['POST','PUT'].includes(method))return json({error:'API endpoint not found.'},404);
   if(Number(request.headers.get('content-length')||0)>2_000_000)return json({error:'Import exceeds the 2MB limit.'},413);
   const text=await request.text();if(Buffer.byteLength(text)>2_000_000)return json({error:'Import exceeds the 2MB limit.'},413);
   let body;try{body=JSON.parse(text);}catch{return json({error:'Request must contain valid JSON.'},400);}
   if(method==='POST'&&route==='/api/admin/extract')return json({development:await extract(body?.url),warning:'Review all extracted information before publishing.'});
   if(method==='POST'&&route==='/api/admin/import'){
    const rows=body?.developments;if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('Import 1–200 developments at a time.');
    const items=rows.map((raw,i)=>{try{return {...validateDevelopment(raw),id:randomBytes(12).toString('hex')};}catch(e){throw Error(`Row ${i+1}: ${e.message}`);}});
    await repository.update(state=>state.developments.push(...items));return json({created:items.length},201);
   }
   if(method==='PUT'&&route.startsWith('/api/admin/developments/')){
    const id=decodeURIComponent(route.slice('/api/admin/developments/'.length));const data={...validateDevelopment(body),id};
    const found=await repository.update(state=>{const i=state.developments.findIndex(d=>d.id===id);if(i<0)return false;state.developments[i]={...state.developments[i],...data};return true;});return json(found?{ok:true}:{error:'Development not found.'},found?200:404);
   }
   return json({error:'API endpoint not found.'},404);
  }catch(e){if(e instanceof ConflictError)return json({error:e.message},409);console.error('Portfolio API request failed:',e.message);return json({error:'Unable to complete the request. Check your data or retry shortly; saved stock has been preserved.'},422);}
 };
}
