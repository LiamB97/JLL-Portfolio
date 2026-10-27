import type {Development} from '../src/types';
export const portfolioInvitation='Explore the JLL New Homes Portfolio';
export function portfolioEmail(link:string,items:Development[]=[],title='Your JLL New Homes Portfolio'){
 const origin=new URL(link).origin,params=new URL(link).searchParams;
 return {subject:title.replace(/[\r\n]/g,' '),body:`Hello,\n\n${items.length?'I have picked these developments for you to explore:':'Explore our new homes, save your favourites and see how each neighbourhood connects across London.'}\n\n${items.map((d,i)=>`${i+1}. ${d.name} — ${d.area}\n${developmentLink(origin,d.id,params.get('collection')||undefined,params.get('broker')||undefined)}`).join('\n\n')}${items.length?'\n\n':''}${portfolioInvitation}:\n${link}\n\nUse the WhatsApp button on the portfolio to come back to me with any questions, or reply to this email.\n\nBest wishes`};
}
export function emailHref(subject:string,body:string){return 'mailto:?subject='+encodeURIComponent(subject.replace(/[\r\n]/g,' '))+'&body='+encodeURIComponent(body);}
export function buyerShareLink(href:string,id?:string){const incoming=new URL(href),params=incoming.searchParams;const url=new URL('/',incoming.origin);if(params.get('collection'))url.searchParams.set('collection',params.get('collection')!);else if(params.get('broker'))url.searchParams.set('broker',params.get('broker')!);if(id)url.searchParams.set('development',id);return url.href;}

export function developmentLink(origin:string,id:string,collection?:string,broker?:string){const url=new URL('/',origin);url.searchParams.set('development',id);if(collection)url.searchParams.set('collection',collection);else if(broker)url.searchParams.set('broker',broker);return url.href;}
