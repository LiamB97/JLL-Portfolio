import {useState} from 'react';
import {Columns2,Heart,LayoutGrid,Map as MapIcon,Menu,Settings,CircleHelp} from 'lucide-react';
import Modal from './Modal';
import Preferences from './Preferences';
import ShareWithFriend from './ShareWithFriend';
import {useLocale} from './i18n';
export type PortfolioView='map'|'split'|'list';
export default function PortfolioHeader({exploring,staff,view,setView,saved,openFavourites,onNavigate}:{exploring:boolean;staff:boolean;view:PortfolioView;setView:(view:PortfolioView)=>void;saved:number;openFavourites:()=>void;onNavigate:()=>void}){
 const {t,dark}=useLocale(),[menu,setMenu]=useState(false);
 function navigate(){setMenu(false);onNavigate();}
 return <header className={'portfolio-header'+(exploring?' with-views':'')} dir="ltr">
  <a className="portfolio-header-brand" href="#" aria-label={t('JLL Residential home')} onClick={onNavigate}><img src={dark?'/images/jll-residential-dark.svg?v=2026-01':'/images/jll-residential-light.svg?v=2026-01'} alt="JLL Residential"/></a>
  {exploring&&<h1 className="portfolio-header-title">London New Homes Portfolio</h1>}
  <div className="portfolio-header-buttons">{exploring&&<button className="portfolio-saved" aria-label={t('Favourites, {count} saved',{count:saved})} title={t('Favourites')} onClick={openFavourites}><Heart size={20}/>{saved>0&&<b>{saved}</b>}</button>}<button aria-label={t('Open menu')} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(true)}><Menu size={22}/></button></div>
  {exploring&&<div className="portfolio-views" role="group" aria-label={t('Portfolio view')}>{([{value:'map',label:'Map',Icon:MapIcon},{value:'split',label:'Split',Icon:Columns2},{value:'list',label:'List',Icon:LayoutGrid}] as const).map(({value,label,Icon})=><button key={value} aria-label={t(label)} aria-pressed={view===value} onClick={()=>setView(value)}><Icon size={17}/><span>{t(label)}</span></button>)}</div>}
  {menu&&<Modal title={t('Portfolio menu')} close={()=>setMenu(false)} className="portfolio-menu">
   {!staff&&<section className="portfolio-menu-section"><h3>{t('Share with a friend')}</h3><ShareWithFriend inline/></section>}
   <section className="portfolio-menu-section"><h3>{t('Appearance and language')}</h3><Preferences onOpenAnalytics={()=>setMenu(false)}/></section>
   <nav className="portfolio-menu-links" aria-label={t('Portfolio navigation')}><a href="#" onClick={navigate}><MapIcon size={18}/>{t('Back to the map')}</a>{!staff&&<a href="#how-it-works" onClick={navigate}><CircleHelp size={18}/>{t('How it works')}</a>}<a href="#admin" onClick={navigate}><Settings size={18}/>{t('Broker workspace')}</a></nav>
  </Modal>}
 </header>;
}
