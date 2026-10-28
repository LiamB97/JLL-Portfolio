export function brochureShareLinks(origin:string,broker:string,collection:string,title:string,name:string){
 const link=new URL('/',origin);if(collection)link.searchParams.set('collection',collection);else if(broker)link.searchParams.set('broker',broker);
 const subject=title.replace(/[\r\n]/g,' ').trim();
 const body=`Hello,\n\nI’ve put together a selection of London homes for you: ${subject}.\n\nExplore the portfolio online:\n${link.href}\n\nBest wishes,\n${name}`;
 return {portfolio:link.href,whatsapp:'https://wa.me/?text='+encodeURIComponent(body),email:'mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
}
