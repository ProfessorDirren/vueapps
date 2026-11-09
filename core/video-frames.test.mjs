import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_SAMPLE_COUNT,videoSampleTimes,captureVideoFrames} from './video-frames.js';
test('three bounded representative video samples',()=>{
 assert.equal(VIDEO_SAMPLE_COUNT,3);
 assert.deepEqual(videoSampleTimes(20),[5,10,15]);
 assert.deepEqual(videoSampleTimes(120),[30,60,90]);
 assert.deepEqual(videoSampleTimes(12,1),[6]);
});
test('invalid or excessive sampling fails closed',()=>{
 for(const duration of [0,-1,121,Infinity,NaN])assert.throws(()=>videoSampleTimes(duration));
 for(const count of [0,4,1.5])assert.throws(()=>videoSampleTimes(10,count));
});

test('captures exactly three local frames without network or upload',async()=>{
 const oldDocument=globalThis.document;
 const drawn=[];
 globalThis.document={createElement:()=>({
  width:0,height:0,
  getContext:()=>({drawImage:(_video,_x,_y,w,h)=>drawn.push([w,h])}),
  toDataURL:()=> 'data:image/jpeg;base64,'+'A'.repeat(128)
 })};
 const listeners=new Map();
 const video={
  duration:20,videoWidth:1920,videoHeight:1080,
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},
  removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn),
  set currentTime(value){this._time=value;queueMicrotask(()=>{for(const fn of [...(listeners.get('seeked')||[])])fn()})}
 };
 try{
  const frames=await captureVideoFrames(video);
  assert.deepEqual(frames.map(f=>f.time),[5,10,15]);
  assert.equal(frames.length,3);
  assert.deepEqual(drawn,[[960,540],[960,540],[960,540]]);
  assert.ok(frames.every(f=>f.image.startsWith('data:image/jpeg;base64,')));
 }finally{globalThis.document=oldDocument}
});
test('aborted video extraction fails before capturing any frames',async()=>{
 const controller=new AbortController();controller.abort();
 const video={duration:20,videoWidth:1920,videoHeight:1080};
 await assert.rejects(captureVideoFrames(video,{signal:controller.signal}),/Cancelled|document is not defined/);
});
