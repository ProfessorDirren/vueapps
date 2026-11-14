import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareLocalVideoAssessment} from './video-analysis-pipeline.js';
test('local video assessment rejects missing consent and invalid files without touching video',async()=>{
 const video={get duration(){throw Error('Must not read video without consent')}};
 assert.deepEqual(await prepareLocalVideoAssessment({video,file:{type:'video/mp4',size:1024}}),{ok:false,reason:'consent_required'});
 assert.deepEqual(await prepareLocalVideoAssessment({video,file:{type:'image/png',size:1024},consent:true}),{ok:false,reason:'unsupported_type'});
});
test('local video assessment respects an aborted signal before reading frames',async()=>{
 const controller=new AbortController();controller.abort();
 assert.deepEqual(await prepareLocalVideoAssessment({file:{type:'video/mp4',size:1024},consent:true,signal:controller.signal}),{ok:false,reason:'aborted'});
});
test('local video assessment never claims remote analysis when extraction fails',async()=>{
 const result=await prepareLocalVideoAssessment({video:{duration:0},file:{type:'video/mp4',size:1024},consent:true});
 assert.deepEqual(result,{ok:false,reason:'frame_extraction_failed'});
});
