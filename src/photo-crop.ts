// Crop coordinates shared by the live circular preview and saved JPEG.
export function squarePhotoCrop(width:number,height:number,zoom:number,x:number,y:number){
 const side=Math.min(width,height)/Math.max(1,Math.min(3,zoom));
 return {sx:(width-side)*Math.max(0,Math.min(100,x))/100,sy:(height-side)*Math.max(0,Math.min(100,y))/100,side};
}
