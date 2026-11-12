import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectInputLanguage} from './language-detection.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('automatic language is session-scoped, distinct from explicit manual preference',()=>{
 assert.match(router,/detail:\{automatic:true\}/);
 assert.match(html,/if\(event\.detail\?\.automatic\)\{/);
 assert.match(html,/sessionStorage\.setItem\(VUE_AUTO_LANGUAGE_KEY,picker\.value\)/);
 assert.match(html,/sessionStorage\.setItem\(VUE_LANGUAGE_KEY,picker\.value\)/);
 assert.match(html,/sessionStorage\.removeItem\(VUE_AUTO_LANGUAGE_KEY\)/);
});
test('keyboard layout cannot override explicit or text-detected language',()=>{
 assert.equal(detectInputLanguage('Min hund är sjuk och behöver hjälp'),'sv');
 assert.equal(detectInputLanguage('Mi perro está enfermo y necesito ayuda'),'es');
 assert.equal(detectInputLanguage('Testing testing'),null);
 assert.doesNotMatch(router,/navigator\.keyboard\.getLayoutMap|KeyboardLayoutMap|navigator\.language/);
});

test('explicit manual selection takes precedence over automatic detection for every VUE',()=>{
 assert.match(router,/function syncInputLanguage\(question\)\{try\{if\(sessionStorage\.getItem\('vue-language'\)\)return\}catch\{\}/);
 assert.match(router,/language:requestedLanguage,previous:active\?\.domain/);
 assert.match(html,/sessionStorage\.setItem\(VUE_LANGUAGE_KEY,picker\.value\)/);
});
