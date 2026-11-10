import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=['anyvue','antiqvue','armvue','estatevue','foodvue','homevue','medivue','motovue','musicgearvue','plantvue','slumpvue','vinylvue','wardrobevue'];
test('all standalone VUEs inherit VUECORE navigation',()=>{
 const module=readFileSync(new URL('../apps/specialist-navigation.js',import.meta.url),'utf8');
 assert.match(module,/PortalVueHelp/);
 assert.match(module,/mountVueHelp/);
 assert.match(module,/home\.href='\.\/'/);
 assert.match(module,/gap:18px/);
 assert.match(module,/#16b8b0/);
 for(const domain of pages){
  const html=readFileSync(new URL('../'+domain+'.html',import.meta.url),'utf8');
  assert.match(html,/src="\.\/apps\/specialist-navigation\.js"/,domain);
 }
});
