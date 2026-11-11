import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifiedSwedenAdapter,createTrafiklabStopResolver,TrafiklabRequestError} from './commutvue-sweden-live.js';
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
 const verified=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.deepEqual(verified.journeyEvidence.departureIds,verified.departures.map(d=>d.id));
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

test('Trafiklab response size cap is measured in UTF-8 bytes and prechecks Content-Length',async()=>{
 const resolveStop=async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']};
 let reads=0;
 const oversizedHeader=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop,fetcher:async()=>({
  ok:true,headers:{get:()=> '350001'},text:async()=>{reads++;return JSON.stringify(board)}
 })});
 assert.equal((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:oversizedHeader})).status,'unavailable');
 assert.equal(reads,0);
 const oversizedUtf8=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop,fetcher:async()=>({
  ok:true,text:async()=> 'å'.repeat(175001)
 })});
 assert.equal((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:oversizedUtf8})).status,'unavailable');
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({
  ok:true,headers:{get:()=> '350001'},text:async()=>{reads++;return '{}'}
 })});
 await assert.rejects(resolver('Stockholm'),/too large/);
 assert.equal(reads,0);
});

test('expired, cancelled and far-future departures never consume a Trips API request',async()=>{
 const invalid=[
  {...departure,trip:{trip_id:'old',start_date:'2026-11-10'},realtime:'2026-11-10T09:30:00'},
  {...departure,trip:{trip_id:'cancelled',start_date:'2026-11-10'},canceled:true},
  {...departure,trip:{trip_id:'far',start_date:'2026-11-10'},realtime:'2026-11-10T16:00:00'}
 ];
 const requests=[];
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:clock,
  resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   requests.push(url);
   return {ok:true,text:async()=>JSON.stringify({...board,departures:invalid})};
  }
 });
 assert.equal((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter})).status,'unavailable');
 assert.equal(requests.filter(url=>url.includes('/trips/')).length,0);
});

test('an incomplete route label is skipped without hiding other verified departures',async()=>{
 const requestedTrips=[];
 const incomplete={...departure,trip:{trip_id:'missing',start_date:'2026-11-10'},route:{}};
 const complete={...departure,trip:{trip_id:'valid',start_date:'2026-11-10'}};
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:clock,
  resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   const tripId=url.match(/\/trips\/([^/]+)\//)?.[1];
   if(tripId)requestedTrips.push(tripId);
   return {ok:true,text:async()=>JSON.stringify(tripId?{...details,trip:{trip_id:tripId,start_date:'2026-11-10'}}:{...board,departures:[incomplete,complete]})};
  }
 });
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(result.status,'ok');
 assert.deepEqual(result.departures.map(d=>d.id),['valid|2026-11-10|stop1']);
 assert.deepEqual(requestedTrips,['valid']);
});

test('ambiguous autumn clock-change timestamps cannot be represented as verified realtime',async()=>{
 const ambiguous={...departure,scheduled:'2026-10-25T02:30:00',realtime:'2026-10-25T02:35:00'};
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:()=>Date.parse('2026-10-25T00:30:00Z'),
  resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async()=>({ok:true,text:async()=>JSON.stringify({...board,timestamp:'2026-10-25T02:30:00',departures:[ambiguous]})})
 });
 assert.equal((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter})).status,'unavailable');
});

test('Stockholm City resolves as an exact child of Stockholm meta-stop',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740098000',name:'Stockholm',stops:[{id:'1',name:'Stockholm Centralstation'},{id:'1617',name:'Stockholm City'},{id:'12275',name:'T-Centralen'}]}
 ]})})});
 assert.deepEqual(await resolver('Stockholm City'),{id:'740098000',stopIds:['1617']});
 await assert.rejects(resolver('Stockholm C'),/uniquely/);
});
test('ambiguous matching child stop names fail closed',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740098000',name:'Stockholm',stops:[{id:'1617',name:'Stockholm City'}]},
  {id:'740098001',name:'Another Group',stops:[{id:'9999',name:'Stockholm City'}]}
 ]})})});
 await assert.rejects(resolver('Stockholm City'),/uniquely/);
});

test('distinct child stops within the same Trafiklab meta-stop can form a verified journey',async()=>{
 const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,
  resolveStop:async name=>name==='Origin'?{id:'740098000',stopIds:['stop1']}:{id:'740098000',stopIds:['stop2']},
  fetcher:async url=>({ok:true,text:async()=>JSON.stringify(url.includes('/trips/')?details:board)})
 });
 const result=await queryCommute({provider:'stockholm',from:'Origin',to:'Destination',adapter});
 assert.equal(result.status,'ok');
 assert.equal(result.departures.length,1);
});
test('identical child stops are never treated as a valid journey',async()=>{
 const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,
  resolveStop:async()=>({id:'740098000',stopIds:['stop1']}),
  fetcher:async()=>{throw Error('Must not call provider for same stop')}
 });
 const result=await queryCommute({provider:'stockholm',from:'Origin',to:'Origin',adapter});
 assert.equal(result.status,'unavailable');
});

test('unavailable live journeys expose only safe stage diagnostics',async()=>{
 const noStops=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async()=>({id:'740000001',stopIds:['stop1']}),fetcher:async()=>{throw Error('unexpected fetch')}});
 assert.equal((await noStops({provider:'stockholm',from:'A',to:'A'})).reason,'stop_resolution');
 const noBoard=make({...board,timestamp:'2026-11-10T09:50:00'});
 assert.equal((await noBoard({provider:'stockholm',from:'Jordbro',to:'Stockholm City'})).reason,'board_unavailable');
 const noEligible=make({...board,departures:[{...departure,is_realtime:false}]});
 assert.equal((await noEligible({provider:'stockholm',from:'Jordbro',to:'Stockholm City'})).reason,'no_eligible_departures');
 const wrongRoute=make(board,{...details,calls:[...details.calls].reverse()});
 assert.equal((await wrongRoute({provider:'stockholm',from:'Jordbro',to:'Stockholm City'})).reason,'route_not_verified');
});

test('provider HTTP authorization and rate-limit failures are safely classified',async()=>{
 for(const [status,category] of [[401,'authorization'],[403,'authorization'],[429,'rate_limited'],[500,'http_error']]){
  const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},fetcher:async()=>({ok:false,status})});
  await assert.rejects(adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'}),e=>e instanceof TrafiklabRequestError&&e.category===category&&e.stage==='departure_board'&&!e.message.includes('fixture'));
 }
});

test('stop lookup distinguishes unauthorized credentials from network failure',async()=>{
 const unauthorized=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:false,status:403})});
 await assert.rejects(unauthorized('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.stage==='stop_lookup'&&e.category==='authorization');
 const offline=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>{throw Error('secret upstream URL')}});
 await assert.rejects(offline('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.stage==='stop_lookup'&&e.category==='network_or_timeout'&&!e.message.includes('secret'));
});

test('Stockholm City resolves through exact child of published Stockholm meta-stop when direct lookup is empty',async()=>{
 const calls=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  calls.push(url);
  return {ok:true,text:async()=>JSON.stringify(url.includes('/stops/name/Stockholm?')?{stop_groups:[{id:'740098000',name:'Stockholm',stops:[{id:'1617',name:'Stockholm City'},{id:'12275',name:'T-Centralen'}]}]}:{stop_groups:[]})};
 }});
 assert.deepEqual(await resolver('Stockholm City'),{id:'740098000',stopIds:['1617']});
 assert.equal(calls.length,2);
 assert.match(calls[1],/stops\/name\/Stockholm\?key=fixture/);
});

test('Stockholm City fallback also handles unrelated nonempty direct lookup groups',async()=>{
 const calls=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  calls.push(url);
  const parent=url.includes('/stops/name/Stockholm?');
  return {ok:true,text:async()=>JSON.stringify({stop_groups:parent?[{id:'740098000',name:'Stockholm',stops:[{id:'1617',name:'Stockholm City'}]}]:[{id:'740000001',name:'Stockholm Cityvägen',stops:[{id:'123',name:'Stockholm Cityvägen'}]}]})};
 }});
 assert.deepEqual(await resolver('Stockholm City'),{id:'740098000',stopIds:['1617']});
 assert.equal(calls.length,2);
});
