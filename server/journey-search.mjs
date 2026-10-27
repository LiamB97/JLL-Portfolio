import london from '../shared/london.json' with {type:'json'};
export const normalizePlace=s=>s.toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/\b(?:underground|rail|dlr|overground|station)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const inLondon=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>=51.28&&p.lat<=51.7&&p.lng>=-.52&&p.lng<=.34;
export async function journeyJson(path){const r=await fetch('https://api.tfl.gov.uk'+path,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/json','User-Agent':'JLL-Portfolio/0.1 (https://subtle-malabi-144145.netlify.app/)'}});if(!r.ok&&r.status!==300)throw Error('TfL could not calculate this journey.');return r.json();}
export async function resolveOrigins(query,network,{get=journeyJson}={}){
 if(typeof query!=='string'||query.trim().length<2||query.length>120)throw Error('Enter a London place, station or full postcode.');
 const q=normalizePlace(query),catalogue=[...network.stations.map(p=>({...p,category:'Station'})),...london.landmarks,...london.areas.map(p=>({...p,category:'Area centre'}))];
 const exact=catalogue.filter(p=>[p.name,...(p.aliases||[])].some(n=>normalizePlace(n)===q));const stations=exact.filter(p=>p.category==='Station');const matches=stations.length?stations:exact;
 if(matches.length)return matches.slice(0,8).map(({name,lat,lng,category})=>({name,lat,lng,category}));
 const data=await get('/Journey/JourneyResults/'+encodeURIComponent(query.trim())+'/to/51.5074,-0.1278?mode=walking');
 const options=data.fromLocationDisambiguation?.disambiguationOptions||[];
 const found=options.map(x=>({name:x.place?.commonName,lat:x.place?.lat,lng:x.place?.lon,category:'TfL place'})).filter(p=>p.name&&inLondon(p));
 // An unambiguous full postcode/place returns a journey directly.
 if(!found.length&&data.journeys?.length){const p=data.journeys[0].legs?.[0]?.departurePoint;if(p&&inLondon({lat:p.lat,lng:p.lon}))found.push({name:p.commonName||query.trim(),lat:p.lat,lng:p.lon,category:'TfL place'});}
 return [...new Map(found.map(p=>[`${p.name}:${p.lat},${p.lng}`,p])).values()].slice(0,8);
}
export function journeyDuration(data,mode){
 const allowed=mode==='walking'?['walking']:mode==='cycle'?['cycle','walking']:['walking','tube','dlr','overground','elizabeth-line','national-rail','bus','tram','cable-car','replacement-bus','coach'];
 const journeys=(data.journeys||[]).filter(j=>Number.isFinite(j.duration)&&j.duration>=0&&j.legs?.length&&j.legs.every(l=>allowed.includes(l.mode?.id))&&(mode!=='cycle'||j.legs.some(l=>l.mode?.id==='cycle')));
 if(!journeys.length)return null;return Math.ceil(Math.min(...journeys.map(j=>j.duration)));
}
export function journeySearchService({get=journeyJson,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 return async(body,developments)=>{
  const {origin,mode,date,time,developmentIds}=body||{};
  if(!origin||!inLondon(origin)||!['transit','walking','cycle'].includes(mode)||!/^\d{8}$/.test(date||'')||!/^\d{4}$/.test(time||'')||Number(time.slice(0,2))>23||Number(time.slice(2))>59)throw Error('Choose a London starting point, travel mode and departure time.');
  const departure=Date.parse(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T${time.slice(0,2)}:${time.slice(2)}:00Z`);if(!Number.isFinite(departure)||departure<now()-2*3600000||departure>now()+15*86400000)throw Error('Choose a departure within the next two weeks.');
  if(!Array.isArray(developmentIds)||!developmentIds.length||developmentIds.length>6||developmentIds.some(id=>typeof id!=='string'))throw Error('Check 1–6 published developments at a time.');
  const homes=[...new Set(developmentIds)].map(id=>developments.find(d=>d.id===id));if(homes.some(d=>!d))throw Error('Refresh the portfolio: a development is no longer available.');
  const start=`${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`,travel=mode==='transit'?'tube,dlr,overground,elizabeth-line,national-rail,bus,tram,cable-car,walking':mode;
  const results=await Promise.all(homes.map(async d=>{
   const key=`${start}/${d.id}/${d.lat},${d.lng}/${mode}/${date}/${time}`,saved=cache.get(key);if(saved&&saved.expires>now())return saved.result;
   if(!pending.has(key))pending.set(key,(async()=>{try{const data=await get(`/Journey/JourneyResults/${start}/to/${d.lat},${d.lng}?mode=${travel}&date=${date}&time=${time}&timeIs=Departing&journeyPreference=LeastTime${mode==='cycle'?'&cyclePreference=AllTheWay':''}`);const minutes=journeyDuration(data,mode);const result={id:d.id,minutes,status:minutes===null?'unavailable':'verified'};if(minutes!==null){if(cache.size>=1000)cache.delete(cache.keys().next().value);cache.set(key,{result,expires:now()+15*60000});}return result;}catch{return {id:d.id,minutes:null,status:'unavailable'};}})().finally(()=>pending.delete(key)));
   return pending.get(key);
  }));
  return {results,source:'TfL Journey Planner',checkedAt:new Date(now()).toISOString()};
 };
}
export const searchJourneys=journeySearchService();
