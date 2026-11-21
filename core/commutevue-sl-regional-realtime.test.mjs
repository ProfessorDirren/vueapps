import test from 'node:test';
import assert from 'node:assert/strict';
import {createSLRegionalRealtimeSource,SLRegionalRealtimeError} from './commutevue-sl-regional-realtime.js';
test('SL regional GTFS-RT feed is fetched from regional source, never Sweden 3',async()=>{
 let observed;
 const source=createSLRegionalRealtimeSource({apiKey:'fake-key',fetcher:async(url,options)=>{
  observed={url,options};
  return {ok:true,headers:{get:()=>null},arrayBuffer:async()=>Uint8Array.from([10,2,8,1]).buffer};
 }});
 const result=await source.tripUpdates();
 assert.equal(new URL(observed.url).origin,'https://opendata.samtrafiken.se');
 assert.equal(new URL(observed.url).pathname,'/gtfs-rt/sl/TripUpdates.pb');
 assert.equal(new URL(observed.url).searchParams.get('key'),'fake-key');
 assert.equal(result.status,'raw_unverified');
 assert.deepEqual([...result.bytes],[10,2,8,1]);
});
test('SL regional source rejects oversized feeds before downloading',async()=>{
 const source=createSLRegionalRealtimeSource({apiKey:'fake',fetcher:async()=>({ok:true,headers:{get:()=>String(9*1024*1024)}})});
 await assert.rejects(source.tripUpdates(),error=>error instanceof SLRegionalRealtimeError&&error.reason==='oversized_feed');
});
test('SL regional source never treats HTTP errors as real-time evidence',async()=>{
 const source=createSLRegionalRealtimeSource({apiKey:'fake',fetcher:async()=>({ok:false,status:403})});
 await assert.rejects(source.serviceAlerts(),error=>error instanceof SLRegionalRealtimeError&&error.reason==='authorization');
});
test('SL regional source rejects missing credentials',()=>{
 assert.throws(()=>createSLRegionalRealtimeSource({apiKey:''}),TypeError);
});
