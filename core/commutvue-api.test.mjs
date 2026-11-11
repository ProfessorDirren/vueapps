import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-router.js';
test('COMMUTVUE does not generate invented live train delays',async()=>{
 const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Är pendeltågen från Jordbro till T-Centralen försenade?',language:'sv'})});
 const response=await POST(request);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.domain,'commutvue');
 assert.equal(data.verified,false);
 assert.equal(data.evidence_status,'live_unavailable');
 assert.equal(data.photo_status,'not_supplied');
 assert.equal(data.photo_evidence,null);
 assert.match(data.answer,/inte tillgänglig/);
});

test('COMMUTVUE asks for missing stations in the requested language',async()=>{
 const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'RER B delayed?',language:'fr'})});
 const response=await POST(request);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.domain,'commutvue');
 assert.equal(data.clarify,true);
 assert.equal(data.evidence_status,'needs_stations');
 assert.match(data.answer,/gare de départ/);
});

test('COMMUTVUE missing-station prompts honor all 11 supported languages',async()=>{
 const expected={en:'Please specify',es:'Indica',sv:'Ange',hi:'कृपया', 'zh-CN':'请提供',ru:'Укажите',ar:'يرجى',fr:'Indiquez',el:'Προσδιορίστε',tr:'Lütfen',fa:'لطفاً'};
 for(const [language,word] of Object.entries(expected)){
  const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'RER B delayed?',language})});
  const response=await POST(request);
  assert.equal(response.status,200,language);
  const data=await response.json();
  assert.equal(data.domain,'commutvue',language);
  assert.equal(data.clarify,true,language);
  assert.equal(data.verified,false,language);
  assert.equal(data.evidence_status,'needs_stations',language);
  assert.ok(data.answer.includes(word),language);
 }
});

test('COMMUTVUE never claims verified live data when provider credentials are absent',async()=>{
 const previousFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 const previousKey=process.env.TRAFIKLAB_API_KEY;
 try{
  delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
  delete process.env.TRAFIKLAB_API_KEY;
  for(const language of ['en','sv','es']){
   const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Är pendeltågen från Jordbro till T-Centralen försenade?',language})});
   const response=await POST(request);
   assert.equal(response.status,200);
   const data=await response.json();
   assert.equal(data.domain,'commutvue');
   assert.equal(data.verified,false);
   assert.equal(data.evidence_status,'live_unavailable');
   assert.equal(data.source_url,null);
   assert.deepEqual(data.departures,[]);
  }
 }finally{
  if(previousFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=previousFlag;
  if(previousKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=previousKey;
 }
});
