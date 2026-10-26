import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {samples,stations,validateDevelopment} from './model.mjs';
import {applySource,fetchSource} from './sync.mjs';
import {extractListing} from './import.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=process.env.DATA_DIR||path.join(root,'.data');mkdirSync(dataDir,{recursive:true,mode:0o700});
const passwordFile=path.join(dataDir,'admin-password');
if(!process.env.ADMIN_PASSWORD&&!existsSync(passwordFile))writeFileSync(passwordFile,randomBytes(24).toString('base64url'),{mode:0o600});
const password=process.env.ADMIN_PASSWORD||readFileSync(passwordFile,'utf8').trim();
if(password.length<12)throw Error('ADMIN_PASSWORD must have at least 12 characters.');
const hash=x=>createHash('sha256').update(x).digest();
const db=new DatabaseSync(path.join(dataDir,'portfolio.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS developments(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL)');
if(!db.prepare("SELECT value FROM metadata WHERE key='seeded'").get()){
 const insert=db.prepare('INSERT INTO developments VALUES (?,?)');db.exec('BEGIN');try{for(const d of samples)insert.run(d.id,JSON.stringify(d));db.prepare('INSERT INTO metadata VALUES (?,?)').run('seeded','1');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'2mb'}));
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','strict-origin-when-cross-origin');next();});
const attempts=new Map();
function admin(req,res,next){
 const ip=req.ip;const now=Date.now();let entry=attempts.get(ip);if(!entry||entry.until<now){entry={count:0,until:now+60000};attempts.set(ip,entry);}if(attempts.size>10000)for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
 if(entry.count>=10)return res.status(429).json({error:'Too many login attempts. Try again in a minute.'});
 const token=req.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!timingSafeEqual(hash(token),hash(password))){entry.count++;return res.status(401).json({error:'Enter a valid administrator password.'});}
 next();
}
app.get('/api/health',(_,res)=>res.json({ok:true}));
app.get('/api/developments',(_,res)=>{res.set('Cache-Control','no-store');res.json(db.prepare('SELECT data FROM developments ORDER BY rowid').all().map(x=>JSON.parse(x.data)));});
app.get('/api/stations',(_,res)=>res.json(stations));
app.post('/api/admin/login',admin,(_,res)=>res.json({ok:true}));
app.get('/api/admin/sync',admin,(_,res)=>{const row=db.prepare("SELECT value FROM metadata WHERE key='last-sync'").get();res.json(row?JSON.parse(row.value):{syncedAt:null});});
app.post('/api/admin/sync',admin,async(_,res)=>{try{res.json(applySource(db,await fetchSource()));}catch(e){res.status(422).json({error:e.message});}});
app.post('/api/admin/extract',admin,async(req,res)=>{try{res.json({development:await extractListing(req.body.url),warning:'Review every imported field before publishing. Missing information must be completed manually.'});}catch(e){res.status(422).json({error:e.message});}});
app.post('/api/admin/import',admin,(req,res)=>{try{
 const rows=req.body.developments;if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('Import 1–200 developments at a time.');
 const items=rows.map((raw,i)=>{try{return {...validateDevelopment(raw),id:randomBytes(12).toString('hex')};}catch(e){throw Error(`Row ${i+1}: ${e.message}`);}});
 const insert=db.prepare('INSERT INTO developments VALUES (?,?)');db.exec('BEGIN');try{for(const d of items)insert.run(d.id,JSON.stringify(d));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 res.status(201).json({created:items.length});
 }catch(e){res.status(422).json({error:e.message});}});
app.put('/api/admin/developments/:id',admin,(req,res)=>{try{const id=req.params.id;const d={...validateDevelopment(req.body),id};const result=db.prepare('UPDATE developments SET data=? WHERE id=?').run(JSON.stringify(d),id);res.status(result.changes?200:404).json(result.changes?{ok:true}:{error:'Development not found.'});}catch(e){res.status(422).json({error:e.message});}});
app.delete('/api/admin/developments/:id',admin,(req,res)=>{const r=db.prepare('DELETE FROM developments WHERE id=?').run(req.params.id);res.status(r.changes?200:404).json(r.changes?{ok:true}:{error:'Development not found.'});});
app.use('/api',(_,res)=>res.status(404).json({error:'API endpoint not found.'}));
app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_,res)=>{if(existsSync(path.join(root,'dist/index.html')))res.sendFile(path.join(root,'dist/index.html'));else res.status(503).send('Run npm run build, or use npm run dev.');});
app.use((error,req,res,next)=>res.status(error.status||500).json({error:error.status===413?'Import exceeds the 2MB limit.':'Request failed.'}));
const syncHours=Number(process.env.AUTO_SYNC_HOURS??6);
if(Number.isFinite(syncHours)&&syncHours>0){
 let syncing=false;
 const sync=async()=>{if(syncing)return;syncing=true;try{const result=applySource(db,await fetchSource());console.log(`JLL stock refreshed: ${result.imported} developments; ${result.skipped.length} require review.`);}catch(e){console.error('JLL refresh failed; existing stock preserved:',e.message);}finally{syncing=false;}};
 setTimeout(sync,5000).unref();setInterval(sync,Math.max(syncHours,1)*3600000).unref();
}
const port=Number(process.env.PORT||3001);app.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Portfolio API listening on port ${port}. Admin password: ADMIN_PASSWORD or .data/admin-password (not logged).`));
