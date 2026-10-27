import {parseListing,cleanListingText} from './import.mjs';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parsePastedListing(text,url='https://manual-import.invalid/'){
 if(typeof text!=='string'||text.trim().length<30||text.length>30000)throw Error('Paste 30–30,000 characters of listing text.');
 const lines=text.split(/\n+/).map(s=>s.replace(/^[\s•*\-]+/,'').trim()).filter(Boolean);const brands=['Savills','Knight Frank','Foxtons','Rightmove','Zoopla'];
 const name=cleanListingText(lines[0],brands),features=lines.filter(s=>s.length<150&&!(s.length>65&&/[.!?]$/.test(s))&&/\b(?:concierge|gym|fitness|pool|cinema|terrace|balcon|garden|parking|spa|sauna|residents|lounge|cowork|co-work|cycle storage|roof|river view)\b/i.test(s));
 const html='<main><h1>'+escape(name)+'</h1>'+lines.slice(1).map(s=>'<p>'+escape(s)+'</p>').join('')+'<ul class="features">'+features.map(s=>'<li>'+escape(s)+'</li>').join('')+'</ul></main>';
 const d=parseListing(html,url);if(url==='https://manual-import.invalid/')d.importSource='';return d;
}
