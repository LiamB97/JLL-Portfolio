import {useEffect,useState} from 'react';
import {track,analyticsConfigured} from './analytics';
import {useLocale,languages,type Language,type Theme} from './i18n';
export default function Preferences({onOpenAnalytics}:{onOpenAnalytics?:()=>void}){
 const {language,setLanguage,theme,setTheme,t}=useLocale();
 const [analyticsEnabled,setAnalyticsEnabled]=useState(analyticsConfigured);
 useEffect(()=>{const update=(e:Event)=>setAnalyticsEnabled(Boolean((e as CustomEvent).detail));window.addEventListener('jll-analytics-configuration',update);return()=>window.removeEventListener('jll-analytics-configuration',update);},[]);
 return <section className="portfolio-inline-preferences" aria-label={t('Appearance and language')}>
  <label>{t('Language')}<select value={language} onChange={e=>{setLanguage(e.target.value as Language);track('language_change',{language:e.target.value});}}>{languages.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</select></label>
  <label>{t('Appearance')}<select value={theme} onChange={e=>setTheme(e.target.value as Theme)}><option value="system">{t('Automatic')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option></select></label>
  {analyticsEnabled&&<button onClick={()=>{onOpenAnalytics?.();window.dispatchEvent(new Event('jll-open-analytics-settings'));}}>{t('Analytics preferences')}</button>}
  <p>{t('Automatic translations are for guidance. Confirm details with your broker.')}</p>
 </section>;
}
