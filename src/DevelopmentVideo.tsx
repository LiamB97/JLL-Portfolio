import {useState} from 'react';
import {Play,ExternalLink} from 'lucide-react';
import {videoSource,videoThumbnails} from './video-source';
export default function DevelopmentVideo({url,name,index,poster}:{url:string;name:string;index:number;poster?:string}){
 const source=videoSource(url),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 const [thumbnail,setThumbnail]=useState(0),thumbnails=videoThumbnails(url,poster);
 let safe=false;try{safe=new URL(url).protocol==='https:';}catch{}
 const title=`${name} - video ${index+1}`;
 return <section className="development-video" aria-label={title}>{source&&!failed?<><div className="video-stage">{!loaded?<button type="button" className="video-play" onClick={()=>setLoaded(true)}><img className="video-thumbnail" src={thumbnails[thumbnail]} alt={name+' video preview'} loading="lazy" onError={()=>setThumbnail(n=>Math.min(n+1,thumbnails.length-1))}/><span><Play size={26}/></span><strong>Play development video {index+1}</strong><small>{source.provider} · Watch here in the portfolio</small></button>:source.kind==='file'?<video controls playsInline preload="metadata" poster={poster} src={source.src} aria-label={title} onError={()=>setFailed(true)}/>:<iframe src={source.src} title={title} allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" onError={()=>setFailed(true)}/>}</div>{loaded&&<p className="video-help">If the owner has restricted playback, use the original video below.</p>}</>:<p>This video’s host does not offer a supported player here.</p>}{safe&&<a className="video-original" href={url} target="_blank" rel="noopener noreferrer">Open original video <ExternalLink size={12}/></a>}</section>;
}
