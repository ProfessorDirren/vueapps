import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
function extract(name,next){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\nfunction '+next+'(',start);assert.ok(end>start);return source.slice(start,end)}
test('reply creates question and answer elements in strict mode and preserves their content',()=>{
 const replySource=extract('reply','syncInputLanguage');
 const articles=[];
 const createElement=tag=>({tag,children:[],style:{},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},append(...children){this.children.push(...children)},scrollIntoView(){}});
 const replies={append(node){articles.push(node)},querySelectorAll(){return articles}};
 const context={document:{createElement,documentElement:{lang:'sv'}},$:id=>{assert.equal(id,'vue-router-replies');return replies},active:{domain:'anivue'},provenanceLabel:{sv:'Ej verifierad'},updateAnswerLanguageNotices(){},console};
 vm.runInNewContext(`'use strict'; ${replySource}; reply('Min hund är sjuk','Kontakta veterinär','anivue','local_guidance',false,'sv');`,context);
 assert.equal(articles.length,1);
 assert.equal(articles[0].dataset.answerLanguage,'sv');
 assert.equal(articles[0].children[1].textContent,'Min hund är sjuk');
 assert.equal(articles[0].children[2].textContent,'Kontakta veterinär');
});
