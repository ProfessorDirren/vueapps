import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifiedSwedenAdapter} from './commutvue-sweden-live.js';

test('Jordbro to Stockholm City prioritizes northbound over realtime Södertälje with a one-trip budget',async()=>{
 const now=Date.parse('2026-11-10T08:59:00Z');
 const row=(id,direction)=>({
  trip:{trip_id:id,start_date:'2026-11-10'},
  stop:{id:'jordbro-platform'},is_realtime:true,
  scheduled:'2026-11-10T10:05:00',realtime:'2026-11-10T10:06:00',
  route:{designation:'43',direction,transport_mode:'TRAIN',transport_mode_code:106},
  canceled:false
 });
 const rows=[row('south','Södertälje centrum'),row('north','Bålsta')];
 const requested=[];
 const adapter=createVerifiedSwedenAdapter({
  apiKey:'fixture',now:()=>now,maxTrips:1,
  resolveStop:async name=>name==='Jordbro'
   ?{id:'740000001',stopIds:['jordbro-platform']}
   :{id:'740098000',stopIds:['1617']},
  fetcher:async url=>{
   const tripId=url.match(/\/trips\/([^/]+)\//)?.[1];
   if(tripId)requested.push(tripId);
   const payload=tripId
    ?{timestamp:'2026-11-10T09:58:30',trip:{trip_id:tripId,start_date:'2026-11-10'},
      calls:tripId==='north'
       ?[{stop:{id:'jordbro-platform',area_id:'740000001'},is_realtime:true},
         {stop:{id:'1617',area_id:'740098000',name:'Stockholm City'},is_realtime:true}]
       :[{stop:{id:'jordbro-platform',area_id:'740000001'},is_realtime:true},
         {stop:{id:'south-platform',area_id:'740000003'},is_realtime:true}]}
    :{timestamp:'2026-11-10T09:58:30',departures:rows};
   return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(payload)};
  }
 });
 const result=await adapter({provider:'stockholm',from:'Jordbro',to:'Stockholm City',transportMode:'TRAIN'});
 assert.deepEqual(requested,['north']);
 assert.equal(result.status,'ok');
 assert.equal(result.journeyEvidence.verified,true);
 assert.equal(result.departures[0].expected,'2026-11-10T09:06:00.000Z');
});
