import test from 'node:test';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {FACTORY_LANGUAGES,validateVueDefinition,scaffoldVue,checkVueCollision,buildRoutingCandidates,previewVueRouting,simulateVueIntegration} from './vuefactory.js';
const definition={
 id:'bookvue',
 scope:'Book identification, edition comparison and collection research',
 method:'Identify author, title, publisher, ISBN, edition, printing, condition and provenance. Distinguish observed details from assumptions, use verifiable catalogues, and never assert authenticity or market value without corroboration.',
 labels:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,'Books'])),
 sources:[['Library of Congress','https://www.loc.gov/']]
};
test('factory generates a deterministic reviewable profile and checklist',()=>{
 const a=scaffoldVue(definition),b=scaffoldVue(definition);
 assert.deepEqual(a,b);
 assert.match(a.files['generated/bookvue/profile.js'],/Book identification/);
 assert.match(a.files['generated/bookvue/RELEASE-CHECKLIST.md'],/manual review required/);
 assert.equal(Object.keys(a.files).length,5);
 assert.match(a.files['generated/bookvue/registry-snippet.txt'],/\"bookvue\":/);
 assert.match(a.files['generated/bookvue/routing-review.txt'],/collision-tested/);
 const plan=JSON.parse(a.files['generated/bookvue/integration-plan.json']);
 assert.equal(plan.status,'review-required');
 assert.equal(plan.deploy.automatic,false);
 assert.equal(plan.routing.collisionReviewRequired,true);
 assert.equal(plan.languages.length,7);
});
test('factory requires seven languages and substantive methods',()=>{
 assert.throws(()=>validateVueDefinition({...definition,labels:{en:'Books'}}),/Missing\/invalid label/);
 assert.throws(()=>validateVueDefinition({...definition,method:'Short'}),/Method/);
 assert.throws(()=>validateVueDefinition({...definition,id:'../bookvue'}),/id/);
});
test('factory rejects credentialed or insecure sources',()=>{
 assert.throws(()=>validateVueDefinition({...definition,sources:[['bad','http://example.org']]}),/HTTPS/);
 assert.throws(()=>validateVueDefinition({...definition,sources:[['bad','https://user:pass@example.org']]}),/HTTPS/);
});
test('factory never writes, registers, deploys or calls an AI service',()=>{
 const a=scaffoldVue(definition);
 assert.ok(Object.keys(a.files).every(p=>p.startsWith('generated/')));
 assert.ok(!Object.keys(a.files).some(p=>p.includes('api/')));
});

test('factory rejects existing specialist names before writing files',()=>{
 assert.throws(()=>checkVueCollision({...definition,id:'anivue'},['anivue','anyvue']),/already registered/);
 assert.equal(checkVueCollision(definition,['anivue','anyvue']).id,'bookvue');
 assert.throws(()=>checkVueCollision(definition,'anivue'),/Invalid existing/);
});

test('routing candidates are literal, review-only and collision-aware',()=>{
 const input={...definition,routingKeywords:['ISBN','book edition','författare']};
 const result=buildRoutingCandidates(input,['isbn','vinyl']);
 assert.deepEqual(result.collisions,['isbn']);
 assert.equal(result.automaticRegistration,false);
 assert.deepEqual(JSON.parse(scaffoldVue(input).files['generated/bookvue/routing-candidates.json']).keywords,['isbn','book edition','författare']);
 assert.throws(()=>buildRoutingCandidates({...definition,routingKeywords:['book.*','isbn']}),/Unsafe/);
 assert.throws(()=>buildRoutingCandidates({...definition,routingKeywords:['ISBN','isbn']}),/Duplicate/);
});

test('BOOKVUE factory CLI produces valid review-only integration files end to end',async()=>{
 const output=await mkdtemp(join(tmpdir(),'vuefactory-test-'));
 try{
  const root=new URL('../',import.meta.url);
  execFileSync(process.execPath,['scripts/vuefactory.mjs','examples/vuefactory-bookvue.json',output],{cwd:root,timeout:15000});
  const directory=join(output,'generated','bookvue');
  const files=await readdir(directory);
  assert.equal(files.length,7);
  const plan=JSON.parse(await readFile(join(directory,'integration-plan.json'),'utf8'));
  const routing=JSON.parse(await readFile(join(directory,'routing-candidates.json'),'utf8'));
  const audit=JSON.parse(await readFile(join(directory,'existing-router-audit.json'),'utf8'));
  assert.equal(audit.specialist,'bookvue');
  assert.equal(audit.liveRouterModified,false);
  assert.equal(audit.probes.length,4);
  assert.equal(plan.specialist,'bookvue');
  assert.equal(plan.deploy.automatic,false);
  assert.equal(routing.automaticRegistration,false);
  assert.ok(routing.keywords.includes('isbn'));
  assert.throws(()=>execFileSync(process.execPath,['scripts/vuefactory.mjs','examples/vuefactory-bookvue.json',output],{cwd:root,timeout:15000,stdio:'pipe'}),/Command failed/);
 }finally{await rm(output,{recursive:true,force:true})}
});

test('routing preview matches whole Unicode words and keeps live routing unchanged',()=>{
 const input={...definition,routingKeywords:['ISBN','författare','edición de libro']};
 assert.deepEqual(previewVueRouting(input,'Har boken en ISBN?').keywords,['isbn']);
 assert.deepEqual(previewVueRouting(input,'Vem är författare till boken?').keywords,['författare']);
 assert.deepEqual(previewVueRouting(input,'Busco una edición de libro').keywords,['edición de libro']);
 assert.equal(previewVueRouting(input,'ISBNs').matched,false);
 assert.equal(previewVueRouting(input,'something else').matched,false);
 assert.equal(previewVueRouting(input,'ISBN').liveRouterModified,false);
 assert.throws(()=>previewVueRouting(input,null),/Invalid preview/);
});

test('factory routing preview does not alter existing VUECORE decisions',async()=>{
 const {routeQuestion}=await import('./router.js');
 const cases=[
  ['Min hund har svårt att andas','anivue'],
  ['My motorcycle has brake problems','motovue'],
  ['Identify this vinyl pressing','vinylvue'],
  ['Medicine side effects','medivue'],
  ['Marshall guitar amplifier','musicgearvue'],
  ['What is the ISBN?','anyvue']
 ];
 const before=cases.map(([q])=>routeQuestion(q));
 const input={...definition,routingKeywords:['ISBN','book edition','författare']};
 assert.equal(previewVueRouting(input,'What is the ISBN?').matched,true);
 const after=cases.map(([q])=>routeQuestion(q));
 assert.deepEqual(after,before);
 for(let i=0;i<cases.length;i++)assert.equal(after[i].domain,cases[i][1]);
});

test('factory refuses existing draft before writing any additional output',async()=>{
 const output=await mkdtemp(join(tmpdir(),'vuefactory-collision-'));
 try{
  const root=new URL('../',import.meta.url);
  const directory=join(output,'generated','bookvue');
  const {mkdir}=await import('node:fs/promises');
  await mkdir(directory,{recursive:true});
  await writeFile(join(directory,'routing-review.txt'),'KEEP THIS FILE');
  assert.throws(()=>execFileSync(process.execPath,['scripts/vuefactory.mjs','examples/vuefactory-bookvue.json',output],{cwd:root,timeout:15000,stdio:'pipe'}),/Command failed/);
  assert.deepEqual(await readdir(directory),['routing-review.txt']);
  assert.equal(await readFile(join(directory,'routing-review.txt'),'utf8'),'KEEP THIS FILE');
 }finally{await rm(output,{recursive:true,force:true})}
});

test('dry-run integration routes new BOOKVUE queries while preserving existing specialists',async()=>{
 const {routeQuestion}=await import('./router.js');
 const input={...definition,routingKeywords:['ISBN','book edition','författare']};
 const book=simulateVueIntegration(input,'ISBN?',routeQuestion);
 assert.deepEqual({domain:book.domain,source:book.source},{domain:'bookvue',source:'factory-preview'});
 const old=routeQuestion('Marshall amplifier');
 const preserved=simulateVueIntegration(input,'Marshall amplifier ISBN',routeQuestion);
 assert.equal(preserved.domain,routeQuestion('Marshall amplifier ISBN').domain);
 assert.equal(preserved.source,'existing');
 assert.equal(old.domain,'musicgearvue');
 const fallback=simulateVueIntegration(input,'Tell me a joke',routeQuestion);
 assert.equal(fallback.domain,'anyvue');
 assert.equal(fallback.source,'existing');
 assert.equal(routeQuestion('ISBN?').domain,'anyvue');
 assert.throws(()=>simulateVueIntegration(input,'ISBN?',null),/router required/);
});
