import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRegionalSnapshot} from './commutevue-regional-snapshot-codec.js';
import {signRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
import {loadRegionalSnapshotFromEnvironment} from './commutevue-regional-runtime-artifact.js';
const now=1763718000000,day='20261121',key='test-only-signing-secret-that-is-long-enough';
const payload=encodeRegionalSnapshot({status:'validated',serviceDate:day,validatedAtMs:now-1000,tripStops:new Map([['trip-1',['stop-1','stop-2']]])},{allowedTripIds:new Set(['trip-1'])});
const encodedEnvelope=Buffer.from(signRegionalSnapshot(payload,{key}),'utf8').toString('base64');
test('runtime loads only authenticated bounded signed artifacts',()=>{
 const result=loadRegionalSnapshotFromEnvironment({encodedEnvelope,signingKey:key,expectedServiceDate:day,now});
 assert.equal(result.status,'validated');
 assert.deepEqual(result.tripStops.get('trip-1'),['stop-1','stop-2']);
});
test('runtime rejects malformed, oversized, stale and unsigned artifacts',()=>{
 const cases=[
 {encodedEnvelope:'%%%'},
 {encodedEnvelope:'A'.repeat(25000)},
 {encodedEnvelope:Buffer.from(payload).toString('base64')},
 {encodedEnvelope,signingKey:'bad'},
 {encodedEnvelope,expectedServiceDate:'20261122'},
 {encodedEnvelope,now:now+25*3600000}
 ];
 for(const overrides of cases){
  const result=loadRegionalSnapshotFromEnvironment({encodedEnvelope,signingKey:key,expectedServiceDate:day,now,...overrides});
  assert.equal(result.status,'unavailable');
 }
});
