import test from 'node:test';
import assert from 'node:assert/strict';
import {AniVueDomain} from './anivue.js';
import {VueDomain} from './index.js';
import {readFileSync} from 'node:fs';

test('native photo analysis uses the VUECORE domain inheritance and API',async()=>{
 const calls=[];
 const domain=new AniVueDomain({fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({summary:'Visual observation',visibleObservations:[],emergencyAdvice:'Contact emergency veterinarian'})};
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
 assert.ok(page.includes('file.size>3*1024*1024'));
 assert.ok(server.includes('bytes.length>3*1024*1024'));
 assert.ok(server.includes('jpeg|png|webp'));
});
