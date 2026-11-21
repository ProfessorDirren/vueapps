import test from 'node:test';
import assert from 'node:assert/strict';
import {signRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
import {regionalCorridorProvisioning} from './commutevue-regional-provisioning.js';
import {loadRegionalSnapshotFromEnvironment} from './commutevue-regional-runtime-artifact.js';

test('compresses a signed corridor larger than 16KiB and verifies after decompression',()=>{
 const key='s'.repeat(64),now=Date.now(),serviceDate='20261121';
 const trips=Array.from({length:180},(_,i)=>['trip'+i,['J','S'+i,'C',...Array.from({length:16},(_,j)=>'S'+j)]]);
 const payload=JSON.stringify({version:1,serviceDate,validatedAtMs:now,trips});
 const envelope=signRegionalSnapshot(payload,{key});
 assert.ok(Buffer.byteLength(envelope)>16384);
 const config=regionalCorridorProvisioning({envelope,originStopIds:new Set(['J']),destinationStopIds:new Set(['C']),selectedTripCount:trips.length});
 const snapshot=loadRegionalSnapshotFromEnvironment({encodedEnvelope:config.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,signingKey:key,expectedServiceDate:serviceDate,now});
 assert.equal(snapshot.status,'validated');
 assert.equal(snapshot.tripStops.size,180);
});
test('rejects invalid compressed artifact without throwing',()=>{
 const result=loadRegionalSnapshotFromEnvironment({encodedEnvelope:Buffer.from([31,139,8,0,1,2]).toString('base64'),signingKey:'s'.repeat(64),expectedServiceDate:'20261121'});
 assert.equal(result.status,'unavailable');
});
