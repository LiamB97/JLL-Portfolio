import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Layers,TrainFront,AlertCircle} from 'lucide-react';
import type {Development,Station} from './types';
export default function PortfolioMap({items,selected,onSelect,stations}:{items:Development[];selected:string|null;onSelect:(id:string)=>void;stations:Station[]}){
 const el=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),markers=useRef<L.LayerGroup|null>(null),rail=useRef<L.TileLayer|null>(null),stationLayer=useRef<L.LayerGroup|null>(null);
 const [transport,setTransport]=useState(false),[nearby,setNearby]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{if(!el.current)return;const m=L.map(el.current,{zoomControl:false,scrollWheelZoom:true}).setView([51.505,-.085],11);map.current=m;L.control.zoom({position:'bottomright'}).addTo(m);
 const tiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19}).addTo(m);tiles.on('tileerror',()=>setFailed(true));
 markers.current=L.layerGroup().addTo(m);stationLayer.current=L.layerGroup();rail.current=L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',{maxZoom:19,attribution:'Railway overlay: &copy; OpenRailwayMap',opacity:.75});rail.current.on('tileerror',()=>setFailed(true));
 return()=>{m.remove();map.current=null;};},[]);
 useEffect(()=>{const g=markers.current;if(!g)return;g.clearLayers();items.forEach(d=>{const active=d.id===selected;const icon=L.divIcon({className:'price-marker-wrap',html:`<span class="price-marker ${active?'active':''}">£${Math.round(d.priceFrom/1000)}k</span>`,iconSize:[72,34],iconAnchor:[36,34]});L.marker([d.lat,d.lng],{icon,keyboard:true,title:d.name,zIndexOffset:active?1000:0}).on('click',()=>onSelect(d.id)).addTo(g);});},[items,selected,onSelect]);
 useEffect(()=>{const d=items.find(d=>d.id===selected);if(d)map.current?.flyTo([d.lat,d.lng],13,{duration:.7});},[selected]);
 useEffect(()=>{const m=map.current,r=rail.current;if(!m||!r)return;if(transport)r.addTo(m);else r.remove();},[transport]);
 useEffect(()=>{const m=map.current,g=stationLayer.current;if(!m||!g)return;g.clearLayers();if(nearby){stations.forEach(s=>{const popup=document.createElement('div');const strong=document.createElement('strong');strong.textContent=s.name;popup.append(strong,document.createElement('br'),document.createTextNode(s.lines));L.circleMarker([s.lat,s.lng],{radius:5,color:'#174579',fillColor:'#fff',fillOpacity:1,weight:2}).bindPopup(popup).addTo(g);});g.addTo(m);}else g.remove();},[nearby,stations]);
 return <div className="map-shell"><div ref={el} className="map" aria-label="Map of London developments"/><div className="map-controls"><button className={nearby?'on':''} onClick={()=>setNearby(!nearby)}><TrainFront size={16}/> Stations</button><button className={transport?'on':''} onClick={()=>setTransport(!transport)}><Layers size={16}/> Railway overlay</button></div><span className="map-note">{nearby?'Selected major stations · not the full TfL network':'Explore London, neighbourhood by neighbourhood'}</span>{failed&&<div className="map-error"><AlertCircle size={16}/> Some map tiles could not load. You can still browse all homes in the list.</div>}</div>;
}
