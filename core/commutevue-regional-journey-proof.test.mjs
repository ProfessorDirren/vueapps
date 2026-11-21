import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRegionalJourney} from './commutevue-regional-journey-proof.js';
const now=1763718000000;
const input={evidence:{status:'trip_evidence_unverified',feedTimestampMs:now-20000,trips:[{tripId:'trip-1',stops:[{stopId:'J',departure:{unixTime:Math.floor(now/1000)+300}}]}]},tripStops:new Map([['trip-1',['J','S','C']]]),originStopIds:new Set(['J']),destinationStopIds:new Set(['C']),now};
test('requires static route order and fresh feed timestamp',()=>{
 const result=verifyRegionalJourney(input);
 assert.equal(result.status,'route_matched');
 assert.equal(result.departures[0].destinationStopId,'C');
});
test('rejects reversed route',()=>assert.equal(verifyRegionalJourney({...input,tripStops:new Map([['trip-1',['C','S','J']]])}).status,'unavailable'));
test('rejects unknown regional static trip',()=>assert.equal(verifyRegionalJourney({...input,tripStops:new Map()}).status,'unavailable'));
test('rejects stale feed timestamp',()=>assert.equal(verifyRegionalJourney({...input,evidence:{...input.evidence,feedTimestampMs:now-180000}}).status,'unavailable'));
test('rejects missing feed timestamp',()=>assert.equal(verifyRegionalJourney({...input,evidence:{...input.evidence,feedTimestampMs:undefined}}).status,'unavailable'));
test('rejects missing stop mappings',()=>assert.equal(verifyRegionalJourney({...input,originStopIds:undefined}).status,'unavailable'));

test('verifies a fresh SL realtime prediction against timed static GTFS stop objects',()=>{
 const timed=new Map([['trip-1',[{stop:'J',departureTime:'08:54:00',sequence:10},{stop:'S',sequence:11},{stop:'C',arrivalTime:'09:24:00',sequence:19}]]]);
 const result=verifyRegionalJourney({...input,tripStops:timed});
 assert.equal(result.status,'route_matched');
 assert.equal(result.departures[0].originStopId,'J');
 assert.equal(result.departures[0].destinationStopId,'C');
});
test('rejects duplicate trip updates and ambiguous repeated origin stop updates',()=>{
 const trip=input.evidence.trips[0];
 assert.equal(verifyRegionalJourney({...input,evidence:{...input.evidence,trips:[trip,{...trip}]}}).status,'unavailable');
 assert.equal(verifyRegionalJourney({...input,evidence:{...input.evidence,trips:[{...trip,stops:[...trip.stops,...trip.stops]}]}}).status,'unavailable');
});

test('rejects old and distant realtime departures even when feed timestamp is fresh',()=>{
 const withTime=unixTime=>({...input,evidence:{...input.evidence,trips:[{tripId:'trip-1',stops:[{stopId:'J',departure:{unixTime}}]}]}});
 assert.equal(verifyRegionalJourney(withTime(Math.floor((now-180000)/1000))).status,'unavailable');
 assert.equal(verifyRegionalJourney(withTime(Math.floor((now+10800000)/1000))).status,'unavailable');
 assert.equal(verifyRegionalJourney(withTime(Math.floor((now+300000)/1000))).status,'route_matched');
});

test('rejects future-dated SL realtime feed timestamp even if a trip looks valid',()=>{
 const result=verifyRegionalJourney({...input,evidence:{...input.evidence,feedTimestampMs:now+60000}});
 assert.equal(result.status,'unavailable');
 assert.equal(result.reason,'stale_or_missing_feed');
});
test('reports stale SL feed as unavailable before route matching',()=>{
 const result=verifyRegionalJourney({...input,evidence:{...input.evidence,feedTimestampMs:now-180000}});
 assert.equal(result.reason,'stale_or_missing_feed');
 assert.deepEqual(result.departures,[]);
});

test('matches real-shaped SL Regional GTFS IDs only when trip, stop order and prediction agree',()=>{
 const origin='9022001006161002',destination='9022001005310001';
 const tripId='14010000668275260';
 const regional={...input,
  tripStops:new Map([[tripId,[{stop:origin,sequence:2,departureTime:'18:09:00'},{stop:'9022001006161003',sequence:3},{stop:destination,sequence:11,arrivalTime:'18:39:00'}]]]),
  originStopIds:new Set([origin]),
  destinationStopIds:new Set([destination]),
  evidence:{status:'trip_evidence_unverified',feedTimestampMs:now-14000,trips:[{tripId,stops:[{stopId:origin,departure:{unixTime:Math.floor(now/1000)+300}}]}]}
 };
 const matched=verifyRegionalJourney(regional);
 assert.equal(matched.status,'route_matched');
 assert.equal(matched.departures.length,1);
 assert.equal(matched.departures[0].evidence,'regional_trip_update');
 assert.equal(matched.departures[0].destinationStopId,destination);
 assert.equal(verifyRegionalJourney({...regional,tripStops:new Map([[tripId,[{stop:destination},{stop:origin}]]])}).status,'unavailable');
 assert.equal(verifyRegionalJourney({...regional,evidence:{...regional.evidence,trips:[{...regional.evidence.trips[0],tripId:'different-trip'}]}}).status,'unavailable');
 assert.equal(verifyRegionalJourney({...regional,destinationStopIds:new Set(['1617'])}).status,'unavailable');
});

test('attaches scheduled time, route number and terminal destination to verified live departure',()=>{
 const tripStops=new Map([['trip-1',[{stop:'J',departureTime:'17:24:00',sequence:1},{stop:'C',arrivalTime:'17:42:00',sequence:2}]]]);
 const tripMetadata=new Map([['trip-1',{routeShortName:'43',tripHeadsign:'Bålsta'}]]);
 const result=verifyRegionalJourney({...input,tripStops,tripMetadata});
 assert.equal(result.status,'route_matched');
 assert.equal(result.departures[0].scheduledDeparture,'17:24:00');
 assert.equal(result.departures[0].routeShortName,'43');
 assert.equal(result.departures[0].tripHeadsign,'Bålsta');
});

test('keeps Bålsta and Kungsängen as train terminals when Stockholm City is the requested stop',()=>{
 const origin='J',destination='C';
 const tripStops=new Map([
  ['towards-balsta',[{stop:origin,sequence:1},{stop:destination,sequence:2},{stop:'B',sequence:3}]],
  ['towards-kungsangen',[{stop:origin,sequence:1},{stop:destination,sequence:2},{stop:'K',sequence:3}]]
 ]);
 const tripMetadata=new Map([
  ['towards-balsta',{routeShortName:'43',tripHeadsign:'Bålsta'}],
  ['towards-kungsangen',{routeShortName:'43',tripHeadsign:'Kungsängen'}]
 ]);
 const evidence={status:'trip_evidence_unverified',feedTimestampMs:now-10000,trips:[
  {tripId:'towards-balsta',stops:[{stopId:origin,departure:{unixTime:Math.floor(now/1000)+300}}]},
  {tripId:'towards-kungsangen',stops:[{stopId:origin,departure:{unixTime:Math.floor(now/1000)+600}}]}
 ]};
 const result=verifyRegionalJourney({evidence,tripStops,tripMetadata,originStopIds:new Set([origin]),destinationStopIds:new Set([destination]),now});
 assert.equal(result.status,'route_matched');
 assert.deepEqual(result.departures.map(x=>x.tripHeadsign),['Bålsta','Kungsängen']);
 assert.deepEqual(result.departures.map(x=>x.destinationStopId),[destination,destination]);
});
