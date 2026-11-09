import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-followup.js';
const base={domain:'anivue',question:'Please assess the animal in this clip',language:'en'};
async function send(extra){
 return POST(new Request('https://localhost/api/vue-followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,...extra})}));
}
test('specialist rejects video without consent before model or budget call',async()=>{
 const response=await send({video_frames:[{time:1,image:'invalid'}],video_public:false});
 assert.equal(response.status,400);
});
test('specialist rejects malformed video frames before model or budget call',async()=>{
 const response=await send({video_frames:[{time:1,image:'invalid'}],video_public:true});
 assert.equal(response.status,400);
});
test('specialist rejects simultaneous photo and video',async()=>{
 const response=await send({video_frames:[],video_public:true,image:'invalid',image_public:true});
 assert.equal(response.status,400);
});
