import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=['anyvue','antiqvue','armvue','estatevue','foodvue','homevue','medivue','motovue','musicgearvue','plantvue','slumpvue','vinylvue','wardrobevue'];
test('VUECORE owns shared help renderer, navigation and styling',()=>{
 const coreNav=readFileSync(new URL('./specialist-navigation.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('./navigation.css',import.meta.url),'utf8');
 const renderer=readFileSync(new URL('./help-renderer.js',import.meta.url),'utf8');
 const specialistBootstrap=readFileSync(new URL('../apps/specialist-navigation.js',import.meta.url),'utf8');
 const portalBootstrap=readFileSync(new URL('../apps/help.js',import.meta.url),'utf8');
 const portalNav=readFileSync(new URL('./portal-navigation.js',import.meta.url),'utf8');
 const portal=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(coreNav,/PortalVueHelp/);
 assert.match(coreNav,/mountVueHelp/);
 assert.match(coreNav,/core\/navigation\.css/);
 assert.match(css,/gap:18px/);
 assert.match(css,/#16b8b0/);
 assert.match(renderer,/home = false/);
 assert.match(renderer,/vuecore-home-link/);
 assert.match(coreNav,/home:true/);
 assert.match(coreNav,/AnyVueHelp/);
 assert.match(coreNav,/document\.documentElement\.lang\|\|'en'/,'CORE must honor page language');
 assert.match(portalBootstrap,/core\/portal-navigation\.js/);
 assert.match(portalNav,/home: true/);
 assert.match(portalNav,/mountVueHelp/);
 assert.match(portal,/href="\.\/core\/navigation\.css"/);
 assert.doesNotMatch(portal,/#vuecore-help \{ margin-top/, "shared portal styles belong to CORE");
 assert.match(css,/\.vuecore-help-panel\[hidden\]/);
 const anyvue=readFileSync(new URL('../anyvue.html',import.meta.url),'utf8');
 assert.doesNotMatch(anyvue,/<style>\.vuecore-help-trigger/, 'ANYVUE must inherit CORE help styles');
 assert.doesNotMatch(anyvue,/src="\.\/apps\/anyvue-help\.js"/, 'ANYVUE must not mount help twice');
 assert.match(specialistBootstrap,/core\/specialist-navigation\.js/);
 for(const domain of pages){
  const html=readFileSync(new URL('../'+domain+'.html',import.meta.url),'utf8');
  assert.match(html,/src="\.\/apps\/specialist-navigation\.js"/,domain);
 }
});
