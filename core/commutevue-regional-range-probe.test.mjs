import test from 'node:test';
import assert from 'node:assert/strict';
import {probeRegionalStaticRange} from './commutevue-regional-range-probe.js';
const url='https://opendata.samtrafiken.se/gtfs/sl/sl.zip?key=fixture';
test('recognizes a valid one-byte partial response',async()=>{
 const result=await probeRegionalStaticRange({url,fetcher:async(_url,opts)=>{
  assert.equal(opts.headers.Range,'bytes=0-0');
  return {status:206,headers:{get:()=> 'bytes 0-0/50000000'},arrayBuffer:async()=>Uint8Array.of(0x50).buffer};
 }});
 assert.deepEqual(result,{status:'range_supported',archiveBytes:50000000});
});
test('does not download a full body when Range is ignored',async()=>{
 let cancelled=false;
 const result=await probeRegionalStaticRange({url,fetcher:async()=>({status:200,body:{cancel:async()=>{cancelled=true;}}})});
 assert.equal(result.status,'range_ignored');assert.equal(cancelled,true);
});
test('rejects untrusted endpoints and malformed content range',async()=>{
 assert.equal((await probeRegionalStaticRange({url:'https://evil.example/a'})).status,'invalid_endpoint');
 const result=await probeRegionalStaticRange({url,fetcher:async()=>({status:206,headers:{get:()=> 'bytes 0-5/999'},body:{cancel:async()=>{}}})});
 assert.equal(result.status,'invalid_content_range');
});

test('categorizes authorization, unsatisfiable range and rate limits without leaking responses',async()=>{
 for(const [code,expected] of [[401,'authorization'],[403,'authorization'],[416,'range_not_satisfiable'],[429,'rate_limited'],[404,'http_error']]){
  let cancelled=false;
  const result=await probeRegionalStaticRange({url,fetcher:async()=>({status:code,body:{cancel:async()=>{cancelled=true;}}})});
  assert.deepEqual(result,{status:expected,httpStatus:code});assert.equal(cancelled,true);
 }
});

test('records only numeric HTTP status for unrecognized HTTP errors',async()=>{
 const result=await probeRegionalStaticRange({url,fetcher:async()=>({status:404,body:{cancel:async()=>{}}})});
 assert.deepEqual(result,{status:'http_error',httpStatus:404});
});

test('retries 406 with wildcard Accept while retaining one-byte Range',async()=>{
 const calls=[];let cancelled=false;
 const result=await probeRegionalStaticRange({url,fetcher:async(_url,opts)=>{
  calls.push(opts.headers);
  if(calls.length===1)return {status:406,body:{cancel:async()=>{cancelled=true;}}};
  return {status:206,headers:{get:()=> 'bytes 0-0/1000'},arrayBuffer:async()=>Uint8Array.of(0x50).buffer};
 }});
 assert.equal(cancelled,true);
 assert.deepEqual(calls,[{Range:'bytes=0-0',Accept:'application/zip'},{Range:'bytes=0-0',Accept:'*/*'}]);
 assert.deepEqual(result,{status:'range_supported',archiveBytes:1000});
});
test('does not retry other errors or consume full response on 406 fallback',async()=>{
 let calls=0,cancelled=0;
 const result=await probeRegionalStaticRange({url,fetcher:async()=>{
  calls++;return {status: calls===1?406:200,body:{cancel:async()=>{cancelled++;}}};
 }});
 assert.deepEqual(result,{status:'range_ignored',httpStatus:200});
 assert.equal(calls,2);assert.equal(cancelled,2);
});
