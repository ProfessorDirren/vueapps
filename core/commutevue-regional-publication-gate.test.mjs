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
 assert.equal(prepareRegionalPublication({proof:{...proof,departures:[stale]},enabled:true,now}).status,'unavailable');
 assert.equal(prepareRegionalPublication({proof:{...proof,departures:[departure,departure]},enabled:true,now}).reason,'duplicate_trip');
});
