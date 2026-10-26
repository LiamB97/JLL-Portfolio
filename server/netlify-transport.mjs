import initialTransport from './data/tfl-network.json' with {type:'json'};
import {getStore} from '@netlify/blobs';
import {transportService} from './transport.mjs';
import {connectionsService} from './connections.mjs';
const store=()=>getStore({name:'jll-transport',consistency:'strong'});
export const network=transportService({seed:initialTransport,read:()=>store().get('tfl-network-v1',{type:'json'}),write:data=>store().setJSON('tfl-network-v1',data)});
export const connections=connectionsService({network,read:key=>store().get(key,{type:'json'}),write:(key,data)=>store().setJSON(key,data)});
