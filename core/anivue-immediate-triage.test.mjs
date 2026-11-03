import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AniVueDomain,HORSE_EMERGENCY_IDS} from './anivue.js';

const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
test('native ANIVUE renders an assertive immediate triage region',()=>{
 assert.match(page,/id="immediate-triage" role="alert" aria-live="assertive"/);
 assert.match(page,/symptom'\)\.addEventListener\('change',showImmediateTriage\)/);
 assert.match(page,/function showImmediateTriage\(\)/);
 assert.match(page,/showImmediateTriage\(\);\}/);
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
 assert.match(page,/\['horseHighFever','Measured fever >39\.5°C'\]/);
 for(const label of ['Measured fever >39.5°C','Fiebre medida >39,5 °C','Uppmätt feber >39,5 °C','मापा गया तापमान >39.5°C','实测体温 >39.5°C','Измеренная температура >39,5 °C','حرارة مقاسة أعلى من 39.5°م'])assert.ok(page.includes(label),label);
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar'])assert.equal(new AniVueDomain().emergencyCheck({species:'horse',symptoms:['horseHighFever'],language})?.severity,'emergency');
});

test('dog and cat collapse and severe bleeding trigger immediate triage in all seven languages',()=>{
 const domain=new AniVueDomain();
 for(const species of ['dog','cat'])for(const language of ['en','es','sv','hi','zh-CN','ru','ar'])for(const symptom of ['collapse','severeBleeding']){
  assert.equal(domain.emergencyCheck({species,symptoms:[symptom],language})?.severity,'emergency',species+' '+language+' '+symptom);
 }
 for(const label of ['Collapse / unconscious','Colapso / inconsciente','Kollaps / medvetslös','गिरना / बेहोशी','倒地 / 失去意识','Коллапс / без сознания','انهيار / فقدان الوعي'])assert.ok(page.includes(label),label);
 assert.match(page,/const companionTranslations=/);
});
