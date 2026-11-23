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

test('COMMUTE-VUE voice submits once only after final speech and recording ends',()=>{
 const clicks={};let sends=0,recognizer;
 const button={setAttribute(){},addEventListener:(name,fn)=>{clicks[name]=fn;},textContent:''};
 const status={textContent:''};
 const input={value:'',dispatchEvent(){}};
 const picker={value:'es',addEventListener(){}};
 const brain={classList:{toggle(){}}};
 const send={click(){sends++;}};
 const elements={'vue-router-mic':button,'vue-router-mic-status':status,'vue-router-question':input,'language':picker,'vue-router-send':send};
 class Recognition{
  constructor(){recognizer=this;}
  start(){}
  stop(){this.onend();}
 }
 initPushToTalk({documentRef:{getElementById:id=>elements[id],querySelector:()=>brain,addEventListener(){}},Recognition,autoSubmit:true});
 clicks.click();
 assert.equal(recognizer.lang,'es-ES');
 recognizer.onresult({resultIndex:0,results:[Object.assign([{transcript:'Próximo tren de Jordbro a Stockholm City'}],{isFinal:true})]});
 assert.equal(sends,0);
 clicks.click();
 assert.equal(sends,1);
 assert.match(input.value,/Próximo tren/);
 recognizer.onend();
 assert.equal(sends,1);
});
test('voice never submits empty speech',()=>{
 const clicks={};let sends=0,recognizer;
 const button={setAttribute(){},addEventListener:(name,fn)=>{clicks[name]=fn;},textContent:''};
 const elements={'vue-router-mic':button,'vue-router-mic-status':{textContent:''},'vue-router-question':{value:'',dispatchEvent(){}},'language':{value:'es',addEventListener(){}},'vue-router-send':{click(){sends++;}}};
 class Recognition{constructor(){recognizer=this;}start(){}stop(){this.onend();}}
 initPushToTalk({documentRef:{getElementById:id=>elements[id],querySelector:()=>({classList:{toggle(){}}}),addEventListener(){}},Recognition,autoSubmit:true});
 clicks.click();clicks.click();assert.equal(sends,0);
});
