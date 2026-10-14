import test from 'node:test';
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
 const bytes=Buffer.alloc(3*1024*1024);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
 const image='data:image/png;base64,'+bytes.toString('base64');
 let charged=0;
 const response=await POST(request({species:'horse',language:'en',image}),{configured:()=>true,spend:async()=>{charged++;return false}});
 assert.equal(response.status,429);
 assert.equal(charged,1);
});
