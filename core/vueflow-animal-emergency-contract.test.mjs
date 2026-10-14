import test from 'node:test';
import assert from 'node:assert/strict';
import {VueFlow,LANGUAGES} from './index.js';
import {AniVueDomain,HORSE_EMERGENCY_IDS} from './anivue.js';

const oversized=[{kind:'image',file:{type:'image/jpeg',size:20*1024*1024}}];

test('VUECORE real horse emergency identifiers bypass invalid media in all languages',async()=>{
 for(const symptom of HORSE_EMERGENCY_IDS){
  for(const language of LANGUAGES){
   const result=await new VueFlow(new AniVueDomain()).run({
    category:'horse',symptoms:[symptom],language,media:oversized
   });
   assert.equal(result.assessment.severity,'emergency',symptom+'/'+language);
   assert.equal(result.source,'safety-rule',symptom+'/'+language);
   assert.equal(result.mediaAnalyzed,false,symptom+'/'+language);
   assert.ok(result.assessment.summary.trim(),symptom+'/'+language);
  }
 }
});

test('VUECORE real companion breathing emergency bypasses invalid media',async()=>{
 for(const category of ['dog','cat']){
  const result=await new VueFlow(new AniVueDomain()).run({
   category,symptoms:['breathing'],media:oversized
  });
  assert.equal(result.assessment.severity,'emergency',category);
  assert.equal(result.source,'safety-rule',category);
 }
});

test('VUECORE non-emergency horse path still validates uploaded media',async()=>{
 await assert.rejects(new VueFlow(new AniVueDomain()).run({
  category:'horse',symptoms:['horseOther'],media:oversized
 }),error=>error.code==='too_large');
});
