import test from 'node:test';import assert from 'node:assert/strict';
import {squarePhotoCrop} from '../src/photo-crop.ts';
import {profilePhoto} from './profile-photo.mjs';
import {readFileSync} from 'node:fs';
test('landscape, portrait and zoomed crops stay square and inside the original photo',()=>{
 for(const [width,height]of [[1600,900],[900,1600],[384,384]])for(const zoom of [1,1.5,3])for(const x of [0,50,100])for(const y of [0,50,100]){const c=squarePhotoCrop(width,height,zoom,x,y);assert.ok(c.sx>=0&&c.sy>=0);assert.ok(c.sx+c.side<=width+.001);assert.ok(c.sy+c.side<=height+.001);assert.equal(c.side,Math.min(width,height)/zoom);}
 assert.deepEqual(squarePhotoCrop(1600,900,1,50,50),{sx:350,sy:0,side:900});assert.deepEqual(squarePhotoCrop(900,1600,1,50,50),{sx:0,sy:350,side:900});
});
test('profile JPEG validation rejects non-square and oversized dimensions',()=>{
 const original=readFileSync(new URL('./fixtures/profile-square.jpg',import.meta.url));assert.ok(profilePhoto('data:image/jpeg;base64,'+original.toString('base64')));
 let offset=2;while(offset+4<original.length){if([192,193,194].includes(original[offset+1]))break;offset+=2+original.readUInt16BE(offset+2);}
 for(const [width,height]of [[384,200],[2000,2000],[32,32]]){const changed=Buffer.from(original);changed.writeUInt16BE(height,offset+5);changed.writeUInt16BE(width,offset+7);assert.throws(()=>profilePhoto('data:image/jpeg;base64,'+changed.toString('base64')));}
});
