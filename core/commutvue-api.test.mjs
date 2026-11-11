import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-router.js';
import {routeQuestion} from './router.js';
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

test('COMMUTVUE POST classifies mocked Trafiklab authorization failures without leaking credentials',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='private-fixture-key';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  const requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));return {ok:false,status:403};};
  const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language:'en'})});
  const response=await POST(request),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.domain,'commutvue');
  assert.equal(body.verified,false);
  assert.equal(body.live_diagnostic,'provider_authorization');
  assert.match(body.answer,/rejected the server credentials/);
  assert.ok(requests.length>0);
  assert.ok(requests.every(url=>url.startsWith('https://realtime-api.trafiklab.se/')));
  assert.doesNotMatch(JSON.stringify(body),/private-fixture-key/);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});

test('COMMUTVUE POST reports Trafiklab rate limits without inventing departures or leaking credentials',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='private-rate-limit-fixture';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:false,status:429};};
  const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language:'sv'})});
  const response=await POST(request),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.domain,'commutvue');
  assert.equal(body.verified,false);
  assert.equal(body.evidence_status,'live_unavailable');
  assert.equal(body.live_diagnostic,'provider_rate_limited');
  assert.deepEqual(body.departures,[]);
  assert.equal(body.source_url,null);
  assert.ok(calls>0);
  assert.doesNotMatch(JSON.stringify(body),/private-rate-limit-fixture/);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});

test('COMMUTVUE provider failures use localized diagnostics in all 11 languages',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='private-locale-fixture';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  globalThis.fetch=async()=>({ok:false,status:429});
  const languages=['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa'];
  for(const language of languages){
   const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language})});
   const response=await POST(request),body=await response.json();
   assert.equal(body.domain,'commutvue',language);
   assert.equal(body.live_diagnostic,'provider_rate_limited',language);
   assert.equal(body.verified,false,language);
   assert.deepEqual(body.departures,[],language);
   if(language!=='en')assert.doesNotMatch(body.answer,/The traffic provider rate limit was reached/,language);
   assert.doesNotMatch(JSON.stringify(body),/private-locale-fixture/);
  }
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});

test('ordinary Swedish next-train question routes to COMMUTVUE without prior context',()=>{
 assert.equal(routeQuestion('När går nästa tåg från Jordbro till Stockholm City?').domain,'commutvue');
});
