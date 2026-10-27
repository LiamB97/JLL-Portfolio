// Build-time smoke checks for the exact public pages requested by the owner.
// Only counts/statuses are published; no raw page scripts or staff data are saved.
import {mkdir,writeFile} from 'node:fs/promises';
import {importForReview} from '../server/review-import.mjs';
import seed from '../server/data/initial-portfolio.json' with {type:'json'};
import {translateText} from '../server/translations.mjs';
const urls=['https://angelvillage.co.uk/','https://search.savills.com/property-detail/gblhrdlad240071','https://residential.jll.co.uk/sale-development/one-thames-quay/london-a0o8w00000j3cxguar'];
const [sources,translation]=await Promise.all([
 Promise.all(urls.map(async url=>{try{const review=await importForReview(url,seed.developments);const d=review.development;const missing=['name','description','postcode','lat','lng','priceFrom','bedrooms','images'].filter(k=>d[k]===null||d[k]===''||Array.isArray(d[k])&&!d[k].length);return {url,status:'parsed',source:review.source,name:d.name,descriptionCharacters:d.description.length,imageCount:d.images.length,featureCount:d.amenities.length,bedrooms:d.bedrooms,priceFrom:d.priceFrom,missing,diagnostics:d._diagnostics,supplementaryPages:d._supplementaryPages};}catch(e){return {url,status:'unavailable',error:e.message};}})),
 Promise.all(['ar','zh-CN','tr'].map(async language=>{try{let cors=null;const text=await translateText('New apartments with private balconies.',language,{fetcher:async(u,init)=>{const response=await fetch(u,init);cors=response.headers.get('access-control-allow-origin');return response;}});return {language,status:'ok',text,cors};}catch(e){return {language,status:'unavailable',error:e.message};}}))
]);
const report={checkedAt:new Date().toISOString(),sources,translation};await mkdir('dist',{recursive:true});await writeFile('dist/import-check.json',JSON.stringify(report));console.log('Source import checks:',JSON.stringify(report));
