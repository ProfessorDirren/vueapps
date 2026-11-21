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
