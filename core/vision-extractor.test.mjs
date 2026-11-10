import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisionExtractor} from './vision-extractor.js';
test('shared CORE vision gate blocks model call when quota unavailable',async()=>{
 let calls=0;
 const extract=createVisionExtractor({allow:async()=>false,run:async()=>{calls++;return '{}'},parse:JSON.parse});
 await assert.rejects(()=>extract({image:'fixture'}),/budget unavailable/);
 assert.equal(calls,0);
});
test('shared CORE vision adapter supports specialist-specific parsing without changing CORE',async()=>{
 let calls=0;
 const extract=createVisionExtractor({allow:async()=>true,run:async({language})=>{calls++;return JSON.stringify({station:'Jordbro',language})},parse:JSON.parse});
 const evidence=await extract({image:'fixture',language:'sv'});
 assert.deepEqual(evidence,{station:'Jordbro',language:'sv'});
 assert.equal(calls,1);
});
test('invalid CORE vision configuration is rejected before execution',()=>{
 assert.throws(()=>createVisionExtractor({allow:()=>true,run:()=>{},parse:JSON.parse,timeoutMs:90000}));
});
