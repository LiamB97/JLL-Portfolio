export async function translateText(text:string,language:string,{fetcher=fetch}:{fetcher?:typeof fetch}={}){
 if(!['ar','zh-CN','tr'].includes(language))throw Error('Unsupported translation language.');
 const paragraphs=String(text).match(/[\s\S]{1,1100}(?:\s|$)|[\s\S]{1,1100}/g)||[];const output:string[]=[];
 for(const part of paragraphs){const u=new URL('https://translate.googleapis.com/translate_a/single');u.search=new URLSearchParams({client:'gtx',sl:'en',tl:language,dt:'t',q:part}).toString();const r=await fetcher(u,{signal:AbortSignal.timeout(8000),credentials:'omit',headers:{Accept:'application/json'}});if(!r.ok){const error=Error('Automatic translation is temporarily unavailable.');Object.assign(error,{code:'provider_http_'+r.status});throw error;}const data=await r.json();const translated=Array.isArray(data?.[0])?data[0].map((row:unknown[])=>typeof row?.[0]==='string'?row[0]:'').join(''):'';if(!translated.trim())throw Error('Automatic translation returned no text.');output.push(translated);}
 return output.join(' ').trim();
}
