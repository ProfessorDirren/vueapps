import test from 'node:test';
import assert from 'node:assert/strict';
import {routeQuestion,routingFields} from './router.js';

// VUEGUARD baseline: protect the existing production routing contract.
test('VUECORE routes clear Swedish and English animal questions to ANIVUE',()=>{
  assert.deepEqual(routeQuestion('Min hund är sjuk'),{domain:'anivue',clarify:false});
  assert.deepEqual(routeQuestion('My horse needs a veterinarian'),{domain:'anivue',clarify:false});
});
test('VUECORE routes Spanish animal questions to ANIVUE',()=>{
  assert.deepEqual(routeQuestion('Mi perro está enfermo'),{domain:'anivue',clarify:false});
  assert.deepEqual(routeQuestion('Mi gato necesita ayuda'),{domain:'anivue',clarify:false});
});
test('VUECORE does not silently choose between equal-priority specialists',()=>{
  const result=routeQuestion('My dog and my car');
  assert.equal(result.domain,null);
  assert.equal(result.clarify,true);
  assert.deepEqual(new Set(result.candidates),new Set(['anivue','motovue']));
});
test('VUECORE defaults to ANYVUE on unknown questions without context',()=>{
  assert.deepEqual(routeQuestion('Please explain this concept'),{domain:'anyvue',clarify:false});
});
test('VUECORE does not route based on stale context when a clear new topic exists',()=>{
  assert.deepEqual(routeQuestion('My cat is ill','motovue'),{domain:'anivue',clarify:false});
});
test('ANIVUE breathing emergency maps to urgent safety field',()=>{
  assert.deepEqual(routingFields('anivue','Min hund har svårt att andas'),{selected:'["breathing"]'});
  assert.deepEqual(routingFields('anivue','My dog cannot breathe'),{selected:'["breathing"]'});
});

test('VUECORE routes multilingual animal terms without changing the selected language',()=>{
  for(const question of ['Mi caballo está enfermo','我的猫生病了','Моя собака заболела','كلبي مريض','मेरी बिल्ली बीमार है']){
    assert.equal(routeQuestion(question).domain,'anivue',question);
  }
});
test('VUECORE distinguishes specialist priorities when one topic is higher risk',()=>{
  assert.deepEqual(routeQuestion('Medicine side effects for my cat'),{domain:'medivue',clarify:false});
});
test('VUECORE leaves unclear questions in the safe generic specialist',()=>{
  assert.deepEqual(routeQuestion('Could you help me?',null),{domain:'anyvue',clarify:false});
});
test('ANIVUE workspace remains native and has no external fallback',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../api/vue-router.js',import.meta.url),'utf8');
 const portal=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(source,/workspace:'\.\/\?vue='/);
 for(const file of [source,portal])assert.doesNotMatch(file,/anivue(?:app)?\.se|legacy_workspace/);
 assert.match(portal,/href="\.\/\?vue=anivue#vue-router"/);
});

test('runtime files never link to retired standalone ANIVUE',async()=>{
 const {readdir,readFile}=await import('node:fs/promises');
 const {join,relative,sep}=await import('node:path');
 const root=new URL('../',import.meta.url).pathname;
 const excluded=new Set(['docs','node_modules','.git','.vercel']);
 async function scan(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const path=join(directory,entry.name);
   if(entry.isDirectory()){
    if(!excluded.has(entry.name))await scan(path);
    continue;
   }
   if(!entry.isFile()||!(/\\.(?:html|js|mjs|json)$/.test(entry.name))||entry.name.endsWith('.test.mjs'))continue;
   const content=await readFile(path,'utf8');
   assert.doesNotMatch(content,/anivue(?:app)?\\.se|legacy_workspace\\s*:/,relative(root,path).split(sep).join('/'));
  }
 }
 await scan(root);
});


test('shared ANIVUE stops emergency cases before image analysis',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../api/vue-router.js',import.meta.url),'utf8');
 const urgent=source.indexOf("if(route.domain==='anivue'&&urgent)return json(200");
 const image=source.indexOf('classifyImage(b.image,question)');
 assert.ok(urgent>=0&&image>urgent,'emergency guidance must precede image routing');
 assert.match(source,/image_analyzed:false/);
});

test('shared ANIVUE horse emergencies remain urgent without standalone page',async()=>{
 const {urgentFollowup}=await import('../api/vue-followup.js');
 for(const question of ['My horse has colic','Min häst har kolik','My horse has choke','My horse has dystocia','Min häst har 39,6 grader feber']){
  assert.ok(urgentFollowup('anivue',question,{},'en'),question);
 }
 assert.ok(urgentFollowup('anivue','horseHighFever',{selected:'horseHighFever'},'sv'));
});

test('retired ANIVUE URL redirects to shared portal without recreating the page',async()=>{
 const {readFile}=await import('node:fs/promises');
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(config.redirects.some(r=>r.source==='/anivue-core.html'&&r.destination==='/?vue=anivue'&&r.permanent===true));
});
