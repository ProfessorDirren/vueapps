/**
 * VUEFACTORY v1 — deterministic, offline specialist scaffolding.
 * Generates a reviewable domain profile; never registers, deploys, or calls AI.
 */
export const FACTORY_LANGUAGES=Object.freeze(['en','es','sv','hi','zh-CN','ru','ar']);
const ID_PATTERN=/^[a-z][a-z0-9]{1,30}vue$/;
const forbidden=/[<>\x00-\x1f]/;
export function validateVueDefinition(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Definition must be an object');
 const {id,scope,method,labels,sources=[]}=value;
 if(typeof id!=='string'||!ID_PATTERN.test(id))throw Error('id must be a lowercase specialist name ending in vue');
 if(typeof scope!=='string'||scope.trim().length<12||scope.length>240||forbidden.test(scope))throw Error('Invalid scope');
 if(typeof method!=='string'||method.trim().length<80||method.length>3000||forbidden.test(method))throw Error('Method needs at least 80 characters of reviewable specialist guidance');
 if(!labels||typeof labels!=='object'||Array.isArray(labels))throw Error('All seven language labels required');
 for(const lang of FACTORY_LANGUAGES)if(typeof labels[lang]!=='string'||!labels[lang].trim()||labels[lang].length>90||forbidden.test(labels[lang]))throw Error('Missing/invalid label: '+lang);
 if(!Array.isArray(sources)||sources.length>12)throw Error('Invalid sources');
 for(const source of sources){
  if(!Array.isArray(source)||source.length!==2||typeof source[0]!=='string'||!source[0].trim()||source[0].length>100||typeof source[1]!=='string')throw Error('Invalid source');
  let url;try{url=new URL(source[1])}catch{throw Error('Invalid source URL')}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Sources must be public HTTPS URLs without credentials');
 }
 return {id,scope:scope.trim(),method:method.trim(),labels:Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,labels[lang].trim()])),sources};
}
/**
 * Fail closed on specialist ID collisions. Pass the existing registry's IDs
 * from the caller; no network calls or production writes are performed.
 */
export function checkVueCollision(input,existingIds=[]){
 const d=validateVueDefinition(input);
 if(!Array.isArray(existingIds)||existingIds.some(id=>typeof id!=='string'))throw Error('Invalid existing specialist registry');
 if(existingIds.includes(d.id))throw Error('Specialist already registered: '+d.id);
 return d;
}
/**
 * Generate safe, literal-keyword routing candidates without executable regex.
 * A reviewer must check semantic collisions before merging into VUECORE.
 */
export function buildRoutingCandidates(input,existingKeywords=[]){
 const d=checkVueCollision(input,[]);
 const raw=input.routingKeywords;
 if(!Array.isArray(raw)||raw.length<2||raw.length>30)throw Error('Provide 2–30 routing keywords');
 if(!Array.isArray(existingKeywords)||existingKeywords.some(x=>typeof x!=='string'))throw Error('Invalid existing routing keywords');
 const keywords=raw.map(value=>{
  if(typeof value!=='string')throw Error('Invalid routing keyword');
  const normalized=value.trim().toLocaleLowerCase('en');
  if((normalized.length<3&&!/^[\p{Script=Han}]{2}$/u.test(normalized))||normalized.length>60||forbidden.test(normalized)||!/^[\p{L}\p{M}\p{N} -]+$/u.test(normalized))throw Error('Unsafe routing keyword');
  return normalized;
 });
 if(new Set(keywords).size!==keywords.length)throw Error('Duplicate routing keyword');
 const existing=new Set(existingKeywords.map(x=>x.trim().toLocaleLowerCase('en')));
 const collisions=keywords.filter(x=>existing.has(x));
 return {specialist:d.id,keywords,collisions,reviewRequired:true,automaticRegistration:false};
}
/**
 * Offline routing preview. Does not change VUECORE's live router.
 * Unicode word boundaries avoid substring matches (e.g. ISBN vs ISBNs).
 * Multi-word phrases are matched as literal sequences.
 */
export function previewVueRouting(input,question){
 const candidate=buildRoutingCandidates(input);
 if(typeof question!=='string'||question.length>3000)throw Error('Invalid preview question');
 const q=question.toLocaleLowerCase('en');
 const isWord=char=>char!==undefined&&/[\p{L}\p{N}]/u.test(char);
 const matches=candidate.keywords.filter(keyword=>{
  let pos=q.indexOf(keyword);
  while(pos!==-1){
   const before=pos===0?undefined:q[pos-1];
   const after=q[pos+keyword.length];
   if((/^[\p{Script=Han}]+$/u.test(keyword))||(!isWord(before)&&!isWord(after)))return true;
   pos=q.indexOf(keyword,pos+1);
  }
  return false;
 });
 return {specialist:candidate.specialist,matched:matches.length>0,keywords:matches,reviewRequired:true,liveRouterModified:false};
}
/**
 * Dry-run integration against the real VUECORE router.
 * Existing specialist decisions always win; new keywords only claim ANYVUE
 * fallbacks. Never mutates the central registry or deploys.
 */
export function simulateVueIntegration(input,question,routeExisting){
 const proposed=previewVueRouting(input,question);
 if(typeof routeExisting!=='function')throw Error('Existing VUECORE router required');
 const existing=routeExisting(question);
 if(!existing||typeof existing!=='object'||typeof existing.domain!=='string'&&existing.clarify!==true)throw Error('Invalid existing VUECORE route');
 if(existing.clarify||existing.domain!=='anyvue')
  return {domain:existing.domain??null,clarify:!!existing.clarify,candidates:existing.candidates||[],source:'existing',proposedMatch:proposed.matched,reviewRequired:true};
 return {domain:proposed.matched?proposed.specialist:existing.domain,clarify:false,source:proposed.matched?'factory-preview':'existing',proposedMatch:proposed.matched,reviewRequired:true};
}
/**
 * Isolated, in-memory specialist registration for integration tests.
 * The real VUECORE registry and router remain unchanged.
 */
export function createFactoryTestRegistry(input,existingSpecialists,routeExisting){
 const definition=checkVueCollision(input,Object.keys(existingSpecialists||{}));
 if(typeof routeExisting!=='function')throw Error('Existing VUECORE router required');
 const profile=Object.freeze({scope:definition.scope,method:definition.method,...(definition.sources.length?{sources:definition.sources}:{})});
 const specialists=Object.freeze({...existingSpecialists,[definition.id]:profile});
 return Object.freeze({
  specialists,
  isRegistered:id=>Object.hasOwn(specialists,id),
  route:question=>simulateVueIntegration(input,question,routeExisting),
  guide:(id,language='en')=>{
   if(id!==definition.id)throw Error('Factory test guide only supports generated specialist');
   const locale=FACTORY_LANGUAGES.includes(language)?language:'en';
   return {domain:id,label:definition.labels[locale],scope:profile.scope,method:profile.method,sources:profile.sources||[],reviewRequired:true};
  }
 });
}
/**
 * Fetch-compatible test-only API handler. No network calls, AI usage, or
 * production registration. Explicitly limited to the factory sandbox.
 */
export function createFactoryTestApi(registry){
 if(!registry||typeof registry.route!=='function'||typeof registry.isRegistered!=='function'||typeof registry.guide!=='function')throw Error('Invalid factory test registry');
 return async function POST(request){
  let body;
  try{
   if(!request||request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
   const raw=await request.text();
   if(raw.length>10000)return Response.json({error:'Too large'},{status:413});
   body=JSON.parse(raw);
  }catch{return Response.json({error:'Invalid JSON'},{status:400})}
  if(!body||typeof body.question!=='string'||body.question.trim().length<3||body.question.length>3000||!FACTORY_LANGUAGES.includes(body.language))return Response.json({error:'Invalid request'},{status:400});
  const route=registry.route(body.question);
  if(route.clarify)return Response.json({domain:null,clarify:true,candidates:route.candidates||[],testOnly:true});
  if(!registry.isRegistered(route.domain))return Response.json({error:'Unregistered specialist'},{status:422});
  if(route.source!=='factory-preview')return Response.json({domain:route.domain,source:'existing',testOnly:true,answer:null});
  const guide=registry.guide(route.domain,body.language);
  return Response.json({domain:route.domain,source:route.source,guide,reviewRequired:true,testOnly:true});
 };
}
/**
 * Build a deterministic review-only change proposal for the real VUECORE
 * registry. A human must supply localized questions before activation.
 */
export function buildVueCoreIntegrationProposal(input){
 const d=validateVueDefinition(input);
 const candidate=Array.isArray(input.routingKeywords)?buildRoutingCandidates(input):null;
 const profile={scope:d.scope,method:d.method,...(d.sources.length?{sources:d.sources}:{})};
 return {
  specialist:d.id,
  status:'blocked-pending-review',
  edits:[
   {file:'core/specialists.js',section:'SPECIALISTS',key:d.id,value:profile,action:'add'},
   {file:'core/specialists.js',section:'questions',key:d.id,value:null,action:'add-seven-localized-question-arrays'},
   {file:'core/router.js',section:'rules',key:d.id,value:candidate?.keywords||[],action:'review-and-add-pattern'},
   {file:'apps/router-content.js',section:'localization',key:d.id,value:d.labels,action:'review-labels'},
   {file:'api/vue-router.js',section:'dispatch',key:d.id,value:null,action:'review-api-routing'}
  ],
  blockers:['Seven localized specialist question arrays','Routing collision and precedence review','Domain safety and emergency review','API and end-to-end regression tests'],
  productionReady:false,
  automaticApply:false
 };
}
/**
 * Validate all localized follow-up prompts before preparing a real integration.
 * Existing drafts remain supported; activation must explicitly opt into this gate.
 */
export function validateVueActivation(input,existingIds=[],existingKeywords=[]){
 const definition=checkVueCollision(input,existingIds);
 const routing=buildRoutingCandidates(input,existingKeywords);
 if(routing.collisions.length)throw Error('Routing keyword collision: '+routing.collisions.join(', '));
 const questions=input.questions;
 if(!questions||typeof questions!=='object'||Array.isArray(questions))throw Error('Seven localized question arrays required for activation');
 const localized={};
 for(const language of FACTORY_LANGUAGES){
  const items=questions[language];
  if(!Array.isArray(items)||items.length!==3)throw Error('Exactly three questions required: '+language);
  if(items.some(q=>typeof q!=='string'||q.trim().length<12||q.length>240||forbidden.test(q)))throw Error('Invalid specialist questions: '+language);
  if(new Set(items.map(q=>q.trim().toLocaleLowerCase(language))).size!==3)throw Error('Duplicate specialist questions: '+language);
  localized[language]=items.map(q=>q.trim());
 }
 return Object.freeze({definition,routing,questions:Object.freeze(localized),requiresSafetyReview:true,automaticDeployment:false});
}
export function scaffoldVue(input){
 const d=validateVueDefinition(input);
 const profile={scope:d.scope,method:d.method,...(d.sources.length?{sources:d.sources}:{})};
 const js='// Generated by VUEFACTORY. REVIEW BEFORE REGISTRATION.\n'
  +'// Import this profile into core/specialists.js only after domain review.\n'
  +'export const profile = Object.freeze('+JSON.stringify(profile,null,2)+');\n'
  +'export const labels = Object.freeze('+JSON.stringify(d.labels,null,2)+');\n';
 const routingCandidates=Array.isArray(input.routingKeywords)?buildRoutingCandidates(input):null;
 const integration={
  version:1,
  specialist:d.id,
  status:'review-required',
  registration:{profile:'core/specialists.js',memory:'core/memory.js',router:'core/router.js',api:'api/vue-router.js'},
  languages:FACTORY_LANGUAGES,
  labels:d.labels,
  routing:{patterns:routingCandidates?.keywords||[],priority:null,collisionReviewRequired:true},
  safety:{emergencyReviewRequired:true,sourceReviewRequired:true,apiReviewRequired:true},
  deploy:{automatic:false,approved:false}
 };
 const integrationFile=JSON.stringify(integration,null,2)+'\n';
 const changeProposal=JSON.stringify(buildVueCoreIntegrationProposal(input),null,2)+'\n';
 const registrySnippet='// REVIEW BEFORE ADDING to core/specialists.js\n'
  +JSON.stringify(d.id)+': '+JSON.stringify(profile,null,2)+',\n';
 const routeSnippet='// REVIEW: add a language-aware, collision-tested route in core/router.js\n'
  +'// '+d.id+': define specific patterns and priority; do not auto-route generic terms.\n';
 const checklist=[
  '# '+d.id.toUpperCase()+' — release checklist','',
  '- [ ] Review specialist scope, method, emergency/safety boundaries and sources.',
  '- [ ] Add profile to core/specialists.js (manual review required).',
  '- [ ] Register specialist in core/specialists registry and any memory domain allowlists.',
  '- [ ] Add multilingual routing patterns and check collisions in core/router.js.',
  '- [ ] Add all seven labels to relevant UI and specialist translations.',
  '- [ ] Add API routing and authorization checks where applicable.',
  '- [ ] Add domain-specific tests, including safety and language regression tests.',
  '- [ ] Run npm test and inspect the preview before release.',
  '- [ ] Confirm zero new paid services and approve production deployment.',''
 ].join('\n');
 return {id:d.id,files:{['generated/'+d.id+'/profile.js']:js,['generated/'+d.id+'/RELEASE-CHECKLIST.md']:checklist,['generated/'+d.id+'/integration-plan.json']:integrationFile,['generated/'+d.id+'/vuecore-change-proposal.json']:changeProposal,['generated/'+d.id+'/registry-snippet.txt']:registrySnippet,['generated/'+d.id+'/routing-review.txt']:routeSnippet,...(routingCandidates?{['generated/'+d.id+'/routing-candidates.json']:JSON.stringify(routingCandidates,null,2)+'\n'}:{})}};
}
