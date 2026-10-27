import React, {useCallback, useEffect, useState, useRef, useMemo, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight, ArrowRight, MapPin, Search, SlidersHorizontal, Map as MapIcon, LayoutGrid, Columns2, X, TrainFront, ChevronLeft, ChevronRight, Check, ArrowLeft, Building2, Settings, Heart, Star, CircleHelp} from 'lucide-react';
const PortfolioMap=lazy(()=>import('./Map'));
const BuyerGuide=lazy(()=>import('./BuyerGuide'));
const StaffPortal=lazy(()=>import('./StaffPortal'));
import {areas,regions,nearArea,regionFor} from './explore';
import Favourites from './Favourites';
import {useFavourites} from './shortlist';
import {type Development, type Station, type TransportNetwork, type Connections, type BuyerCollection,type BrokerCard, money, bedroomLabel, distance} from './types';
import './style.css';
import Preferences from './Preferences';
import {PreferencesProvider,useLocale} from './i18n';
import Detail from './Detail';
import AnalyticsConsent from './AnalyticsConsent';
import {track,setAnalyticsContext,setCurrentDevelopment} from './analytics';

type View = 'map' | 'split' | 'list';
function App() {
  const {t,dark,language}=useLocale();
  const [items, setItems] = useState<Development[]>([]);
  const [network, setNetwork] = useState<TransportNetwork|null>(null);
  const [transportError,setTransportError]=useState('');
  const stations=network?.stations||[];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [region,setRegion]=useState(''),[area,setArea]=useState('');
  const [beds, setBeds] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  const [sort, setSort] = useState('curated');
  const isStaff=()=>location.hash==='#admin'||location.hash.startsWith('#invite=');
  const [admin, setAdmin] = useState(isStaff);
  const [howItWorks,setHowItWorks]=useState(()=>location.hash==='#how-it-works');
  const favourites=useFavourites();
  const [showFavourites,setShowFavourites]=useState(false),[favouritesOnly,setFavouritesOnly]=useState(false);
  const [linkLoading,setLinkLoading]=useState(()=>{const q=new URLSearchParams(location.search);return Boolean(q.get('broker')||q.get('collection'));});
  const [broker,setBroker]=useState<BrokerCard|null>(null);
  const [collection,setCollection]=useState<BuyerCollection|null>(null),[collectionError,setCollectionError]=useState(''),[featuredOnly,setFeaturedOnly]=useState(false);
  const featuredIds=useMemo(()=>collection?.developmentIds||[],[collection]);
  const initialLink=useRef(false);
  useEffect(()=>{const slug=new URLSearchParams(location.search).get('collection');if(!slug)return;fetch('/api/collections/'+encodeURIComponent(slug)).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'This collection is unavailable.');setCollection(d);setBroker(d.broker||null);}).catch(e=>setCollectionError(e.message)).finally(()=>setLinkLoading(false));},[]);
  useEffect(()=>{const params=new URLSearchParams(location.search);if(params.has('collection'))return;const slug=params.get('broker');if(!slug)return;fetch('/api/brokers/'+encodeURIComponent(slug)).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'This broker link is unavailable.');setBroker(d);}).catch(e=>setCollectionError(e.message)).finally(()=>setLinkLoading(false));},[]);
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
    const change = () => {setAdmin(isStaff());setHowItWorks(location.hash==='#how-it-works');};
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, [refresh]);
  const select = useCallback((id: string) => setSelected(id), []);
  const filtered = items.filter(d =>
    `${d.name} ${d.area} ${d.postcode}`.toLowerCase().includes(query.toLowerCase()) &&
    (!region||regionFor(d)===region)&&(!area||nearArea(d,area)) &&
    (!featuredOnly||featuredIds.includes(d.id)) &&
    (!favouritesOnly||favourites.ids.includes(d.id)) &&
    (!beds || d.bedrooms.includes(Number(beds))) &&
    (!type || d.propertyTypes.includes(type))
  ).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='area'?a.area.localeCompare(b.area):Number(featuredIds.includes(b.id))-Number(featuredIds.includes(a.id)));
  const active = items.find(d => d.id === selected);
  useEffect(()=>{setAnalyticsContext({language,link_kind:collection?'collection':broker?'broker':'general',...(broker?{broker_link_id:broker.slug}:{}),...(collection?{collection_id:collection.slug}:{})},!loading&&!linkLoading);},[language,broker,collection,loading,linkLoading]);
  useEffect(()=>{setCurrentDevelopment(!admin&&!howItWorks&&active?active.id:null);},[selected,active?.id,admin,howItWorks]);
  useEffect(()=>{if(!query.trim()||admin)return;const timer=setTimeout(()=>track('search_used',{result_count:filtered.length}),700);return()=>clearTimeout(timer);},[query,admin]);
  const filterCount = [beds, type,region,area].filter(Boolean).length;
  const reset = () => { setQuery(''); setBeds(''); setType('');setFeaturedOnly(false);setFavouritesOnly(false);setRegion('');setArea(''); };

  return <div className={`portfolio-app ${admin ? 'admin-active' : 'explorer-active'}`}>
    <header className="explorer-header" dir="ltr">
      <a className="brand" href="#" aria-label={t("JLL Residential home")}>
        <img className="official-logo" src={dark?'/images/jll-residential-dark.svg':'/images/jll-residential-light.svg'} alt="JLL Residential"/>

      </a>
      {!admin&&!howItWorks && <div className="explorer-view-toggle" role="group" aria-label={t("Portfolio view")}>
        {([{value:'map', label:'Map', icon:MapIcon}, {value:'split', label:'Split', icon:Columns2}, {value:'list', label:'List', icon:LayoutGrid}] as const).map(({value, label, icon:Icon}) =>
          <button key={value} aria-pressed={view === value} className={view === value ? 'chosen' : ''} onClick={() => {setView(value);track('view_change',{view_mode:value});}}><Icon size={16}/><span>{t(label)}</span></button>
        )}
      </div>}
      {!admin&&!howItWorks&&<button className="shortlist-header-button" aria-label={t('Favourites, {count} saved',{count:favourites.ids.length})} onClick={()=>{setSelected(null);setShowFavourites(true);track('shortlist_open',{saved_count:favourites.ids.length});}}><Heart size={17}/><span>{t("Favourites")}</span>{favourites.ids.length>0&&<b>{favourites.ids.length}</b>}</button>}
      {!admin&&<a className={howItWorks?'how-link selected':'how-link'} href="#how-it-works" aria-label={t('How it works')} aria-current={howItWorks?'page':undefined} onClick={()=>{setSelected(null);setShowFavourites(false);setFilters(false);}}><CircleHelp size={18}/><span>{t('How it works')}</span></a>}
      <Preferences/>
      <a className="manage-link" href="#admin" aria-label={t("Manage portfolio")} title={t("Manage portfolio")}><Settings size={17}/><span>{t("Manage")}</span></a>
    </header>
    {admin ? <Suspense fallback={<p className="staff-portal">{t("Loading staff workspace…")}</p>}><div dir="ltr" lang="en"><StaffPortal items={items} onChange={refresh}/></div></Suspense> : howItWorks?<Suspense fallback={<p className="staff-portal">{t('Loading guide…')}</p>}><BuyerGuide/></Suspense> : <main className={`map-explorer view-${view}`} aria-label={t("London development explorer")}>
      <div className="explorer-tools">
        <form className="explorer-search" onSubmit={e=>e.preventDefault()}>
          <Search size={18}/>
          <input aria-label={t("Search by area, development or postcode")} placeholder={t("Search an area, development or postcode")} value={query} onChange={e => setQuery(e.target.value)}/>
          {query && <button type="button" className="clear-search" aria-label={t("Clear search")} onClick={() => setQuery('')}><X size={15}/></button>}
          <button type="button" aria-label={t("Filters")} className={`explorer-filter-button ${filterCount ? 'filtered' : ''}`} aria-expanded={filters} aria-controls="explorer-filter-panel" onClick={() => {setFilters(!filters);}}><SlidersHorizontal size={16}/><span>{t("Filters")}</span>{filterCount > 0 && <b>{filterCount}</b>}</button>
        </form>
        {filters && <section id="explorer-filter-panel" className="explorer-filter-panel" aria-label={t("Filter developments")}>
          <div className="filter-panel-heading"><strong>{t("Find your London home")}</strong><button aria-label={t("Close filters")} onClick={() => setFilters(false)}><X size={16}/></button></div>
          <div className="explorer-filter-fields"><label>{t("London region")}<select aria-label={t("London region")} value={region} onChange={e=>{setRegion(e.target.value);track('filter_apply',{filter_kind:'region'});}}><option value="">{t("All London")}</option>{regions.map(r=><option key={r} value={r}>{t(r)}</option>)}</select></label><label>{t("Near an area")}<select aria-label={t("Near an area")} value={area} onChange={e=>{setArea(e.target.value);track('filter_apply',{filter_kind:'area'});}}><option value="">{t("All areas")}</option>{areas.map(a=><option key={a.name}>{a.name}</option>)}</select></label>
            <label>{t("Bedrooms")}<select aria-label={t("Bedrooms")} value={beds} onChange={e => {setBeds(e.target.value);track('filter_apply',{filter_kind:'bedrooms'});}}><option value="">{t("Any bedrooms")}</option><option value="0">{t("Studio")}</option>{[1,2,3,4].map(n => <option key={n} value={n}>{t('{count} bedrooms',{count:n})}</option>)}</select></label>
            <label>{t("Property type")}<select aria-label={t("Property type")} value={type} onChange={e => {setType(e.target.value);track('filter_apply',{filter_kind:'property_type'});}}><option value="">{t("All types")}</option>{Array.from(new Set(items.flatMap(d => d.propertyTypes))).map(ptype => <option key={ptype} value={ptype}>{t(ptype)}</option>)}</select></label>
          </div>
          <p className="area-filter-note">{t("Areas show developments within 2 km of the named centre. Regions are approximate geographic sectors.")}</p><div className="filter-panel-actions"><button onClick={reset}>{t("Reset filters")}</button><button className="primary" onClick={() => setFilters(false)}>{t('Show {count} developments',{count:filtered.length})}</button></div>
        </section>}
        <button className={favouritesOnly?"favourites-map-toggle on":"favourites-map-toggle"} aria-pressed={favouritesOnly} onClick={()=>{setFavouritesOnly(!favouritesOnly);setSelected(null);}}><Heart size={15} fill={favouritesOnly?"currentColor":"none"}/>{t(favouritesOnly?"Show all developments":"Show favourites only")}<span>{favourites.ids.filter(id=>items.some(d=>d.id===id)).length}</span></button>
        <div className="explorer-result-count" role="status" aria-live="polite">{loading ? 'Loading London homes…' : <><span className="collection-dot"/><strong>{t('{count} developments',{count:filtered.length})}</strong><span>{t("across London")}</span>{(query || filterCount > 0 || favouritesOnly) && <button onClick={reset}>{t("Clear all")}</button>}</>}</div>
        {collection&&<section className="featured-intro"><span><Star size={15}/><strong>{collection.title}</strong></span><p>{featuredIds.length} {t("featured developments · Picked by")} {collection.brokerName}</p><button aria-pressed={featuredOnly} onClick={()=>setFeaturedOnly(!featuredOnly)}>{featuredOnly?'Explore all developments':'Show featured only'}</button></section>}
        {broker&&<section className="broker-intro"><span>{t('Your JLL broker')}: <strong>{broker.name}</strong></span><a onClick={()=>track('whatsapp_click',{surface:'broker_banner'})} href={'https://wa.me/'+broker.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent(t("Hi, I'd like more information about your London developments."))} target="_blank" rel="noopener noreferrer">{t('WhatsApp {name}',{name:broker.name})} <ArrowUpRight size={13}/></a></section>}
        {collectionError&&<div className="explorer-message" role="status">{collectionError} {t("You can still explore the full portfolio.")}</div>}
        {error && <div className="explorer-message" role="alert">{error}<button onClick={() => { setError(''); void refresh().catch(e => setError(e.message)); }}>{t("Retry")}</button></div>}
        {!loading && !filtered.length && !error && view === 'map' && <div className="explorer-message"><Building2 size={20}/><div><strong>{t(favouritesOnly?"No favourites match this view":"No homes found")}</strong><p>{t(favouritesOnly?"Save developments with the heart button, or clear your filters to see more favourites.":"Try a different area or broaden your filters.")}</p></div><button onClick={reset}>{t("Reset")}</button></div>}
      </div>
      <div className="explorer-workspace">
        {view !== 'list' && <Suspense fallback={<div className="map-shell map-loading" role="status">{t("Loading your London map…")}</div>}><PortfolioMap items={filtered} selected={selected} onSelect={select} network={network} transportError={transportError} featuredIds={featuredIds} favouriteIds={favourites.ids} favouritesOnly={favouritesOnly}/></Suspense>}
        {view !== 'map' && <section className="explorer-list" aria-label={t("Development listings")}>
          <div className="listing-heading"><h1>{t("London collection")}</h1><label>{t("Sort by")}<select aria-label={t("Sort developments")} value={sort} onChange={e => setSort(e.target.value)}><option value="curated">{t("Our collection")}</option><option value="name">{t("Name: A–Z")}</option><option value="area">{t("Area: A–Z")}</option></select></label></div>
          {loading ? <p className="empty-state">{t("Loading your London collection…")}</p> : !filtered.length ? <div className="empty-state"><Building2 size={30}/><h2>{t(favouritesOnly?"No favourites match this view":"No homes found")}</h2><p>{t(favouritesOnly?"Save developments with the heart button, or clear your filters to see more favourites.":"Try a different area or broaden your filters.")}</p><button onClick={reset}>{t("Reset filters")}</button></div> : <div className="cards">
            {filtered.map(d => <article className="property-card-wrap" key={d.id}><button className={`property-card ${selected === d.id ? 'selected' : ''}`} key={d.id} onClick={() => setSelected(d.id)}>
              <div className="card-image"><img src={d.images[0] || '/images/city.svg'} alt={d.sample ? 'Architectural illustration' : d.name} loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/city.svg'; }}/><span className="card-tag">{featuredIds.includes(d.id)?t('FEATURED'):d.sample ? t('SAMPLE COLLECTION') : t(d.status)}</span><span className="card-arrow"><ArrowUpRight size={18}/></span></div>
              <div className="card-body"><p className="card-area"><MapPin size={12}/>{d.area}<span>· {d.postcode}</span></p><h2>{d.name}</h2><p className="card-beds">{bedroomLabel(d.bedrooms).replace('Studio',t('Studio'))} {t("bedrooms")} <span>·</span> {d.propertyTypes.map(ptype=>t(ptype)).join(' & ')}</p><div className="card-bottom"><span>{t("Prices from")} <strong>{money(d.priceFrom)}</strong></span><span className="explore">{t("Explore")} <ArrowRight size={14}/></span></div></div>
            </button><button className={favourites.ids.includes(d.id)?"save-card saved":"save-card"} aria-pressed={favourites.ids.includes(d.id)} aria-label={favourites.ids.includes(d.id)?`Remove ${d.name} from favourites`:`Save ${d.name} to favourites`} onClick={()=>favourites.toggle(d.id)}><Heart size={17} fill={favourites.ids.includes(d.id)?"currentColor":"none"}/></button></article>)}
          </div>}
        </section>}
      </div>
      <div className="explorer-disclaimer">{items.some(d => d.sample) ? 'Preview collection · Illustrative stock and prices' : 'Prices & availability subject to broker confirmation'}</div>
    </main>}
    <AnalyticsConsent/>
    {showFavourites&&!admin&&!howItWorks&&<Favourites items={items} ids={favourites.ids} toggle={favourites.toggle} persistent={favourites.persistent} broker={broker} collection={collection?.slug} close={()=>setShowFavourites(false)} open={id=>{setShowFavourites(false);setSelected(id);}}/>}
    {active && !admin && !howItWorks && <Detail key={active.id} broker={broker} collection={collection?.slug} d={active} stations={stations} network={network} saved={favourites.ids.includes(active.id)} toggleFavourite={()=>favourites.toggle(active.id)} close={() => setSelected(null)}/>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><PreferencesProvider><App/></PreferencesProvider></React.StrictMode>);
