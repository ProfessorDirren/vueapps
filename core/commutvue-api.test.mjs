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

test('COMMUTVUE POST fails closed on upstream 500 without publishing departures',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='private-http-fixture';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  globalThis.fetch=async()=>({ok:false,status:500});
  const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language:'sv'})});
  const response=await POST(request),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.domain,'commutvue');
  assert.equal(body.live_diagnostic,'provider_http_error');
  assert.equal(body.evidence_status,'live_unavailable');
  assert.equal(body.verified,false);
  assert.deepEqual(body.departures,[]);
  assert.equal(body.source_url,null);
  assert.equal(body.updated_at,null);
  assert.doesNotMatch(JSON.stringify(body),/private-http-fixture/);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});

test('COMMUTVUE POST fails closed on Trafiklab network timeout without leaking secrets',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='private-timeout-fixture';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  globalThis.fetch=async()=>{throw new Error('network timed out: private-timeout-fixture');};
  const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language:'sv'})});
  const response=await POST(request),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.domain,'commutvue');
  assert.equal(body.live_diagnostic,'provider_network_or_timeout');
  assert.equal(body.evidence_status,'live_unavailable');
  assert.equal(body.verified,false);
  assert.deepEqual(body.departures,[]);
  assert.equal(body.source_url,null);
  assert.equal(body.updated_at,null);
  assert.doesNotMatch(JSON.stringify(body),/private-timeout-fixture/);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});

test('ordinary Swedish next-train question routes to COMMUTVUE without prior context',()=>{
 assert.equal(routeQuestion('När går nästa tåg från Jordbro till Stockholm City?').domain,'commutvue');
});


test('COMMUTVUE POST does not call Trafiklab when live flag is absent even if a key exists',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='private-preview-fixture';
  delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('Trafiklab should not be called');};
  const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language:'sv'})});
  const response=await POST(request),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.domain,'commutvue');
  assert.equal(body.live_diagnostic,'not_configured');
  assert.equal(body.evidence_status,'live_unavailable');
  assert.equal(body.verified,false);
  assert.deepEqual(body.departures,[]);
  assert.equal(calls,0);
  assert.doesNotMatch(JSON.stringify(body),/private-preview-fixture/);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});


test('COMMUTEVUE distinguishes ambiguous origin and destination without exposing station data',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='secret-ambiguity-fixture';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  for(const role of ['origin','destination']){
   globalThis.fetch=async url=>{
    const name=decodeURIComponent(new URL(url).pathname.split('/').pop());
    const ambiguous=role==='origin'?'Jordbro':'Stockholm City';
    const groups=name===ambiguous?[
     {id:'740000001',name:ambiguous,stops:[{id:'stop1',name:ambiguous}]},
     {id:'740000002',name:ambiguous,stops:[{id:'stop2',name:ambiguous}]}
    ]:[{id:'740000003',name,stops:[{id:'stop3',name}]}];
    return {ok:true,text:async()=>JSON.stringify({stop_groups:groups})};
   };
   const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går nästa tåg från Jordbro till Stockholm City?',language:'sv'})});
   const response=await POST(request),body=await response.json();
   assert.equal(response.status,200);
   assert.equal(body.domain,'commutvue');
   assert.equal(body.live_diagnostic,'provider_ambiguous_'+role+'_station');
   assert.equal(body.verified,false);
   assert.deepEqual(body.departures,[]);
   assert.equal(body.source_url,null);
   assert.match(body.answer,role==='origin'?/Avresestationens namn/:/Destinationsstationens namn/);
   assert.doesNotMatch(JSON.stringify(body),/secret-ambiguity-fixture/);
  }
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});


test('COMMUTVUE timetable-only result explicitly says delay is unknown',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='fixture';process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  const now=new Date();const local=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const wall=d=>{const p=Object.fromEntries(local.formatToParts(d).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second};
  const day=wall(now).slice(0,10);
  globalThis.fetch=async url=>{
   const path=new URL(url).pathname;
   let data;
   if(path.includes('/stops/name/')){const station=decodeURIComponent(path.split('/').pop());data={stop_groups:[{id:station==='Jordbro'?'740000001':'740000002',name:station,stops:[{id:station==='Jordbro'?'stop1':'stop2',name:station}]}]};}
   else if(path.includes('/departures/'))data={timestamp:wall(now),departures:[{trip:{trip_id:'t1',start_date:day},stop:{id:'stop1'},is_realtime:false,scheduled:wall(new Date(now.getTime()+1800000)),route:{designation:'43',direction:'Stockholm City',transport_mode:'TRAIN',transport_mode_code:106}}]};
   else data={timestamp:wall(now),trip:{trip_id:'t1',start_date:day},calls:[{stop:{id:'stop1',area_id:'740000001',name:'Jordbro'}},{stop:{id:'stop2',area_id:'740000002',name:'Stockholm City'}}]};
   return {ok:true,text:async()=>JSON.stringify(data)};
  };
  const expected={en:'Delay status cannot be determined',es:'No se puede determinar',sv:'Det går inte att avgöra',hi:'रीयल-टाइम डेटा', 'zh-CN':'没有实时数据',ru:'Без данных в реальном времени',ar:'لا يمكن تحديد التأخير',fr:'Impossible de déterminer',el:'Δεν είναι δυνατό',tr:'Gerçek zamanlı veri',fa:'بدون دادهٔ لحظه‌ای'};
  for(const [language,phrase] of Object.entries(expected)){
   const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Är pendeltågen från Jordbro till Stockholm City försenade?',language})});
   const response=await POST(request),data=await response.json();
   assert.equal(data.domain,'commutvue',language);
   assert.equal(data.verified,false,language);
   assert.equal(data.evidence_status,'schedule_verified',language);
   assert.equal(data.live_diagnostic,'no_realtime_at_origin',language);
   if(language==='sv')assert.ok(data.answer.includes('Trafiklab saknar realtidsmarkering'),language);
   if(language==='en')assert.ok(data.answer.includes('Trafiklab did not mark'),language);
   assert.ok(data.answer.includes(phrase),language+' missing delay-unknown disclaimer');
  }
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});


test('COMMUTEVUE never returns today realtime for tomorrow questions',async()=>{
 for(const [language,question] of [['sv','När går tåget från Jordbro till Stockholm City imorgon?'],['sv','När går tåget från Jordbro till Stockholm City i morgon?'],['en','Train delay from Jordbro to Stockholm City tomorrow?']]){
  const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language})}));
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.domain,'commutvue');
  assert.equal(body.verified,false);
  assert.equal(body.evidence_status,'future_date_unavailable');
  assert.deepEqual(body.departures,[]);
  assert.equal(body.source_url,null);
  assert.match(body.answer,language==='sv'?/framtida datum/:/future date/);
 }
});


test('COMMUTEVUE future-date safety guidance uses all 11 UI languages',async()=>{
 const expected={sv:'Realtidsavgångar',en:'Real-time departures',es:'No se pueden',fr:'Les départs',hi:'भविष्य की', 'zh-CN':'今天无法',ru:'Сегодня невозможно',ar:'لا يمكن',el:'Οι αναχωρήσεις',tr:'Gelecekteki',fa:'اطلاعات لحظه‌ای'};
 for(const [language,phrase] of Object.entries(expected)){
  const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'När går tåget från Jordbro till Stockholm City imorgon?',language})}));
  const data=await response.json();
  assert.equal(response.status,200,language);
  assert.equal(data.evidence_status,'future_date_unavailable',language);
  assert.equal(data.verified,false,language);
  assert.deepEqual(data.departures,[],language);
  assert.ok(data.answer.startsWith(phrase),language);
 }
});


test('COMMUTEVUE never presents today realtime for the day after tomorrow',async()=>{
 for(const [language,question] of [['sv','När går tåget från Jordbro till Stockholm City övermorgon?'],['sv','När går tåget från Jordbro till Stockholm City i övermorgon?'],['en','Train delay from Jordbro to Stockholm City day after tomorrow?']]){
  const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language})}));
  const data=await response.json();
  assert.equal(response.status,200,question);
  assert.equal(data.evidence_status,'future_date_unavailable',question);
  assert.equal(data.verified,false,question);
  assert.deepEqual(data.departures,[],question);
  assert.equal(data.source_url,null,question);
  assert.match(data.answer,language==='sv'?/framtida datum/:/future date/);
 }
});

test('COMMUTEVUE router preserves missing realtime timestamp diagnostic in both fallback modes',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const source=readFileSync(fileURLToPath(new URL('../api/vue-router.js',import.meta.url)),'utf8');
 assert.match(source,/realtime_trip_flag_missing','realtime_timestamp_missing'\]\.includes\(raw\.reason\)/);
 assert.match(source,/provider_time_conflict','realtime_timestamp_missing','realtime_origin_unverified','realtime_destination_unverified','realtime_destination_absent','realtime_destination_wrong_order','realtime_destination_id_mismatch','realtime_trip_flag_missing'\]\.includes\(raw\.reason\)/);
 assert.match(source,/realtime_timestamp_missing:'Trafiklab markerar avgången som realtid/);
 assert.match(source,/realtime_timestamp_missing:'Trafiklab marks the departure as real-time/);
});

test('COMMUTEVUE POST exposes safe missing-realtime-time diagnostic with timetable fallback',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.TRAFIKLAB_API_KEY,oldFlag=process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;
 try{
  process.env.TRAFIKLAB_API_KEY='secret-missing-realtime-fixture';
  process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED='true';
  const now=new Date();
  const local=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const wall=d=>{const p=Object.fromEntries(local.formatToParts(d).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second};
  const day=wall(now).slice(0,10);
  const scheduled=wall(new Date(now.getTime()+1800000));
  globalThis.fetch=async url=>{
   const path=new URL(url).pathname;
   let data;
   if(path.includes('/stops/name/')){
    const name=decodeURIComponent(path.split('/').pop());
    data={stop_groups:[{id:name==='Jordbro'?'740000001':'740000002',name,stops:[{id:name==='Jordbro'?'stop1':'stop2',name}]}]};
   }else if(path.includes('/departures/')){
    data={timestamp:wall(now),departures:[
     {trip:{trip_id:'missing',start_date:day},stop:{id:'stop1'},is_realtime:true,scheduled,route:{designation:'43',direction:'Stockholm City',transport_mode:'TRAIN',transport_mode_code:106}},
     {trip:{trip_id:'scheduled',start_date:day},stop:{id:'stop1'},is_realtime:false,scheduled,route:{designation:'43',direction:'Stockholm City',transport_mode:'TRAIN',transport_mode_code:106}}
    ]};
   }else{
    data={timestamp:wall(now),trip:{trip_id:'scheduled',start_date:day},calls:[{stop:{id:'stop1',area_id:'740000001',name:'Jordbro'}},{stop:{id:'stop2',area_id:'740000002',name:'Stockholm City'}}]};
   }
   return {ok:true,text:async()=>JSON.stringify(data)};
  };
  for(const [language,phrase] of [['sv','Trafiklab markerar avgången som realtid'],['en','Trafiklab marks the departure as real-time']]){
   const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Är pendeltågen från Jordbro till Stockholm City försenade?',language})}));
   const body=await response.json();
   assert.equal(response.status,200,language);
   assert.equal(body.domain,'commutvue',language);
   assert.equal(body.evidence_status,'schedule_verified',language);
   assert.equal(body.live_diagnostic,'realtime_timestamp_missing',language);
   assert.equal(body.verified,false,language);
   assert.ok(body.answer.includes(phrase),language);
   assert.ok(body.departures.every(d=>d.expected===null),language);
   assert.doesNotMatch(JSON.stringify(body),/secret-missing-realtime-fixture/,language);
  }
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.TRAFIKLAB_API_KEY;else process.env.TRAFIKLAB_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED;else process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED=oldFlag;
 }
});


test('COMMUTVUE recognizes Jordbro as origin and asks only for destination',async()=>{
 const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'när går tågen från Jordbro?',language:'sv'})});
 const response=await POST(request),data=await response.json();
 assert.equal(data.domain,'commutvue');
 assert.equal(data.clarify,true);
 assert.equal(data.region,'stockholm');
 assert.match(data.answer,/Vilken station vill du resa till från Jordbro/);
 assert.doesNotMatch(data.answer,/Ange avreseort/);
 assert.equal(data.verified,false);
});
