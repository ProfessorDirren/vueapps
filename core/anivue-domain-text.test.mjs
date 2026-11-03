import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AniVueDomain} from './anivue.js';
import {VueDomain,VueFlow} from './index.js';
import {createSpecialistDomain} from './domain-registry.js';

test('native ANIVUE text requests use inherited domain adapter',async()=>{
 const calls=[];
 const domain=new AniVueDomain({fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({domain:'anivue',answer:'Contact a veterinarian if symptoms worsen'})};
 }});
 assert.ok(domain instanceof VueDomain);
 const result=await domain.analyzeText({species:'horse',symptoms:['horseNotEating'],description:'  Not eating today ',language:'es'});
 assert.equal(result.domain,'anivue');
 assert.equal(calls[0].url,'/api/vue-router');
 assert.deepEqual(JSON.parse(calls[0].options.body),{question:'horse horseNotEating Not eating today',language:'es',previous:'anivue',newCase:true});
});

test('invalid text inputs never call the backend',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected')}});
 await assert.rejects(domain.analyzeText({species:'cow',description:'Not well'}),error=>error.code==='invalid_species');
 await assert.rejects(domain.analyzeText({species:'cat',description:'a'}),error=>error.code==='invalid_description');
 await assert.rejects(domain.analyzeText({species:'dog',description:'Coughing',language:'fr'}),error=>error.code==='invalid_language');
 assert.equal(calls,0);
});

test('native page delegates both text and photo to VUECORE domain',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.match(page,/await flow\.run\(context\)/);
 assert.match(page,/flow\.domain\.analyzePhoto\(/);
});

test('registry forwards injected fetcher to ANIVUE specialist adapter',async()=>{
 let calls=0;
 const domain=createSpecialistDomain('anivue',{fetcher:async()=>{
  calls++;
  return {ok:true,json:async()=>({domain:'anivue',answer:'Contact a veterinarian'})};
 }});
 assert.ok(domain instanceof AniVueDomain);
 await domain.analyzeText({species:'cat',description:'Cat not eating'});
 assert.equal(calls,1);
});

test('VUEFlow calls real ANIVUE text assessment exactly once for non-emergency symptoms',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{
  calls++;
  return {ok:true,json:async()=>({domain:'anivue',answer:'Observe symptoms and contact a veterinarian'})};
 }});
 const result=await new VueFlow(domain).run({category:'dog',symptoms:['other'],description:'Dog seems tired',language:'en'});
 assert.equal(result.source,'domain');
 assert.equal(result.assessment.summary,'Observe symptoms and contact a veterinarian');
 assert.equal(calls,1);
});
test('emergency symptoms never call text AI via VUEFlow',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected')}});
 const result=await new VueFlow(domain).run({category:'horse',symptoms:['horseColic'],description:'Severe colic',language:'sv'});
 assert.equal(result.assessment.severity,'emergency');
 assert.equal(calls,0);
});
