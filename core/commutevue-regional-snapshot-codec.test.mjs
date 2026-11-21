import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRegionalSnapshot,decodeRegionalSnapshot} from './commutevue-regional-snapshot-codec.js';
const now=1763718000000,date='20261121';
const snapshot={status:'validated',serviceDate:date,validatedAtMs:now-1000,tripStops:new Map([['trip-1',['stop-1','stop-2']],['trip-2',['stop-3','stop-4']]])};
test('regional codec only exports explicitly selected trips and round trips',()=>{
 const encoded=encodeRegionalSnapshot(snapshot,{allowedTripIds:new Set(['trip-1'])});
 const decoded=decodeRegionalSnapshot(encoded,{now,expectedServiceDate:date});
 assert.equal(decoded.status,'validated');
 assert.deepEqual([...decoded.tripStops], [['trip-1',['stop-1','stop-2']]]);
 assert.ok(!encoded.includes('stop-3'));
});
test('regional codec fails closed on stale, wrong day, duplicates and malformed stop IDs',()=>{
 const encoded=encodeRegionalSnapshot(snapshot,{allowedTripIds:new Set(['trip-1'])});
 assert.equal(decodeRegionalSnapshot(encoded,{now,expectedServiceDate:'20261122'}).status,'unavailable');
 assert.equal(decodeRegionalSnapshot(encoded,{now:now+25*3600000,expectedServiceDate:date}).status,'unavailable');
 assert.equal(decodeRegionalSnapshot(JSON.stringify({version:1,serviceDate:date,validatedAtMs:now-1000,trips:[['x',['a','b']],['x',['a','b']]]}),{now,expectedServiceDate:date}).status,'unavailable');
 assert.equal(decodeRegionalSnapshot(JSON.stringify({version:1,serviceDate:date,validatedAtMs:now-1000,trips:[['x',['a','bad stop']]]}),{now,expectedServiceDate:date}).status,'unavailable');
 assert.equal(decodeRegionalSnapshot('{broken',{now,expectedServiceDate:date}).status,'unavailable');
});
test('regional codec refuses unverified input and empty selections',()=>{
 assert.throws(()=>encodeRegionalSnapshot({...snapshot,status:'unavailable'},{allowedTripIds:new Set(['trip-1'])}));
 assert.throws(()=>encodeRegionalSnapshot(snapshot,{allowedTripIds:new Set(['missing'])}));
});

test('regional codec retains GTFS scheduled arrival and departure times',()=>{
 const timed={status:'validated',serviceDate:date,validatedAtMs:now-1000,tripStops:new Map([['timed-trip',[
  {stop:'stop-1',arrivalTime:'17:24:00',departureTime:'17:25:00',sequence:4},
  {stop:'stop-2',arrivalTime:'17:58:00',departureTime:'17:58:00',sequence:9}
 ]]])};
 const encoded=encodeRegionalSnapshot(timed,{allowedTripIds:new Set(['timed-trip'])});
 const decoded=decodeRegionalSnapshot(encoded,{now,expectedServiceDate:date});
 assert.equal(decoded.status,'validated');
 assert.deepEqual(decoded.tripStops.get('timed-trip'),[
  {stop:'stop-1',arrivalTime:'17:24:00',departureTime:'17:25:00',sequence:4},
  {stop:'stop-2',arrivalTime:'17:58:00',departureTime:'17:58:00',sequence:9}
 ]);
});
test('regional codec rejects malformed GTFS times',()=>{
 const timed={...snapshot,tripStops:new Map([['bad-time',[{stop:'stop-1',arrivalTime:'25:99:00',departureTime:null},{stop:'stop-2'}]]])};
 assert.throws(()=>encodeRegionalSnapshot(timed,{allowedTripIds:new Set(['bad-time'])}));
});

test('signed regional snapshot retains route number and final destination labels',()=>{
 const timed={status:'validated',serviceDate:date,validatedAtMs:now-1000,
  tripStops:new Map([['trip-balta',[{stop:'J',arrivalTime:null,departureTime:'17:24:00',sequence:1},{stop:'C',arrivalTime:'17:40:00',departureTime:'17:41:00',sequence:2}]],['trip-kungsangen',[{stop:'J',arrivalTime:null,departureTime:'17:39:00',sequence:1},{stop:'C',arrivalTime:'17:55:00',departureTime:'17:56:00',sequence:2}]]]),
  tripMetadata:new Map([['trip-balta',{routeShortName:'43',tripHeadsign:'Bålsta'}],['trip-kungsangen',{routeShortName:'43',tripHeadsign:'Kungsängen'}]])
 };
 const encoded=encodeRegionalSnapshot(timed,{allowedTripIds:new Set(['trip-balta','trip-kungsangen'])});
 const decoded=decodeRegionalSnapshot(encoded,{now,expectedServiceDate:date});
 assert.deepEqual(decoded.tripMetadata.get('trip-balta'),{routeShortName:'43',routeLongName:null,tripHeadsign:'Bålsta',tripShortName:null});
 assert.deepEqual(decoded.tripMetadata.get('trip-kungsangen'),{routeShortName:'43',routeLongName:null,tripHeadsign:'Kungsängen',tripShortName:null});
});
