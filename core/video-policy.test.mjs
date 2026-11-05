import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_POLICY,videoAnalysisDecision} from './video-policy.js';
const valid={type:'video/mp4',size:1024};
test('VUECORE video analysis and uploads are disabled by default',()=>{
 assert.equal(VIDEO_POLICY.analysisEnabled,false);
 assert.equal(VIDEO_POLICY.uploadEnabled,false);
 assert.equal(VIDEO_POLICY.maxSampleFrames,0);
 assert.deepEqual(videoAnalysisDecision({file:valid,consent:true}),{allowed:false,reason:'analysis_disabled'});
});
test('shared policy validates before any future provider can be called',()=>{
 assert.equal(videoAnalysisDecision({}).reason,'missing_video');
 assert.equal(videoAnalysisDecision({file:{type:'image/png',size:1024},consent:true}).reason,'unsupported_type');
 assert.equal(videoAnalysisDecision({file:{type:'video/mp4',size:VIDEO_POLICY.maxBytes+1},consent:true}).reason,'invalid_size');
 assert.equal(videoAnalysisDecision({file:valid}).reason,'consent_required');
});
