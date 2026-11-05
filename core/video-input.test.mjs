import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_LIMIT_BYTES,VIDEO_MIME_TYPES,VIDEO_LABELS,isValidVideo,videoBlocksSubmission} from './video-input.js';
test('video input shared limits and supported formats',()=>{
 assert.equal(VIDEO_LIMIT_BYTES,50*1024*1024);
 for(const type of VIDEO_MIME_TYPES)assert.equal(isValidVideo({type,size:1024}),true);
 for(const size of [0,-1,VIDEO_LIMIT_BYTES+1])assert.equal(isValidVideo({type:'video/mp4',size}),false);
 assert.equal(isValidVideo({type:'image/png',size:1024}),false);
 assert.equal(isValidVideo(null),false);
 assert.equal(isValidVideo({type:'video/mp4',size:VIDEO_LIMIT_BYTES}),true);
 assert.equal(isValidVideo({type:'video/mp4',size:NaN}),false);
 assert.equal(isValidVideo({type:'video/mp4',size:Infinity}),false);
 assert.equal(isValidVideo({type:'video/mp4',size:1.5}),false);
 assert.equal(isValidVideo({type:'video/mp4',size:'1024'}),false);
});
test('video controls localized across all seven VUECORE languages',()=>{
 assert.deepEqual(Object.keys(VIDEO_LABELS).sort(),['en','es','sv','hi','zh-CN','ru','ar'].sort());
 for(const labels of Object.values(VIDEO_LABELS)){assert.equal(labels.length,6);assert.ok(labels.every(s=>typeof s==='string'&&s.trim().length>0));}
});

test('video selection blocks misleading text-only AI submission',()=>{assert.equal(videoBlocksSubmission(true),true);assert.equal(videoBlocksSubmission(false),false);});
