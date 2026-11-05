import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVuecoreVideoInput} from './video-input.js';
function node(){
 const handlers=new Map();
 return {textContent:'',hidden:true,value:'',files:[],readyState:0,
 addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:(name)=>handlers.delete(name),
 click(){handlers.get('click')?.();},fire(name){handlers.get(name)?.({target:this});},
 pause(){},load(){},removeAttribute(){},handlers};
}
test('shared VUECORE video component mounts, translates and disposes without uploads',()=>{
 const ids=['vue-router-video-record','vue-router-video-choose','vue-router-video-preview','vue-router-video-panel','vue-router-video-notice','vue-router-video-record-file','vue-router-video-choose-file','vue-router-video-remove'];
 const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
 const root={documentElement:{lang:'sv'},getElementById:id=>nodes[id]};
 const oldWindow=globalThis.window;
 globalThis.window={addEventListener(){},removeEventListener(){}};
 try{
  const dispose=mountVuecoreVideoInput({root,status:node()});
  assert.equal(nodes['vue-router-video-record'].textContent,'Spela in video');
  assert.equal(nodes['vue-router-video-choose'].textContent,'Välj en video');
  assert.equal(nodes['vue-router-video-panel'].hidden,true);
  dispose();
  assert.equal(nodes['vue-router-video-choose'].handlers.size,0);
  assert.equal(nodes['vue-router-video-record-file'].handlers.size,0);
 }finally{globalThis.window=oldWindow;}
});
test('component does not throw when optional DOM controls are missing',()=>{
 const root={documentElement:{lang:'en'},getElementById:id=>id==='vue-router-video-record'||id==='vue-router-video-choose'?node():null};
 assert.doesNotThrow(()=>mountVuecoreVideoInput({root,status:node()})());
});
