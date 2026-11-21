import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPrivateRegionalLiveJoin} from './commutevue-private-live-join-smoke.mjs';
test('manual live smoke rejects missing keys and mappings without fetching',async()=>{
 let calls=0;
 const source={tripUpdates:async()=>{calls++;throw Error('should not fetch');}};
 await assert.rejects(()=>verifyPrivateRegionalLiveJoin({source}),/Missing private/);
 await assert.rejects(()=>verifyPrivateRegionalLiveJoin({source,manifest:{},signingKey:'x'.repeat(32),realtimeKey:'abc'}),/Missing station/);
 assert.equal(calls,0);
});
test('manual live smoke fails closed on malformed signed envelope',async()=>{
 const result=await verifyPrivateRegionalLiveJoin({
  manifest:{COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:'J',COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:'C',COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64:'not-base64'},
  signingKey:'s'.repeat(32),realtimeKey:'secret-private',
  source:{tripUpdates:async()=>({bytes:new Uint8Array([1,2,3])})}
 });
 assert.equal(result.status,'unavailable');
 assert.equal(result.verifiedDepartureCount,0);
 assert.equal(JSON.stringify(result).includes('secret-private'),false);
});
