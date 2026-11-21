import test from 'node:test';
import assert from 'node:assert/strict';
import {matchRegionalRealtimeJourney} from './commutevue-regional-provider-core.js';

const now=1763718000000;
const origin='9022001006161002',destination='9022001005310001',tripId='14010000668275260';
const staticSnapshot={status:'validated',validatedAtMs:now-3600000,tripStops:new Map([[tripId,[{stop:origin,sequence:2},{stop:destination,sequence:11}]]])};
const evidence={status:'trip_evidence_unverified',feedTimestampMs:now-14000,trips:[{tripId,stops:[{stopId:origin,departure:{unixTime:Math.floor(now/1000)+300}}]}]};
const input={staticSnapshot,evidence,originStopIds:new Set([origin]),destinationStopIds:new Set([destination]),now};

test('regional provider core joins validated SL static snapshot to fresh GTFS-RT evidence',()=>{
 const result=matchRegionalRealtimeJourney(input);
 assert.equal(result.status,'route_matched');
 assert.equal(result.departures.length,1);
 assert.equal(result.departures[0].evidence,'regional_trip_update');
});

test('regional provider core fails closed without validated or current static snapshot',()=>{
 for(const snapshot of [undefined,{...staticSnapshot,status:'unverified'},{...staticSnapshot,validatedAtMs:now-25*3600000},{...staticSnapshot,validatedAtMs:now+1000}]){
  const result=matchRegionalRealtimeJourney({...input,staticSnapshot:snapshot});
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.departures,[]);
 }
});

test('regional provider core rejects mismatched IDs, missing stops and stale realtime',()=>{
 const mismatched={...evidence,trips:[{...evidence.trips[0],tripId:'unrelated'}]};
 for(const options of [
  {evidence:mismatched},
  {destinationStopIds:new Set(['1617'])},
  {originStopIds:new Set()},
  {evidence:{...evidence,feedTimestampMs:now-180000}},
 ]){
  const result=matchRegionalRealtimeJourney({...input,...options});
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.departures,[]);
 }
});
