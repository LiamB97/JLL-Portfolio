import {useEffect, useMemo, useRef, useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import '@maplibre/maplibre-gl-leaflet';
import {Layers, TrainFront, AlertCircle, ChevronDown, X} from 'lucide-react';
import type {Development, TransportNetwork} from './types';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

function stationPopup(station:TransportNetwork['stations'][number], network:TransportNetwork) {
  const popup=document.createElement('div');popup.className='transport-popup';
  const name=document.createElement('strong');name.textContent=station.name;popup.append(name);
  for(const id of station.lineIds || []) {
    const line=network.lines.find(l=>l.id===id);if(!line)continue;
    const badge=document.createElement('div');badge.className='transport-popup-line';
    const swatch=document.createElement('i');swatch.style.background=line.colour;
    badge.append(swatch,document.createTextNode(line.name));popup.append(badge);
  }
  return popup;
}
export default function PortfolioMap({items, selected, onSelect, network, transportError}:{items:Development[];selected:string|null;onSelect:(id:string)=>void;network:TransportNetwork|null;transportError:string}) {
  const el=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null);
  const markers=useRef<L.MarkerClusterGroup|null>(null), lines=useRef<L.LayerGroup|null>(null), stationLayer=useRef<L.LayerGroup|null>(null);
  const [showLines,setShowLines]=useState(false),[showStations,setShowStations]=useState(false),[legend,setLegend]=useState(false),[failed,setFailed]=useState(false),[baseReady,setBaseReady]=useState(false);
  const [lineFilter,setLineFilter]=useState<string|null>(null);
  const shownLines=useMemo(()=>network?.lines.filter(l=>!lineFilter||l.id===lineFilter)||[],[network,lineFilter]);
  useEffect(()=>{
    if(!el.current)return;
    const m=L.map(el.current,{zoomControl:false,scrollWheelZoom:true,minZoom:8,maxZoom:19}).setView([51.505,-.085],11);map.current=m;
    L.control.zoom({position:'bottomright'}).addTo(m);
    m.createPane('transportLines');m.getPane('transportLines')!.style.zIndex='410';
    let vector:L.MaplibreGL|null=null, fallback=false, vectorLoaded=false;
    const rasterFallback=()=>{if(fallback)return;fallback=true;vector?.remove();L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).on('load',()=>setBaseReady(true)).on('tileerror',()=>setFailed(true)).addTo(m);};
    try{vector=L.maplibreGL({style:'https://tiles.openfreemap.org/styles/positron',attributionControl:false,interactive:false}).addTo(m);}catch{rasterFallback();}
    m.attributionControl.addAttribution('<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Powered by <a href="https://tfl.gov.uk">TfL Open Data</a>');
    const gl=vector?.getMaplibreMap();
    const styleTimeout=window.setTimeout(()=>{if(!vectorLoaded)rasterFallback();},12000);
    gl?.on('load',()=>{
      vectorLoaded=true;window.clearTimeout(styleTimeout);setFailed(false);setBaseReady(true);
      const style=gl.getStyle();const source=Object.entries(style.sources).find(([,s])=>s.type==='vector')?.[0];
      if(!source)return;
      const universityFilter=['any',['==',['get','class'],'college'],['==',['get','class'],'university'],['==',['get','subclass'],'university']] as import('maplibre-gl').ExpressionSpecification;
      gl.addLayer({id:'london-university-points',type:'circle',source,'source-layer':'poi',minzoom:13,filter:universityFilter,paint:{'circle-radius':3,'circle-color':'#5a6890','circle-stroke-color':'#fff','circle-stroke-width':1}});
      gl.addLayer({id:'london-university-labels',type:'symbol',source,'source-layer':'poi',minzoom:13,filter:universityFilter,layout:{'text-field':['coalesce',['get','name:en'],['get','name:latin'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':12,'text-anchor':'left','text-offset':[.6,0],'text-max-width':13},paint:{'text-color':'#536183','text-halo-color':'#fff','text-halo-width':2}});
      gl.addLayer({id:'london-local-places',type:'symbol',source,'source-layer':'poi',minzoom:16,filter:['!',universityFilter],layout:{'text-field':['coalesce',['get','name:en'],['get','name:latin'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':11,'text-max-width':12},paint:{'text-color':'#8b938d','text-halo-color':'#fff','text-halo-width':1.5}});
    });
    markers.current=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:40,spiderfyOnMaxZoom:true,iconCreateFunction:cluster=>L.divIcon({html:`<span>${cluster.getChildCount()}</span>`,className:'development-cluster',iconSize:[42,42]})}).addTo(m);
    lines.current=L.layerGroup().addTo(m);stationLayer.current=L.layerGroup().addTo(m);
    const resize=new ResizeObserver(()=>m.invalidateSize({pan:false}));resize.observe(el.current);
    return()=>{window.clearTimeout(styleTimeout);resize.disconnect();m.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    const group=markers.current;if(!group)return;group.clearLayers();
    for(const d of items){
      const icon=L.divIcon({className:'development-pin-wrap',html:`<span class="development-pin ${d.id===selected?'active':''}"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 15V4h7v11M11 7h3v8M2 15h14M7 6h1M7 9h1M7 12h1"/></svg></span>`,iconSize:[34,40],iconAnchor:[17,38]});
      const marker=L.marker([d.lat,d.lng],{icon,keyboard:true,title:d.name,zIndexOffset:d.id===selected?1000:0});
      marker.on('add',()=>marker.getElement()?.setAttribute('aria-label',`View ${d.name}`)).on('click',()=>onSelect(d.id)).addTo(group);
    }
  },[items,selected,onSelect]);
  useEffect(()=>{const d=items.find(d=>d.id===selected);if(d)map.current?.flyTo([d.lat,d.lng],14,{duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.7});},[selected]);
  useEffect(()=>{
    const group=lines.current;if(!group)return;group.clearLayers();if(!showLines)return;
    for(const line of shownLines) for(const path of line.paths){
      L.polyline(path,{pane:'transportLines',color:'#fff',weight:6,opacity:.9,interactive:false}).addTo(group);
      L.polyline(path,{pane:'transportLines',color:line.colour,weight:3.5,opacity:.9}).bindTooltip(line.name,{sticky:true}).addTo(group);
    }
  },[showLines,shownLines]);
  useEffect(()=>{
    const group=stationLayer.current;if(!group)return;group.clearLayers();if(!showStations||!network)return;
    for(const station of network.stations){
      if(lineFilter&&!station.lineIds?.includes(lineFilter))continue;
      const colour=network.lines.find(l=>l.id===(lineFilter||station.lineIds?.[0]))?.colour||'#596575';
      L.circleMarker([station.lat,station.lng],{radius:4,color:colour,fillColor:'#fff',fillOpacity:1,weight:2}).bindTooltip(station.name).bindPopup(stationPopup(station,network)).addTo(group);
    }
  },[showStations,network,lineFilter]);
  return <div className="map-shell" data-map-ready={baseReady}>{!baseReady&&<div className="map-loading-indicator" role="status">Loading London map…</div>}<div ref={el} className="map" aria-label="Map of London developments"/>
    <div className="map-controls">
      <button aria-pressed={showStations} disabled={!network} className={showStations?'on':''} onClick={()=>{setShowStations(!showStations);if(!showStations)setShowLines(true);}}><TrainFront size={16}/> Stations</button>
      <button aria-pressed={showLines} disabled={!network} className={showLines?'on':''} onClick={()=>{setShowLines(!showLines);setLegend(!showLines);}}><Layers size={16}/> TfL lines</button>
      {showLines&&<button className="line-picker-toggle" aria-expanded={legend} onClick={()=>setLegend(!legend)}><ChevronDown size={14}/> Lines</button>}
    </div>
    {showLines&&legend&&network&&<section className="line-legend" aria-label="TfL line legend"><div className="line-legend-heading"><strong>Explore London's connections</strong><button aria-label="Close line legend" onClick={()=>setLegend(false)}><X size={15}/></button></div><p>Tube · Elizabeth line · DLR · Overground · Trams · Cable car</p><button className={!lineFilter?'line-option selected':'line-option'} aria-pressed={!lineFilter} onClick={()=>setLineFilter(null)}>Show all lines</button><div className="line-options">{network.lines.map(line=><button key={line.id} className={lineFilter===line.id?'line-option selected':'line-option'} aria-pressed={lineFilter===line.id} onClick={()=>{setLineFilter(lineFilter===line.id?null:line.id);setShowStations(true);}}><i style={{background:line.colour}}/>{line.name}</button>)}</div><small>Powered by TfL Open Data{network.stale?' · Last available network':''}</small>{Boolean(network.missingGeometry?.length)&&<small>Route geometry unavailable for: {network.missingGeometry!.join(', ')}</small>}</section>}
    <span className="map-note">{showStations&&network?`${network.stations.length} TfL rail stops · Click a station for its lines`:'Zoom in for universities, landmarks & local detail'}</span>
    {transportError&&<div className="transport-notice" role="status">TfL network temporarily unavailable. Development browsing is still available.</div>}
    {failed&&<div className="map-error"><AlertCircle size={16}/> Some map detail could not load. You can still browse developments in List.</div>}
  </div>;
}
