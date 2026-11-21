import test from 'node:test';
import assert from 'node:assert/strict';
import {probeRegionalStaticHead} from './commutevue-regional-head-probe.js';
const url='https://opendata.samtrafiken.se/gtfs/sl/sl.zip?key=fixture';
test('uses HEAD with no Range or Accept and no body download',async()=>{
 let called=false;
 const result=await probeRegionalStaticHead({url,fetcher:async(_url,opts)=>{
  assert.equal(opts.method,'HEAD');assert.equal(opts.headers,undefined);
  called=true;return {status:200};
 }});
 assert.equal(called,true);assert.deepEqual(result,{status:'metadata_available',httpStatus:200});
});
test('reports numeric errors without exposing API keys or response content',async()=>{
 for(const [code,status] of [[406,'http_error'],[401,'authorization'],[429,'rate_limited']]){
  let cancelled=false;
  const result=await probeRegionalStaticHead({url,fetcher:async()=>({status:code,body:{cancel:async()=>{cancelled=true;}}})});
  assert.deepEqual(result,{status,httpStatus:code});assert.equal(cancelled,true);
  assert.equal(JSON.stringify(result).includes('fixture'),false);
 }
});
test('rejects untrusted endpoints',async()=>{
 assert.deepEqual(await probeRegionalStaticHead({url:'https://evil.example/file.zip'}),{status:'invalid_endpoint'});
});
