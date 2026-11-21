import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRegionalSnapshot} from './commutevue-regional-snapshot-codec.js';
import {signRegionalSnapshot,verifySignedRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
const now=1763718000000,day='20261121';
const key='an-example-server-only-signing-key-with-at-least-32-bytes';
const payload=encodeRegionalSnapshot({status:'validated',serviceDate:day,validatedAtMs:now-1000,tripStops:new Map([['trip-1',['origin','destination']]])},{allowedTripIds:new Set(['trip-1'])});

test('authenticated snapshot verifies exact payload and expected service day',()=>{
 const signed=signRegionalSnapshot(payload,{key});
 const verified=verifySignedRegionalSnapshot(signed,{key,now,expectedServiceDate:day});
 assert.equal(verified.status,'validated');
 assert.deepEqual(verified.tripStops.get('trip-1'),['origin','destination']);
 assert.equal(signed.includes(key),false);
});

test('snapshot authentication rejects altered payload, signature and wrong key',()=>{
 const signed=signRegionalSnapshot(payload,{key});
 const modified=JSON.parse(signed);
 modified.payload=modified.payload.replace('destination','elsewhere');
 for(const envelope of [JSON.stringify(modified),signed.replace(/"signature":"[a-f0-9]/,'"signature":"0'),'{broken']){
  const result=verifySignedRegionalSnapshot(envelope,{key,now,expectedServiceDate:day});
  assert.equal(result.status,'unavailable');
 }
 assert.equal(verifySignedRegionalSnapshot(signed,{key:key+'-wrong',now,expectedServiceDate:day}).status,'unavailable');
});

test('snapshot authentication rejects stale day, stale timestamp and short keys',()=>{
 const signed=signRegionalSnapshot(payload,{key});
 assert.equal(verifySignedRegionalSnapshot(signed,{key,now,expectedServiceDate:'20261122'}).status,'unavailable');
 assert.equal(verifySignedRegionalSnapshot(signed,{key,now:now+25*3600000,expectedServiceDate:day}).status,'unavailable');
 assert.equal(verifySignedRegionalSnapshot(signed,{key:'short',now,expectedServiceDate:day}).status,'unavailable');
 assert.throws(()=>signRegionalSnapshot(payload,{key:'short'}));
});
