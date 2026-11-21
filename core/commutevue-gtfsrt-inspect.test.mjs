import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGTFSRealtimeFeed,GTFSRealtimeDecodeError} from './commutevue-gtfsrt-inspect.js';
const field=(n,payload)=>[n*8+2,payload.length,...payload];
const header=field(1,field(1,[50,46,48])); // GTFS-RT version 2.0
const entity=field(2,[...field(1,[116,49]),...field(3,[10,0])]);
test('decodes regional GTFS-RT counts without claiming verified journeys',()=>{
 const result=inspectGTFSRealtimeFeed(Uint8Array.from([...header,...entity]));
 assert.deepEqual(result,{status:'decoded_unverified',entityCount:1,tripUpdateCount:1,vehicleCount:0,alertCount:0});
});
test('rejects truncated protobuf',()=>assert.throws(()=>inspectGTFSRealtimeFeed(Uint8Array.from([10,7,10,3,50])),GTFSRealtimeDecodeError));
test('rejects non-realtime payload',()=>assert.throws(()=>inspectGTFSRealtimeFeed(Uint8Array.from([123,125])),GTFSRealtimeDecodeError));
test('rejects invalid header version',()=>assert.throws(()=>inspectGTFSRealtimeFeed(Uint8Array.from(field(1,field(1,[49,46,48])))),GTFSRealtimeDecodeError));
test('rejects oversized input',()=>assert.throws(()=>inspectGTFSRealtimeFeed(new Uint8Array(8*1024*1024+1)),GTFSRealtimeDecodeError));
