import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyMusic,validateMusicClip} from './music-recognition.js';
import {POST} from '../api/music-recognition.js';
const clip=()=>new File([new Uint8Array(200)],'sample.webm',{type:'audio/webm'});
test('VUECORE rejects unsupported and oversized recordings',()=>{
 assert.equal(validateMusicClip(new File(['abc'],'x.txt',{type:'text/plain'})).code,'unsupported_type');
 assert.equal(validateMusicClip({size:11*1024*1024,type:'audio/webm'}).code,'invalid_size');
});
test('provider token stays in server request and normalized song metadata is returned',async()=>{
 let sent;
 const result=await identifyMusic(clip(),{token:'test-secret',fetcher:async(url,opts)=>{sent={url,opts};return {ok:true,json:async()=>({status:'success',result:{artist:'Artist',title:'Track',album:'Album'}})}}});
 assert.equal(sent.url,'https://api.audd.io/');
 assert.equal(sent.opts.body.get('api_token'),'test-secret');
 assert.deepEqual(result.match,{artist:'Artist',title:'Track',album:'Album',release_date:null,song_link:null});
});
test('unrecognized song is not treated as provider error',async()=>{
 const result=await identifyMusic(clip(),{token:'test-secret',fetcher:async()=>({ok:true,json:async()=>({status:'success',result:null})})});
 assert.deepEqual(result,{ok:true,match:null});
});
test('missing token blocks request before upload or provider call',async()=>{
 const response=await POST(new Request('https://localhost/api/music-recognition',{method:'POST'}),{token:''});
 assert.equal(response.status,503);
});
test('multipart request returns VINYLVUE result',async()=>{
 const form=new FormData();form.set('file',clip());
 const response=await POST(new Request('https://localhost/api/music-recognition',{method:'POST',body:form}),{token:'test-secret',fetcher:async()=>({ok:true,json:async()=>({status:'success',result:{artist:'A',title:'B'}})})});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{match:{artist:'A',title:'B',album:null,release_date:null,song_link:null},specialist:'vinylvue'});
});
