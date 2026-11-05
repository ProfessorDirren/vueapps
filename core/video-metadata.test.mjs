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
