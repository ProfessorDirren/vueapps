import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './anivue-vision.js';

const image = 'data:image/png;base64,' + Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,73,72,68,82,0,0,0,0]).toString('base64');
const request = (body) => new Request('https://localhost/api/anivue-analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const structured = {
 species:{value:'horse',confidence:'high'},
 breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},
 ageAssessment:{estimatedRange:null,confidence:'low'},
 visibleObservations:[{observation:'A horse is visible.',confidence:'high',significance:'normal'}],
 limitations:['A still photo cannot establish the cause of symptoms.'],
 suggestedFollowUpQuestions:['When did this start?','Has a veterinarian been contacted?'],
 emergencySignals:[],summary:'A horse is visible.'
};
const provider = async (_url,options) => {
 const payload=JSON.parse(options.body);
 assert.equal(payload.store,false);
 assert.match(payload.instructions,/SUPPLEMENTARY/);
 return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(structured)}]}]})};
};
const options={configured:()=>true,spend:async()=>true,fetcher:provider};

test('VUECORE vision preserves horse colic emergency advice alongside supplementary observations',async()=>{
 const response=await POST(request({language:'es',species:'horse',symptoms:['horseColic'],image}),options);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.match(result.emergencyAdvice,/veterinario/);
 assert.equal(result.verified,false);
 assert.equal(result.species.value,'horse');
 assert.equal(result.visibleObservations.length,1);
});

test('VUECORE vision preserves dog and cat breathing emergency advice',async()=>{
 for(const species of ['dog','cat']){
  const response=await POST(request({language:'en',species,symptoms:['breathing'],image}),options);
  assert.equal(response.status,200);
  assert.match((await response.json()).emergencyAdvice,/emergency veterinary care/);
 }
});

test('VUECORE vision does not invent emergency advice for routine symptoms',async()=>{
 const response=await POST(request({language:'en',species:'horse',symptoms:['horseOther'],image}),options);
 assert.equal(response.status,200);
 assert.equal((await response.json()).emergencyAdvice,null);
});

test('VUECORE vision rejects unsupported languages before provider call',async()=>{
 let calls=0;
 const response=await POST(request({language:'fr',species:'horse',image}),{configured:()=>{calls++;return true},spend:async()=>{calls++;return true},fetcher:async()=>{calls++;throw Error('must not call')}});
 assert.equal(response.status,400);
 assert.equal(calls,0);
});
