import test from 'node:test';
import assert from 'node:assert/strict';
import {extractGTFSRealtimeTripEvidence} from './commutevue-gtfsrt-trip-evidence.js';
import {GTFSRealtimeDecodeError} from './commutevue-gtfsrt-inspect.js';
const field=(n,p)=>[n*8+2,p.length,...p];
const v=(n,value)=>[n*8,value];
const ascii=s=>[...new TextEncoder().encode(s)];
const header=field(1,field(1,ascii('2.0')));
const descriptor=field(1,field(1,ascii('trip-42')));
const departure=field(3,[...v(1,120),...v(2,60)]);
const stop=field(2,[...field(4,ascii('Jordbro-stop')),...departure]);
const update=field(3,[...descriptor,...stop]);
const entity=field(2,[...field(1,ascii('e1')),...update]);
const bytes=Uint8Array.from([...header,...entity]);
test('extracts trip and stop update evidence without verifying a journey',()=>{
 const data=extractGTFSRealtimeTripEvidence(bytes);
 assert.equal(data.status,'trip_evidence_unverified');
 assert.deepEqual(data.trips,[{tripId:'trip-42',stops:[{stopId:'Jordbro-stop',arrival:null,departure:{delaySeconds:120,unixTime:60}}]}]);
});
test('fails closed when stop cap is exceeded',()=>assert.throws(()=>extractGTFSRealtimeTripEvidence(bytes,{maxStops:0}),GTFSRealtimeDecodeError));
test('fails closed on malformed input',()=>assert.throws(()=>extractGTFSRealtimeTripEvidence(Uint8Array.from([1,2,3])),GTFSRealtimeDecodeError));

const encodeVarint=value=>{let n=BigInt.asUintN(64,BigInt(value));const out=[];while(n>=128n){out.push(Number(n&127n)|128);n>>=7n;}out.push(Number(n));return out;};
const wireVarint=(n,value)=>[n*8,...encodeVarint(value)];
test('extracts feed timestamp and negative signed int32 delay',()=>{
 const stampedHeader=field(1,[...field(1,ascii('2.0')),...wireVarint(3,1795250000)]);
 const earlyDeparture=field(3,[...wireVarint(1,-45),...wireVarint(2,1795250060)]);
 const earlyStop=field(2,[...field(4,ascii('Jordbro-stop')),...earlyDeparture]);
 const earlyUpdate=field(3,[...descriptor,...earlyStop]);
 const earlyEntity=field(2,[...field(1,ascii('e1')),...earlyUpdate]);
 const data=extractGTFSRealtimeTripEvidence(Uint8Array.from([...stampedHeader,...earlyEntity]));
 assert.equal(data.feedTimestampMs,1795250000000);
 assert.equal(data.trips[0].stops[0].departure.delaySeconds,-45);
 assert.equal(data.trips[0].stops[0].departure.unixTime,1795250060);
});

test('never treats GTFS-RT cancelled or deleted trips as active departures',()=>{
 for(const relationship of [3,7]){
  const cancelledDescriptor=field(1,[...field(1,ascii('trip-42')),...wireVarint(4,relationship)]);
  const cancelledUpdate=field(3,[...cancelledDescriptor,...stop]);
  const cancelledEntity=field(2,[...field(1,ascii('e1')),...cancelledUpdate]);
  const data=extractGTFSRealtimeTripEvidence(Uint8Array.from([...header,...cancelledEntity]));
  assert.deepEqual(data.trips,[]);
 }
});
test('excludes skipped and no-data stop updates while retaining valid stops',()=>{
 for(const relationship of [1,2]){
  const ignoredStop=field(2,[...field(4,ascii('Jordbro-stop')),...wireVarint(5,relationship),...departure]);
  const validStop=field(2,[...field(4,ascii('next-stop')),...departure]);
  const updateWithSkipped=field(3,[...descriptor,...ignoredStop,...validStop]);
  const entityWithSkipped=field(2,[...field(1,ascii('e1')),...updateWithSkipped]);
  const data=extractGTFSRealtimeTripEvidence(Uint8Array.from([...header,...entityWithSkipped]));
  assert.equal(data.trips.length,1);
  assert.deepEqual(data.trips[0].stops.map(x=>x.stopId),['next-stop']);
 }
});
