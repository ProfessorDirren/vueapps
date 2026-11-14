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
 const file={type:'video/mp4',size:1024};
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
  const frames=await captureVideoFrames(video,{consent:true,file});
  assert.deepEqual(frames.map(f=>f.time),[5,10,15]);
  assert.equal(frames.length,3);
  assert.deepEqual(drawn,[[960,540],[960,540],[960,540]]);
  assert.ok(frames.every(f=>f.image.startsWith('data:image/jpeg;base64,')));
 }finally{globalThis.document=oldDocument}
});
test('aborted video extraction fails before capturing any frames',async()=>{
 const controller=new AbortController();controller.abort();
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({drawImage:()=>{throw Error('Must not draw')}})})};
 const video={duration:20,videoWidth:1920,videoHeight:1080};
 try{await assert.rejects(captureVideoFrames(video,{signal:controller.signal,consent:true,file:{type:'video/mp4',size:1024}}),/Cancelled/)}
 finally{globalThis.document=oldDocument}
});

test('seek failure rejects promptly and removes video listeners',async()=>{
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({drawImage:()=>{}})})};
 const listeners=new Map();
 const video={
  duration:12,videoWidth:640,videoHeight:480,
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},
  removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn),
  set currentTime(_value){throw new Error('Video seek failed')}
 };
 try{
  await assert.rejects(captureVideoFrames(video,{consent:true,file:{type:'video/mp4',size:1024}}),/Video seek failed/);
  assert.equal(listeners.get('seeked')?.size,0);
  assert.equal(listeners.get('error')?.size,0);
 }finally{globalThis.document=oldDocument}
});

test('frame capture requires explicit consent and a valid local video file',async()=>{
 const video={duration:10,videoWidth:640,videoHeight:480};
 await assert.rejects(captureVideoFrames(video),/consent required/);
 await assert.rejects(captureVideoFrames(video,{consent:true,file:{type:'video/mp4',size:0}}),/Invalid video file/);
 await assert.rejects(captureVideoFrames(video,{consent:true,file:{type:'image/png',size:100}}),/Invalid video file/);
});
