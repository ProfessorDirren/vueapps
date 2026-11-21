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
