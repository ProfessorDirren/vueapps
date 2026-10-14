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
