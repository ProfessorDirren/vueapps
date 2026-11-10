import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AniVueDomain,HORSE_EMERGENCY_IDS} from './anivue.js';

const page=readFileSync(new URL('../api/vue-router.js',import.meta.url),'utf8');
test('shared ANIVUE performs emergency triage before image classification',()=>{
 assert.ok(page.indexOf("if(route.domain==='anivue'&&urgent")<page.indexOf('classifyImage(b.image,question)'));
});
test('every horse emergency ID triggers immediate advice in every supported language',()=>{
 const domain=new AniVueDomain();
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar']){
  for(const symptom of HORSE_EMERGENCY_IDS){
   const advice=domain.emergencyCheck({species:'horse',symptoms:[symptom],language});
   assert.equal(advice.severity,'emergency',language+': '+symptom);
   assert.ok(advice.summary.length>20);
  }
 }
});
test('routine horse symptoms do not trigger the emergency alert',()=>{
 assert.equal(new AniVueDomain().emergencyCheck({species:'horse',symptoms:['horseOther']}),null);
});

test('horse high fever has a localized selectable symptom and immediate emergency guidance',()=>{


 for(const language of ['en','es','sv','hi','zh-CN','ru','ar'])assert.equal(new AniVueDomain().emergencyCheck({species:'horse',symptoms:['horseHighFever'],language})?.severity,'emergency');
});

test('dog and cat collapse and severe bleeding trigger immediate triage in all seven languages',()=>{
 const domain=new AniVueDomain();
 for(const species of ['dog','cat'])for(const language of ['en','es','sv','hi','zh-CN','ru','ar'])for(const symptom of ['collapse','severeBleeding']){
  assert.equal(domain.emergencyCheck({species,symptoms:[symptom],language})?.severity,'emergency',species+' '+language+' '+symptom);
 }

});
