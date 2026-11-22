import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRealtimeJourney} from './commutevue-realtime-itinerary-guard.js';
const a={serviceId:'SJ-123',from:'Stockholm C',to:'Göteborg C',departure:'2026-11-23T07:00',arrival:'2026-11-23T10:20',mode:'TRAIN'};
const deadline={cutoff:'2026-11-23T10:30'};
const trip={legs:[a]};
const evidence=overrides=>[{...a,verified:true,estimatedDeparture:'2026-11-23T07:00',estimatedArrival:'2026-11-23T10:20',...overrides}];
test('verified punctual arrival satisfies deadline',()=>assert.equal(assessRealtimeJourney(trip,evidence(),{arriveBy:deadline}).status,'on_time'));
test('verified delay beyond arrival deadline is rejected',()=>assert.equal(assessRealtimeJourney(trip,evidence({estimatedArrival:'2026-11-23T10:45'}),{arriveBy:deadline}).status,'arrival_deadline_missed'));
test('verified cancellation blocks itinerary',()=>assert.equal(assessRealtimeJourney(trip,evidence({cancelled:true}),{arriveBy:deadline}).status,'cancelled'));
test('missing or mismatched identity is not treated as verified',()=>{
 assert.equal(assessRealtimeJourney(trip,[],{arriveBy:deadline}).status,'unverified');
 assert.equal(assessRealtimeJourney(trip,evidence({serviceId:'SJ-999'}),{arriveBy:deadline}).status,'unverified');
 assert.equal(assessRealtimeJourney(trip,evidence({verified:false}),{arriveBy:deadline}).status,'unverified');
 assert.equal(assessRealtimeJourney(trip,[...evidence(),...evidence()],{arriveBy:deadline}).status,'unverified');
});
test('late incoming service misses its next connection',()=>{
 const second={serviceId:'SJ-456',from:'Göteborg C',to:'Mölndal',departure:'2026-11-23T10:25',arrival:'2026-11-23T10:35',mode:'TRAIN'};
 const result=assessRealtimeJourney({legs:[a,second]},[...evidence({estimatedArrival:'2026-11-23T10:30'}),{...second,verified:true}],{});
 assert.equal(result.status,'connection_at_risk');
});
test('walking connection cannot be assumed to absorb a delay',()=>{
 const walk={from:'Göteborg C',to:'Göteborg C spår 4',departure:'2026-11-23T10:21',arrival:'2026-11-23T10:26',mode:'WALK'};
 assert.equal(assessRealtimeJourney({legs:[a,walk]},evidence({estimatedArrival:'2026-11-23T10:24'})).status,'connection_at_risk');
});
test('unverified train never becomes realtime-verified just because walking is planned',()=>{
 const walk={from:'Göteborg C',to:'Göteborg C spår 4',departure:'2026-11-23T10:21',arrival:'2026-11-23T10:26',mode:'WALK'};
 assert.equal(assessRealtimeJourney({legs:[a,walk]},[]).status,'unverified');
});
