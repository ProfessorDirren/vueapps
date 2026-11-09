import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_SAMPLE_COUNT,videoSampleTimes} from './video-frames.js';
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
