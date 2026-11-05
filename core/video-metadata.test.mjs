import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVideoMetadata,MAX_VIDEO_DURATION_SECONDS,MAX_VIDEO_DIMENSION,probeVideoMetadata} from './video-metadata.js';
test('metadata bounds reject oversized, corrupt and non-finite videos',()=>{
 assert.deepEqual(validateVideoMetadata({duration:30,videoWidth:1920,videoHeight:1080}),{ok:true,reason:'valid'});
 assert.equal(validateVideoMetadata({duration:MAX_VIDEO_DURATION_SECONDS,videoWidth:MAX_VIDEO_DIMENSION,videoHeight:1080}).ok,true);
 for(const duration of [0,-1,NaN,Infinity,MAX_VIDEO_DURATION_SECONDS+1])assert.equal(validateVideoMetadata({duration,videoWidth:1920,videoHeight:1080}).reason,'duration');
 for(const width of [0,-1,1.2,NaN,MAX_VIDEO_DIMENSION+1])assert.equal(validateVideoMetadata({duration:20,videoWidth:width,videoHeight:1080}).reason,'dimensions');
});
test('metadata probe fails closed for missing video',async()=>{assert.equal((await probeVideoMetadata(null)).reason,'unsupported');});

test('metadata probe accepts already-loaded metadata without waiting',async()=>{
 const video={duration:12,videoWidth:1280,videoHeight:720,readyState:1,addEventListener(){},removeEventListener(){}};
 assert.equal((await probeVideoMetadata(video,{timeoutMs:20})).ok,true);
});
test('metadata probe times out safely and removes listeners',async()=>{
 const listeners=new Map();
 const video={readyState:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
 assert.deepEqual(await probeVideoMetadata(video,{timeoutMs:1}),{ok:false,reason:'timeout'});
 assert.equal(listeners.size,0);
});
test('metadata decode error rejects and cleans up',async()=>{
 const listeners=new Map();
 const video={readyState:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
 const pending=probeVideoMetadata(video,{timeoutMs:100});
 listeners.get('error')();
 assert.deepEqual(await pending,{ok:false,reason:'decode'});
 assert.equal(listeners.size,0);
});

test('metadata probe aborts immediately and releases event listeners',async()=>{
 const listeners=new Map(),controller=new AbortController();
 const video={readyState:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
 const pending=probeVideoMetadata(video,{signal:controller.signal,timeoutMs:10000});
 controller.abort();
 assert.deepEqual(await pending,{ok:false,reason:'aborted'});
 assert.equal(listeners.size,0);
});
