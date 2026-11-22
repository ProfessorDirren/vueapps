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
 const result=assessRealtimeJourney({legs:[a,second]},[...evidence({estimatedArrival:'2026-11-23T10:30'}),{...second,verified:true,estimatedDeparture:'2026-11-23T10:25',estimatedArrival:'2026-11-23T10:35'}],{});
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
test('verified train identity without an arrival forecast is still unverified',()=>{
 assert.equal(assessRealtimeJourney(trip,[{...a,verified:true}],{arriveBy:deadline}).status,'unverified');
});

test('verified cancellation outranks downstream missed walking transfer',()=>{
 const walk={from:'Göteborg C',to:'Göteborg C spår 4',departure:'2026-11-23T10:21',arrival:'2026-11-23T10:26',mode:'WALK'};
 assert.equal(assessRealtimeJourney({legs:[a,walk]},evidence({cancelled:true})).status,'cancelled');
});
test('duplicate or unverified cancellation is never promoted to verified',()=>{
 assert.equal(assessRealtimeJourney(trip,[...evidence({cancelled:true}),...evidence({cancelled:true})]).status,'unverified');
 assert.equal(assessRealtimeJourney(trip,evidence({cancelled:true,verified:false})).status,'unverified');
});

test('UTC realtime arrival is compared against Sweden-local arrival deadline',()=>{
 const result=assessRealtimeJourney(trip,evidence({estimatedDeparture:'2026-11-23T06:00:00.000Z',estimatedArrival:'2026-11-23T09:45:00.000Z'}),{arriveBy:deadline});
 assert.equal(result.status,'arrival_deadline_missed');
});
test('UTC realtime punctual forecast is not mistaken for an hour early',()=>{
 const result=assessRealtimeJourney(trip,evidence({estimatedDeparture:'2026-11-23T06:00:00.000Z',estimatedArrival:'2026-11-23T09:20:00.000Z'}),{arriveBy:deadline});
 assert.equal(result.status,'on_time');
});
test('ambiguous Stockholm winter-time departure fails closed',()=>{
 const ambiguous={...a,departure:'2026-10-25T02:30',arrival:'2026-10-25T03:30'};
 assert.equal(assessRealtimeJourney({legs:[ambiguous]},[{...ambiguous,verified:true,cancelled:false,estimatedArrival:'2026-10-25T02:30:00Z'}]).status,'unverified');
});

test('connecting train with no departure forecast is not claimed realtime-verified',()=>{
 const second={serviceId:'SJ-456',from:'Göteborg C',to:'Mölndal',departure:'2026-11-23T10:25',arrival:'2026-11-23T10:35',mode:'TRAIN'};
 const result=assessRealtimeJourney({legs:[a,second]},[...evidence(),{...second,verified:true,estimatedArrival:'2026-11-23T10:35'}]);
 assert.equal(result.status,'unverified');
});
