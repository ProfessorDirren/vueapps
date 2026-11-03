import test from 'node:test';
import assert from 'node:assert/strict';
import {AniVueDomain} from './anivue.js';
import {LANGUAGES} from './index.js';

test('horse temperature above 39.5 C prompts immediate veterinarian guidance in every language',()=>{
 const domain=new AniVueDomain();
 for(const language of LANGUAGES){
  for(const description of ['Horse temperature 39.6°C','Temp 40,2 ° C','Fever 40 degrees C']){
   const assessment=domain.emergencyCheck({species:'horse',description,language});
   assert.equal(assessment?.severity,'emergency',language+' '+description);
  }
 }
});

test('39.5 C threshold is strict, and unsupported units are not misread',()=>{
 const domain=new AniVueDomain();
 for(const description of ['Temperature 39.5°C','Temperature 39,4°C','Temperature 103.5°F','Horse weighs 40 kg']){
  assert.equal(domain.emergencyCheck({species:'horse',description}),null,description);
 }
 assert.equal(domain.emergencyCheck({species:'dog',description:'Temperature 40°C'}),null);
});

test('horse fever detection does not affect established colic and breathing emergencies',()=>{
 const domain=new AniVueDomain();
 assert.equal(domain.emergencyCheck({species:'horse',symptoms:['horseColic']}).severity,'emergency');
 assert.equal(domain.emergencyCheck({species:'cat',symptoms:['breathing']}).severity,'emergency');
});
