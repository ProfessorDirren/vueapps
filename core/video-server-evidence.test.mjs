import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVideoEvidence} from './video-server-evidence.js';
const image='data:image/jpeg;base64,/9j/'+'A'.repeat(40);
const frames=[{time:1,image},{time:2,image},{time:3,image}];
test('server video evidence rejects missing consent and malformed frames',()=>{
 assert.equal(validateVideoEvidence(frames).reason,'consent_required');
 assert.equal(validateVideoEvidence(null,{consent:true}).ok,false);
 assert.equal(validateVideoEvidence(frames.slice(0,2),{consent:true}).ok,false);
 assert.equal(validateVideoEvidence(frames.map(f=>({...f,image:'data:image/jpeg;base64,'+'A'.repeat(44)})),{consent:true}).ok,false);
});
test('server video evidence accepts exactly three consented ordered JPEG frames',()=>{
 assert.deepEqual(validateVideoEvidence(frames,{consent:true}),{ok:true,images:[image,image,image]});
});
