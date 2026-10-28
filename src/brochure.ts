import {jsPDF} from 'jspdf';
import type {Development} from './types';
export interface BrochureInput {title:string;intro:string;notes:Record<string,string>;items:Development[];broker:{name:string;whatsapp:string};origin:string;collection?:string;brokerSlug?:string;date?:Date}
export interface BrochureAssets {regular:string;semibold:string;photos:Record<string,string>}
export function brochureFilename(title:string){return (title.normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,70)||'JLL-brochure')+'.pdf';}
const clean=(s:string)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\u00a0/g,' ');
const brief=(s:string)=>{const value=s.replace(/\s+/g,' ').trim();return value.length<=450?value:value.slice(0,447).replace(/\s+\S*$/,'')+'…';};
export function buildBrochure(input:BrochureInput,assets:BrochureAssets){
 if(!input.title.trim()||input.items.length<1||input.items.length>20)throw Error('Choose 1–20 developments and add a title.');
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
 doc.addFileToVFS('SourceSans.ttf',assets.regular);doc.addFont('SourceSans.ttf','SourceSans','normal');
 doc.addFileToVFS('SourceSansSemibold.ttf',assets.semibold);doc.addFont('SourceSansSemibold.ttf','SourceSans','bold');
 const ink='#003e51',muted='#596575',sand='#f4f1eb';let y=40,developmentName='';
 const date=(input.date||new Date()).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 const style=(size=11,bold=false,colour=ink)=>{doc.setFont('SourceSans',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(colour);};
 function header(){doc.setFillColor(ink);doc.rect(0,0,210,3,'F');style(22,true);doc.text('JLL',20,19);style(9,false,muted);doc.text('RESIDENTIAL  /  LONDON NEW HOMES',39,18);doc.setDrawColor('#dedfdc');doc.line(20,25,190,25);y=39;}
 function next(){doc.addPage();header();if(developmentName){text(developmentName+' / CONTINUED',10,true,muted,6);}}
 function room(height:number){if(y+height>266)next();}
 function text(value:string,size=11,bold=false,colour=ink,gap=6){style(size,bold,colour);const lineHeight=size*.46;const paragraphs=clean(value).split('\n');for(const paragraph of paragraphs){const lines:string[]=doc.splitTextToSize(paragraph||' ',170);for(const line of lines){room(lineHeight);style(size,bold,colour);doc.text(line,20,y);y+=lineHeight;}}y+=gap;}
 function section(label:string,value:string){room(18);text(label.toUpperCase(),9,true,muted,2);text(value);}
 function link(label:string,url:string){room(12);style(11,true);doc.textWithLink(label,20,y,{url});y+=10;}
 function contact(){section('Your JLL broker',input.broker.name);if(input.broker.whatsapp){text(input.broker.whatsapp,11,false,muted,2);link('Contact your broker on WhatsApp','https://wa.me/'+input.broker.whatsapp.replace(/\D/g,''));}}
 const portfolio=new URL('/',input.origin);if(input.collection)portfolio.searchParams.set('collection',input.collection);else if(input.brokerSlug)portfolio.searchParams.set('broker',input.brokerSlug);
 header();y=58;text('A COLLECTION OF LONDON HOMES',10,true,muted,12);text(input.title.trim().slice(0,100),32,true,ink,10);text(`${input.items.length} selected developments  /  Prepared ${date}`,11,false,muted,12);
 if(input.intro.trim())section('A note from your broker',input.intro.trim().slice(0,1600));
 contact();link('Explore your interactive portfolio',portfolio.href);
 for(const [index,d]of input.items.entries()){
  developmentName='';next();developmentName=d.name;text(`YOUR SELECTION  /  ${String(index+1).padStart(2,'0')}`,9,true,muted,3);
  const photo=assets.photos[d.id];if(photo){room(69);doc.addImage(photo,'JPEG',20,y,170,64,undefined,'MEDIUM');y+=74;}else{doc.setFillColor(sand);doc.roundedRect(20,y,170,30,2,2,'F');style(11,false,muted);doc.text('Development photography unavailable',105,y+17,{align:'center'});y+=41;}
  text(d.name,26,true,ink,3);text(`${d.area}  /  ${d.postcode}`,11,false,muted,7);
  const price=d.priceFrom>0?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(d.priceFrom):'Price to be confirmed';
  const beds=d.bedrooms.length?d.bedrooms.map(b=>b===0?'Studio':String(b)).join(', ')+(d.bedrooms.some(b=>b>0)?' bedrooms':''):'Bedrooms to be confirmed';
  text(`${d.priceFrom>0?'From ':''}${price}   |   ${beds}`,13,true,ink,6);
  if(d.sample)text('ILLUSTRATIVE SAMPLE - NOT LIVE STOCK',10,true,'#a32222');
  if(d.description.trim())section('At a glance',brief(d.description.trim()));
  if(d.amenities.length)section('Features',d.amenities.slice(0,4).map(a=>a.length>100?a.slice(0,97)+'…':a).join('  /  '));
  if(input.notes[d.id]?.trim())section('Your broker’s notes',input.notes[d.id].trim().slice(0,1600));
  const url=new URL(portfolio);url.searchParams.set('development',d.id);link('View this development and enquire',url.href);
 }
 const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setDrawColor('#dedfdc');doc.line(20,276,190,276);style(8,false,muted);doc.text('Prices and availability subject to broker confirmation. Images are indicative.',20,282);doc.text(`${page} / ${pages}`,190,282,{align:'right'});doc.text(`Prepared ${date}  |  JLL Residential`,20,287);}
 doc.setProperties({title:input.title,author:input.broker.name,subject:'Selected London new homes',creator:'JLL New Homes Portfolio'});
 return doc;
}
