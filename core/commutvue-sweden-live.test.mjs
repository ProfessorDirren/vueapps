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

test('invalid origin and destination stop data have distinct safe diagnostics',async()=>{
 for(const [badName,expected] of [['Jordbro','invalid_origin_stop_data'],['Stockholm City','invalid_destination_stop_data']]){
  const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async name=>{
   if(name===badName)throw new Error('secret upstream response');
   return {id:'740000001',stopIds:['stop1']};
  },fetcher:async()=>{throw Error('No departure request expected')}});
  await assert.rejects(adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'}),error=>{
   assert.equal(error.name,'TrafiklabRequestError');
   assert.equal(error.stage,'stop_lookup');
   assert.equal(error.category,expected);
   assert.doesNotMatch(error.message,/secret upstream response/);
   return true;
  });
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
 await assert.rejects(resolver('Unknown'),e=>e instanceof TrafiklabRequestError&&e.category==='station_not_found');
 const ambiguous=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740000001',name:'Jordbro',stops:[{id:'stop1'}]},
  {id:'740000002',name:'Jordbro',stops:[{id:'stop2'}]}
 ]})})});
 await assert.rejects(ambiguous('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.category==='ambiguous_station');
});

test('duplicate exact station rows sharing one area ID are one location, not ambiguous',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740000001',name:'Jordbro',stops:[{id:'stop1'}]},
  {id:'740000001',name:'Jordbro',stops:[{id:'stop2'},{id:'stop1'}]}
 ]})})});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1','stop2']});
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
 await assert.rejects(resolver('Stockholm C'),e=>e instanceof TrafiklabRequestError&&e.category==='station_not_found');
});
test('ambiguous matching child stop names fail closed',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740098000',name:'Stockholm',stops:[{id:'1617',name:'Stockholm City'}]},
  {id:'740098001',name:'Another Group',stops:[{id:'9999',name:'Stockholm City'}]}
 ]})})});
 await assert.rejects(resolver('Stockholm City'),e=>e instanceof TrafiklabRequestError&&e.category==='ambiguous_station');
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
 const scheduled=await noEligible({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
  assert.equal(scheduled.status,'scheduled');
  assert.equal(scheduled.departures[0].expected,null);
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

test('same-name platforms within one meta-stop are retained without accepting different meta-stops',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740098000',name:'Stockholm',stops:[{id:'1617',name:'Stockholm City'},{id:'1618',name:'Stockholm City'},{id:'1617',name:'Stockholm City'}]}
 ]})})});
 assert.deepEqual(await resolver('Stockholm City'),{id:'740098000',stopIds:['1617','1618']});
});

test('stop lookup safely distinguishes empty, missing, ambiguous and incomplete results',async()=>{
 for(const [groups,category] of [
  [[], 'empty_station_results'],
  [[{id:'740000001',name:'Other',stops:[{id:'1',name:'Other'}]}], 'station_not_found'],
  [[{id:'740000001',name:'Jordbro',stops:[]}], 'missing_platform_ids'],
  [[{id:'740000001',name:'Jordbro',stops:[{id:'1',name:'Jordbro'}]},{id:'740000002',name:'Jordbro',stops:[{id:'2',name:'Jordbro'}]}], 'ambiguous_station']
 ]){
  const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:groups})})});
  await assert.rejects(resolver('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.stage==='stop_lookup'&&e.category===category&&!e.message.includes('fixture'));
 }
});

test('only alerts on verified departures are exposed; invalid routes never leak alerts',async()=>{
 const alert={title:'Signal failure',text:'Delays on this line',type:'WARNING'};
 const verified=await make({...board,departures:[{...departure,alerts:[alert]}]})({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(verified.status,'ok');
 assert.equal(verified.alerts.length,1);
 assert.equal(verified.alerts[0].title,'Signal failure');
 assert.deepEqual(verified.alerts[0].affectedLines,['43']);
 const unverified=await make({...board,departures:[{...departure,alerts:[alert]}]},{...details,calls:[...details.calls].reverse()})({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(unverified.status,'unavailable');
 assert.equal(unverified.alerts,undefined);
});

test('Jordbro stop lookup fails with explicit safe categories for unexpected provider payloads',async()=>{
 for(const [payload,expected] of [
  [{stop_groups:[]},'empty_station_results'],
  [{stop_groups:[{id:'740000001',name:'Different stop',stops:[{id:'stop1'}]}]},'station_not_found'],
  [{stop_groups:[{id:'740000001',name:'Jordbro',stops:[]}]},'missing_platform_ids']
 ]){
  const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify(payload)})});
  await assert.rejects(resolver('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.stage==='stop_lookup'&&e.category===expected);
 }
});

test('official Trafiklab Stockholm meta-stop fixture resolves City child, not Centralstation',async()=>{
 const urls=[];
 const fetcher=async url=>{
  urls.push(url);
  const name=decodeURIComponent(new URL(url).pathname);
  const payload=name.endsWith('/Stockholm City')?{stop_groups:[]}:
   {stop_groups:[{id:'740098000',name:'Stockholm',area_type:'META_STOP',stops:[
    {id:'1',name:'Stockholm Centralstation'},
    {id:'1617',name:'Stockholm City'},
    {id:'12275',name:'T-Centralen'}
   ]}]};
  return {ok:true,text:async()=>JSON.stringify(payload)};
 };
 const resolved=await createTrafiklabStopResolver({apiKey:'fixture',fetcher})('Stockholm City');
 assert.deepEqual(resolved,{id:'740098000',stopIds:['1617']});
 assert.equal(urls.length,2);
 assert.ok(urls.every(url=>new URL(url).hostname==='realtime-api.trafiklab.se'));
});

test('ambiguous exact Jordbro groups must fail closed rather than select the first',async()=>{
 const payload={stop_groups:[
  {id:'740000001',name:'Jordbro',stops:[{id:'stop1',name:'Jordbro'}]},
  {id:'740000002',name:'Jordbro',stops:[{id:'stop2',name:'Jordbro'}]}
 ]};
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify(payload)})});
 await assert.rejects(resolver('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.category==='ambiguous_station');
});

test('scheduled-only pendeltag is never falsely presented as live realtime',async()=>{
 const scheduledOnly={...board,departures:[{...departure,is_realtime:false,realtime:departure.scheduled}]};
 const raw=await make(scheduledOnly)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(raw.status,'scheduled');
 assert.equal(raw.departures.length,1);
 assert.equal(raw.departures[0].expected,null);
 const normalized=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(scheduledOnly)});
 assert.equal(normalized.status,'unavailable');
 assert.deepEqual(normalized.departures,[]);
});

test('duplicate exact Jordbro meta-stop rows combine platforms instead of reporting false ambiguity',async()=>{
 const groups=[
  {id:'740000001',name:'Jordbro',stops:[{id:'stop1',name:'Jordbro'}]},
  {id:'740000001',name:'Jordbro',stops:[{id:'stop2',name:'Jordbro'},{id:'stop1',name:'Jordbro'}]}
 ];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:groups})})});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1','stop2']});
});

test('empty full-name Jordbro lookup retries indexed prefix but only accepts exact station',async()=>{
 const calls=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  calls.push(decodeURIComponent(new URL(url).pathname));
  return {ok:true,text:async()=>JSON.stringify({stop_groups:new URL(url).pathname.endsWith('/Jordb')?[
   {id:'740000001',name:'Jordbro',stops:[{id:'stop1',name:'Jordbro'}]},
   {id:'740000002',name:'Jordberg',stops:[{id:'stop2',name:'Jordberg'}]}
  ]:[]})};
 }});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1']});
 assert.equal(calls.length,2);
});

test('station ambiguity identifies origin versus destination without exposing credentials',async()=>{
 for(const [ambiguous,role] of [['Jordbro','origin'],['Stockholm City','destination']]){
  const adapter=createVerifiedSwedenAdapter({apiKey:'secret-fixture',now:clock,resolveStop:async name=>{
   if(name===ambiguous)throw new TrafiklabRequestError('stop_lookup','ambiguous_station');
   return {id:'740000001',stopIds:['stop1']};
  },fetcher:async()=>{throw Error('should not fetch departures')}});
  await assert.rejects(adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'}),error=>error instanceof TrafiklabRequestError&&error.category==='ambiguous_station'&&error.stopRole===role&&!error.message.includes('secret-fixture'));
 }
});


test('ambiguous Jordbro resolves only uniquely identified rail platforms, never bus or unclassified stops',async()=>{
 const groups=[
  {id:'740000001',name:'Jordbro',transport_modes:['BUS'],stops:[{id:'bus1',name:'Jordbro'}]},
  {id:'740000002',name:'Jordbro',transport_modes:['TRAIN'],stops:[{id:'rail1',name:'Jordbro'}]}
 ];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:groups})})});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000002',stopIds:['rail1']});
 const bothRail=groups.map(g=>({...g,transport_modes:['TRAIN']}));
 const ambiguous=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:bothRail})})});
 await assert.rejects(ambiguous('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.category==='ambiguous_station');
});


test('trip destination is verified by exact station area when child platform differs',async()=>{
 const trip={...details,calls:[details.calls[0],{stop:{id:'different-platform',area_id:'740000002',name:'Stockholm City'},is_realtime:true}]};
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,trip)});
 assert.equal(result.status,'ok');
 assert.equal(result.departures.length,1);
 const wrong={...details,calls:[details.calls[0],{stop:{id:'different-platform',area_id:'740000999'},is_realtime:true}]};
 const rejected=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,wrong)});
 assert.equal(rejected.status,'unavailable');
 assert.deepEqual(rejected.departures,[]);
});


test('Trafiklab Trips documented call shape verifies exact destination area without matching platform ID',async()=>{
 // Trafiklab Trips example: calls[].stop has id, area_id and name;
 // realtime and scheduled fields can be supplied as Departure/Arrival variants.
 const documented={...details,calls:[
  {stop:{id:'stop1',area_id:'740000001',name:'Jordbro'},is_realtime:true,scheduledDeparture:'2026-11-10T09:59:00',realtimeDeparture:'2026-11-10T10:06:00',departureCanceled:false},
  {stop:{id:'alternate-city-platform',area_id:'740000002',name:'Stockholm City'},is_realtime:true,scheduledArrival:'2026-11-10T10:29:00',realtimeArrival:'2026-11-10T10:34:00',arrivalCanceled:false}
 ]};
 const verified=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,documented)});
 assert.equal(verified.status,'ok');
 assert.equal(verified.departures.length,1);
 assert.equal(verified.departures[0].delayMinutes,7);
 const wrong={...documented,calls:documented.calls.map((c,i)=>i===1?{...c,stop:{...c.stop,area_id:'740000099'}}:c)};
 const blocked=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,wrong)});
 assert.equal(blocked.status,'unavailable');
 assert.deepEqual(blocked.departures,[]);
});


test('missing provider direction is safe only after destination trip is verified',async()=>{
 const withoutDirection={...departure,route:{designation:'43'}};
 const verified=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make({...board,departures:[withoutDirection]},details)});
 assert.equal(verified.status,'ok');
 assert.equal(verified.departures[0].destination,'Stockholm City');
 const wrongTrip={...details,calls:[details.calls[0],{stop:{id:'different-platform',area_id:'740000099'},is_realtime:true}]};
 const rejected=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make({...board,departures:[withoutDirection]},wrongTrip)});
 assert.equal(rejected.status,'unavailable');
 assert.deepEqual(rejected.departures,[]);
});


test('verified scheduled train is shown without inventing realtime or delay',async()=>{
 const scheduledBoard={...board,departures:[{...departure,is_realtime:false,realtime:null}]};
 const scheduledTrip={...details,calls:details.calls.map(c=>({...c,is_realtime:false}))};
 const raw=await make(scheduledBoard,scheduledTrip)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(raw.status,'scheduled');
 assert.equal(raw.departures.length,1);
 assert.equal(raw.departures[0].expected,null);
 assert.equal(raw.departures[0].scheduled,'2026-11-10T08:59:00.000Z');
 const wrong={...scheduledTrip,calls:[scheduledTrip.calls[0],{stop:{id:'wrong',area_id:'740000099'},is_realtime:false}]};
 const rejected=await make(scheduledBoard,wrong)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(rejected.status,'unavailable');
 assert.deepEqual(rejected.departures,[]);
});


test('trip without the requested origin is rejected even if destination exists',async()=>{
 const missingOrigin={...details,calls:[{stop:{id:'unrelated',area_id:'740000099'},is_realtime:true},details.calls[1]]};
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,missingOrigin)});
 assert.equal(result.status,'unavailable');
 assert.deepEqual(result.departures,[]);
});


test('Trafiklab canceled departure and arrival flags never produce a verified journey',async()=>{
 for(const [label,changedBoard,changedTrip] of [
  ['board departureCanceled',{...board,departures:[{...departure,departureCanceled:true}]},details],
  ['origin departureCanceled',board,{...details,calls:details.calls.map((c,i)=>i===0?{...c,departureCanceled:true}:c)}],
  ['destination arrivalCanceled',board,{...details,calls:details.calls.map((c,i)=>i===1?{...c,arrivalCanceled:true}:c)}]
 ]){
  const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(changedBoard,changedTrip)});
  assert.equal(result.status,'unavailable',label);
  assert.deepEqual(result.departures,[],label);
 }
});

test('commuter-rail T-Centralen resolves to Stockholm City while child stop IDs stay distinct',async()=>{
 const groups=[{id:'740098000',name:'Stockholm',area_type:'META_STOP',stops:[
  {id:'1617',name:'Stockholm City'},{id:'12275',name:'T-Centralen'}
 ]}];
 const requested=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  requested.push(new URL(url).pathname);
  return {ok:true,text:async()=>JSON.stringify({stop_groups:url.includes('/Stockholm?')?groups:[]})};
 }});
 assert.deepEqual(await resolver('Stockholm City'),{id:'740098000',stopIds:['1617']});
 assert.deepEqual(await resolver('T-Centralen'),{id:'740098000',stopIds:['1617']});
 assert.equal(requested.filter(p=>p.endsWith('/Stockholm')).length,2);
});

test('same Stockholm meta-stop must not verify T-Centralen trip via Stockholm City child',async()=>{
 const resolveStop=async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740098000',stopIds:['12275']};
 const trip={...details,calls:[details.calls[0],{stop:{id:'1617',area_id:'740098000',name:'Stockholm City'},is_realtime:true}]};
 const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop,fetcher:async url=>({ok:true,text:async()=>JSON.stringify(url.includes('/trips/')?trip:board)})});
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'T-Centralen',adapter});
 assert.equal(result.status,'unavailable');
 assert.deepEqual(result.departures,[]);
});


test('T-Centralen commuter queries resolve to Stockholm City platforms, not metro stop IDs',async()=>{
 const requested=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  requested.push(url);
  return {ok:true,text:async()=>JSON.stringify({stop_groups:[
   {id:'740098000',name:'Stockholm',stops:[
    {id:'1617',name:'Stockholm City'},
    {id:'12275',name:'T-Centralen'}
   ]}
  ]})};
 }});
 assert.deepEqual(await resolver('T-Centralen'),{id:'740098000',stopIds:['1617']});
 assert.ok(requested.every(url=>!url.includes('/stops/name/T-Centralen')));
});


test('contradictory Trips origin timestamps never verify a real-time delay',async()=>{
 const matching={...details,calls:[{...details.calls[0],scheduledDeparture:departure.scheduled,realtimeDeparture:departure.realtime},details.calls[1]]};
 const good=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,matching)});
 assert.equal(good.status,'ok');
 assert.equal(good.departures[0].delayMinutes,7);
 for(const changed of [
  {...matching,calls:[{...matching.calls[0],scheduledDeparture:'2026-11-10T10:00:00'},matching.calls[1]]},
  {...matching,calls:[{...matching.calls[0],realtimeDeparture:'2026-11-10T10:07:00'},matching.calls[1]]},
  {...matching,calls:[{...matching.calls[0],realtimeDeparture:'invalid'},matching.calls[1]]}
 ]){
  const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:make(board,changed)});
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.departures,[]);
 }
});


test('conflicting Trafiklab times yield a specific safe diagnostic without claiming delay',async()=>{
 const inconsistent={...details,calls:[{...details.calls[0],scheduledDeparture:'2026-11-10T10:00:00',realtimeDeparture:departure.realtime},details.calls[1]]};
 const raw=await make(board,inconsistent)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(raw.status,'unavailable');
 assert.equal(raw.reason,'provider_time_conflict');
 assert.deepEqual(raw.departures,[]);
 const wrongRoute={...details,calls:[details.calls[0],{...details.calls[1],stop:{id:'wrong',area_id:'740000099'}}]};
 const unrelated=await make(board,wrongRoute)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(unrelated.reason,'route_not_verified');
});


test('mixed Trafiklab evidence keeps verified trips and excludes conflicting delays and alerts',async()=>{
 const valid={...departure,trip:{trip_id:'valid',start_date:'2026-11-10'}};
 const conflict={...departure,trip:{trip_id:'conflict',start_date:'2026-11-10'},alerts:[{title:'Unverified alert',text:'Should not appear'}]};
 const seen=[];
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:clock,
  resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   const tripId=url.match(/\/trips\/([^/]+)\//)?.[1];
   if(tripId)seen.push(tripId);
   const calls=tripId==='conflict'
    ?[{...details.calls[0],scheduledDeparture:'2026-11-10T10:00:00'},details.calls[1]]
    :[{...details.calls[0],scheduledDeparture:departure.scheduled,realtimeDeparture:departure.realtime},details.calls[1]];
   const payload=tripId?{...details,trip:{trip_id:tripId,start_date:'2026-11-10'},calls}:{...board,departures:[conflict,valid]};
   return {ok:true,text:async()=>JSON.stringify(payload)};
  }
 });
 const raw=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(raw.status,'ok');
 assert.deepEqual(raw.departures.map(d=>d.id),['valid|2026-11-10|stop1']);
 assert.deepEqual(raw.journeyEvidence.departureIds,['valid|2026-11-10|stop1']);
 assert.deepEqual(raw.alerts,[]);
 assert.deepEqual(seen,['conflict','valid']);
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(result.status,'ok');
 assert.equal(result.departures[0].delayMinutes,7);
});


test('stop resolver retries indexed prefix when full-name results contain unrelated stations',async()=>{
 const requests=[];
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async url=>{
  const name=decodeURIComponent(new URL(url).pathname.split('/').pop());requests.push(name);
  const stop_groups=name==='Jordbro'?[{id:'740000099',name:'Jordbro södra',stops:[{id:'other'}]}]:[
   {id:'740000099',name:'Jordbro södra',stops:[{id:'other'}]},
   {id:'740000001',name:'Jordbro',stops:[{id:'stop1'}]}
  ];
  return {ok:true,text:async()=>JSON.stringify({stop_groups})};
 }});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1']});
 assert.deepEqual(requests,['Jordbro','Jordb']);
});

test('stop resolver prefix fallback never accepts only fuzzy matches',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[
  {id:'740000099',name:'Jordbro södra',stops:[{id:'other'}]}
 ]})})});
 await assert.rejects(resolver('Jordbro'),e=>e instanceof TrafiklabRequestError&&e.category==='station_not_found');
});


test('scheduled-only trip alerts never contaminate a separate verified realtime journey',async()=>{
 const scheduled={...departure,trip:{trip_id:'scheduled',start_date:'2026-11-10'},is_realtime:false,alerts:[{title:'Unverified timetable warning',text:'Do not show as live'}]};
 const verified={...departure,trip:{trip_id:'verified',start_date:'2026-11-10'},alerts:[{title:'Verified trip warning',text:'Verified route'}]};
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:clock,
  resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   const tripId=url.match(/\/trips\/([^/]+)\//)?.[1];
   return {ok:true,text:async()=>JSON.stringify(tripId
    ?{...details,trip:{trip_id:tripId,start_date:'2026-11-10'}}
    :{...board,departures:[scheduled,verified]})};
  }
 });
 const raw=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(raw.status,'ok');
 assert.deepEqual(raw.alerts.map(a=>a.title),['Verified trip warning']);
 const normalized=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(normalized.status,'ok');
 assert.equal(normalized.alerts,undefined); // Provider-neutral query contract does not expose alerts.
 assert.equal(normalized.departures.length,1);
});


test('malformed null trip calls fail closed without hiding later valid departures',async()=>{
 const malformed={...departure,trip:{trip_id:'broken',start_date:'2026-11-10'}};
 const valid={...departure,trip:{trip_id:'valid',start_date:'2026-11-10'}};
 const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,
  resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   const parts=new URL(url).pathname.split('/');const tripId=parts.includes('trips')?parts[parts.indexOf('trips')+1]:null;
   const payload=tripId?{...details,trip:{trip_id:tripId,start_date:'2026-11-10'},calls:tripId==='broken'?[null,...details.calls]:details.calls}:{...board,departures:[malformed,valid]};
   return {ok:true,text:async()=>JSON.stringify(payload)};
  }
 });
 const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'ok');
 assert.deepEqual(result.departures.map(d=>d.id),['broken|2026-11-10|stop1','valid|2026-11-10|stop1']);
});


test('null Trafiklab departure board fails closed without claiming live service',async()=>{
 const result=await make(null)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'unavailable');
 assert.equal(result.reason,'board_unavailable');
 assert.deepEqual(result.departures,[]);
});

test('null Trafiklab trip response is ignored and never verifies a journey',async()=>{
 const result=await make(board,null)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'unavailable');
 assert.equal(result.reason,'route_not_verified');
 assert.deepEqual(result.departures,[]);
});


test('null Trafiklab stop lookup payload fails closed as empty results',async()=>{
 const resolve=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=> 'null'})});
 await assert.rejects(resolve('Jordbro'),error=>error instanceof TrafiklabRequestError&&error.stage==='stop_lookup'&&error.category==='empty_station_results');
});


test('null stop-group rows are ignored while an exact station remains resolvable',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[null,{id:'740000001',name:'Jordbro',stops:[{id:'stop1'}]}]})})});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1']});
});


test('null child platform rows do not prevent resolving an exact station',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[{id:'740000001',name:'Jordbro',stops:[null,{id:'stop1'}]}]})})});
 assert.deepEqual(await resolver('Jordbro'),{id:'740000001',stopIds:['stop1']});
});

test('null child platform rows do not prevent Stockholm City child lookup',async()=>{
 const resolver=createTrafiklabStopResolver({apiKey:'fixture',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({stop_groups:[{id:'740000002',name:'Stockholm',stops:[null,{id:'city1',name:'Stockholm City'}]}]})})});
 assert.deepEqual(await resolver('Stockholm City'),{id:'740000002',stopIds:['city1']});
});


test('realtime departure is not starved by earlier scheduled-only rows',async()=>{
 const scheduledRows=Array.from({length:8},(_,i)=>({...departure,trip:{trip_id:'schedule'+i,start_date:'2026-11-10'},is_realtime:false,realtime:undefined}));
 const realtimeRow={...departure,trip:{trip_id:'live',start_date:'2026-11-10'}};
 const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,maxTrips:8,
  resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   const path=new URL(url).pathname;
   const id=path.includes('/trips/')?path.split('/trips/')[1].split('/')[0]:null;
   return {ok:true,text:async()=>JSON.stringify(id?{...details,trip:{trip_id:id,start_date:'2026-11-10'},calls:details.calls.map(call=>({...call,is_realtime:id==='live'}))}:{...board,departures:[...scheduledRows,realtimeRow]})};
  }
 });
 const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'ok');
 assert.deepEqual(result.departures.map(d=>d.id),['live|2026-11-10|stop1']);
});


test('scheduled fallback reports whether realtime evidence was rejected or absent',async()=>{
 const scheduled={...departure,trip:{trip_id:'schedule',start_date:'2026-11-10'},is_realtime:false,realtime:undefined};
 const unverified={...departure,trip:{trip_id:'unverified',start_date:'2026-11-10'},is_realtime:true};
 const build=rows=>createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,
  resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{
   const path=new URL(url).pathname;
   const id=path.includes('/trips/')?path.split('/trips/')[1].split('/')[0]:null;
   return {ok:true,text:async()=>JSON.stringify(id?{...details,trip:{trip_id:id,start_date:'2026-11-10'},calls:details.calls.map(call=>({...call,is_realtime:false}))}:{...board,departures:rows})};
  }
 });
 const absent=await build([scheduled])({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(absent.status,'scheduled');
 assert.equal(absent.reason,'no_realtime_at_origin');
 const rejected=await build([scheduled,unverified])({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(rejected.status,'scheduled');
 assert.equal(rejected.reason,'realtime_trip_flag_missing');
 assert.equal(rejected.departures.length,1);
});


test('schedule fallback distinguishes realtime trip platform, destination and flag failures',async()=>{
 const schedule={...departure,trip:{trip_id:'schedule',start_date:'2026-11-10'},is_realtime:false};
 const live={...departure,trip:{trip_id:'live',start_date:'2026-11-10'}};
 for(const [reason,calls] of [
  ['realtime_origin_unverified',[{stop:{id:'other'},is_realtime:true},{stop:{id:'stop2'},is_realtime:true}]],
  ['realtime_destination_absent',[{stop:{id:'stop1'},is_realtime:true},{stop:{id:'other'},is_realtime:true}]],
  ['realtime_trip_flag_missing',[{stop:{id:'stop1'},is_realtime:false},{stop:{id:'stop2'},is_realtime:true}]]
 ]){
  const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},fetcher:async url=>{
   const id=url.match(/\/trips\/([^/]+)\//)?.[1];
   return {ok:true,text:async()=>JSON.stringify(id?{...details,trip:{trip_id:id,start_date:'2026-11-10'},calls:id==='live'?calls:details.calls.map(c=>({...c,is_realtime:false}))}:{...board,departures:[schedule,live]})};
  }});
  const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
  assert.equal(result.status,'scheduled');assert.equal(result.reason,reason);assert.equal(result.departures.length,1);
 }
});


test('Stockholm City accepts an exact named child of its verified meta-stop even if platform IDs differ',async()=>{
 const trip={...details,calls:[details.calls[0],{stop:{id:'other-city-platform',area_id:'740000002',name:'Stockholm City'},is_realtime:true}]};
 const result=await make(board,trip)({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'ok');assert.equal(result.departures.length,1);
});

test('Stockholm City does not accept a different station in the same meta-stop',async()=>{
 const scheduled={...departure,is_realtime:false,trip:{trip_id:'scheduled',start_date:'2026-11-10'}};
 const realtime={...departure,trip:{trip_id:'realtime',start_date:'2026-11-10'}};
 const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740098000',stopIds:['1617']},fetcher:async url=>{
  const id=url.match(/\/trips\/([^/]+)\//)?.[1];
  const calls=[details.calls[0],{stop:{id:'1',area_id:'740098000',name:'Stockholm Centralstation'},is_realtime:true}];
  return {ok:true,text:async()=>JSON.stringify(id?{...details,trip:{trip_id:id,start_date:'2026-11-10'},calls:id==='realtime'?calls:[details.calls[0],{stop:{id:'1617',area_id:'740098000',name:'Stockholm City'},is_realtime:false}]}:{...board,departures:[scheduled,realtime]})};
 }});
 const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'scheduled');assert.equal(result.reason,'realtime_destination_id_mismatch');
});


test('realtime destination diagnostics distinguish absent, wrong order and area-ID/name mismatch',async()=>{
 const scheduled={...departure,is_realtime:false,trip:{trip_id:'scheduled',start_date:'2026-11-10'}};
 const live={...departure,trip:{trip_id:'live',start_date:'2026-11-10'}};
 const destination={stop:{id:'stop2',area_id:'740000002',name:'Stockholm City'},is_realtime:true};
 const origin={stop:{id:'stop1',area_id:'740000001',name:'Jordbro'},is_realtime:true};
 for(const [reason,calls] of [
  ['realtime_destination_absent',[origin,{stop:{id:'elsewhere',area_id:'740000003',name:'Other'},is_realtime:true}]],
  ['realtime_destination_wrong_order',[destination,origin]],
  ['realtime_destination_id_mismatch',[origin,{stop:{id:'other-platform',area_id:'740000002',name:'Stockholm Centralstation'},is_realtime:true}]]
 ]){
  const adapter=createVerifiedSwedenAdapter({apiKey:'fixture',now:clock,resolveStop:async name=>name==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},fetcher:async url=>{
   const id=url.match(/\/trips\/([^/]+)\//)?.[1];
   return {ok:true,text:async()=>JSON.stringify(id?{...details,trip:{trip_id:id,start_date:'2026-11-10'},calls:id==='live'?calls:[origin,{...destination,is_realtime:false}]}:{...board,departures:[live,scheduled]})};
  }});
  const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
  assert.equal(result.status,'scheduled');assert.equal(result.reason,reason);
 }
});

test('unavailable route retains precise realtime destination diagnosis without scheduled fallback',async()=>{
 const cases=[
  {name:'absent destination',calls:[details.calls[0]],reason:'realtime_destination_absent'},
  {name:'destination before origin',calls:[details.calls[1],details.calls[0]],reason:'realtime_destination_wrong_order'},
  {name:'destination area without verified child/name',calls:[details.calls[0],{stop:{id:'unknown',area_id:'740000002',name:'Another station'},is_realtime:true}],reason:'realtime_destination_id_mismatch'}
 ];
 for(const fixture of cases){
  const adapter=make(board,{...details,calls:fixture.calls});
  const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City'});
  assert.equal(result.status,'unavailable',fixture.name);
  assert.equal(result.reason,fixture.reason,fixture.name);
  assert.deepEqual(result.departures,[],fixture.name);
 }
});
