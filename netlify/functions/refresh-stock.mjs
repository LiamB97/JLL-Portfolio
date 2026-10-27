import {engagementRepository} from '../../server/engagement-store.mjs';
import {portfolioRepository,refreshPortfolio} from '../../server/netlify-store.mjs';
import {fetchSource} from '../../server/sync.mjs';
export default async function handler(request,context){
 // Netlify's scheduled-function configuration controls invocation; no public API route is registered.
 try{try{await engagementRepository().prune(new Date(Date.now()-399*86400000).toISOString().slice(0,10));}catch(e){console.error('Engagement cleanup will retry at the next scheduled refresh:',e.message);}
 const result=await refreshPortfolio(portfolioRepository(),await fetchSource());console.log(`Refreshed ${result.imported} JLL developments; ${result.skipped.length} require review.`);return new Response(null,{status:204});}
 catch(e){console.error('Scheduled JLL refresh failed; stock preserved:',e.message);return new Response('Refresh failed; existing stock preserved.',{status:502});}
}
export const config={schedule:'0 */6 * * *'};
