import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyStationCandidates} from './commutevue-provider-station-verification.js';
const candidates=[{resRobotName:'Jordbro',trafikverketSignature:'J'},{resRobotName:'Stockholm City',trafikverketSignature:'Sci'}];
const provider={station:async name=>({'Jordbro':'J','Stockholm City':'Sci'})[name]};
test('independent exact provider station lookup verifies crosswalk candidates',async()=>{
 const verified=await verifyStationCandidates(candidates,provider);
 assert.deepEqual(verified,candidates.map(x=>({...x,verified:true})));
});
test('forged verified flag cannot override provider mismatch',async()=>{
 assert.equal(await verifyStationCandidates([{...candidates[0],verified:true,trafikverketSignature:'Wrong'}],provider),null);
});
test('missing, ambiguous, duplicate or failed provider lookup fails closed',async()=>{
 assert.equal(await verifyStationCandidates(candidates,{station:async()=>{throw Error('ambiguous_station')}}),null);
 assert.equal(await verifyStationCandidates([...candidates,candidates[0]],provider),null);
 assert.equal(await verifyStationCandidates(candidates,{station:async()=>null}),null);
 assert.equal(await verifyStationCandidates(candidates,null),null);
 assert.equal(await verifyStationCandidates([],provider),null);
});
test('fuzzy aliases are never silently accepted',async()=>{
 assert.equal(await verifyStationCandidates([{resRobotName:'Stockholm C',trafikverketSignature:'Cst'}],provider),null);
});
