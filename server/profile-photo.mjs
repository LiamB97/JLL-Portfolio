// Profiles accept only small, square JPEGs produced by the browser cropper.
export function profilePhoto(value){
 if(value==='')return '';
 if(typeof value!=='string'||value.length>180000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Choose a JPEG, PNG or WebP photo and save its circular crop.');
 const raw=value.slice(23),bytes=Buffer.from(raw,'base64');
 if(bytes.toString('base64')!==raw||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('The profile photo is not a valid JPEG.');
 let offset=2;
 while(offset+4<bytes.length){
  if(bytes[offset]!==255)break;const marker=bytes[offset+1];if(marker===218||marker===217)break;
  const length=bytes.readUInt16BE(offset+2);if(length<2||offset+2+length>bytes.length)break;
  if([192,193,194].includes(marker)&&length>=8){const height=bytes.readUInt16BE(offset+5),width=bytes.readUInt16BE(offset+7);if(width>=64&&width<=512&&width===height)return value;break;}
  offset+=2+length;
 }
 throw Error('Use a square profile photo between 64 and 512 pixels.');
}
