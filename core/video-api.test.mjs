import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-router.js';
test('VUECORE refuses video input until a reviewed video analysis pipeline exists',async()=>{
 for(const payload of [{video:'data:video/mp4;base64,AAAA'},{video_url:'https://example.com/video.mp4'},{video_public:true}]){
  const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,question:'Describe this',language:'en'})}));
  assert.equal(response.status,415);
  assert.match((await response.json()).error,/not yet supported/i);
 }
});
