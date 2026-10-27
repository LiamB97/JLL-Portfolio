import React, {useCallback, useEffect, useState, useRef, useMemo, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight, ArrowRight, MapPin, Search, SlidersHorizontal, Map as MapIcon, LayoutGrid, Columns2, X, TrainFront, ChevronLeft, ChevronRight, Check, ArrowLeft, Building2, Settings, Heart, Star} from 'lucide-react';
const PortfolioMap=lazy(()=>import('./Map'));
const StaffPortal=lazy(()=>import('./StaffPortal'));
import JourneySearch,{useJourneySearch} from './JourneySearch';
import {areas,regions,nearArea,regionFor,parseJourneyQuery} from './explore';
import Favourites from './Favourites';
import {useFavourites} from './shortlist';
import {type Development, type Station, type TransportNetwork, type Connections, type BuyerCollection, money, bedroomLabel, distance} from './types';
import './style.css';

type View = 'map' | 'split' | 'list';
function App() {
  const [items, setItems] = useState<Development[]>([]);
  const [network, setNetwork] = useState<TransportNetwork|null>(null);
  const [transportError,setTransportError]=useState('');
  const stations=network?.stations||[];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [region,setRegion]=useState(''),[area,setArea]=useState(''),[journeyOpen,setJourneyOpen]=useState(false),[journeyIntent,setJourneyIntent]=useState<ReturnType<typeof parseJourneyQuery>>(null);
  const travel=useJourneySearch(items);
  const journeyMinutes=useMemo(()=>Object.fromEntries((travel.journey?.results||[]).filter(r=>r.status==='verified').map(r=>[r.id,r.minutes as number])),[travel.journey?.results]);
  const [beds, setBeds] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  const [sort, setSort] = useState('curated');
  const isStaff=()=>location.hash==='#admin'||location.hash.startsWith('#invite=');
  const [admin, setAdmin] = useState(isStaff);
  const favourites=useFavourites();
  const [showFavourites,setShowFavourites]=useState(false);
  const [collection,setCollection]=useState<BuyerCollection|null>(null),[collectionError,setCollectionError]=useState(''),[featuredOnly,setFeaturedOnly]=useState(false);
  const featuredIds=useMemo(()=>collection?.developmentIds||[],[collection]);
  const initialLink=useRef(false);
  useEffect(()=>{const slug=new URLSearchParams(location.search).get('collection');if(!slug)return;fetch('/api/collections/'+encodeURIComponent(slug)).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'This collection is unavailable.');setCollection(d);}).catch(e=>setCollectionError(e.message));},[]);
  useEffect(()=>{if(loading||initialLink.current||!items.length)return;initialLink.current=true;const id=new URLSearchParams(location.search).get('development');if(id&&items.some(d=>d.id===id))setSelected(id);},[items,loading]);
  const [filters, setFilters] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/developments');
    if (!response.ok) throw Error('Unable to load the portfolio. Please try again.');
    setItems(await response.json());
  }, []);
  useEffect(() => {
    void refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));
    void fetch('/api/transport').then(response => {
        if (!response.ok) throw Error('The TfL network is temporarily unavailable.');
        return response.json();
      }).then(setNetwork).catch(e=>setTransportError(e.message));
    const change = () => setAdmin(isStaff());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, [refresh]);
  const select = useCallback((id: string) => setSelected(id), []);
  const filtered = items.filter(d =>
    (!parseJourneyQuery(query)&&`${d.name} ${d.area} ${d.postcode}`.toLowerCase().includes(query.toLowerCase())||Boolean(parseJourneyQuery(query))) &&
    (!region||regionFor(d)===region)&&(!area||nearArea(d,area))&&(!travel.journey||(journeyMinutes[d.id]!==undefined&&journeyMinutes[d.id]<=travel.journey.limit)) &&
    (!featuredOnly||featuredIds.includes(d.id)) &&
    (!beds || d.bedrooms.includes(Number(beds))) &&
    (!type || d.propertyTypes.includes(type))
  ).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='area'?a.area.localeCompare(b.area):Number(featuredIds.includes(b.id))-Number(featuredIds.includes(a.id)));
  const active = items.find(d => d.id === selected);
  const filterCount = [beds, type,region,area].filter(Boolean).length;
  const reset = () => { setQuery(''); setBeds(''); setType('');setFeaturedOnly(false);setRegion('');setArea('');travel.clear();setJourneyOpen(false);setJourneyIntent(null); };

  return <div className={`portfolio-app ${admin ? 'admin-active' : 'explorer-active'}`}>
    <header className="explorer-header">
      <a className="brand" href="#" aria-label="JLL Residential home">
        <img className="official-logo" src="/images/jll-logo.svg" alt="JLL"/>
        <span className="brand-divider"/>
        <span className="brand-sub">RESIDENTIAL<br/><strong>London new homes</strong></span>
      </a>
      {!admin && <div className="explorer-view-toggle" role="group" aria-label="Portfolio view">
        {([{value:'map', label:'Map', icon:MapIcon}, {value:'split', label:'Split', icon:Columns2}, {value:'list', label:'List', icon:LayoutGrid}] as const).map(({value, label, icon:Icon}) =>
          <button key={value} aria-pressed={view === value} className={view === value ? 'chosen' : ''} onClick={() => setView(value)}><Icon size={16}/><span>{label}</span></button>
        )}
      </div>}
      {!admin&&<button className="shortlist-header-button" aria-label={`Favourites, ${favourites.ids.length} saved`} onClick={()=>{setSelected(null);setShowFavourites(true);}}><Heart size={17}/><span>Favourites</span>{favourites.ids.length>0&&<b>{favourites.ids.length}</b>}</button>}
      <a className="manage-link" href="#admin" aria-label="Manage portfolio" title="Manage portfolio"><Settings size={17}/><span>Manage</span></a>
    </header>
    {admin ? <Suspense fallback={<p className="staff-portal">Loading staff workspace…</p>}><StaffPortal items={items} onChange={refresh}/></Suspense> : <main className={`map-explorer view-${view}`} aria-label="London development explorer">
      <div className="explorer-tools">
        <form className="explorer-search" onSubmit={e=>{e.preventDefault();const intent=parseJourneyQuery(query)||(query.trim()?{place:query.trim(),minutes:20,mode:'transit'}:null);setJourneyIntent(intent);setJourneyOpen(true);setFilters(false);}}>
          <Search size={18}/>
          <input aria-label="Search by area, development, postcode or journey" placeholder="Area, development or ‘20 minutes from Angel’" value={query} onChange={e => setQuery(e.target.value)}/>
          {query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button>}
          <button type="button" aria-label="Filters" className={`explorer-filter-button ${filterCount ? 'filtered' : ''}`} aria-expanded={filters} aria-controls="explorer-filter-panel" onClick={() => {setFilters(!filters);setJourneyOpen(false);}}><SlidersHorizontal size={16}/><span>Filters</span>{filterCount > 0 && <b>{filterCount}</b>}</button>
        </form>
        <JourneySearch open={journeyOpen} setOpen={setJourneyOpen} intent={journeyIntent} run={async(...args)=>{setQuery('');await travel.run(...args);}} journey={travel.journey} clear={travel.clear}/>
        {filters && <section id="explorer-filter-panel" className="explorer-filter-panel" aria-label="Filter developments">
          <div className="filter-panel-heading"><strong>Find your London home</strong><button aria-label="Close filters" onClick={() => setFilters(false)}><X size={16}/></button></div>
          <div className="explorer-filter-fields"><label>London region<select aria-label="London region" value={region} onChange={e=>setRegion(e.target.value)}><option value="">All London</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label>Near an area<select aria-label="Near an area" value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{areas.map(a=><option key={a.name}>{a.name}</option>)}</select></label>
            <label>Bedrooms<select aria-label="Bedrooms" value={beds} onChange={e => setBeds(e.target.value)}><option value="">Any bedrooms</option><option value="0">Studio</option>{[1,2,3,4].map(n => <option key={n} value={n}>{n} bedrooms</option>)}</select></label>
            <label>Property type<select aria-label="Property type" value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{Array.from(new Set(items.flatMap(d => d.propertyTypes))).map(t => <option key={t}>{t}</option>)}</select></label>
          </div>
          <p className="area-filter-note">Areas show developments within 2 km of the named centre. Regions are approximate geographic sectors.</p><div className="filter-panel-actions"><button onClick={reset}>Reset filters</button><button className="primary" onClick={() => setFilters(false)}>Show {filtered.length} developments</button></div>
        </section>}
        <div className="explorer-result-count" role="status" aria-live="polite">{loading ? 'Loading London homes…' : <><span className="collection-dot"/><strong>{filtered.length} developments</strong><span>across London</span>{(query || filterCount > 0) && <button onClick={reset}>Clear all</button>}</>}</div>
        {collection&&<section className="featured-intro"><span><Star size={15}/><strong>{collection.title}</strong></span><p>{featuredIds.length} featured developments · Picked by {collection.brokerName}</p><button aria-pressed={featuredOnly} onClick={()=>setFeaturedOnly(!featuredOnly)}>{featuredOnly?'Explore all developments':'Show featured only'}</button></section>}
        {collectionError&&<div className="explorer-message" role="status">{collectionError} You can still explore the full portfolio.</div>}
        {error && <div className="explorer-message" role="alert">{error}<button onClick={() => { setError(''); void refresh().catch(e => setError(e.message)); }}>Retry</button></div>}
        {!loading && !filtered.length && !error && view === 'map' && <div className="explorer-message"><Building2 size={20}/><div><strong>{travel.journey?.running?'Checking for nearby homes…':'No homes found'}</strong><p>{travel.journey?.running?'Verified matches appear as journeys are checked.':'Try a different area or broaden your filters.'}</p></div><button onClick={reset}>Reset</button></div>}
      </div>
      <div className="explorer-workspace">
        {view !== 'list' && <Suspense fallback={<div className="map-shell map-loading" role="status">Loading your London map…</div>}><PortfolioMap items={filtered} selected={selected} onSelect={select} network={network} transportError={transportError} featuredIds={featuredIds} journeyOrigin={travel.journey?.origin} journeyMinutes={journeyMinutes} journeyKey={travel.journey&&!travel.journey.running?`${travel.journey.origin.lat},${travel.journey.origin.lng}/${travel.journey.limit}/${travel.journey.departure}`:''}/></Suspense>}
        {view !== 'map' && <section className="explorer-list" aria-label="Development listings">
          <div className="listing-heading"><h1>London collection</h1><label>Sort by<select aria-label="Sort developments" value={sort} onChange={e => setSort(e.target.value)}><option value="curated">Our collection</option><option value="name">Name: A–Z</option><option value="area">Area: A–Z</option></select></label></div>
          {loading ? <p className="empty-state">Loading your London collection…</p> : !filtered.length ? <div className="empty-state"><Building2 size={30}/><h2>No homes found</h2><p>Try a different area or broaden your filters.</p><button onClick={reset}>Reset filters</button></div> : <div className="cards">
            {filtered.map(d => <article className="property-card-wrap" key={d.id}><button className={`property-card ${selected === d.id ? 'selected' : ''}`} key={d.id} onClick={() => setSelected(d.id)}>
              <div className="card-image"><img src={d.images[0] || '/images/city.svg'} alt={d.sample ? 'Architectural illustration' : d.name} loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/city.svg'; }}/><span className="card-tag">{featuredIds.includes(d.id)?'FEATURED':d.sample ? 'SAMPLE COLLECTION' : d.status.toUpperCase()}</span><span className="card-arrow"><ArrowUpRight size={18}/></span></div>
              <div className="card-body"><p className="card-area"><MapPin size={12}/>{d.area}<span>· {d.postcode}</span></p><h2>{d.name}</h2><p className="card-beds">{bedroomLabel(d.bedrooms)} bedrooms <span>·</span> {d.propertyTypes.join(' & ')}</p><div className="card-bottom"><span>Prices from <strong>{money(d.priceFrom)}</strong></span>{journeyMinutes[d.id]!==undefined&&<span className="journey-card-time">{journeyMinutes[d.id]} min journey</span>}<span className="explore">Explore <ArrowRight size={14}/></span></div></div>
            </button><button className={favourites.ids.includes(d.id)?"save-card saved":"save-card"} aria-pressed={favourites.ids.includes(d.id)} aria-label={favourites.ids.includes(d.id)?`Remove ${d.name} from favourites`:`Save ${d.name} to favourites`} onClick={()=>favourites.toggle(d.id)}><Heart size={17} fill={favourites.ids.includes(d.id)?"currentColor":"none"}/></button></article>)}
          </div>}
        </section>}
      </div>
      <div className="explorer-disclaimer">{items.some(d => d.sample) ? 'Preview collection · Illustrative stock and prices' : 'Prices & availability subject to broker confirmation'}</div>
    </main>}
    {showFavourites&&!admin&&<Favourites items={items} ids={favourites.ids} toggle={favourites.toggle} persistent={favourites.persistent} collection={collection?.slug} close={()=>setShowFavourites(false)} open={id=>{setShowFavourites(false);setSelected(id);}}/>}
    {active && !admin && <Detail key={active.id} d={active} stations={stations} network={network} saved={favourites.ids.includes(active.id)} toggleFavourite={()=>favourites.toggle(active.id)} close={() => setSelected(null)}/>}
  </div>;
}

function Detail({d,stations,network,close,saved,toggleFavourite}:{d:Development;stations:Station[];network:TransportNetwork|null;close:()=>void;saved:boolean;toggleFavourite:()=>void}){
 const [connections,setConnections]=useState<Connections|null>(null),[routesLoading,setRoutesLoading]=useState(true),[routeError,setRouteError]=useState('');
 useEffect(()=>{const controller=new AbortController();fetch('/api/connections/'+encodeURIComponent(d.id),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Station routes are temporarily unavailable.');return r.json();}).then(setConnections).catch(e=>{if(e.name!=='AbortError')setRouteError(e.message);}).finally(()=>{if(!controller.signal.aborted)setRoutesLoading(false);});return()=>controller.abort();},[d.id]);
 const [photo,setPhoto]=useState(0),[destination,setDestination]=useState(''),[mode,setMode]=useState('transit');
 useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';const previous=document.activeElement as HTMLElement|null;const dialog=document.getElementById('development-dialog');dialog?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();if(e.key==='Tab'&&dialog){const nodes=Array.from(dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,video'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus();};},[]);
 const nearest=stations.map(s=>({...s,km:distance(d,s)})).sort((a,b)=>a.km-b.km).slice(0,3);
 const image=d.images[photo]||'/images/city.svg';
 return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)close();}}><section id="development-dialog" className="detail" role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex={-1}><button className="detail-close" onClick={close} aria-label="Close development"><X size={22}/></button><div className="detail-image"><img src={image} alt={d.sample?'Architectural illustration':d.name} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/images/city.svg';}}/>{d.sample&&<span className="detail-sample">ILLUSTRATIVE SAMPLE · NOT LIVE STOCK</span>}{d.images.length>1&&<div className="gallery-buttons"><button aria-label="Previous photo" onClick={()=>setPhoto((photo-1+d.images.length)%d.images.length)}><ChevronLeft/></button><span>{photo+1} / {d.images.length}</span><button aria-label="Next photo" onClick={()=>setPhoto((photo+1)%d.images.length)}><ChevronRight/></button></div>}</div><div className="detail-content"><p className="card-area"><MapPin size={14}/>{d.area} · {d.postcode}</p><h1 id="detail-title">{d.name}</h1><button className={saved?"detail-save saved":"detail-save"} aria-pressed={saved} onClick={toggleFavourite}><Heart size={16} fill={saved?"currentColor":"none"}/>{saved?"Saved to favourites":"Save to favourites"}</button><div className="detail-summary"><span>Prices from <strong>{money(d.priceFrom)}</strong></span><span>{bedroomLabel(d.bedrooms)} bedrooms<br/>{d.propertyTypes.join(' · ')}</span></div><p className="description">{d.description}</p><h2>Features & amenities</h2><div className="amenities">{d.amenities.length?d.amenities.map(a=><span key={a}><Check size={16}/>{a}</span>):<p>Amenities to be confirmed.</p>}</div>{d.videos.length>0&&<><h2>A closer look</h2>{d.videos.map((v,i)=>/\.(?:mp4|webm|ogg)(?:\?|$)/i.test(v)?<video key={v} controls preload="none" src={v} aria-label={`Development video ${i+1}`}/>:<a className="video-link" href={v} target="_blank" rel="noopener noreferrer" key={v}>Watch development video {i+1} <ArrowUpRight size={16}/></a>)}</>}<section className="connections"><p className="eyebrow">LONDON, CONNECTED</p><h2>Your neighbourhood. Your connections.</h2><p className="muted">Nearby stations from TfL's rail network. Choose Walk or Cycle to open a station journey in Google Maps.</p>{routesLoading&&<p className="route-status" role="status">Checking walking and cycling routes…</p>}{routeError&&<p className="route-status" role="status">{routeError} Use the journey links for current routes.</p>}{(connections?.stations||nearest.map(s=>({...s,straightLineKm:s.km,walking:null,cycling:null}))).map(s=><div className="station connection-station" key={s.id||s.name}><div className="station-heading"><span className="station-icon"><TrainFront size={19}/></span><div><strong>{s.name}</strong><div className="station-line-badges">{s.lineIds?.length?s.lineIds.map(id=>{const line=network?.lines.find(l=>l.id===id);return <span key={id}><i style={{background:line?.colour||'#626d79'}}/>{line?.name||id}</span>;}):s.lines}</div></div></div><div className="station-routes">{(['walking','cycling'] as const).map(mode=>{const route=s[mode];return <a key={mode} href={'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(`${d.lat},${d.lng}`)+'&destination='+encodeURIComponent(`${s.lat},${s.lng}`)+'&travelmode='+(mode==='walking'?'walking':'bicycling')} target="_blank" rel="noopener noreferrer"><strong>{mode==='walking'?'Walk':'Cycle'} <ArrowUpRight size={12}/></strong><span>{route?`${route.durationMinutes} min · ${route.distanceMeters<1000?route.distanceMeters+' m':(route.distanceMeters/1000).toFixed(1)+' km'}`:routesLoading?'Checking…':'Check route ↗'}</span></a>;})}</div>{!s.walking&&!s.cycling&&!routesLoading&&<small className="route-fallback">{s.straightLineKm.toFixed(1)} km straight-line distance · Route distance unavailable</small>}</div>)}{connections&&<p className="route-source">Walking and cycling routes: TfL Journey Planner · Updated {new Date(connections.updatedAt).toLocaleDateString('en-GB')}. Conditions can change.</p>}<form onSubmit={e=>{e.preventDefault();window.open('https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(`${d.lat},${d.lng}`)+'&destination='+encodeURIComponent(destination)+'&travelmode='+mode,'_blank','noopener,noreferrer');}}><h3>What would your commute look like?</h3><label>Destination<input required value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Office, station or postcode"/></label><div className="commute-row"><select aria-label="Travel mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="transit">Public transport</option><option value="walking">Walking</option><option value="bicycling">Cycling</option></select><button className="primary">Plan journey <ArrowUpRight size={16}/></button></div><p className="muted">Opens Google Maps for route options and current travel estimates. Your destination is sent to Google, not stored in this portfolio.</p></form></section><div className="broker-note"><strong>Found somewhere you like?</strong><p>Go back to the JLL broker who shared this portfolio to find out more.</p></div><button className="back-link" onClick={close}><ArrowLeft size={16}/> Back to the collection</button></div></section></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
