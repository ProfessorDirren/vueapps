import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareVideoEvidence} from './video-evidence.js';
const image='data:image/jpeg;base64,/9j/'+'A'.repeat(40);
const frames=[{time:5,image},{time:10,image},{time:15,image}];
test('three frames only after explicit public consent',()=>{
 assert.deepEqual(prepareVideoEvidence(frames).reason,'consent_required');
 assert.deepEqual(prepareVideoEvidence(frames,{consent:true}),{ok:true,images:[image,image,image]});
});
test('reject malformed, excessive, and out-of-order evidence',()=>{
 for(const candidate of [frames.slice(0,2),[...frames,frames[0]],[frames[1],frames[0],frames[2]],frames.map((f,i)=>({...f,image:i===1?'data:image/png;base64,AAAA':image})),frames.map((f,i)=>({...f,image:i===1?'data:image/jpeg;base64,'+'A'.repeat(44):image})),frames.map((f,i)=>({...f,image:i===1?image+'A'.repeat(700000):image}))]){
  assert.equal(prepareVideoEvidence(candidate,{consent:true}).ok,false);
 }
});

test('reject aggregate evidence exceeding 1.8 MB even when each frame is individually allowed',()=>{
 const oversized='data:image/jpeg;base64,/9j/'+'A'.repeat(640000);
 const largeFrames=frames.map(frame=>({...frame,image:oversized}));
 assert.deepEqual(prepareVideoEvidence(largeFrames,{consent:true}),{ok:false,reason:'evidence_too_large'});
});
