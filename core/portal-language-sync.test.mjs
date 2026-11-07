import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const portal=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
const help=readFileSync(new URL('../apps/help-renderer.js',import.meta.url),'utf8');
const video=readFileSync(new URL('./video-input.js',import.meta.url),'utf8');

test('portal announces language changes after synchronizing the selected language',()=>{
 assert.match(portal,/picker\.value=lang;\s*document\.dispatchEvent\(new CustomEvent\("vueapps:languagechange"/);
 assert.match(portal,/document\.documentElement\.lang=lang/);
});
test('VUECORE router explicitly refreshes when portal language changes',()=>{
 assert.match(router,/document\.addEventListener\('vueapps:languagechange',render\)/);
});
test('VUECORE video actions refresh and release language listener on disposal',()=>{
 assert.match(video,/root\.addEventListener\?\.\('vueapps:languagechange',translate\)/);
 assert.match(video,/root\.removeEventListener\?\.\('vueapps:languagechange',translate\)/);
});

test('Help refreshes after the portal commits the selected language',()=>{
 assert.match(help,/document\.addEventListener\?\.\('vueapps:languagechange', render\)/);
 assert.match(help,/return render;/);
});

test('Help actually changes EN → SV → ES after the portal event', async()=>{
 const originalDocument=globalThis.document;
 const listeners=new Map();
 const element=tag=>({
  tagName:tag,hidden:false,children:[],attributes:{},
  append(...nodes){this.children.push(...nodes);},
  replaceChildren(...nodes){this.children=nodes;},
  setAttribute(name,value){this.attributes[name]=value;},
  addEventListener(name,handler){this.events??={};this.events[name]=handler;},
  focus(){}
 });
 const host=element('div');host.id='vuecore-help';
 const picker={value:'en',addEventListener(){},removeEventListener(){}};
 globalThis.document={
  createElement:element,
  addEventListener(name,handler){listeners.set(name,handler);},
  removeEventListener(name){listeners.delete(name);}
 };
 try{
  const {mountVueHelp}=await import('../apps/help-renderer.js');
  const help={getHelp(lang){return {button:{en:'Help',sv:'Hjälp',es:'Ayuda'}[lang],language:lang,direction:'ltr',title:lang,close:'Close',topics:[]};}};
  const refresh=mountVueHelp({host,help,language:()=>picker.value,languageControl:picker});
  assert.equal(typeof refresh,'function');
  assert.equal(host.children[0].textContent,'Help');
  picker.value='sv';
  listeners.get('vueapps:languagechange')();
  assert.equal(host.children[0].textContent,'Hjälp');
  picker.value='es';
  listeners.get('vueapps:languagechange')();
  assert.equal(host.children[0].textContent,'Ayuda');
  assert.equal(host.children[1].lang,'es');
 }finally{
  if(originalDocument===undefined)delete globalThis.document;
  else globalThis.document=originalDocument;
 }
});

test('MARTIALARTSVUE card and action have seven language variants and update with portal selection',()=>{
 const languages=['en','sv','es','hi','zh-CN','ru','ar'];
 const section=portal.match(/const martialTranslations=([\s\S]*?);\s*const mediTranslations=/)?.[1];
 assert.ok(section,'MARTIALARTSVUE translation dictionary exists');
 for(const language of languages){
  const key=language.includes('-')?JSON.stringify(language):language;
  assert.ok(section.includes(key+':'),'missing MARTIALARTSVUE locale '+language);
 }
 assert.match(portal,/querySelector\("#app-martialartsvue p"\)\.textContent=martial\[0\]/);
 assert.match(portal,/querySelector\("#app-martialartsvue a"\)\.textContent=martial\[1\]/);
});

test('HOMEVUE and shared tool action links use the selected language',()=>{
 assert.match(portal,/const toolLinkVerbs=/);
 assert.match(portal,/sv:"Öppna"/);
 assert.match(portal,/es:"Abrir"/);
 assert.match(portal,/toolLinkVerbs\[lang\]\|\|toolLinkVerbs\.en/);
});

test('Language picker and category accessibility labels follow the chosen language',()=>{
 assert.match(portal,/const accessibilityLabels=/);
 assert.match(portal,/sv:\["Välj språk"/);
 assert.match(portal,/es:\["Seleccionar idioma"/);
 assert.match(portal,/picker\.setAttribute\("aria-label",a11y\[0\]\)/);
 assert.match(portal,/querySelector\("#app-armvue \.subcategories"\)\.setAttribute\("aria-label",a11y\[1\]\)/);
 assert.match(portal,/querySelector\("#app-foodvue \.subcategories"\)\.setAttribute\("aria-label",a11y\[2\]\)/);
});

test('Portal always starts in English without restoring a stored language',()=>{
 assert.match(portal,/setLanguage\("en"\);/);
 assert.doesNotMatch(portal,/localStorage\.getItem\("vueapps-language-v2"\)/);
 assert.doesNotMatch(portal,/localStorage\.setItem\("vueapps-language-v2"/);
});
