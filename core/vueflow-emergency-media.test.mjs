import test from 'node:test';
import assert from 'node:assert/strict';
import {VueDomain,VueFlow,normalizeAssessment,VueCoreError} from './index.js';

class SafetyDomain extends VueDomain {
 constructor(){super({id:'safety-test',name:'Safety Test'});this.assessCalls=0}
 emergencyCheck({symptoms=[]}) {
  return symptoms.includes('emergency') ? normalizeAssessment({severity:'emergency',summary:'Seek immediate professional help.'}) : null;
 }
 async assess(){this.assessCalls++;return {severity:'monitor',summary:'Non-emergency response.'}}
}
const invalidMedia=[{kind:'image',file:{type:'image/png',size:20*1024*1024}}];

test('VUECORE emergency takes priority over invalid uploaded media',async()=>{
 const domain=new SafetyDomain();
 const result=await new VueFlow(domain).run({symptoms:['emergency'],media:invalidMedia});
 assert.equal(result.assessment.severity,'emergency');
 assert.equal(result.source,'safety-rule');
 assert.equal(domain.assessCalls,0);
});
test('VUECORE still rejects invalid media on non-emergency path',async()=>{
 const domain=new SafetyDomain();
 await assert.rejects(new VueFlow(domain).run({media:invalidMedia}),error=>error instanceof VueCoreError&&error.code==='too_large');
 assert.equal(domain.assessCalls,0);
});
