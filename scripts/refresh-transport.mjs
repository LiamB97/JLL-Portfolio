import {writeFile} from 'node:fs/promises';
import {fetchTransport} from '../server/transport.mjs';
const data=await fetchTransport();
await writeFile(new URL('../server/data/tfl-network.json',import.meta.url),JSON.stringify(data)+'\n');
console.log(JSON.stringify({stations:data.stations.length,lines:data.lines.map(l=>({name:l.name,paths:l.paths.length})),missingGeometry:data.missingGeometry,updatedAt:data.updatedAt}));
