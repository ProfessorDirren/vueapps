import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVueActivation,prepareVueActivation,FACTORY_LANGUAGES} from './vuefactory.js';
const labels=Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,'Martial arts '+l]));
const questions=Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,['Which martial art do you practice?','What is your training experience so far?','What would you like to improve in training?']]));
const valid={id:'trainingvue',scope:'Educational martial arts training advice',method:'Provide educational guidance about martial arts training with safe practice, supervision, appropriate equipment, and careful attention to injury prevention.',labels,routingKeywords:['training techniques','martial training'],questions};
test('activation requires seven languages and produces no deployment',()=>{
 const result=validateVueActivation(valid);
 assert.equal(result.automaticDeployment,false);
 assert.deepEqual(Object.keys(result.questions),FACTORY_LANGUAGES);
});
test('activation rejects missing translations',()=>{
 const copy={...valid,questions:{...questions}};
 delete copy.questions.ar;
 assert.throws(()=>validateVueActivation(copy),/ar/);
});
test('activation rejects duplicate questions',()=>{
 const copy={...valid,questions:{...questions,sv:[questions.sv[0],questions.sv[0],questions.sv[2]]}};
 assert.throws(()=>validateVueActivation(copy),/Duplicate/);
});
test('activation rejects registered ID and routing collisions',()=>{
 assert.throws(()=>validateVueActivation(valid,['trainingvue']),/already registered/);
 assert.throws(()=>validateVueActivation(valid,[],['martial training']),/collision/);
});

test('activation manifest includes real VUECORE edit targets but never applies them',()=>{
 const plan=prepareVueActivation(valid);
 assert.equal(plan.specialist,'trainingvue');
 assert.equal(plan.automaticApply,false);
 assert.equal(plan.productionReady,false);
 assert.deepEqual(plan.edits.map(e=>e.file),['core/specialists.js','core/specialists.js','core/router.js']);
 assert.deepEqual(plan.edits[1].value,questions);
});
