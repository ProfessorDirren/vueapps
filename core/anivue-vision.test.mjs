import test from 'node:test';
import {deflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {POST} from './anivue-vision.js';
const url='https://localhost/api/anivue-analyze';
const request=body=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const good={species:'horse',language:'en',image:'data:image/png;base64,invalid'};
test('rejects invalid image before provider and budget',async()=>{
 let calls=0;
 const response=await POST(request(good),{configured:()=>{calls++;return true},spend:async()=>{calls++;return true},fetcher:async()=>{calls++;throw Error('provider should not run')}});
 assert.equal(response.status,400);assert.equal(calls,0);
});
test('rejects invalid language',async()=>{
 const response=await POST(request({...good,language:'xx'}));
 assert.equal(response.status,400);
});
test('rejects invalid species',async()=>{
 const response=await POST(request({...good,species:'dragon'}));
 assert.equal(response.status,400);
});
test('rejects oversized request',async()=>{
 const response=await POST(request({...good,description:'x'.repeat(4300000)}));
 assert.equal(response.status,413);
});

test('rejects missing photo',async()=>{
 const response=await POST(request({species:'horse',language:'en'}));
 assert.equal(response.status,400);
});
test('rejects invalid request JSON',async()=>{
 const response=await POST(new Request(url,{method:'POST',body:'{'}));
 assert.equal(response.status,400);
});
test('rejects unsupported species and language without charging budget',async()=>{
 let charges=0;const opts={configured:()=>true,spend:async()=>{charges++;return true}};
 assert.equal((await POST(request({...good,species:'cow'}),opts)).status,400);
 assert.equal((await POST(request({...good,language:'fr'}),opts)).status,400);
 assert.equal(charges,0);
});

test('accepts valid PNG at exact 3 MiB upload boundary',async()=>{
 const header=Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(128,0);ihdr.writeUInt32BE(128,4);ihdr[8]=8;ihdr[9]=2;
 const raw=Buffer.alloc(128*(128*3+1));for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=y*385+1+x*3;raw[p]=x*2;raw[p+1]=y*2;raw[p+2]=(x+y)&255}
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);return Buffer.concat([len,Buffer.from(type),data,Buffer.alloc(4)])};
 const start=Buffer.concat([header,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw))]);
 const filler=Buffer.alloc(3*1024*1024-start.length-12-12);
 const bytes=Buffer.concat([start,chunk('tEXt',filler),chunk('IEND',Buffer.alloc(0))]);
 const image='data:image/png;base64,'+bytes.toString('base64');
 let charged=0;let namespace;
 const response=await POST(request({species:'horse',language:'en',image}),{configured:()=>true,spend:async key=>{namespace=key;charged++;return false}});
 assert.equal(response.status,429);
 assert.equal(charged,1);
 assert.equal(namespace,'anivue');
});


test('rejects a JPEG MIME claim with invalid JPEG bytes before spending budget',async()=>{
 let calls=0;
 const image='data:image/jpeg;base64,'+Buffer.from('not a JPEG image').toString('base64');
 const response=await POST(request({species:'dog',language:'en',image}),{
  configured:()=>{calls++;return true},
  spend:async()=>{calls++;return true},
  fetcher:async()=>{calls++;throw Error('provider must not run')}
 });
 assert.equal(response.status,400);
 assert.equal(calls,0);
});


test('rejects spoofed PNG and WebP uploads before calling external services',async()=>{
 for(const format of ['png','webp']){
  let calls=0;
  const image='data:image/'+format+';base64,'+Buffer.from('not a real image file').toString('base64');
  const response=await POST(request({species:'cat',language:'en',image}),{
   configured:()=>{calls++;return true},
   spend:async()=>{calls++;return true},
   fetcher:async()=>{calls++;throw Error('provider must not run')}
  });
  assert.equal(response.status,400,format);
  assert.equal(calls,0,format);
 }
});


test('rejects unsupported HEIC and HEIF uploads without charging model budget',async()=>{
 for(const format of ['heic','heif']){
  let calls=0;
  const image='data:image/'+format+';base64,'+Buffer.from('unsupported image').toString('base64');
  const response=await POST(request({species:'horse',language:'en',image}),{
   configured:()=>{calls++;return true},
   spend:async()=>{calls++;return true},
   fetcher:async()=>{calls++;throw Error('provider must not run')}
  });
  assert.equal(response.status,400,format);
  assert.equal(calls,0,format);
 }
});

test('server refuses emergency photo analysis before quota or external model calls',async()=>{
 const header=Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(128,0);ihdr.writeUInt32BE(128,4);ihdr[8]=8;ihdr[9]=2;
 const raw=Buffer.alloc(128*(128*3+1));for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=y*385+1+x*3;raw[p]=x*2;raw[p+1]=y*2;raw[p+2]=(x+y)&255}
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);return Buffer.concat([len,Buffer.from(type),data,Buffer.alloc(4)])};
 const image='data:image/png;base64,'+Buffer.concat([header,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
 for(const [species,symptoms] of [['horse',['horseColic']],['dog',['breathing']],['cat',['collapse']]]){
  let calls=0;
  const response=await POST(request({species,language:'en',image,symptoms,description:'Emergency symptoms observed'}),{
   configured:()=>{calls++;return true},spend:async()=>{calls++;return true},fetcher:async()=>{calls++;throw Error('Must not call model')}
  });
  assert.equal(response.status,409,species);
  assert.match((await response.json()).emergencyAdvice,/emergency/i);
  assert.equal(calls,0,species);
 }
});

test('emergency phrase beyond first 500 characters still blocks provider and quota',async()=>{
 const header=Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(128,0);ihdr.writeUInt32BE(128,4);ihdr[8]=8;ihdr[9]=2;
 const raw=Buffer.alloc(128*(128*3+1));for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=y*385+1+x*3;raw[p]=x*2;raw[p+1]=y*2;raw[p+2]=(x+y)&255}
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);return Buffer.concat([len,Buffer.from(type),data,Buffer.alloc(4)])};
 const image='data:image/png;base64,'+Buffer.concat([header,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
 let calls=0;
 const response=await POST(request({species:'horse',language:'en',image,description:'x'.repeat(600)+' trouble breathing'}),{
  configured:()=>{calls++;return true},spend:async()=>{calls++;return true},fetcher:async()=>{calls++;throw Error('Must not call model')}
 });
 assert.equal(response.status,409);
 assert.equal(calls,0);
});

test('emergency symptom beyond the first twelve IDs blocks provider and quota',async()=>{
 const header=Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(128,0);ihdr.writeUInt32BE(128,4);ihdr[8]=8;ihdr[9]=2;
 const raw=Buffer.alloc(128*(128*3+1));for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=y*385+1+x*3;raw[p]=x*2;raw[p+1]=y*2;raw[p+2]=(x+y)&255}
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);return Buffer.concat([len,Buffer.from(type),data,Buffer.alloc(4)])};
 const image='data:image/png;base64,'+Buffer.concat([header,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
 let calls=0;
 const response=await POST(request({species:'horse',language:'en',image,description:'Unclear symptoms',symptoms:[...Array(12).fill('horseOther'),'horseColic']}),{
  configured:()=>{calls++;return true},spend:async()=>{calls++;return true},fetcher:async()=>{calls++;throw Error('Must not call model')}
 });
 assert.equal(response.status,409);
 assert.equal(calls,0);
});
