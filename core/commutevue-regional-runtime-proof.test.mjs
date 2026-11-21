import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRegionalSnapshot} from './commutevue-regional-snapshot-codec.js';
import {signRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
import {matchProvisionedRegionalJourney} from './commutevue-regional-runtime-proof.js';
const now=1763718000000,serviceDate='20261121',signingKey='test-only-key-for-regional-snapshots-123';
const snapshot={status:'validated',serviceDate,validatedAtMs:now-1000,tripStops:new Map([['forward',['J','X','C']],['reverse',['C','X','J']]])};
const payload=encodeRegionalSnapshot(snapshot,{allowedTripIds:new Set(['forward','reverse'])});
const encodedEnvelope=Buffer.from(signRegionalSnapshot(payload,{key:signingKey})).toString('base64');
const evidence={status:'trip_evidence_unverified',feedTimestampMs:now-10000,trips:[{tripId:'forward',stops:[{stopId:'J',departure:{unixTime:Math.floor((now+600000)/1000)}}]}]};
const args={encodedEnvelope,signingKey,serviceDate,originStopIds:new Set(['J']),destinationStopIds:new Set(['C']),evidence,now};
test('provisioned authenticated corridor matches fresh forward regional departure',()=>{
 const result=matchProvisionedRegionalJourney(args);
 assert.equal(result.status,'route_matched');
 assert.equal(result.departures[0].tripId,'forward');
});
test('runtime proof rejects missing, tampered, stale and mismatched inputs',()=>{
 const cases=[
 {encodedEnvelope:undefined},
 {encodedEnvelope:encodedEnvelope.slice(0,-4)+'AAAA'},
 {signingKey:'wrong-key'},
 {serviceDate:'20261122'},
 {now:now+25*3600000},
 {originStopIds:new Set(['UNKNOWN'])},
 {destinationStopIds:new Set()},
 {evidence:{...evidence,feedTimestampMs:now-300000}},
 {evidence:{...evidence,trips:[{tripId:'reverse',stops:[{stopId:'C',departure:{unixTime:Math.floor((now+600000)/1000)}}]}]}}
 ];
 for(const overrides of cases){
  const result=matchProvisionedRegionalJourney({...args,...overrides});
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.departures,[]);
 }
});

test('regional journey proof accepts authenticated file and rejects tampered file even with valid env fallback',()=>{
 const dir=mkdtempSync(join(tmpdir(),'commutvue-proof-')),filePath=join(dir,'snapshot.json');
 try{
  writeFileSync(filePath,Buffer.from(encodedEnvelope,'base64'));
  const result=matchProvisionedRegionalJourney({...args,filePath,encodedEnvelope:undefined});
  assert.equal(result.status,'route_matched');
  writeFileSync(filePath,'tampered');
  const bad=matchProvisionedRegionalJourney({...args,filePath});
  assert.equal(bad.status,'unavailable');
  assert.deepEqual(bad.departures,[]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
