import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../analytics.js',import.meta.url),'utf8');

function boot({dnt=null,gpc=false,hostname='www.vueapps.se',fetchResponse={ok:true}}={}){
  const listeners=new Map();
  const captures=[];
  const requests=[];
  const document={
    addEventListener(name,callback){listeners.set(name,callback)},
    dispatchEvent(event){listeners.get(event.type)?.(event)},
    head:{appendChild(script){this.script=script}},
    createElement(){return {}},
    referrer:'',
    title:'VUEAPPS',
  };
  const location={hostname,origin:'https://www.vueapps.se',pathname:'/',href:'https://www.vueapps.se/'};
  const navigator={doNotTrack:dnt,globalPrivacyControl:gpc};
  const window={fetch:(...args)=>{requests.push(args);return Promise.resolve(fetchResponse)},
    posthog:{init(_key,options){options.loaded({capture:(name,properties)=>captures.push({name,properties})})}}};
  class CustomEvent{constructor(type,{detail}){this.type=type;this.detail=detail}}
  runInNewContext(source,{document,location,navigator,window,CustomEvent,URL,Set});
  return {document,window,captures,requests};
}
test('VUEGUARD: DNT and GPC block all analytics initialization',()=>{
  for(const privacy of [{dnt:'1'},{gpc:true},{hostname:'example.org'}]){
    const env=boot(privacy);
    assert.equal(env.document.head.script,undefined);
    assert.equal(env.captures.length,0);
  }
});
test('VUEGUARD: pageview and lifecycle events carry only safe metadata',async()=>{
  const env=boot();
  env.document.head.script.onload();
  assert.equal(env.captures[0].name,'$pageview');
  await env.window.fetch('/api/vue-router',{method:'POST',body:'PRIVATE HEALTH QUESTION'});
  assert.deepEqual(env.captures.map(e=>e.name),['$pageview','assessment_started','assessment_completed']);
  for(const event of env.captures) assert.doesNotMatch(JSON.stringify(event),'PRIVATE HEALTH QUESTION');
});
test('VUEGUARD: non-assessment POSTs do not generate lifecycle events',async()=>{
  const env=boot();
  env.document.head.script.onload();
  await env.window.fetch('/api/unlisted',{method:'POST'});
  await env.window.fetch('https://other.example/api/vue-router',{method:'POST'});
  assert.deepEqual(env.captures.map(e=>e.name),['$pageview']);
});
test('VUEGUARD: a failed HTTP response cannot be counted as completed',async()=>{
  const env=boot({fetchResponse:{ok:false,status:500}});
  env.document.head.script.onload();
  await env.window.fetch('/api/vue-router',{method:'POST'});
  assert.deepEqual(env.captures.map(e=>e.name),['$pageview','assessment_started']);
});
