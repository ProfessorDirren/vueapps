import test from 'node:test';
import assert from 'node:assert/strict';
import {VueDomain,VueFlow} from './index.js';
import {AniVueDomain} from './anivue.js';
test('ANIVUE adapter inherits VUECORE VueDomain and runs through VueFlow',async()=>{
 const domain=new AniVueDomain();
 assert.ok(domain instanceof VueDomain);
 const flow=new VueFlow(domain);
 const emergency=await flow.run({description:'Mi perro tiene dificultad para respirar',language:'es'});
 assert.equal(emergency.assessment.severity,'emergency');
 assert.equal(emergency.source,'safety-rule');
 assert.match(emergency.assessment.summary,/veterinaria/);
 const routine=await flow.run({description:'My dog is scratching',language:'en'});
 assert.equal(routine.source,'domain');
 assert.equal(routine.assessment.severity,'monitor');
});

test('ANIVUE VueFlow emergency-first gate covers collapse and severe bleeding in supported locales',async()=>{const flow=new VueFlow(new AniVueDomain());for(const [language,description] of [['en','My dog collapsed'],['sv','Min katt har kraftig blödning'],['es','Mi perro tiene hemorragia grave'],['ar','قطتي تعاني من نزيف شديد'],['zh-CN','我的狗严重出血'],['ru','Собака без сознания'],['hi','मेरा कुत्ता बेहोश']]){const result=await flow.run({language,description});assert.equal(result.source,'safety-rule',language);assert.equal(result.assessment.severity,'emergency',language)}});
