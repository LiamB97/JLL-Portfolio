import {getStore} from '@netlify/blobs';
import {translationsService} from './translations.mjs';
const store=()=>getStore({name:'jll-translations',consistency:'strong'});
export const translations=translationsService({read:k=>store().get(k,{type:'json'}),write:(k,v)=>store().setJSON(k,v)});
