import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../analytics.js',import.meta.url),'utf8');
for(const [pathname,expected] of [['/','VUEAPPS'],['/anivue-core.html','ANIVUE'],['/homevue.html','HOMEVUE']])test('PostHog canonical page label: '+pathname,()=>{
 const captures=[];const listeners=new Map();
 const document={addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent:e=>listeners.get(e.type)?.(e),createElement:()=>({}),head:{appendChild(s){s.onload()}},referrer:'',title:'VUEAPPS'};
 const location={hostname:'vueapps.se',origin:'https://vueapps.se',pathname,href:'https://vueapps.se'+pathname};
 const window={fetch:()=>Promise.resolve({ok:true}),posthog:{init(_key,options){options.loaded({capture:(name,properties)=>captures.push({name,properties})})}}};
 class CustomEvent{constructor(type,{detail}){this.type=type;this.detail=detail}}
 runInNewContext(source,{document,location,window,navigator:{},URL,Set,CustomEvent});
 assert.equal(captures.find(x=>x.name==='$pageview')?.properties.vue_app,expected);
});
