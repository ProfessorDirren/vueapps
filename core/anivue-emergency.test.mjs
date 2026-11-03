import test from 'node:test';
import assert from 'node:assert/strict';
import {AniVueDomain,HORSE_EMERGENCY_IDS} from './anivue.js';
import {VueFlow} from './index.js';

test('all standalone horse emergency IDs trigger VUECORE safety gate without AI',async()=>{
 const flow=new VueFlow(new AniVueDomain());
 for(const symptom of HORSE_EMERGENCY_IDS){
  const result=await flow.run({category:'horse',symptoms:[symptom],language:'en'});
  assert.equal(result.assessment.severity,'emergency',symptom);
  assert.equal(result.source,'safety-rule');
  assert.equal(result.mediaAnalyzed,false);
 }
});
test('breathing triggers emergency for dog and cat',async()=>{
 const flow=new VueFlow(new AniVueDomain());
 for(const category of ['dog','cat']){
  const result=await flow.run({category,symptoms:['breathing'],language:'en'});
  assert.equal(result.assessment.severity,'emergency');
 }
});
test('equine emergency guidance remains localized',async()=>{
 const flow=new VueFlow(new AniVueDomain());
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar']){
  const result=await flow.run({category:'horse',symptoms:['horseColic'],language});
  assert.equal(result.assessment.severity,'emergency');
  assert.ok(result.assessment.summary.length>20);
 }
});
test('non-emergency is handled by real specialist assessment',async()=>{
 const flow=new VueFlow(new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>({domain:'anivue',answer:'Veterinary assessment recommended'})})}));
 const result=await flow.run({category:'horse',symptoms:['horseNotEating'],description:'Horse has not eaten today',language:'en'});
 assert.equal(result.source,'domain');
 assert.equal(result.assessment.summary,'Veterinary assessment recommended');
});
