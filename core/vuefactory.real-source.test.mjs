import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateVueActivation,previewVueCoreSourcePatch,FACTORY_LANGUAGES} from './vuefactory.js';
import {SPECIALISTS} from './specialists.js';
import {routeQuestion} from './router.js';

const labels=Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,'Training '+lang]));
const questions=Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,[
  'Which discipline are you learning?',
  'What experience do you have so far?',
  'What safety equipment is available?'
]]));
const definition={
 id:'trainingvue',
 scope:'Educational training techniques and safe practice',
 method:'Offer general educational training guidance. Check experience, supervision, protective equipment, injuries, and safe training conditions. Never promise injury prevention or encourage dangerous practice.',
 labels,questions,routingKeywords:['practice footwork','training stance']
};

test('review-only patch accepts actual VUECORE source and leaves repository state untouched',async()=>{
 const files={
  'core/specialists.js':await readFile(new URL('./specialists.js',import.meta.url),'utf8'),
  'core/router.js':await readFile(new URL('./router.js',import.meta.url),'utf8')
 };
 const original=structuredClone(files);
 const validated=validateVueActivation(definition,Object.keys(SPECIALISTS));
 assert.equal(validated.automaticDeployment,false);
 const patch=previewVueCoreSourcePatch(definition,files,Object.keys(SPECIALISTS));
 assert.deepEqual(files,original);
 assert.equal(patch.automaticApply,false);
 assert.equal(patch.productionReady,false);
 assert.match(patch.files['core/specialists.js'],/trainingvue:/);
 assert.match(patch.files['core/router.js'],/\['trainingvue',3,/);
 assert.equal(routeQuestion('practice footwork').domain,'anyvue');
 assert.throws(()=>previewVueCoreSourcePatch(definition,patch.files,Object.keys(SPECIALISTS)),/already in source/);
});
