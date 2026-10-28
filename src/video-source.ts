export type VideoSource={kind:'file'|'embed';src:string;provider:string}|null;
export function videoSource(value:string):VideoSource{
 let u:URL;try{u=new URL(value);}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 const host=u.hostname.toLowerCase();
 if(/\.(mp4|webm|ogv|ogg|m4v)$/i.test(u.pathname))return {kind:'file',src:u.href,provider:'Video'};
 if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be'].includes(host)){
  const parts=u.pathname.split('/').filter(Boolean);const id=host==='youtu.be'?parts[0]:['embed','shorts','live'].includes(parts[0])?parts[1]:u.searchParams.get('v');
  if(!id||!/^[-\w]{11}$/.test(id))return null;
  const src=new URL('https://www.youtube-nocookie.com/embed/'+id);src.searchParams.set('rel','0');
  const t=u.searchParams.get('start')||u.searchParams.get('t');if(t&&/^\d+$/.test(t))src.searchParams.set('start',t);
  return {kind:'embed',src:src.href,provider:'YouTube'};
 }
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
  const parts=u.pathname.split('/').filter(Boolean),index=parts.findIndex(p=>/^\d+$/.test(p));if(index<0)return null;
  const src=new URL('https://player.vimeo.com/video/'+parts[index]);const hash=u.searchParams.get('h')||parts[index+1];
  if(hash&&/^[a-z0-9]+$/i.test(hash))src.searchParams.set('h',hash);src.searchParams.set('dnt','1');
  return {kind:'embed',src:src.href,provider:'Vimeo'};
 }
 if(host==='players.brightcove.net'&&/^\/\d+\/[a-z0-9_-]+\/index.html$/i.test(u.pathname)&&u.searchParams.get('videoId')){
  const src=new URL(u.origin+u.pathname);src.searchParams.set('videoId',u.searchParams.get('videoId')!);src.searchParams.set('playsinline','true');
  return {kind:'embed',src:src.href,provider:'Brightcove'};
 }
 if(host==='bcove.video'&&/^\/[a-z0-9]+$/i.test(u.pathname))return {kind:'embed',src:u.origin+u.pathname,provider:'Brightcove'};
 return null;
}

export function videoThumbnails(url:string,poster?:string){
 const source=videoSource(url);let frame='';if(source?.provider==='YouTube'){const id=new URL(source.src).pathname.split('/').at(-1);frame='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';}
 return [...new Set([frame,poster,'/images/city.svg'].filter((value):value is string=>Boolean(value)))];
}
