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
