import test from 'node:test';
import assert from 'node:assert/strict';
import {createStructuredImageRunner} from './structured-image-runner.js';
import {createVisionExtractor} from './vision-extractor.js';
const schema={type:'object',properties:{station:{type:'string'}},required:['station'],additionalProperties:false};
test('CORE structured image runner does not leak credentials into the body',async()=>{
 let called=0;
 const run=createStructuredImageRunner({apiKey:'server-secret',model:'fixture-model',fetcher:async(url,opts)=>{
  called++;
  assert.equal(url,'https://api.openai.com/v1/responses');
  assert.equal(opts.headers.Authorization,'Bearer server-secret');
  assert.equal(opts.body.includes('server-secret'),false);
  const payload=JSON.parse(opts.body);
  assert.equal(payload.store,false);
  assert.equal(payload.text.format.strict,true);
  assert.equal(payload.input[0].content[1].detail,'high');
  return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"station":"Jordbro"}'}]}]})};
 }});
 const extract=createVisionExtractor({allow:async()=>true,run:args=>run({...args,schema,instructions:'Read only visible station text.'}),parse:x=>x});
 assert.deepEqual(await extract({image:'data:image/png;base64,fixture',question:'Which station?',language:'sv'}),{station:'Jordbro'});
 assert.equal(called,1);
});
test('CORE budget gate blocks even a configured structured model runner',async()=>{
 let calls=0;
 const run=createStructuredImageRunner({apiKey:'server-secret',model:'fixture-model',fetcher:async()=>{calls++;throw Error('should not call')}});
 const extract=createVisionExtractor({allow:async()=>false,run:args=>run({...args,schema,instructions:'Read visible text'}),parse:x=>x});
 await assert.rejects(()=>extract({image:'data:image/png;base64,fixture'}));
 assert.equal(calls,0);
});
test('CORE rejects partial, malformed and failed model output',async()=>{
 for(const response of [
  {ok:false},{ok:true,json:async()=>({status:'incomplete'})},
  {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'not-json'}]}]})}
 ]){
  const run=createStructuredImageRunner({apiKey:'server-secret',model:'fixture-model',fetcher:async()=>response});
  await assert.rejects(()=>run({image:'data:image/png;base64,fixture',schema,instructions:'Read station'}));
 }
});
