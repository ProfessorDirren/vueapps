import test from 'node:test';
import assert from 'node:assert/strict';
import {probeProvisionedRegionalJourney} from './commutevue-regional-shadow-proof.js';
test('shadow verifier fails closed without configuration and does not fetch',async()=>{
 let calls=0;
 const source={tripUpdates:async()=>{calls++;return {bytes:new Uint8Array([1])};}};
 const result=await probeProvisionedRegionalJourney({source});
 assert.deepEqual(result,{status:'unavailable',reason:'missing_configuration',verifiedDepartureCount:0});
 assert.equal(calls,0);
});
test('shadow verifier fails closed on invalid provider bytes without exposing secrets',async()=>{
 const result=await probeProvisionedRegionalJourney({
  source:{tripUpdates:async()=>({bytes:new Uint8Array([1,2,3])})},
  encodedEnvelope:'not-a-snapshot',signingKey:'secret-secret-secret-secret-secret-1234',serviceDate:'20261121',
  originStopIds:new Set(['J']),destinationStopIds:new Set(['C'])
 });
 assert.equal(result.status,'unavailable');
 assert.equal(result.verifiedDepartureCount,0);
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('shadow verifier rejects missing source or non-byte payload',async()=>{
 const common={encodedEnvelope:'x',signingKey:'a',serviceDate:'20261121',originStopIds:new Set(['J']),destinationStopIds:new Set(['C'])};
 assert.equal((await probeProvisionedRegionalJourney(common)).reason,'missing_source');
 assert.equal((await probeProvisionedRegionalJourney({...common,source:{tripUpdates:async()=>({bytes:'not-bytes'})}})).reason,'invalid_feed');
});
