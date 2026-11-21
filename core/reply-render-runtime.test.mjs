import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
function extract(name,next){const start=source.indexOf(name==='reply'?'const replyTimestampLabels=':'function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\nfunction '+next+'(',start);assert.ok(end>start);return source.slice(start,end)}
test('reply creates question and answer elements in strict mode and preserves their content',()=>{
 const replySource=extract('reply','syncInputLanguage');
 const articles=[];
 const createElement=tag=>({tag,children:[],style:{},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},append(...children){this.children.push(...children)},scrollIntoView(){}});
 const replies={insertBefore(node,before){const index=articles.indexOf(before);articles.splice(index<0?articles.length:index,0,node)},querySelectorAll(){return articles}};
 const context={document:{createElement,documentElement:{lang:'sv'}},$:id=>{assert.equal(id,'vue-router-replies');return replies},active:{domain:'anivue'},provenanceLabel:{sv:'Ej verifierad'},updateAnswerLanguageNotices(){},vueTitle:id=>id.toUpperCase()+' (Djur-VUE)',console};
 vm.runInNewContext(`'use strict'; ${replySource}; reply('Min hund är sjuk','Kontakta veterinär','anivue','local_guidance',false,'sv',{askedAt:'2026-11-21T03:00:00Z',answeredAt:'2026-11-21T03:00:03Z'}); reply('Ny fråga','Nytt svar','anivue','local_guidance',false,'sv',{askedAt:'2026-11-21T04:00:00Z',answeredAt:'2026-11-21T04:00:01Z'});`,context);
 assert.equal(articles.length,2);
 assert.equal(articles[0].dataset.answerLanguage,'sv');
 assert.equal(articles[0].children[0].textContent,'ANIVUE (Djur-VUE)');
 assert.equal(articles[0].children[0].dataset.vueDomain,'anivue');
 assert.equal(articles[0].children[1].textContent,'Ny fråga');
 assert.equal(articles[0].children[2].textContent,'Nytt svar');
 assert.equal(articles[0].children[3].dataset.replyTimestamps,'');
 assert.match(articles[0].children[3].textContent,/Fråga ställd/);
 assert.match(articles[0].children[3].textContent,/Svar mottaget/);
 assert.equal(articles[1].children[1].textContent,'Min hund är sjuk');
 assert.equal(articles[1].children[2].textContent,'Kontakta veterinär');
});


test('router hides redundant workspace deep link when specialist already answers inside VUECORE',()=>{
 assert.match(source,/link\.hidden=!data\.workspace\|\|data\.workspace\.startsWith\('\.\/\?vue='\)&&data\.workspace\.endsWith\('#vue-router'\)/);
});
