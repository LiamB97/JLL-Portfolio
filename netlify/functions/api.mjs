import {createNetlifyApi} from '../../server/netlify-api.mjs';
import {portfolioRepository} from '../../server/netlify-store.mjs';
export default async function handler(request){return createNetlifyApi({repository:portfolioRepository(),password:process.env.ADMIN_PASSWORD})(request);}
export const config={rateLimit:{windowSize:60,windowLimit:120,aggregateBy:['ip','domain']}};
