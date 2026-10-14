import test from 'node:test';
import assert from 'node:assert/strict';
import {VueDomain,VueFlow,normalizeAssessment,VueCoreError,validateMedia} from './index.js';

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

test('VUECORE waits for asynchronous emergency gate before assessing',async()=>{
 const domain=new SafetyDomain();
 domain.emergencyCheck=async()=>{await Promise.resolve();return {severity:'emergency',summary:'Immediate help required.'}};
 const result=await new VueFlow(domain).run({media:invalidMedia});
 assert.equal(result.assessment.severity,'emergency');
 assert.equal(domain.assessCalls,0);
});
test('VUECORE rejects non-emergency severity returned by emergency gate',async()=>{
 const domain=new SafetyDomain();
 domain.emergencyCheck=()=>({severity:'monitor',summary:'Incorrect emergency severity.'});
 await assert.rejects(new VueFlow(domain).run({symptoms:['emergency']}),error=>error instanceof VueCoreError&&error.code==='invalid_emergency');
 assert.equal(domain.assessCalls,0);
});

test('VUECORE rejects non-finite media sizes in shared validator',()=>{
 for(const size of [NaN,Infinity,-Infinity]){
  const result=validateMedia({type:'image/png',size},'image');
  assert.equal(result.ok,false);
  assert.equal(result.code,'invalid_file');
 }
});

test('VUECORE rejects empty or malformed video MIME subtypes',()=>{
 for(const type of ['video/','video/ ','video/;codecs=abc']){
  const result=validateMedia({type,size:1024},'video');
  assert.equal(result.ok,false,type);
  assert.equal(result.code,'unsupported_type');
 }
 assert.equal(validateMedia({type:'video/mp4',size:1024},'video').ok,true);
});

test('VUECORE requires safe integer byte sizes',()=>{
 for(const size of [0.5,1024.25,Number.MAX_SAFE_INTEGER+1]){
  const result=validateMedia({type:'image/png',size},'image');
  assert.equal(result.ok,false,String(size));
  assert.equal(result.code,'invalid_file');
 }
 assert.equal(validateMedia({type:'image/png',size:1024},'image').ok,true);
});

test('VUECORE normalized assessment arrays cannot be mutated after validation',()=>{
 const original={severity:'monitor',summary:' Example ',observations:['visible'],recommendations:['observe'],followUpQuestions:['when?'],limitations:['not a diagnosis']};
 const result=normalizeAssessment(original);
 assert.equal(result.summary,'Example');
 for(const key of ['observations','recommendations','followUpQuestions','limitations']){
  assert.ok(Object.isFrozen(result[key]),key);
  assert.throws(()=>result[key].push('injected'),TypeError,key);
 }
 original.observations.push('later');
 assert.deepEqual(result.observations,['visible']);
});

test('VUECORE rejects malformed domain media capability declarations',()=>{
 for(const capabilities of [null,[],false,'image',{imageAnalysis:'true'},{videoAnalysis:1}]){
  assert.throws(()=>new VueDomain({id:'bad-domain',capabilities}),error=>error instanceof VueCoreError&&error.code==='invalid_capabilities');
 }
 const domain=new VueDomain({id:'valid-domain',capabilities:{imageAnalysis:true,videoAnalysis:false}});
 assert.equal(domain.capabilities.imageAnalysis,true);
 assert.equal(domain.capabilities.videoAnalysis,false);
 assert.ok(Object.isFrozen(domain.capabilities));
});

test('VUECORE protects flow input arrays from domain adapter mutation',async()=>{
 const domain=new SafetyDomain();
 domain.emergencyCheck=({symptoms,media})=>{
  assert.ok(Object.isFrozen(symptoms));
  assert.ok(Object.isFrozen(media));
  assert.throws(()=>symptoms.push('emergency'),TypeError);
  assert.throws(()=>media.push({kind:'image'}),TypeError);
  return null;
 };
 const symptoms=['ordinary'];
 const media=[];
 const result=await new VueFlow(domain).run({symptoms,media});
 assert.equal(result.source,'domain');
 assert.deepEqual(symptoms,['ordinary']);
 assert.deepEqual(media,[]);
 assert.equal(domain.assessCalls,1);
});
