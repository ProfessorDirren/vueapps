import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('VUECORE detects language during typing without waiting for submission',()=>{
 assert.match(router,/input\.addEventListener\('input',event=>\{if\(!event\.isComposing&&!busy\)syncInputLanguage\(input\.value\)\}\)/);
 assert.match(router,/input\.addEventListener\('compositionend',\(\)=>\{if\(!busy\)syncInputLanguage\(input\.value\)\}\)/);
});
test('typing and submit use the same shared language picker and change event',()=>{
 assert.match(router,/function syncInputLanguage\(question\)/);
 assert.match(router,/languagePicker\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(router,/syncInputLanguage\(question\);/);
 assert.match(router,/if\(!detectedLanguage\|\|detectedLanguage===document\.documentElement\.lang\)return/);
});
