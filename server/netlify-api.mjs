import {accessService,AccessError,checkOrigin,sessionCookie,publicDevelopment,publicUser} from './access.mjs';
import {randomBytes} from 'node:crypto';
import {validateDevelopment} from './model.mjs';
import {extractListing} from './import.mjs';
import {fetchSource} from './sync.mjs';
import {ConflictError,refreshPortfolio} from './netlify-store.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createNetlifyApi({repository,password,fetchListings=fetchSource,extract=extractListing,network,connections}){
 const access=accessService(repository,password);
 return async(request)=>{
  const url=new URL(request.url);const route=url.pathname.replace(/^\/\.netlify\/functions\/api/,'/api');const method=request.method;
  try{
   if(method==='GET'&&route==='/api/health'){await repository.read();return json({ok:true});}
   if(method==='GET'&&route==='/api/developments')return json((await repository.read()).developments.map(publicDevelopment));
   if(method==='GET'&&route.startsWith('/api/collections/'))return json(await access.publicCollection(decodeURIComponent(route.slice('/api/collections/'.length))));
   if(method==='GET'&&route==='/api/access/status')return json(await access.status());
   if(method==='GET'&&route==='/api/access/me'){const actor=await access.authenticate(request,{allowLegacy:false});return json({user:publicUser(actor),csrf:actor.csrf});}
   if(method==='POST'&&['/api/access/bootstrap','/api/access/login','/api/access/accept'].includes(route)){checkOrigin(request);if(Number(request.headers.get('content-length')||0)>10000)return json({error:'Request is too large.'},413);const text=await request.text();if(Buffer.byteLength(text)>10000)return json({error:'Request is too large.'},413);let body;try{body=JSON.parse(text);}catch{return json({error:'Request must contain valid JSON.'},400);}const action=route.split('/').pop();const result=await access[action](body);const response=json({user:result.user,csrf:result.csrf});response.headers.set('Set-Cookie',sessionCookie(result.token,request));return response;}
   if(method==='POST'&&route==='/api/access/logout'){const actor=await access.authenticate(request,{allowLegacy:false});access.csrf(request,actor);await access.logout(actor);const response=json({ok:true});response.headers.set('Set-Cookie',sessionCookie('',request,true));return response;}
   if(method==='GET'&&route==='/api/transport'){try{return json(await network());}catch{return json({error:'The TfL network is temporarily unavailable.'},503);}}
   if(method==='GET'&&route==='/api/stations'){try{return json((await network()).stations);}catch{return json({error:'The TfL station directory is temporarily unavailable.'},503);}}
   if(method==='GET'&&route.startsWith('/api/connections/')){const id=decodeURIComponent(route.slice('/api/connections/'.length));const d=(await repository.read()).developments.find(d=>d.id===id);if(!d)return json({error:'Development not found.'},404);try{return json(await connections(d));}catch{return json({error:'Station routes are temporarily unavailable.'},503);}}
   if(!route.startsWith('/api/admin/'))return json({error:'API endpoint not found.'},404);
   if((await access.status()).setupRequired&&(!password||password.length<12))return json({error:'Administrator access is not configured for this deployment.'},503);
   const actor=await access.authenticate(request);
   if(!['GET','HEAD'].includes(method))access.csrf(request,actor);
   if(method==='POST'&&route==='/api/admin/login')return json({ok:true});
   if(method==='GET'&&route==='/api/admin/invites')return json(await access.invites(actor));
   if(method==='DELETE'&&route.startsWith('/api/admin/invites/'))return json(await access.revokeInvite(actor,decodeURIComponent(route.slice('/api/admin/invites/'.length))));
   if(method==='GET'&&route==='/api/admin/users')return json(await access.users(actor));
   if(method==='GET'&&route==='/api/admin/collections')return json(await access.collections(actor));
   if(method==='GET'&&route==='/api/admin/developments')return json((await repository.read()).developments.map(d=>({...d,canEdit:access.canEdit(actor,d)})));
   if(method==='DELETE'&&route.startsWith('/api/admin/collections/'))return json(await access.deleteCollection(actor,decodeURIComponent(route.slice('/api/admin/collections/'.length))));
   if(method==='GET'&&route==='/api/admin/sync')return json((await repository.read()).lastSync||{syncedAt:null});
   if(method==='POST'&&route==='/api/admin/sync'){access.admin(actor);return json(await refreshPortfolio(repository,await fetchListings(),state=>access.admin(access.current(state,actor))));}
   if(method==='DELETE'&&route.startsWith('/api/admin/developments/')){
    const id=decodeURIComponent(route.slice('/api/admin/developments/'.length));
    const found=await repository.update(state=>{const acting=access.current(state,actor);const target=state.developments.find(d=>d.id===id);if(target&&!access.canEdit(acting,target))throw new AccessError('You can only remove your own developments.',403);const before=state.developments.length;state.developments=state.developments.filter(d=>d.id!==id);return before!==state.developments.length;});return json(found?{ok:true}:{error:'Development not found.'},found?200:404);
   }
   if(!['POST','PUT','PATCH'].includes(method))return json({error:'API endpoint not found.'},404);
   if(Number(request.headers.get('content-length')||0)>2_000_000)return json({error:'Import exceeds the 2MB limit.'},413);
   const text=await request.text();if(Buffer.byteLength(text)>2_000_000)return json({error:'Import exceeds the 2MB limit.'},413);
   let body;try{body=JSON.parse(text);}catch{return json({error:'Request must contain valid JSON.'},400);}
   if(method==='POST'&&route==='/api/admin/users/invite')return json(await access.invite(actor,body),201);
   if(method==='PATCH'&&route.startsWith('/api/admin/users/'))return json(await access.updateUser(actor,decodeURIComponent(route.slice('/api/admin/users/'.length)),body));
   if(method==='POST'&&route==='/api/admin/collections')return json(await access.saveCollection(actor,body),201);
   if(method==='PUT'&&route.startsWith('/api/admin/collections/'))return json(await access.saveCollection(actor,body,decodeURIComponent(route.slice('/api/admin/collections/'.length))));
   if(method==='POST'&&route==='/api/admin/extract')return json({development:await extract(body?.url),warning:'Review all extracted information before publishing.'});
   if(method==='POST'&&route==='/api/admin/import'){
    const rows=body?.developments;if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('Import 1–200 developments at a time.');
    const items=rows.map((raw,i)=>{try{return {...validateDevelopment(raw),id:randomBytes(12).toString('hex'),createdBy:actor.id};}catch(e){throw Error(`Row ${i+1}: ${e.message}`);}});
    await repository.update(state=>{access.current(state,actor);state.developments.push(...items);});return json({created:items.length},201);
   }
   if(method==='PUT'&&route.startsWith('/api/admin/developments/')){
    const id=decodeURIComponent(route.slice('/api/admin/developments/'.length));const data={...validateDevelopment(body),id};
    const found=await repository.update(state=>{const acting=access.current(state,actor);const i=state.developments.findIndex(d=>d.id===id);if(i<0)return false;if(!access.canEdit(acting,state.developments[i]))throw new AccessError('You can only edit your own developments.',403);state.developments[i]={...state.developments[i],...data};return true;});return json(found?{ok:true}:{error:'Development not found.'},found?200:404);
   }
   return json({error:'API endpoint not found.'},404);
  }catch(e){if(e instanceof AccessError)return json({error:e.message},e.status);if(e instanceof ConflictError)return json({error:e.message},409);console.error('Portfolio API request failed:',e.message);return json({error:'Unable to complete the request. Check your data or retry shortly; saved stock has been preserved.'},422);}
 };
}
