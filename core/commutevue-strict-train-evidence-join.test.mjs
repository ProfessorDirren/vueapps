import test from 'node:test';
import assert from 'node:assert/strict';
import {joinNationalTrainEvidence} from './commutevue-strict-train-evidence-join.js';
const leg={serviceId:'1234',from:'Stockholm Centralstation',to:'Göteborg Centralstation',departure:'2026-11-23T07:00:00',arrival:'2026-11-23T10:20:00',mode:'JST'};
const map={'Stockholm Centralstation':'Cst','Göteborg Centralstation':'G'};
const opts={originSignature:'Cst',destinationSignature:'G',stationMap:map};
const train={train:'1234',advertisedTime:'2026-11-23T07:00:00',destinationArrival:'2026-11-23T10:20:00',estimatedTime:'2026-11-23T07:05:00',estimatedDestinationArrival:'2026-11-23T10:25:00'};
const probe={status:'matched',originSignature:'Cst',destinationSignature:'G',departures:[train]};
test('exact provider and station crosswalk yields a verified forecast',()=>{
 const result=joinNationalTrainEvidence(leg,probe,opts);
 assert.equal(result.verified,true);
 assert.equal(result.estimatedArrival,'2026-11-23T10:25:00');
});
test('missing destination forecast remains unverified even with matching train number',()=>{
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,estimatedDestinationArrival:null}]},opts),null);
});
test('wrong service, wrong date, ambiguous records, wrong stations and no crosswalk fail closed',()=>{
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,train:'9999'}]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,advertisedTime:'2026-11-24T07:00:00'}]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[train,train]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,probe,{...opts,stationMap:{}}),null);
 assert.equal(joinNationalTrainEvidence(leg,probe,{...opts,destinationSignature:'X'}),null);
 assert.equal(joinNationalTrainEvidence({...leg,serviceId:null},probe,opts),null);
});
test('planned destination arrival must agree with the national itinerary',()=>{
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,destinationArrival:'2026-11-23T10:50:00'}]},opts),null);
});

test('Trafikverket ISO UTC arrival forecast and departure match local ResRobot times only when instants agree',()=>{
 const utc={...train,advertisedTime:'2026-11-23T06:00:00.000Z',destinationArrival:'2026-11-23T09:20:00.000Z',estimatedDestinationArrival:'2026-11-23T09:25:00.000Z'};
 // Without a verified timezone conversion, local ResRobot times must not silently match UTC.
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[utc]},opts),null);
 const offset={...train,advertisedTime:'2026-11-23T07:00:00+01:00',destinationArrival:'2026-11-23T10:20:00+01:00',estimatedDestinationArrival:'2026-11-23T10:25:00+01:00'};
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[offset]},opts),null);
});
