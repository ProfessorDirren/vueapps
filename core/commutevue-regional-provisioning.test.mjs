import test from 'node:test';
import assert from 'node:assert/strict';
import {regionalCorridorProvisioning} from './commutevue-regional-provisioning.js';
const valid={envelope:'{"version":1}',originStopIds:new Set(['J2','J1']),destinationStopIds:new Set(['C1']),selectedTripCount:1};
test('offline manifest encodes signed artifact and deterministic same-archive IDs',()=>{
 const m=regionalCorridorProvisioning(valid);
 assert.equal(Buffer.from(m.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,'base64').toString('utf8'),valid.envelope);
 assert.equal(m.COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS,'J1,J2');
 assert.equal(m.COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS,'C1');
 assert.equal(Object.keys(m).length,3);
});
test('rejects empty corridor, invalid stations, overlap and oversized artifact',()=>{
 const cases=[
 {...valid,selectedTripCount:0},
 {...valid,originStopIds:new Set(['J 1'])},
 {...valid,destinationStopIds:new Set(['J1'])},
 {...valid,originStopIds:new Set()},
 {...valid,envelope:'x'.repeat(16*1024+1)}
 ];
 for(const c of cases)assert.throws(()=>regionalCorridorProvisioning(c));
});
