import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifiedSwedenAdapter,createTrafiklabStopResolver} from './commutvue-sweden-live.js';
import {queryCommute} from './commutvue.js';
const clock=()=>Date.parse('2026-11-10T08:59:00Z');
const departure={trip:{trip_id:'t1',start_date:'2026-11-10'},stop:{id:'stop1'},is_realtime:true,scheduled:'2026-11-10T09:59:00',realtime:'2026-11-10T10:06:00',route:{designation:'43',direction:'Stockholm City'},canceled:false};
const board={timestamp:'2026-11-10T09:58:00',departures:[departure]};
const details={timestamp:'2026-11-10T09:58:00',trip:{trip_id:'t1',start_date:'2026-11-10'},calls:[{stop:{id:'stop1',area_id:'740000001'},is_realtime:true},{stop:{id:'stop2',area_id:'740000002'},is_realtime:true}]};
const make=(boardPayload=board,tripPayload=details)=>createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},fetcher:async url=>({ok:true,text:async()=>JSON.stringify(url.includes('/trips/')?tripPayload:boardPayload)})});
test('verified Swedish realtime delay requires origin-before-destination trip calls',async()=>{
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make()});
 assert.equal(result.status,'ok');assert.equal(result.departures[0].delayMinutes,7);
 assert.equal(result.sourceUrl.includes('key='),false);
 assert.equal(result.updatedAt,'2026-11-10T08:58:00.000Z');
});
test('wrong route order, absent realtime or stale provider evidence never claims delay',async()=>{
 for(const adapter of [
  make(board,{...details,calls:[...details.calls].reverse()}),
  make({...board,departures:[{...departure,is_realtime:false}]}),
  make({...board,departures:[{...departure,canceled:true}]}),
  make(board,{...details,calls:[details.calls[0],{...details.calls[1],canceled:true}]}),
  make({...board,departures:[{...departure,stop:{id:'wrong-origin-stop'}}]}),
  make({...board,timestamp:'2026-11-10T09:50:00'}),
  make(board,{...details,timestamp:'2026-11-10T09:50:00'})
 ]){
  const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
  assert.equal(result.status,'unavailable');
 }
});

test('network errors and oversized payloads fail closed',async()=>{
 const failing=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},fetcher:async()=>{throw Error('offline')}});
 assert.equal((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:failing})).status,'unavailable');
 const oversized=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},fetcher:async()=>({ok:true,text:async()=> ' '.repeat(350001)})});
 assert.equal((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:oversized})).status,'unavailable');
});

test('the source URL never includes a secret and limits trip lookups to eight',async()=>{
 const seen=[];
 const many={...board,departures:Array.from({length:30},(_,i)=>({...departure,trip:{trip_id:'unmatched'+i,start_date:'2026-11-10'}}))};
 const adapter=createVerifiedSwedenAdapter({apiKey:'private-key',now:clock,maxTrips:8,
  resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{seen.push(url);return {ok:true,text:async()=>JSON.stringify(url.includes('/trips/')?details:many)};}
 });
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(result.status,'unavailable'); // Trip identifiers in details do not match, so none are verified.
 assert.equal(seen.filter(url=>url.includes('/trips/')).length,8);
});

test('stale departed trips and unsafe quota overrides fail closed',async()=>{
 const departed={...departure,realtime:'2026-11-10T09:40:00'};
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make({...board,departures:[departed]})});
 assert.equal(result.status,'unavailable');
 for(const maxTrips of [0,9,100,-1,1.5]){
  assert.throws(()=>createVerifiedSwedenAdapter({apiKey:'fixture',resolveStop:async()=>({id:'740000001',stopIds:['stop1']}),maxTrips}),/required/);
 }
});

test('stop resolver accepts only a unique exact station group with child stop IDs',async()=>{
 const calls=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  calls.push(url);
  return {ok:true,text:async()=>JSON.stringify({stop_groups:[
   {id:'740000001',name:'Jordbro',stops:[{id:'stop1'}]},
   {id:'740000002',name:'Jordbro södra',stops:[{id:'stop3'}]}
  ]})};
 }});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1']});
 assert.equal(calls.length,1);
 await assert.rejects(resolver('Unknown'),/uniquely/);
 const ambiguous=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740000001',name:'Jordbro',stops:[{id:'stop1'}]},
  {id:'740000002',name:'Jordbro',stops:[{id:'stop2'}]}
 ]})})});
 await assert.rejects(ambiguous('Jordbro'),/uniquely/);
});

test('departures are sorted by expected time and far-future times are excluded',async()=>{
 const late={...departure,trip:{trip_id:'late',start_date:'2026-11-10'},realtime:'2026-11-10T10:26:00'};
 const early={...departure,trip:{trip_id:'early',start_date:'2026-11-10'},realtime:'2026-11-10T10:03:00'};
 const far={...departure,trip:{trip_id:'far',start_date:'2026-11-10'},realtime:'2026-11-10T15:03:00'};
 const seen=[];
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:clock,maxTrips:8,
  resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   seen.push(url);
   const tripId=url.match(/\/trips\/([^/]+)\//)?.[1];
   return {ok:true,text:async()=>JSON.stringify(tripId?{...details,trip:{trip_id:tripId,start_date:'2026-11-10'}}:{...board,departures:[late,far,early]})};
  }
 });
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(result.status,'ok');
 assert.deepEqual(result.departures.map(d=>d.id),['early|2026-11-10|stop1','late|2026-11-10|stop1']);
});

test('official Trafiklab Stop Lookup meta-stop contract preserves numeric child stop ids',async()=>{
 // Based on Trafiklab's published Stop Lookup example: Stockholm meta-stop 740098000
 // includes child stop 1617 (Stockholm City), 12275 (T-Centralen), and others.
 const resolver=createTrafiklabStopResolver({
  apiKey:'fixture',
  fetcher:async url=>{
   assert.match(url,/\/v1\/stops\/name\/Stockholm\?key=fixture$/);
   return {ok:true,text:async()=>JSON.stringify({timestamp:'2025-05-02T15:10:56',stop_groups:[
    {id:'740098000',name:'Stockholm',area_type:'META_STOP',stops:[
     {id:'1',name:'Stockholm Centralstation'},
     {id:'1617',name:'Stockholm City'},
     {id:'12275',name:'T-Centralen'}
    ]},
    {id:'740022197',name:'Karlstad Residenstorget',stops:[{id:'41045'}]}
   ]})};
  }
 });
 assert.deepEqual(await resolver('Stockholm'),{id:'740098000',stopIds:['1','1617','12275']});
});
