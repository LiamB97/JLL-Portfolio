import Modal from './Modal';
import {useState} from 'react';
import {Copy,Share2} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import {useLocale} from './i18n';
import {buyerShareLink,portfolioInvitation} from './sharing';
export default function ShareWithFriend({developmentId,developmentName,inline=false}:{developmentId?:string;developmentName?:string;inline?:boolean}){
 const {t}=useLocale(),[message,setMessage]=useState(''),[open,setOpen]=useState(false),[manual,setManual]=useState(false);const link=buyerShareLink(location.href,developmentId),text=(developmentName?developmentName+'\n':'')+portfolioInvitation+'\n'+link;
 async function copy(){try{await navigator.clipboard.writeText(link);setMessage(t('Link copied.'));setManual(false);}catch{setMessage(t('Select and copy the link below.'));setManual(true);}}
 const content=<div className={inline?"portfolio-inline-share":"friend-share-menu"}><p>{t('Send this portfolio to a partner, friend or family member. The same broker and featured homes stay with the link.')}</p><a className="whatsapp-action" href={'https://wa.me/?text='+encodeURIComponent(text)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17}/>{t('Share on WhatsApp')}</a><button onClick={()=>void copy()}><Copy size={15}/>{t('Copy link')}</button>{(!inline||manual)&&<input aria-label={t('Share link')} readOnly value={link} onFocus={e=>e.currentTarget.select()}/>}{message&&<p role="status">{message}</p>}</div>;
 if(inline)return content;
 return <div className="friend-share"><button className="friend-share-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)} aria-label={t('Share with a friend')} title={t('Share with a friend')}><Share2 size={17}/><span>{t('Share with a friend')}</span></button>{open&&<Modal title={t('Share with a friend')} close={()=>setOpen(false)} className="friend-share-dialog">{content}</Modal>}</div>;
}
