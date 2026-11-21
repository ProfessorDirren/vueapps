import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRegionalSnapshot} from './commutevue-regional-snapshot-codec.js';
import {signRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
import {matchSignedRegionalRealtimeJourney} from './commutevue-regional-signed-join.js';
const now=1763718000000,serviceDate='20261121',signingKey='test-only-server-secret-which-is-long-enough';
const payload=encodeRegionalSnapshot({status:'validated',serviceDate,validatedAtMs:now-1000,tripStops:new Map([['trip-A',['J','X','C']],['trip-B',['C','X','J']]])},{allowedTripIds:new Set(['trip-A','trip-B'])});
const signedSnapshot=signRegionalSnapshot(payload,{key:signingKey});
const evidence={status:'trip_evidence_unverified',feedTimestampMs:now-10000,trips:[{tripId:'trip-A',stops:[{stopId:'J',departure:{unixTime:Math.floor((now+600000)/1000)}}]}]};
const originStopIds=new Set(['J']),destinationStopIds=new Set(['C']);
const args={signedSnapshot,signingKey,serviceDate,evidence,originStopIds,destinationStopIds,now};
test('signed regional snapshot and fresh GTFS-RT evidence produce a proven journey',()=>{
 const result=matchSignedRegionalRealtimeJourney(args);
 assert.equal(result.status,'route_matched');
 assert.equal(result.departures.length,1);
 assert.equal(result.departures[0].tripId,'trip-A');
});
test('signed join rejects wrong day, wrong key, tampering and stale evidence',()=>{
 const failures=[
 {...args,serviceDate:'20261122'},
 {...args,signingKey:signingKey+'different'},
 {...args,signedSnapshot:signedSnapshot.replace('trip-A','trip-Z')},
 {...args,evidence:{...evidence,feedTimestampMs:now-180000}},
 {...args,evidence:{...evidence,trips:[{tripId:'trip-B',stops:[{stopId:'C',departure:{unixTime:Math.floor((now+600000)/1000)}}]}]}},
 {...args,originStopIds:new Set()},
 ];
 for(const input of failures){
  const result=matchSignedRegionalRealtimeJourney(input);
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.departures,[]);
 }
});
