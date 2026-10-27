import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import net from 'node:net';
import {samples} from './model.mjs';
test('API enforces admin access, atomically validates uploads, and persists changes across restart',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'jll-test-'));const password=randomBytes(24).toString('hex');
 const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 let child;async function start(){child=spawn(process.execPath,['--use-env-proxy','server/index.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_PASSWORD:password,AUTO_SYNC_HOURS:'0'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timed out')),10000);child.stdout.on('data',d=>{if(d.toString().includes('listening')){clearTimeout(timer);resolve();}});child.on('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});});}
 async function stop(){if(child?.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;}}
 const call=(route,body,auth=true,method='POST')=>fetch(`http://127.0.0.1:${port}/api/${route}`,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+password}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{await start();assert.equal((await (await call('health',undefined,false,'GET')).json()).ok,true);const list=()=>call('developments',undefined,false,'GET').then(r=>r.json());assert.equal((await list()).length,6);
 assert.equal((await call('admin/import',{developments:[samples[0]]},false)).status,401);
 assert.equal((await call('admin/import',{developments:[samples[0],{...samples[0],lat:90}]})).status,422);assert.equal((await list()).length,6);
 const inserted=await call('admin/import',{developments:[{...samples[0],name:'Integration test',sample:false}]});assert.equal(inserted.status,201);assert.equal((await list()).length,7);
 await stop();await start();const persisted=await list();assert.equal(persisted.length,7);const item=persisted.find(d=>d.name==='Integration test');assert.equal(item.sample,false);
 assert.equal((await call('admin/developments/'+item.id,{...item,priceFrom:999000},false,'PUT')).status,401);
 assert.equal((await call('admin/developments/'+item.id,{...item,lat:90},true,'PUT')).status,422);
 assert.equal((await call('admin/developments/'+item.id,{...item,priceFrom:999000},true,'PUT')).status,200);
 assert.equal((await list()).find(d=>d.id===item.id).priceFrom,999000);
 assert.equal((await call('admin/developments/'+item.id,undefined,false,'DELETE')).status,401);assert.equal((await call('admin/developments/'+item.id,undefined,true,'DELETE')).status,200);assert.equal((await list()).length,6);
 const html=await fetch(`http://127.0.0.1:${port}/`);assert.equal(html.status,200);assert.match(await html.text(),/<title>London New Homes \| JLL Residential<\/title>/);
 }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
