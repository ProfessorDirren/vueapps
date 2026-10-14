import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/anivue-analyze.js';
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
