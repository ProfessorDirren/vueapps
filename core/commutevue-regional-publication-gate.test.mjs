import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRegionalPublication} from './commutevue-regional-publication-gate.js';
const now=1763748000000;
const departure={tripId:'t1',originStopId:'J',destinationStopId:'C',scheduledDeparture:'18:39:00',predictedDeparture:new Date(now+300000).toISOString(),routeShortName:'43',tripHeadsign:'Bålsta',evidence:'regional_trip_update'};
const proof={status:'route_matched',departures:[departure]};
test('publication is disabled by default even with verified route evidence',()=>assert.equal(prepareRegionalPublication({proof,now}).reason,'publication_disabled'));
test('complete opted-in evidence produces display-safe regional departures',()=>{
 const result=prepareRegionalPublication({proof,enabled:true,now});
 assert.equal(result.status,'ready');
 assert.equal(result.departures[0].destination,'Bålsta');
 assert.equal(result.departures[0].destinationStopId,'C');
 assert.equal(result.departures[0].line,'43');
});
test('missing terminal, line, schedule or evidence fails closed',()=>{
 for(const patch of [{tripHeadsign:null},{routeShortName:null},{scheduledDeparture:null},{evidence:'unverified'},{destinationStopId:'J'}]){
  assert.equal(prepareRegionalPublication({proof:{...proof,departures:[{...departure,...patch}]},enabled:true,now}).status,'unavailable');
 }
});
test('stale prediction and duplicate trip IDs fail closed',()=>{
 const stale={...departure,predictedDeparture:new Date(now-180000).toISOString()};
 assert.equal(prepareRegionalPublication({proof:{...proof,departures:[stale]},enabled:true,now}).reason,'no_upcoming_departures');
 assert.equal(prepareRegionalPublication({proof:{...proof,departures:[departure,departure]},enabled:true,now}).reason,'duplicate_trip');
});

test('publication enforces precise live departure window boundaries',()=>{
 const at=ms=>({...departure,predictedDeparture:new Date(ms).toISOString()});
 for(const ms of [now,now+7200000]){
  assert.equal(prepareRegionalPublication({proof:{status:'route_matched',departures:[at(ms)]},enabled:true,now}).status,'ready');
 }
 for(const ms of [now+7200001]){
  assert.equal(prepareRegionalPublication({proof:{status:'route_matched',departures:[at(ms)]},enabled:true,now}).reason,'invalid_prediction');
 }
});
test('publication excludes passed departures while retaining upcoming trains',()=>{
 const passed={...departure,tripId:'passed',predictedDeparture:new Date(now-60000).toISOString()};
 const result=prepareRegionalPublication({proof:{status:'route_matched',departures:[passed,departure]},enabled:true,now});
 assert.equal(result.status,'ready');
 assert.deepEqual(result.departures.map(d=>d.tripId),['t1']);
 assert.equal(prepareRegionalPublication({proof:{status:'route_matched',departures:[passed]},enabled:true,now}).reason,'no_upcoming_departures');
});
test('publication sorts verified departures by predicted time without changing their destination headsigns',()=>{
 const later={...departure,tripId:'later',tripHeadsign:'Kungsängen',predictedDeparture:new Date(now+900000).toISOString()};
 const earlier={...departure,tripId:'earlier',tripHeadsign:'Bålsta',predictedDeparture:new Date(now+60000).toISOString()};
 const result=prepareRegionalPublication({proof:{status:'route_matched',departures:[later,earlier]},enabled:true,now});
 assert.equal(result.status,'ready');
 assert.deepEqual(result.departures.map(x=>x.tripId),['earlier','later']);
 assert.deepEqual(result.departures.map(x=>x.destination),['Bålsta','Kungsängen']);
});

test('publication exposes verified arrival only if chronologically valid',()=>{
 const arrival=new Date(now+1500000).toISOString();
 const withArrival=predictedArrival=>prepareRegionalPublication({proof:{...proof,departures:[{...departure,predictedArrival}]},enabled:true,now}).departures[0];
 assert.equal(withArrival(arrival).predictedArrival,arrival);
 assert.equal(withArrival(new Date(now+1000).toISOString()).predictedArrival,null);
 assert.equal(withArrival('invalid').predictedArrival,null);
 assert.equal(withArrival(undefined).predictedArrival,null);
});

test('publication reports only allowlisted non-sensitive proof failure categories',()=>{
 assert.equal(prepareRegionalPublication({proof:{status:'unavailable',reason:'station_ids_not_in_snapshot',departures:[]},enabled:true,now}).reason,'station_ids_not_in_snapshot');
 assert.equal(prepareRegionalPublication({proof:{status:'unavailable',reason:'secret-key=https://private.example',departures:[]},enabled:true,now}).reason,'no_verified_route');
});

test('actual GTFS-RT proof failures are preserved without leaking arbitrary text',()=>{
 for(const reason of ['no_verified_updates','stale_or_missing_feed']){
  assert.equal(prepareRegionalPublication({proof:{status:'unavailable',reason,departures:[]},enabled:true,now}).reason,reason);
 }
});
