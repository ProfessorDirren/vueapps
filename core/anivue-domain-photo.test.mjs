import test from 'node:test';
import assert from 'node:assert/strict';
import {AniVueDomain} from './anivue.js';
import {VueDomain} from './index.js';
import {readFileSync} from 'node:fs';

test('native photo analysis uses the VUECORE domain inheritance and API',async()=>{
 const calls=[];
 const domain=new AniVueDomain({fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({species:{value:'horse',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Visual observation',visibleObservations:[{observation:'Visible detail',confidence:'medium',significance:'normal'}],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[],emergencyAdvice:'Contact emergency veterinarian'})};
 }});
 assert.ok(domain instanceof VueDomain);
 assert.equal(domain.capabilities.imageAnalysis,true);
 const result=await domain.analyzePhoto({image:'data:image/png;base64,abc',species:'horse',symptoms:['horseColic'],language:'es'});
 assert.equal(result.emergencyAdvice,'Contact emergency veterinarian');
 assert.equal(calls[0].url,'/api/vue-router');
 const body=JSON.parse(calls[0].options.body);
 assert.equal(body.action,'anivue_analyze');
 assert.deepEqual(body.symptoms,['horseColic']);
 assert.equal(body.language,'es');
});

test('unsupported species and language do not reach photo provider',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('Unexpected')}});
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'horse',language:'fr'}),error=>error.code==='invalid_language');
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'cow',language:'en'}),error=>error.code==='invalid_species');
 assert.equal(calls,0);
});

test('emergency rules remain independent of photo service availability',()=>{
 const domain=new AniVueDomain({fetcher:async()=>{throw Error('Provider unavailable')}});
 assert.equal(domain.emergencyCheck({species:'horse',symptoms:['horseColic']}).severity,'emergency');
});

test('native photo picker invalidation resets the pending read task',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.match(page,/if\(!file\)\{photoReadTask=Promise\.resolve\(\);showPhotoStatus\(null\);return\}/);
 assert.match(page,/file\.size===0\)\{photoReadTask=Promise\.resolve\(\);showPhotoStatus\(0\);photo\.value='';camera\.value='';selectedPhotoFile=null;return\}/);
});

test('mobile capture controls use VUECORE hints without claiming video analysis',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.match(page,/MEDIA_CAPTURE,validateMedia/);
 assert.match(page,/input\.setAttribute\('capture',MEDIA_CAPTURE\[kind\]\.capture\)/);
 assert.match(page,/validateMedia\(file,'video'\)/);
 assert.match(page,/Video analysis is not available yet/);
});


test('ANIVUE native photo upload remains aligned with the supported server image formats',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('./image-input.js',import.meta.url),'utf8');
 assert.ok(page.includes('accept="image/jpeg,image/png,image/webp"'));
 assert.ok(page.includes("input.accept=kind==='image'?'image/jpeg,image/png,image/webp':MEDIA_CAPTURE[kind].accept"));
 assert.ok(page.includes('file.size>10*1024*1024'));
 assert.ok(page.includes('createImageBitmap(file)'));
 assert.ok(page.includes("typeof createImageBitmap!=='function'"));
 assert.ok(page.includes("bitmap.width<128||bitmap.height<128"));
 assert.ok(page.includes("canvas.width<128||canvas.height<128"));
 assert.ok(page.includes("canvas.toDataURL('image/jpeg',0.78)"));
 assert.ok(page.includes('data.length<=3900000'));
 assert.ok(page.includes('data.length>4200000'));
 assert.ok(page.includes('Invalid prepared photo'));
 assert.ok(page.includes('const photoVersionAtSubmit=photoReadVersion;await photoReadTask;'));
 assert.ok(page.includes('photoVersionAtSubmit!==photoReadVersion'));
 assert.ok(page.includes('if(photoVersionAtSubmit!==photoReadVersion)throw Error(photoStatusText[picker.value][2]);}catch(error)'));
 assert.ok(page.includes('if(error?.message===photoStatusText[picker.value][2])throw error;'));
 assert.match(page,/imageData=null;\s*showPhotoStatus\(null\);\s*selectedPhotoFile=file\|\|null;/);
 assert.ok(server.includes('bytes.length>3*1024*1024'));
 assert.ok(server.includes('jpeg|png|webp'));
});


test('ANIVUE reports a controlled error when vision service returns unreadable JSON',async()=>{
 const domain=new AniVueDomain({fetcher:async()=>({ok:false,json:async()=>{throw new SyntaxError('bad json')}})});
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog',language:'en'}),error=>error.code==='image_analysis_unavailable');
});


test('ANIVUE rejects empty or malformed image observations',async()=>{
 for(const observations of [[{observation:''}],[null],[{observation:42}]]){
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>({summary:'Photo',visibleObservations:observations,limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]})})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'cat',language:'en'}),error=>error.code==='invalid_analysis');
 }
});


test('ANIVUE masks malformed error bodies from the vision service',async()=>{
 for(const body of [null,{}, {error:42}]){
  const domain=new AniVueDomain({fetcher:async()=>({ok:false,json:async()=>body})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'horse',language:'en'}),error=>error.code==='image_analysis_unavailable'&&error.message==='Image analysis unavailable');
 }
});


test('ANIVUE rejects missing structured vision arrays',async()=>{
 for(const key of ['limitations','suggestedFollowUpQuestions','emergencySignals']){
  const result={summary:'Photo',visibleObservations:[],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]};
  delete result[key];
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>result})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog',language:'en'}),error=>error.code==='invalid_analysis');
 }
});


test('ANIVUE rejects non-string elements in vision result arrays',async()=>{
 for(const key of ['limitations','suggestedFollowUpQuestions','emergencySignals']){
  const result={summary:'Photo',visibleObservations:[],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]};
  result[key]=[null];
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>result})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'horse',language:'en'}),error=>error.code==='invalid_analysis',key);
 }
});


test('ANIVUE normalizes failed vision network requests',async()=>{
 const domain=new AniVueDomain({fetcher:async()=>{throw new TypeError('network disconnected')}});
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog',language:'en'}),error=>error.code==='image_analysis_unavailable');
});


test('ANIVUE clears failed photo reads without blocking text-only assessments',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.ok(page.includes("selectedPhotoFile=null;photo.value='';camera.value='';showPhotoStatus(2)"));
});


test('ANIVUE photo timeouts become controlled errors without affecting emergency triage',async()=>{
 const domain=new AniVueDomain({fetcher:async()=>{const error=new Error('Timed out');error.name='TimeoutError';throw error}});
 assert.equal(domain.emergencyCheck({species:'horse',symptoms:['horseChoke']}).severity,'emergency');
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'horse',language:'sv'}),error=>error.code==='image_analysis_unavailable');
});


test('ANIVUE preserves successful photo analysis in every supported language',async()=>{
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar']){
  let sent;
  const domain=new AniVueDomain({fetcher:async(_url,options)=>{
   sent=JSON.parse(options.body);
   return {ok:true,json:async()=>({species:{value:'cat',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Visible findings',visibleObservations:[{observation:'Visible finding',significance:'normal',confidence:'medium'}],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]})};
  }});
  const result=await domain.analyzePhoto({image:'data:image/png;base64,abc',species:'cat',language});
  assert.equal(sent.language,language);
  assert.equal(result.summary,'Visible findings');
 }
});


test('ANIVUE defaults photo requests to English unless a language is selected',async()=>{
 let request;
 const domain=new AniVueDomain({fetcher:async(_url,options)=>{
  request=JSON.parse(options.body);
  return {ok:true,json:async()=>({species:{value:'dog',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Visible findings',visibleObservations:[{observation:'Visible detail',confidence:'medium',significance:'normal'}],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]})};
 }});
 await domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'});
 assert.equal(request.language,'en');
});


test('ANIVUE photo request preserves user observations for the selected species',async()=>{
 let request;
 const domain=new AniVueDomain({fetcher:async(_url,options)=>{
  request=JSON.parse(options.body);
  return {ok:true,json:async()=>({species:{value:'horse',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Visual findings',visibleObservations:[{observation:'Visible detail',confidence:'medium',significance:'normal'}],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]})};
 }});
 await domain.analyzePhoto({image:'data:image/png;base64,abc',species:'horse',description:'Limping after exercise',symptoms:['horseCannotBearWeight'],language:'sv'});
 assert.equal(request.species,'horse');
 assert.equal(request.description,'Limping after exercise');
 assert.deepEqual(request.symptoms,['horseCannotBearWeight']);
 assert.equal(request.language,'sv');
});


test('ANIVUE rejects observations without valid urgency and confidence metadata',async()=>{
 for(const observation of [{observation:'Swelling'},{observation:'Swelling',significance:'urgent'},{observation:'Swelling',significance:'unknown',confidence:'high'}]){
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>({summary:'Photo',visibleObservations:[observation],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]})})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='invalid_analysis');
 }
});


test('ANIVUE rejects mismatched species and missing age or breed assessments',async()=>{
 for(const bad of [{species:{value:'cat',confidence:'high'}},{breedAssessment:null},{ageAssessment:null}]){
  const result={species:{value:'dog',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Photo',visibleObservations:[],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[],...bad};
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>result})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='invalid_analysis');
 }
});


test('ANIVUE reports a useful fallback when provider error text is blank',async()=>{
 for(const errorText of ['', '   ']){
  const domain=new AniVueDomain({fetcher:async()=>({ok:false,json:async()=>({error:errorText})})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='image_analysis_unavailable'&&error.message==='Image analysis unavailable');
 }
});


test('ANIVUE rejects malformed alternative breed entries',async()=>{
 const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>({species:{value:'dog',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[null,123],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Photo',visibleObservations:[],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]})})});
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='invalid_analysis');
});


test('ANIVUE rejects non-text breed and age predictions',async()=>{
 for(const change of [{breedAssessment:{likelyBreed:42,alternatives:[],confidence:'low'}},{ageAssessment:{estimatedRange:{years:5},confidence:'low'}}]){
  const result={species:{value:'dog',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Photo',visibleObservations:[],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[],...change};
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>result})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='invalid_analysis');
 }
});


test('ANIVUE rejects malformed emergency advice rather than rendering an object',async()=>{
 const result={species:{value:'dog',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Photo',visibleObservations:[],limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[],emergencyAdvice:{message:'Call vet'}};
 const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>result})});
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='invalid_analysis');
});


test('ANIVUE rejects empty or excessive observations even with otherwise valid metadata',async()=>{
 for(const count of [0,11]){
  const result={species:{value:'dog',confidence:'high'},breedAssessment:{likelyBreed:null,alternatives:[],confidence:'low'},ageAssessment:{estimatedRange:null,confidence:'low'},summary:'Photo',visibleObservations:Array.from({length:count},()=>({observation:'Visible detail',confidence:'medium',significance:'normal'})),limitations:[],suggestedFollowUpQuestions:[],emergencySignals:[]};
  const domain=new AniVueDomain({fetcher:async()=>({ok:true,json:async()=>result})});
  await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'dog'}),error=>error.code==='invalid_analysis');
 }
});


test('ANIVUE distinguishes exhausted image quota from other provider failures',async()=>{
 const domain=new AniVueDomain({fetcher:async()=>({ok:false,status:429,json:async()=>({error:'Daily analysis budget unavailable'})})});
 await assert.rejects(domain.analyzePhoto({image:'data:image/png;base64,abc',species:'cat'}),error=>error.code==='image_analysis_limit');
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.ok(page.includes("error?.code==='image_analysis_limit'?2:0"));
});


test('ANIVUE emergency assessment bypasses remote text flow even without photo',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.ok(page.includes("const check=emergency?{assessment:emergency}:(imageData||selectedPhotoFile)?"));
 assert.ok(page.includes("if(!imageData&&!selectedPhotoFile)return;"));
});
