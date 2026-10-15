import test from 'node:test';
import assert from 'node:assert/strict';
import {VueFlow} from './index.js';
import {AniVueDomain,HORSE_EMERGENCY_IDS} from './anivue.js';

const languages=['en','es','sv','hi','zh-CN','ru','ar'];
for(const language of languages){
 test('equine emergency rules run through VUECORE in '+language,async()=>{
  const flow=new VueFlow(new AniVueDomain());
  for(const symptom of HORSE_EMERGENCY_IDS){
   const result=await flow.run({species:'horse',symptoms:[symptom],language});
   assert.equal(result.source,'safety-rule',symptom);
   assert.equal(result.assessment.severity,'emergency',symptom);
   assert.equal(result.mediaAnalyzed,false);
   assert.ok(result.assessment.summary.length>20);
  }
 });
}
test('horse emergencies take priority over invalid photo uploads',async()=>{
 const flow=new VueFlow(new AniVueDomain());
 const result=await flow.run({species:'horse',symptoms:['horseColic'],media:[{kind:'image',file:{type:'image/png',size:99999999}}]});
 assert.equal(result.assessment.severity,'emergency');
 assert.equal(result.source,'safety-rule');
});
test('non-emergency horse symptom does not claim immediate emergency',async()=>{
 const result=await new VueFlow(new AniVueDomain()).run({species:'horse',symptoms:['horseOther']});
 assert.equal(result.source,'domain');
 assert.equal(result.assessment.severity,'monitor');
});
test('companion animal breathing emergency still takes priority',async()=>{
 for(const species of ['dog','cat']){
  const result=await new VueFlow(new AniVueDomain()).run({species,symptoms:['breathing']});
  assert.equal(result.assessment.severity,'emergency');
 }
});
