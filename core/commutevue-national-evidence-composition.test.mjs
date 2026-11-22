import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNationalTrainEvidence} from './commutevue-national-evidence-composition.js';
const leg={serviceId:'43',from:'Jordbro',to:'Stockholm City',departure:'2026-11-23T10:00:00',arrival:'2026-11-23T10:25:00',mode:'JST'};
const stationCandidates=[{resRobotName:'Jordbro',resRobotStopId:'A=740000001@',trafikverketSignature:'J',verified:false},{resRobotName:'Stockholm City',resRobotStopId:'A=740000002@',trafikverketSignature:'Sci',verified:false}];
const trafikverket={station:async name=>({'Jordbro':'J','Stockholm City':'Sci'})[name]};
const departure={train:'43',advertisedTime:'2026-11-23T10:00:00+01:00',destinationArrival:'2026-11-23T10:25:00+01:00',estimatedTime:'2026-11-23T10:03:00+01:00',estimatedDestinationArrival:'2026-11-23T10:27:00+01:00'};
const probe=async()=>({status:'matched',originSignature:'J',destinationSignature:'Sci',departures:[departure]});
const options={stationCandidates,trafikverket,probe};
test('independent exact station lookup and train forecast can compose evidence',async()=>{
 const result=await composeNationalTrainEvidence(leg,options);
 assert.equal(result?.verified,true);
 assert.equal(result?.estimatedArrival,departure.estimatedDestinationArrival);
});
test('provider station mismatch never certifies evidence',async()=>{
 const result=await composeNationalTrainEvidence(leg,{...options,trafikverket:{station:async()=> 'WRONG'}});
 assert.equal(result,null);
});
test('ambiguous station candidates fail before provider probe',async()=>{
 const result=await composeNationalTrainEvidence(leg,{...options,stationCandidates:[...stationCandidates,stationCandidates[0]]});
 assert.equal(result,null);
});
test('provider route mismatch and missing destination forecast fail closed',async()=>{
 assert.equal(await composeNationalTrainEvidence(leg,{...options,probe:async()=>({...await probe(),destinationSignature:'Wrong'})}),null);
 assert.equal(await composeNationalTrainEvidence(leg,{...options,probe:async()=>({...await probe(),departures:[{...departure,estimatedDestinationArrival:null}]})}),null);
});
test('provider failures and unsupported train identity fail closed',async()=>{
 assert.equal(await composeNationalTrainEvidence(leg,{...options,probe:async()=>{throw Error('network')}}),null);
 assert.equal(await composeNationalTrainEvidence({...leg,serviceId:null},options),null);
});
