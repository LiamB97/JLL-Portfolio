import {useState} from 'react';
import {Copy,Share2} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import {useLocale} from './i18n';
import {buyerShareLink,portfolioInvitation} from './sharing';
export default function ShareWithFriend({developmentId,developmentName}:{developmentId?:string;developmentName?:string}){
 const {t}=useLocale(),[message,setMessage]=useState('');const link=buyerShareLink(location.href,developmentId),text=(developmentName?developmentName+'\n':'')+portfolioInvitation+'\n'+link;
 return <details className="friend-share"><summary aria-label={t('Share with a friend')} title={t('Share with a friend')}><Share2 size={17}/><span>{t('Share with a friend')}</span></summary><div className="friend-share-menu"><p>{t('Send this portfolio to a partner, friend or family member. The same broker and featured homes stay with the link.')}</p><a className="whatsapp-action" href={'https://wa.me/?text='+encodeURIComponent(text)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17}/>{t('Share on WhatsApp')}</a><button onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage(t('Link copied.'))).catch(()=>setMessage(t('Select and copy the link below.')))}><Copy size={15}/>{t('Copy link')}</button><input aria-label={t('Share link')} readOnly value={link} onFocus={e=>e.currentTarget.select()}/>{message&&<p role="status">{message}</p>}</div></details>;
}
