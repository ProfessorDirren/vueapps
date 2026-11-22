import test from 'node:test';
import assert from 'node:assert/strict';
import {speechLocale,initPushToTalk} from './push-to-talk.js';
test('speech locale maps all portal languages to explicit recognizer locales',()=>{
 const languages=['en','sv','es','hi','zh-CN','ru','ar','fr','el','tr','fa','it'];
 for(const lang of languages)assert.match(speechLocale(lang),/^[a-z]{2,3}-[A-Z]{2}$/);
 assert.equal(speechLocale('sv'),'sv-SE');
 assert.equal(speechLocale('it'),'it-IT');
});
test('push to talk leaves unsupported browser inert and does not submit',()=>{
 let clicks=[];
 const button={setAttribute(){},addEventListener:(event,handler)=>clicks.push(handler),classList:{toggle(){}},textContent:''};
 const status={textContent:''};
 const input={value:'',dispatchEvent(){}};
 const picker={value:'sv',addEventListener(){}};
 const brain={classList:{toggle(){}}};
 const elements={'vue-router-mic':button,'vue-router-mic-status':status,'vue-router-question':input,'language':picker};
 initPushToTalk({documentRef:{getElementById:id=>elements[id],querySelector:()=>brain,addEventListener(){}},Recognition:null});
 clicks[0]();
 assert.match(status.textContent,/stöds inte/);
 assert.equal(input.value,'');
});
