import {getStore} from '@netlify/blobs';
import {ConflictError} from './netlify-store.mjs';
// Separate daily aggregates keep public traffic away from the portfolio's stock/account writes.
export function engagementRepository(store=getStore({name:'jll-team-engagement',consistency:'strong'})){
 return {async prune(before){for await(const page of store.list({paginate:true})){const expired=page.blobs.filter(b=>/^\d{4}-\d{2}-\d{2}$/.test(b.key)&&b.key<before);for(let i=0;i<expired.length;i+=12)await Promise.all(expired.slice(i,i+12).map(b=>store.delete(b.key)));}},async readDay(date){return await store.get(date,{type:'json',consistency:'strong'})||{people:{}};},async updateDay(date,change){for(let attempt=0;attempt<5;attempt++){const current=await store.getWithMetadata(date,{type:'json',consistency:'strong'}),next=structuredClone(current?.data||{people:{}});change(next);const result=await store.setJSON(date,next,current?{onlyIfMatch:current.etag}:{onlyIfNew:true});if(result.modified)return;}throw new ConflictError('Activity is busy. Please retry.');}};
}
