import test from 'node:test';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {FACTORY_LANGUAGES,validateVueDefinition,scaffoldVue,checkVueCollision,buildRoutingCandidates,previewVueRouting,simulateVueIntegration,createFactoryTestRegistry,createFactoryTestApi,buildVueCoreIntegrationProposal} from './vuefactory.js';
const definition={
 id:'bookvue',
 scope:'Book identification, edition comparison and collection research',
 method:'Identify author, title, publisher, ISBN, edition, printing, condition and provenance. Distinguish observed details from assumptions, use verifiable catalogues, and never assert authenticity or market value without corroboration.',
 labels:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,'Books'])),
 questions:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,['Which book are you researching?','What edition or printing do you have?','Which details can you verify from the book?']])),
 sources:[['Library of Congress','https://www.loc.gov/']]
};
test('factory generates a deterministic reviewable profile and checklist',()=>{
 const a=scaffoldVue(definition),b=scaffoldVue(definition);
 assert.deepEqual(a,b);
 assert.match(a.files['generated/bookvue/profile.js'],/Book identification/);
 assert.match(a.files['generated/bookvue/RELEASE-CHECKLIST.md'],/manual review required/);
 assert.equal(Object.keys(a.files).length,8);
 const requirements=JSON.parse(a.files['generated/bookvue/test-requirements.json']);
 assert.equal(requirements.specialist,'bookvue');
 assert.equal(requirements.vercelBuildsDuringDevelopment,0);
 assert.equal(requirements.previewRequired,true);
 assert.equal(requirements.productionApproved,false);
 assert.ok(requirements.required.includes('domain-safety'));
 assert.ok(requirements.required.includes('routing-smoke'));
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
test('factory blocks internal, loopback and private source addresses',()=>{
 for(const host of ['localhost','app.local','server.internal','127.0.0.1','10.0.0.8','172.16.0.1','192.168.1.2','169.254.1.1','[::1]']){
  assert.throws(()=>validateVueDefinition({...definition,sources:[['internal','https://'+host+'/']]}),/public HTTPS/,host);
 }
 assert.doesNotThrow(()=>validateVueDefinition(definition));
});
test('factory rejects encoded loopback, IPv6 and metadata endpoints',()=>{
 for(const host of ['0x7f000001','2130706433','0177.0.0.1','127.1','[::1]','[::ffff:127.0.0.1]','169.254.169.254','100.100.100.200','metadata.google.internal']){
  assert.throws(()=>validateVueDefinition({...definition,sources:[['blocked','https://'+host+'/']]}),/public HTTPS/,host);
 }
 assert.doesNotThrow(()=>validateVueDefinition({...definition,sources:[['public','https://www.loc.gov/']]}));
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
  assert.equal(files.length,11);
  assert.ok(files.includes('test-requirements.json'));
  assert.ok(files.includes('contract.test.mjs'));
  const childEnv={...process.env};
  delete childEnv.NODE_TEST_CONTEXT;
  const runContract=()=>spawnSync(process.execPath,['--test',join(directory,'contract.test.mjs')],{cwd:root,timeout:15000,encoding:'utf8',env:childEnv});
  const baseline=runContract();
  assert.equal(baseline.status,0,'Generated contract baseline failed: '+baseline.stdout+' '+baseline.stderr);
  assert.match(baseline.stdout,/# tests 2/,'Generated tests did not execute');
  const profilePath=join(directory,'profile.js');
  const originalProfile=await readFile(profilePath,'utf8');
  assert.ok(originalProfile.includes('https://www.loc.gov/'));
  await writeFile(profilePath,originalProfile.replace('https://www.loc.gov/','http://www.loc.gov/'));
  const tampered=runContract();
  assert.notEqual(tampered.status,0,'Tampered source unexpectedly passed: '+tampered.stdout+' '+tampered.stderr);
  await writeFile(profilePath,originalProfile);
  const restored=runContract();
  assert.equal(restored.status,0,'Restored contract failed: '+restored.stdout+' '+restored.stderr);
  assert.match(restored.stdout,/# tests 2/);
  const plan=JSON.parse(await readFile(join(directory,'integration-plan.json'),'utf8'));
  const routing=JSON.parse(await readFile(join(directory,'routing-candidates.json'),'utf8'));
  const audit=JSON.parse(await readFile(join(directory,'existing-router-audit.json'),'utf8'));
  const dryRun=JSON.parse(await readFile(join(directory,'integration-dry-run.json'),'utf8'));
  assert.equal(dryRun.productionIntegrated,false);
  assert.equal(dryRun.cases.length,4);
  assert.ok(dryRun.cases.some(x=>x.result.domain==='bookvue'));
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

test('BOOKVUE registers only in an isolated VUECORE test registry',async()=>{
 const {routeQuestion}=await import('./router.js');
 const {SPECIALISTS,isRegisteredSpecialist}=await import('./specialists.js');
 const input={...definition,routingKeywords:['ISBN','book edition','författare']};
 const sandbox=createFactoryTestRegistry(input,SPECIALISTS,routeQuestion);
 assert.equal(sandbox.isRegistered('bookvue'),true);
 assert.equal(sandbox.isRegistered('anivue'),true);
 assert.equal(isRegisteredSpecialist('bookvue'),false);
 assert.equal(Object.hasOwn(SPECIALISTS,'bookvue'),false);
 assert.equal(sandbox.route('ISBN?').domain,'bookvue');
 assert.equal(sandbox.route('Marshall amplifier').domain,'musicgearvue');
 assert.equal(routeQuestion('ISBN?').domain,'anyvue');
 assert.equal(sandbox.guide('bookvue','sv').domain,'bookvue');
 assert.equal(sandbox.guide('bookvue','xx').label,input.labels.en);
 assert.throws(()=>sandbox.guide('anivue'),/only supports/);
 assert.throws(()=>createFactoryTestRegistry({...input,id:'anivue'},SPECIALISTS,routeQuestion),/already registered/);
});

test('isolated POST API routes BOOKVUE without touching the production API',async()=>{
 const {routeQuestion}=await import('./router.js');
 const {SPECIALISTS}=await import('./specialists.js');
 const input={...definition,routingKeywords:['ISBN','book edition','författare']};
 const POST=createFactoryTestApi(createFactoryTestRegistry(input,SPECIALISTS,routeQuestion));
 const send=body=>POST(new Request('https://localhost/test-factory',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 const book=await send({question:'What is this ISBN?',language:'sv'});
 assert.equal(book.status,200);
 const payload=await book.json();
 assert.equal(payload.domain,'bookvue');
 assert.equal(payload.testOnly,true);
 assert.equal(payload.guide.label,input.labels.sv);
 const existing=await send({question:'Marshall amplifier',language:'en'});
 assert.equal((await existing.json()).domain,'musicgearvue');
 const bad=await send({question:'ISBN',language:'xx'});
 assert.equal(bad.status,400);
 const malformed=await POST(new Request('https://localhost/test-factory',{method:'POST',body:'{'}));
 assert.equal(malformed.status,400);
});

test('VUECORE change proposal enumerates real integration points and blocks unreviewed releases',()=>{
 const input={...definition,routingKeywords:['ISBN','book edition']};
 const proposal=buildVueCoreIntegrationProposal(input);
 assert.equal(proposal.productionReady,false);
 assert.equal(proposal.automaticApply,false);
 assert.deepEqual(proposal.edits.map(x=>x.file),['core/specialists.js','core/specialists.js','core/router.js','apps/router-content.js','api/vue-router.js']);
 assert.equal(proposal.edits[1].value,null);
 assert.deepEqual(proposal.edits[2].value,['isbn','book edition']);
 const file=JSON.parse(scaffoldVue(input).files['generated/bookvue/vuecore-change-proposal.json']);
 assert.deepEqual(file,proposal);
});
