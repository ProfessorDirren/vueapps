import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('previous answers retain their original text and are marked on language change',()=>{
 assert.match(source,/previousAnswerNotices=/);
 assert.match(source,/function updateAnswerLanguageNotices\(\)/);
 assert.match(source,/article\.dataset\.answerLanguage=answerLanguage/);
 assert.match(source,/lang===document\.documentElement\.lang/);
 assert.match(source,/data-original-language-notice/);
 assert.match(source,/notice\.setAttribute\('role','note'\)/);
 assert.match(source,/function render\(\)\{updateAnswerLanguageNotices\(\)/);
});
test('response language is captured at submit and old turns are not restored automatically',()=>{
 assert.match(source,/const requestedLanguage=document\.documentElement\.lang/);
 assert.match(source,/language:requestedLanguage,previous:active\?\.domain/);
 assert.match(source,/reply\(question,data\.answer,data\.domain\|\|'CORE-VUE',data\.kind,true,requestedLanguage\)/);
 assert.doesNotMatch(source,/reply\(previous\.question/);
});
