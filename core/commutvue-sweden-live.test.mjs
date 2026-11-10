import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifiedSwedenAdapter} from './commutvue-sweden-live.js';
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
 const many={...board,departures:Array.from({length:30},(_,i)=>({...departure,trip:{trip_id:'t'+i,start_date:'2026-11-10'}}))};
 const adapter=createVerifiedSwedenAdapter({apiKey:'private-key',now:clock,maxTrips:8,
  resolveStop:async s=>s==='Jordbro'?{id:'740000001',stopIds:['stop1']}:{id:'740000002',stopIds:['stop2']},
  fetcher:async url=>{seen.push(url);return {ok:true,text:async()=>JSON.stringify(url.includes('/trips/')?details:many)};}
 });
 const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(result.status,'unavailable'); // Trip identifiers in details do not match, so none are verified.
 assert.equal(seen.filter(url=>url.includes('/trips/')).length,8);
});
