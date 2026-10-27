import {randomBytes,createHash,timingSafeEqual,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback),SESSION_MS=8*3600000,INVITE_MS=7*24*3600000,LOCK_MS=15*60000;
export class AccessError extends Error{constructor(message,status=422){super(message);this.status=status;}}
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const equal=(a,b)=>timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
function email(value){if(typeof value!=='string'||value.length>254||!/^\S+@\S+\.\S+$/.test(value.trim()))throw new AccessError('Enter a valid email address.');return value.trim().toLowerCase();}
function name(value){if(typeof value!=='string'||!value.trim()||value.length>100)throw new AccessError('Enter a name of up to 100 characters.');return value.trim();}
function role(value){if(!['admin','broker_admin','broker'].includes(value))throw new AccessError('Choose Admin, Broker admin or Broker.');return value;}
function password(value){if(typeof value!=='string'||value.length<12||value.length>128)throw new AccessError('Use a password of 12–128 characters.');return value;}
async function passwordHash(value){const salt=randomBytes(16).toString('hex');const key=await scrypt(password(value),salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt-v1:${salt}:${key.toString('hex')}`;}
async function verify(value,stored){if(typeof value!=='string'||value.length>128)return false;const [,salt,key]=String(stored||'').split(':');const result=await scrypt(value,salt||'jll-login-padding',64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return Boolean(key)&&equal(result.toString('hex'),key);}
export function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,active:u.active,createdAt:u.createdAt};}
export function publicDevelopment(d){const {createdBy,updatedBy,...safe}=d;return safe;}
function init(s){for(const key of ['users','sessions','invites','collections','authFailures'])if(!Array.isArray(s[key]))s[key]=[];}
function ownerGuard(s,u,nextRole,nextActive){if(u.role==='admin'&&u.active&&(nextRole!=='admin'||!nextActive)&&s.users.filter(x=>x.active&&x.role==='admin').length<=1)throw new AccessError('Keep at least one active administrator.');}
function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')).filter(x=>x.length===2));}
export function sessionCookie(token,request,clear=false){return `jll_session=${clear?'':token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${clear?0:SESSION_MS/1000}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export function checkOrigin(request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AccessError('This request must come from the portfolio.',403);}
export function accessService(repository,bootstrapSecret,{now=Date.now}={}){
 function addSession(s,user){const token=randomBytes(32).toString('base64url');s.sessions=s.sessions.filter(x=>x.expiresAt>now());s.sessions.push({tokenHash:digest(token),userId:user.id,expiresAt:now()+SESSION_MS});return {user:publicUser(user),token,csrf:digest('csrf:'+token)};}
 async function status(){const s=await repository.read();return {setupRequired:!(s.users||[]).length,setupConfigured:typeof bootstrapSecret==='string'&&bootstrapSecret.length>=12};}
 async function authenticate(request,{allowLegacy=true}={}){
  const s=await repository.read(),token=cookies(request).jll_session;
  if(token){const session=(s.sessions||[]).find(x=>x.expiresAt>now()&&equal(x.tokenHash,digest(token)));const u=session&&(s.users||[]).find(x=>x.id===session.userId&&x.active);if(u)return {...publicUser(u),csrf:digest('csrf:'+token),token};}
  const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(allowLegacy&&!(s.users||[]).length&&bootstrapSecret?.length>=12&&supplied&&equal(supplied,bootstrapSecret))return {id:'bootstrap',name:'Administrator',role:'admin',active:true,legacy:true};
  throw new AccessError('Sign in to manage the portfolio.',401);
 }
 function current(s,actor){if(actor.legacy){if((s.users||[]).length)throw new AccessError('Sign in with your staff account.',401);return actor;}const u=(s.users||[]).find(x=>x.id===actor.id&&x.active),session=(s.sessions||[]).find(x=>x.userId===actor.id&&x.expiresAt>now()&&equal(x.tokenHash,digest(actor.token||'')));if(!u||!session)throw new AccessError('Your session has ended. Sign in again.',401);return {...actor,...publicUser(u)};}
 function csrf(request,actor){checkOrigin(request);if(!actor.legacy&&!equal(request.headers.get('x-csrf-token')||'',actor.csrf||''))throw new AccessError('Your session needs refreshing. Sign in again.',403);}
 function stock(actor){if(!['admin','broker_admin'].includes(actor.role))throw new AccessError('Admin or Broker admin access is required to change developments.',403);}
 function admin(actor){if(actor.role!=='admin')throw new AccessError('Administrator access is required.',403);}
 async function bootstrap(body){
  if(!bootstrapSecret||bootstrapSecret.length<12)throw new AccessError('First set ADMIN_PASSWORD in Netlify Functions environment variables and redeploy. Then create your owner account here.',503);
  if(typeof body.setupSecret!=='string'||!equal(body.setupSecret,bootstrapSecret))throw new AccessError('The owner setup code is incorrect.',401);
  const address=email(body.email),display=name(body.name),hash=await passwordHash(body.password);
  return repository.update(s=>{init(s);if(s.users.length)throw new AccessError('The owner account is already configured. Sign in instead.',409);const u={id:randomBytes(12).toString('hex'),email:address,name:display,role:'admin',active:true,passwordHash:hash,createdAt:new Date(now()).toISOString()};s.users.push(u);return addSession(s,u);});
 }
 async function login(body){
  let address;try{address=email(body.email);}catch{throw new AccessError('Email or password is incorrect.',401);}
  const state=await repository.read(),key=digest(address),failure=(state.authFailures||[]).find(x=>x.key===key&&x.until>now());
  if(failure?.count>=5)throw new AccessError('Too many attempts. Please try again in 15 minutes.',429);
  const user=(state.users||[]).find(x=>x.email===address),valid=await verify(body.password,user?.passwordHash);
  if(!valid||!user?.active){await repository.update(s=>{init(s);s.authFailures=s.authFailures.filter(x=>x.until>now());let f=s.authFailures.find(x=>x.key===key);if(!f){f={key,count:0,until:now()+LOCK_MS};s.authFailures.push(f);}f.count++;s.authFailures=s.authFailures.slice(-200);});throw new AccessError('Email or password is incorrect.',401);}
  return repository.update(s=>{init(s);const current=s.users.find(x=>x.id===user.id&&x.active&&x.passwordHash===user.passwordHash);if(!current)throw new AccessError('Email or password is incorrect.',401);s.authFailures=s.authFailures.filter(x=>x.key!==key);return addSession(s,current);});
 }
 async function logout(actor){await repository.update(s=>{init(s);s.sessions=s.sessions.filter(x=>x.tokenHash!==digest(actor.token||''));});}
 async function users(actor){admin(actor);return (await repository.read()).users?.map(publicUser)||[];}
 async function invite(actor,body){if(actor.legacy)throw new AccessError('Create the owner account first.',409);const address=email(body.email),display=name(body.name),assigned=role(body.role||'broker');const token=randomBytes(32).toString('base64url');
  const data=await repository.update(s=>{init(s);const acting=current(s,actor);const u=s.users.find(x=>x.email===address);if(acting.role!=='admin'&&(assigned!=='broker'||u||s.invites.some(x=>x.email===address&&x.expiresAt>now())))throw new AccessError('You may invite new regular brokers only. Ask an Admin to change roles or reset an account.',403);if(u)ownerGuard(s,u,assigned,true);s.invites=s.invites.filter(x=>x.email!==address&&x.expiresAt>now());const invitation={id:randomBytes(12).toString('hex'),tokenHash:digest(token),email:address,name:display,role:assigned,expiresAt:now()+INVITE_MS,createdBy:actor.id};s.invites.push(invitation);return {id:invitation.id,email:address,name:display,role:assigned,expiresAt:invitation.expiresAt};});return {...data,token};
 }
 async function invites(actor){return ((await repository.read()).invites||[]).filter(x=>x.expiresAt>now()&&(actor.role==='admin'||x.createdBy===actor.id)).map(({tokenHash,...safe})=>safe);}
 async function revokeInvite(actor,id){return repository.update(s=>{init(s);const acting=current(s,actor);const invite=s.invites.find(x=>x.id===id);if(invite&&acting.role!=='admin'&&invite.createdBy!==actor.id)throw new AccessError('You can only revoke your own invitations.',403);const before=s.invites.length;s.invites=s.invites.filter(x=>x.id!==id);if(before===s.invites.length)throw new AccessError('Invitation not found.',404);return {ok:true};});}
 async function accept(body){
  if(typeof body.token!=='string'||body.token.length>100)throw new AccessError('This invitation is invalid or expired.',410);
  const hash=await passwordHash(body.password);return repository.update(s=>{init(s);const invitation=s.invites.find(x=>x.expiresAt>now()&&equal(x.tokenHash,digest(body.token)));const inviter=invitation&&s.users.find(x=>x.id===invitation.createdBy&&x.active);if(!invitation||!inviter||(inviter.role!=='admin'&&(invitation.role!=='broker'||s.users.some(x=>x.email===invitation.email))))throw new AccessError('This invitation is invalid or expired.',410);
   let u=s.users.find(x=>x.email===invitation.email);if(u){ownerGuard(s,u,invitation.role,true);u.passwordHash=hash;u.role=invitation.role;u.active=true;u.name=invitation.name;}else{u={id:randomBytes(12).toString('hex'),email:invitation.email,name:invitation.name,role:invitation.role,active:true,passwordHash:hash,createdAt:new Date(now()).toISOString()};s.users.push(u);}
   s.invites=s.invites.filter(x=>x.id!==invitation.id);s.sessions=s.sessions.filter(x=>x.userId!==u.id);s.authFailures=s.authFailures.filter(x=>x.key!==digest(u.email));return addSession(s,u);
  });
 }
 async function updateUser(actor,id,body){admin(actor);return repository.update(s=>{init(s);admin(current(s,actor));const u=s.users.find(x=>x.id===id);if(!u)throw new AccessError('User not found.',404);const nextRole=body.role===undefined?u.role:role(body.role),active=body.active===undefined?u.active:body.active;if(typeof active!=='boolean')throw new AccessError('Choose whether the account is active.');ownerGuard(s,u,nextRole,active);u.role=nextRole;u.active=active;s.sessions=s.sessions.filter(x=>x.userId!==u.id);s.invites=s.invites.filter(x=>x.email!==u.email&&x.createdBy!==u.id);return publicUser(u);});}
 function canEdit(actor,d){return ['admin','broker_admin'].includes(actor.role);}
 async function collections(actor){return ((await repository.read()).collections||[]).filter(c=>actor.role==='admin'||c.ownerId===actor.id);}
 async function saveCollection(actor,body,id){if(actor.legacy)throw new AccessError('Create a staff account first.',409);const title=name(body.title);if(!Array.isArray(body.developmentIds)||!body.developmentIds.length||body.developmentIds.length>50||!body.developmentIds.every(x=>typeof x==='string'))throw new AccessError('Choose 1–50 developments.');const ids=[...new Set(body.developmentIds)];return repository.update(s=>{init(s);const acting=current(s,actor);if(ids.some(id=>!s.developments.some(d=>d.id===id)))throw new AccessError('One of these developments is no longer listed. Refresh your selection.');let c=id?s.collections.find(x=>x.id===id):null;if(id&&!c)throw new AccessError('Collection not found.',404);if(c&&acting.role!=='admin'&&c.ownerId!==acting.id)throw new AccessError('You can only edit your own collections.',403);if(!c){c={id:randomBytes(12).toString('hex'),slug:randomBytes(12).toString('base64url'),ownerId:actor.id,createdAt:new Date(now()).toISOString()};s.collections.push(c);}c.title=title;c.developmentIds=ids;c.updatedAt=new Date(now()).toISOString();return structuredClone(c);});}
 async function deleteCollection(actor,id){return repository.update(s=>{init(s);const acting=current(s,actor);const c=s.collections.find(x=>x.id===id);if(!c)throw new AccessError('Collection not found.',404);if(acting.role!=='admin'&&c.ownerId!==acting.id)throw new AccessError('You can only remove your own collections.',403);s.collections=s.collections.filter(x=>x.id!==id);return {ok:true};});}
 async function publicCollection(slug){const s=await repository.read();const c=(s.collections||[]).find(x=>x.slug===slug),owner=c&&(s.users||[]).find(u=>u.id===c.ownerId&&u.active);if(!c||!owner)throw new AccessError('This collection is no longer available.',404);return {slug:c.slug,title:c.title,brokerName:owner.name,developmentIds:c.developmentIds.filter(id=>s.developments.some(d=>d.id===id))};}
 return {status,authenticate,current,csrf,admin,stock,bootstrap,login,logout,users,invite,invites,revokeInvite,accept,updateUser,canEdit,collections,saveCollection,deleteCollection,publicCollection};
}
