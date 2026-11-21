import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRegionalStopIds,stockholmRegionalDay,runRegionalRouterShadow,runRegionalRouterPublication} from './commutevue-regional-router-shadow.js';
test('stop IDs require bounded, exact, unique identifiers',()=>{
 assert.deepEqual([...parseRegionalStopIds('A,B_2')],['A','B_2']);
 for(const x of ['',',A','A,A','A,','a b','a/'.repeat(2000)])assert.equal(parseRegionalStopIds(x),null);
});
test('Stockholm service day follows local date across UTC midnight',()=>{
 assert.equal(stockholmRegionalDay(Date.parse('2026-11-20T23:30:00Z')),'20261121');
 assert.equal(stockholmRegionalDay(Date.parse('2026-07-20T22:30:00Z')),'20260721');
});
test('router shadow never fetches when disabled, wrong corridor or missing configuration',async()=>{
 let calls=0;const source={tripUpdates:async()=>{calls++;throw Error('unexpected request');}};
 const cases=[
 {env:{},from:'Jordbro',to:'Stockholm City'},
 {env:{COMMUTVUE_REGIONAL_SHADOW_ENABLED:'true'},from:'Jordbro',to:'T-Centralen'},
 {env:{COMMUTVUE_REGIONAL_SHADOW_ENABLED:'true'},from:'Jordbro',to:'Stockholm City'}
 ];
 for(const c of cases){
  const result=await runRegionalRouterShadow({...c,source});
  assert.equal(result.status,'unavailable');
  assert.equal(result.verifiedDepartureCount,0);
 }
 assert.equal(calls,0);
});
test('router shadow never exposes credentials on upstream failure',async()=>{
 const env={COMMUTVUE_REGIONAL_SHADOW_ENABLED:'true',COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:'J',COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:'C',COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64:'opaque',COMMUTEVUE_SNAPSHOT_SIGNING_KEY:'secret-key-should-not-appear',TRAFIKLAB_REGIONAL_REALTIME_KEY:'private-key-should-not-appear'};
 const result=await runRegionalRouterShadow({env,from:'Jordbro',to:'Stockholm City',source:{tripUpdates:async()=>{throw Error('private-key-should-not-appear');}}});
 assert.equal(result.status,'unavailable');
 assert.equal(JSON.stringify(result).includes('private-key'),false);
 assert.equal(JSON.stringify(result).includes('secret-key'),false);
});

test('router shadow rejects malformed and duplicate station IDs before network access',async()=>{
 let calls=0;
 const source={tripUpdates:async()=>{calls++;return {bytes:new Uint8Array([1])};}};
 const base={COMMUTVUE_REGIONAL_SHADOW_ENABLED:'true',COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:'C',COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64:'opaque',COMMUTEVUE_SNAPSHOT_SIGNING_KEY:'key',TRAFIKLAB_REGIONAL_REALTIME_KEY:'private'};
 for(const invalid of ['J,J','J/../../secret','',',J']){
  const result=await runRegionalRouterShadow({env:{...base,COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:invalid},from:'Jordbro',to:'Stockholm City',source});
  assert.equal(result.reason,'missing_configuration');
 }
 assert.equal(calls,0);
});

test('regional publication adapter is disabled by default and never fetches',async()=>{
 let calls=0;
 const source={tripUpdates:async()=>{calls++;throw Error('must not fetch');}};
 const result=await runRegionalRouterPublication({env:{},from:'Jordbro',to:'Stockholm City',source});
 assert.equal(result.reason,'publication_disabled');
 assert.deepEqual(result.departures,[]);
 assert.equal(calls,0);
});
test('regional publication adapter rejects unsupported corridor before network',async()=>{
 let calls=0;
 const source={tripUpdates:async()=>{calls++;throw Error('must not fetch');}};
 const result=await runRegionalRouterPublication({env:{COMMUTVUE_REGIONAL_PUBLICATION_ENABLED:'true'},from:'Jordbro',to:'T-Centralen',source});
 assert.equal(result.reason,'unsupported_corridor');
 assert.equal(calls,0);
});
test('regional publication adapter never leaks upstream secrets on errors',async()=>{
 const env={COMMUTVUE_REGIONAL_PUBLICATION_ENABLED:'true',COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:'J',COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:'C',COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64:'opaque',COMMUTEVUE_SNAPSHOT_SIGNING_KEY:'secret-key',TRAFIKLAB_REGIONAL_REALTIME_KEY:'private-key'};
 const result=await runRegionalRouterPublication({env,from:'Jordbro',to:'Stockholm City',source:{tripUpdates:async()=>{throw Error('private-key');}}});
 assert.equal(result.status,'unavailable');
 assert.deepEqual(result.departures,[]);
 assert.doesNotMatch(JSON.stringify(result),/private-key|secret-key/);
});

test('regional publication rejects missing or duplicate station IDs without provider requests',async()=>{
 let calls=0;
 const source={tripUpdates:async()=>{calls++;throw Error('unexpected network request');}};
 const base={COMMUTVUE_REGIONAL_PUBLICATION_ENABLED:'true',COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:'J',COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:'C',COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64:'opaque',COMMUTEVUE_SNAPSHOT_SIGNING_KEY:'key',TRAFIKLAB_REGIONAL_REALTIME_KEY:'private'};
 for(const overrides of [{COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:'J,J'},{COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:'C,C'},{COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:''},{COMMUTEVUE_SNAPSHOT_SIGNING_KEY:''},{TRAFIKLAB_REGIONAL_REALTIME_KEY:''}]){
  const result=await runRegionalRouterPublication({env:{...base,...overrides},from:'Jordbro',to:'Stockholm City',source});
  assert.equal(result.status,'unavailable');
  assert.equal(result.reason,'missing_configuration');
  assert.deepEqual(result.departures,[]);
 }
 assert.equal(calls,0);
});
