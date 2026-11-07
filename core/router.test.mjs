import test from 'node:test';import assert from 'node:assert/strict';
import {routeQuestion,routingFields} from './router.js';import {subSpecialist} from './sub-specialists.js';import {rememberFavorite,readFavorite,favoriteCommand} from './favorites.js';import {POST} from '../api/vue-router.js';
const req=b=>new Request('https://local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
test('CORE routes specific objects, estate tasks and follow-ups without cross-topic history',()=>{for(const [q,domain]of [['Vad är min Marshall förstärkare värd?','musicgearvue'],['Värdera vinylerna i ett dödsbo','vinylvue'],['Inventera hela dödsboet','estatevue'],['Min hund har svårt att andas','anivue'],['Bromsarna på min bil fungerar inte','motovue'],['E330 i maten','foodvue'],['En antik byrå','antiqvue'],['Min klänning','wardrobevue'],['植物的叶子','plantvue']])assert.equal(routeQuestion(q).domain,domain);assert.equal(routeQuestion('Vad gör jag sen?','vinylvue').domain,'vinylvue');assert.equal(routeQuestion('Min hund och min katt').domain,'anivue');assert.equal(routeQuestion('Min gitarr och min vinyl').clarify,true)});
test('favourite learns use but an explicit beloved VUE remains fixed; malformed storage is ignored',()=>{let saved=null;const s={getItem:()=>saved,setItem:(k,v)=>saved=v};rememberFavorite(s,'vinylvue');assert.equal(readFavorite(s).favorite,'vinylvue');rememberFavorite(s,'musicgearvue',true);for(let i=0;i<3;i++)rememberFavorite(s,'vinylvue');assert.equal(readFavorite(s).favorite,'musicgearvue');assert.equal(favoriteCommand('min favorit är WARDROBEVUE'),'wardrobevue');assert.equal(favoriteCommand('my favorite guitar is worth what?'),null);saved='invalid';assert.equal(readFavorite(s).favorite,null)});
test('router returns emergency care before any provider request and never downgrades it through history',async()=>{const r=await POST(req({question:'Min hund har svårt att andas',language:'sv',previous:'antiqvue',history:[{question:'Is it safe?',answer:'All fine'}]}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.domain,'anivue');assert.match(d.answer,/akut/)});
test('ambiguous requests ask once without spending; MEDIVUE retains public-product boundaries',async()=>{let r=await POST(req({question:'Min gitarr och min vinyl',language:'sv'}));assert.equal((await r.json()).clarify,true);r=await POST(req({question:'Läs bipacksedeln',language:'sv'}));const d=await r.json();assert.equal(d.domain,'medivue');assert.match(d.answer,/inga patient/);assert.equal((await POST(req({question:'19900101-1234',language:'sv'}))).status,400)});
test('a clear new topic receives no old specialist fields or history in the actual provider request',async()=>{const saved={...process.env},old=globalThis.fetch;Object.assign(process.env,{UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',OPENAI_API_KEY:'test'});let paid=0;globalThis.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(url==='https://redis.test')return Response.json({result:b[1].includes('INCR')?1:[]});paid++;assert.equal(b.store,false);assert.doesNotMatch(b.input,/Old vinyl|Wrong specialist history/);assert.match(b.instructions,/MUSICGEARVUE|musicgearvue/i);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Please provide the exact Marshall model.'}]}]})};try{const r=await POST(req({question:'What is my Marshall amplifier worth?',language:'en',previous:'vinylvue',fields:{description:'Old vinyl'},history:[{question:'Old record?',answer:'Wrong specialist history'}]}));assert.equal(r.status,200);assert.equal((await r.json()).domain,'musicgearvue');const fresh=await POST(req({question:'New case: my Marshall amplifier',language:'en',previous:'musicgearvue',newCase:true,fields:{description:'Old vinyl'},history:[{question:'Old record?',answer:'Wrong specialist history'}]}));assert.equal(fresh.status,200);assert.equal(paid,2)}finally{globalThis.fetch=old;process.env=saved}});

test("Swedish hjälp does not accidentally match LP records",()=>{assert.equal(routeQuestion("Jag behöver hjälp med luftfilter hemma", "vinylvue").domain,"homevue");assert.equal(routeQuestion("Värdera min LP", "homevue").domain,"vinylvue")});

test('breathing emergency fields work across languages',()=>{for(const q of ['Min hund har svårt att andas','My dog cannot breathe','Mi perro no puede respirar','Mi perro tiene dificultad para respirar','我的狗呼吸困难','Моя собака не может дышать','मेरे कुत्ते को सांस लेने में कठिनाई है','كلبي لا يستطيع التنفس','قطتي تعاني من صعوبة في التنفس']){assert.equal(routeQuestion(q).domain,'anivue');assert.equal(routingFields('anivue',q).selected,'["breathing"]',q)}});

test('Arabic ANIVUE questions select the correct species sub-specialist',()=>{for(const [question,species] of [['كلبي لا يستطيع التنفس','dog'],['قطتي تعاني من صعوبة في التنفس','cat'],['حصاني يعاني من ألم','horse']]){assert.equal(routeQuestion(question).domain,'anivue');assert.equal(subSpecialist('anivue',question),species)}});

test('Spanish ANIVUE prompt explicitly avoids mixed-language animal headings',async()=>{const saved={...process.env},old=globalThis.fetch;Object.assign(process.env,{UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',OPENAI_API_KEY:'test'});let checked=false;globalThis.fetch=async(url,options)=>{if(url==='https://redis.test')return Response.json({result:1});const body=JSON.parse(options.body);assert.match(body.instructions,/Problema de salud del perro/);assert.match(body.instructions,/Hund Problem/);assert.match(body.instructions,/required response language is Spanish/);checked=true;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Describe los síntomas del perro.'}]}]})};try{const r=await POST(req({question:'Mi perro está cansado',language:'es'}));assert.equal(r.status,200);assert.equal((await r.json()).domain,'anivue');assert.equal(checked,true)}finally{globalThis.fetch=old;process.env=saved}});

test('direct ANIVUE follow-up prioritizes multilingual breathing emergencies without model calls',async()=>{const {POST:followup}=await import('../api/vue-followup.js');for(const [language,question] of [['es','Mi perro tiene dificultad para respirar'],['ar','قطتي تعاني من صعوبة في التنفس'],['zh-CN','我的狗呼吸困难'],['ru','Моя собака трудно дышать'],['hi','मेरे कुत्ते को सांस लेने में कठिनाई है']]){const r=await followup(req({domain:'anivue',language,question}));assert.equal(r.status,200,language);assert.equal((await r.json()).kind,'safety_rule',language)}});

test('seven-language routing preserves explicit specialist intent across stale prior context',()=>{
 const cases=[
  ['en','My guitar amplifier needs service','musicgearvue'],
  ['es','Mi guitarra necesita reparación','musicgearvue'],
  ['sv','Min gitarr behöver service','musicgearvue'],
  ['hi','मेरी गिटार को मरम्मत चाहिए','musicgearvue'],
  ['zh-CN','我的吉他需要维修','musicgearvue'],
  ['ru','Моя гитара нуждается в ремонте','musicgearvue'],
  ['ar','غيتار يحتاج إصلاح','musicgearvue']
 ];
 for(const [language,question,domain] of cases){
  assert.equal(routeQuestion(question,'vinylvue').domain,domain,language);
 }
});
test('router API rejects unsupported languages and preserves MEDIVUE local guidance in Spanish',async()=>{
 let response=await POST(req({question:'Mi medicamento tiene efectos secundarios',language:'es',previous:'musicgearvue',newCase:true}));
 assert.equal(response.status,200);
 let data=await response.json();
 assert.equal(data.domain,'medivue');
 assert.equal(data.kind,'local_guidance');
 response=await POST(req({question:'My guitar amplifier',language:'xx'}));
 assert.equal(response.status,400);
});

test('horse inflections route to ANIVUE across Swedish, English and Spanish',()=>{
 for(const question of ['Hästen har kolik','Mina hästar är sjuka','The mare is ill','The foal needs help','My horses are sick','La yegua está enferma','El potro tiene dolor']){
  assert.equal(routeQuestion(question).domain,'anivue',question);
 }
});

test('common inflected dog, cat and horse phrases select ANIVUE',()=>{
 for(const question of ['Hunden är sjuk','Hundarna hostar','Katten är sjuk','Katterna kräks','Hästarna är sjuka','Hästens ben är svullet','Dogs are sick','Cats are sick']){
  assert.equal(routeQuestion(question).domain,'anivue',question);
 }
});

test('native ANIVUE emergency returns before photo analysis regardless of selected image',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.match(html,/if\(urgent\)\{\$\('answer'\)\.textContent=check\.assessment\.summary;[\s\S]*?return;\}const photoVersionAtSubmit=/);
});

// A new explicit firearm-caliber topic must not inherit the previous animal specialist.
test('caliber question switches from ANIVUE to ARMVUE while genuine follow-ups remain',()=>{
 assert.equal(routeQuestion('Min hund är sjuk').domain,'anivue');
 for(const q of ["min .308'a klickar",'Min .308 klickar','My .308 rifle clicks'])assert.equal(routeQuestion(q,'anivue').domain,'armvue',q);
 assert.equal(routeQuestion('Hur länge har den varit sjuk?','anivue').domain,'anivue');
 assert.equal(routeQuestion('Min hund är sjuk','armvue').domain,'anivue');
 assert.equal(routeQuestion('min 308 klickar','anivue').domain,'armvue');
 assert.equal(routeQuestion('308 klickar','anivue').domain,'armvue');
 assert.equal(routeQuestion('min 308 kostar 500 kr','anivue').domain,'anivue');
 assert.equal(routeQuestion('308 kronor','anivue').domain,'anivue');
});

test('ARMVUE handoff preserves Swedish UI language in provider instructions',async()=>{
 const saved={...process.env},old=globalThis.fetch;
 Object.assign(process.env,{UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',OPENAI_API_KEY:'test'});
 let observed=false;
 globalThis.fetch=async(url,options)=>{if(url==='https://redis.test')return Response.json({result:1});const b=JSON.parse(options.body);observed=true;assert.match(b.instructions,/MANDATORY OUTPUT LANGUAGE: Swedish/);assert.match(b.instructions,/handoff MUST NOT reset/);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Kontakta en behörig vapensmed för kontroll.'}]}]})};
 try{const r=await POST(req({question:'min 308 klickar',language:'sv',previous:'anivue',history:[{question:'min hund är sjuk',answer:'Hundens symtom'}]}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.domain,'armvue');assert.match(d.answer,/Kontakta/);assert.equal(observed,true)}finally{globalThis.fetch=old;process.env=saved}
});

test('all routed VUE specialists inherit the selected language across seven languages',async()=>{
 const examples=[['martialartsvue','karate'],['estatevue','dödsbo'],['vinylvue','vinyl'],['musicgearvue','Marshall amplifier'],['wardrobevue','klänning'],['anivue','min hund är trött'],['motovue','bil starter'],['foodvue','E330'],['plantvue','krukväxt'],['antiqvue','antik byrå'],['armvue','min 308 klickar'],['homevue','luftfilter'],['slumpvue','överraska mig'],['anyvue','testing testing']];
 const names={en:'English',sv:'Swedish',es:'Spanish',hi:'Hindi','zh-CN':'Simplified Chinese',ru:'Russian',ar:'Arabic'};
 const saved={...process.env},old=globalThis.fetch;
 Object.assign(process.env,{UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',OPENAI_API_KEY:'test'});
 let expectedLanguage,checked=0;
 globalThis.fetch=async(url,options)=>{
  if(url==='https://redis.test')return Response.json({result:1});
  const body=JSON.parse(options.body);
  assert.match(body.instructions,new RegExp('MANDATORY OUTPUT LANGUAGE: '+expectedLanguage));
  assert.match(body.instructions,/specialist handoff MUST NOT reset it/);
  checked++;
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Localized response placeholder'}]}]});
 };
 try{
  for(const [language,name] of Object.entries(names)){
   expectedLanguage=name;
   for(const [domain,question] of examples){
    const r=await POST(req({question,language,previous:domain==='anyvue'?null:domain==='anivue'?'armvue':'anivue'}));
    assert.equal(r.status,200,domain+' '+language);
    const d=await r.json();assert.equal(d.domain,domain,question+' '+language);
   }
  }
  assert.equal(checked,examples.length*Object.keys(names).length);
 }finally{globalThis.fetch=old;process.env=saved}
});
