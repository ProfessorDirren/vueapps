import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { POST } from './anivue-vision.js';

const png = () => {
 const header=Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(128,0);ihdr.writeUInt32BE(128,4);ihdr[8]=8;ihdr[9]=2;
 const raw=Buffer.alloc(128*(128*3+1));
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=y*385+1+x*3;raw[p]=x*2;raw[p+1]=y*2;raw[p+2]=(x+y)&255}
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);return Buffer.concat([len,Buffer.from(type),data,Buffer.alloc(4)])};
 return Buffer.concat([header,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
};
const image = 'data:image/png;base64,' + png().toString('base64');
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

test('VUECORE vision bypasses horse colic photo analysis in favor of emergency advice',async()=>{
 const response=await POST(request({language:'es',species:'horse',symptoms:['horseColic'],image}),options);
 assert.equal(response.status,409);
 const result=await response.json();
 assert.match(result.emergencyAdvice,/veterinario/);
});

test('VUECORE vision bypasses dog and cat breathing photo analysis',async()=>{
 for(const species of ['dog','cat']){
  const response=await POST(request({language:'en',species,symptoms:['breathing'],image}),options);
  assert.equal(response.status,409);
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

test('vision API rejects invalid provider metadata instead of returning HTTP 200',async()=>{
 for(const patch of [
  {species:{value:'horse',confidence:'invalid'}},
  {breedAssessment:{...structured.breedAssessment,alternatives:[42]}},
  {breedAssessment:{...structured.breedAssessment,likelyBreed:42}},
  {ageAssessment:{...structured.ageAssessment,estimatedRange:42}}
 ]){
  const malformed={...structured,...patch};
  const fetcher=async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(malformed)}]}]})});
  const response=await POST(request({language:'en',species:'horse',symptoms:['horseOther'],image}),{configured:()=>true,spend:async()=>true,fetcher});
  assert.equal(response.status,502,JSON.stringify(patch));
 }
});

test('vision API bounds oversized model-generated text fields',async()=>{
 for(const patch of [
  {summary:'x'.repeat(4001)},
  {visibleObservations:[{...structured.visibleObservations[0],observation:'x'.repeat(1001)}]},
  {limitations:['x'.repeat(1001)]},
  {suggestedFollowUpQuestions:['x'.repeat(1001),'Normal question?']},
  {emergencySignals:['x'.repeat(1001)]},
  {breedAssessment:{...structured.breedAssessment,likelyBreed:'x'.repeat(201)}},
  {ageAssessment:{...structured.ageAssessment,estimatedRange:'x'.repeat(201)}}
 ]){
  const malformed={...structured,...patch};
  const fetcher=async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(malformed)}]}]})});
  const response=await POST(request({language:'en',species:'horse',symptoms:['horseOther'],image}),{configured:()=>true,spend:async()=>true,fetcher});
  assert.equal(response.status,502,Object.keys(patch)[0]);
 }
});
