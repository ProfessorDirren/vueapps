import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-router.js';
test('router refuses video frame payloads until expert pipeline is enabled',async()=>{
 for(const payload of [{video_frames:[]},{video_evidence:[]},{video_public:true},{video_url:'https://example.invalid/video.mp4'}]){
  const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,language:'en',question:'Please analyze this video'})}));
  assert.equal(response.status,415);
  const body=await response.json();
  assert.match(body.error,/not yet supported/i);
 }
});
