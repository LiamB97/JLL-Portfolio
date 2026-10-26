const API='https://api.tfl.gov.uk';
export const TRANSPORT_MODES='tube,dlr,elizabeth-line,overground,tram,cable-car';
export const TRANSPORT_TTL=7*24*3600000;
export const lineColours={bakerloo:'#B36305',central:'#E32017',circle:'#FFD300',district:'#00782A','hammersmith-city':'#F3A9BB',jubilee:'#8B9096',metropolitan:'#9B0056',northern:'#202020',piccadilly:'#003688',victoria:'#0098D4','waterloo-city':'#95CDBA',elizabeth:'#6950A1','elizabeth-line':'#6950A1',dlr:'#00A4A7',tram:'#65A328','london-overground':'#EE7C0E',lioness:'#FAA61A',mildmay:'#0077AD',windrush:'#D03B41',weaver:'#9B0058',suffragette:'#47A247',liberty:'#61686B','london-cable-car':'#E21836'};
export async function tflJson(path,fetcher=fetch){const r=await fetcher(API+path,{signal:AbortSignal.timeout(14000),headers:{'User-Agent':'JLL-Portfolio/0.1 (https://subtle-malabi-144145.netlify.app/)','Accept':'application/json'}});if(!r.ok)throw Error(`TfL service returned ${r.status}`);return r.json();}
export function routePaths(strings=[]){const paths=[];function visit(x){if(!Array.isArray(x))return;if(x.length>1&&x.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]))){paths.push(x.map(([lng,lat])=>[lat,lng]));}else x.forEach(visit);}for(const s of strings){try{visit(typeof s==='string'?JSON.parse(s):s);}catch{}}return paths;}
export async function fetchTransport({get=tflJson,minLines=15,minStations=350}={}){
 const lines=await get('/Line/Mode/'+TRANSPORT_MODES);if(!Array.isArray(lines)||lines.length<minLines)throw Error('TfL returned an incomplete line list.');
 const stations=new Map(),output=[];let index=0;
 async function worker(){while(index<lines.length){const line=lines[index++];
  const [stops,route]=await Promise.all([get('/Line/'+encodeURIComponent(line.id)+'/StopPoints'),get('/Line/'+encodeURIComponent(line.id)+'/Route/Sequence/all?serviceTypes=Regular').catch(()=>null)]);
  if(!Array.isArray(stops)||!stops.length)throw Error('TfL returned an incomplete station list.');
  for(const stop of stops){if(!Number.isFinite(stop.lat)||!Number.isFinite(stop.lon)||!stop.id)continue;const id=stop.stationNaptan||stop.id;const s=stations.get(id)||{id,name:stop.commonName.replace(/ (Underground|DLR|Rail|Tram|Overground|Cable Car) Station$/,''),lat:stop.lat,lng:stop.lon,lineIds:[],lines:''};if(!s.lineIds.includes(line.id))s.lineIds.push(line.id);stations.set(id,s);}
  output.push({id:line.id,name:line.name,mode:line.modeName,colour:lineColours[line.id]||'#596B78',paths:routePaths(route?.lineStrings)});
 }}
 await Promise.all(Array.from({length:3},worker));const byId=new Map(output.map(l=>[l.id,l]));const all=[...stations.values()].map(s=>({...s,lineIds:s.lineIds.sort(),lines:s.lineIds.map(id=>byId.get(id)?.name||id).join(' · ')})).sort((a,b)=>a.name.localeCompare(b.name));
 if(all.length<minStations)throw Error('TfL returned too few stations; previous network was preserved.');
 return {source:'TfL Unified API',attribution:'Powered by TfL Open Data',updatedAt:new Date().toISOString(),stations:all,lines:output.sort((a,b)=>a.name.localeCompare(b.name)),missingGeometry:output.filter(l=>!l.paths.length).map(l=>l.name)};
}
export function transportService({read=async()=>null,write=async()=>{},load=fetchTransport,now=Date.now,seed=null}={}){let memory=null,pending=null;return async()=>{
 const saved=memory||await read()||seed;if(saved&&now()-Date.parse(saved.updatedAt)<TRANSPORT_TTL){memory=saved;return saved;}
 if(!pending)pending=load().then(async data=>{memory=data;await write(data);return data;}).catch(e=>{if(saved)return {...saved,stale:true};throw e;}).finally(()=>{pending=null;});return pending;
};}
