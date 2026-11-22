import test from 'node:test';
import assert from 'node:assert/strict';
import {joinNationalTrainEvidence} from './commutevue-strict-train-evidence-join.js';
const leg={serviceId:'1234',from:'Stockholm Centralstation',to:'Göteborg Centralstation',departure:'2026-11-23T07:00:00',arrival:'2026-11-23T10:20:00',mode:'JST'};
const map={'Stockholm Centralstation':'Cst','Göteborg Centralstation':'G'};
const opts={originSignature:'Cst',destinationSignature:'G',stationMap:map};
const train={train:'1234',advertisedTime:'2026-11-23T06:00:00.000Z',destinationArrival:'2026-11-23T09:20:00.000Z',estimatedTime:'2026-11-23T06:05:00.000Z',estimatedDestinationArrival:'2026-11-23T09:25:00.000Z'};
const probe={status:'matched',originSignature:'Cst',destinationSignature:'G',departures:[train]};
test('exact provider and station crosswalk yields a verified forecast',()=>{
 const result=joinNationalTrainEvidence(leg,probe,opts);
 assert.equal(result.verified,true);
 assert.equal(result.estimatedArrival,'2026-11-23T09:25:00.000Z');
});
test('missing destination forecast remains unverified even with matching train number',()=>{
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,estimatedDestinationArrival:null}]},opts),null);
});
test('wrong service, wrong date, ambiguous records, wrong stations and no crosswalk fail closed',()=>{
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,train:'9999'}]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,advertisedTime:'2026-11-24T06:00:00.000Z'}]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[train,train]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,probe,{...opts,stationMap:{}}),null);
 assert.equal(joinNationalTrainEvidence(leg,probe,{...opts,destinationSignature:'X'}),null);
 assert.equal(joinNationalTrainEvidence({...leg,serviceId:null},probe,opts),null);
});
test('planned destination arrival must agree with the national itinerary',()=>{
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,destinationArrival:'2026-11-23T09:50:00.000Z'}]},opts),null);
});

test('Trafikverket ISO UTC arrival forecast and departure match local ResRobot times only when instants agree',()=>{
 const utc={...train,advertisedTime:'2026-11-23T06:00:00.000Z',destinationArrival:'2026-11-23T09:20:00.000Z',estimatedDestinationArrival:'2026-11-23T09:25:00.000Z'};
 // Correct UTC instant must match the ResRobot local clock through Europe/Stockholm.
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[utc]},opts)?.verified,true);
 const offset={...train,advertisedTime:'2026-11-23T07:00:00+01:00',destinationArrival:'2026-11-23T10:20:00+01:00',estimatedDestinationArrival:'2026-11-23T10:25:00+01:00'};
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[offset]},opts)?.verified,true);
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...offset,advertisedTime:'2026-11-23T07:00:00Z'}]},opts),null);
 assert.equal(joinNationalTrainEvidence(leg,{...probe,departures:[{...train,advertisedTime:'2026-11-23T07:00:00'}]},opts),null);
});

test('ambiguous fall-back hour and nonexistent spring-forward hour fail closed',()=>{
 const autumn={...leg,departure:'2026-10-25T02:30:00',arrival:'2026-10-25T03:30:00'};
 const spring={...leg,departure:'2026-03-29T02:30:00',arrival:'2026-03-29T03:30:00'};
 assert.equal(joinNationalTrainEvidence(autumn,probe,opts),null);
 assert.equal(joinNationalTrainEvidence(spring,probe,opts),null);
});

test('summer CEST train matches provider UTC timestamps two hours behind',()=>{
 const summerLeg={...leg,departure:'2026-07-23T07:00:00',arrival:'2026-07-23T10:20:00'};
 const summerTrain={...train,advertisedTime:'2026-07-23T05:00:00.000Z',destinationArrival:'2026-07-23T08:20:00.000Z',estimatedDestinationArrival:'2026-07-23T08:27:00.000Z'};
 const matched=joinNationalTrainEvidence(summerLeg,{...probe,departures:[summerTrain]},opts);
 assert.equal(matched?.verified,true);
 assert.equal(matched?.estimatedArrival,'2026-07-23T08:27:00.000Z');
});
test('provider departure matching refuses wrong UTC offset in summer',()=>{
 const summerLeg={...leg,departure:'2026-07-23T07:00:00',arrival:'2026-07-23T10:20:00'};
 const wrong={...train,advertisedTime:'2026-07-23T06:00:00.000Z',destinationArrival:'2026-07-23T08:20:00.000Z',estimatedDestinationArrival:'2026-07-23T08:27:00.000Z'};
 assert.equal(joinNationalTrainEvidence(summerLeg,{...probe,departures:[wrong]},opts),null);
});
test('destination mismatch across autumn DST fold is rejected',()=>{
 const foldLeg={...leg,departure:'2026-10-25T01:30:00',arrival:'2026-10-25T02:30:00'};
 const foldTrain={...train,advertisedTime:'2026-10-24T23:30:00.000Z',destinationArrival:'2026-10-25T01:30:00.000Z'};
 assert.equal(joinNationalTrainEvidence(foldLeg,{...probe,departures:[foldTrain]},opts),null);
});
