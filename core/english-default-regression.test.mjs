import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('new tabs default to English and explicit tab language follows navigation',()=>{
 assert.match(html,/let initialLanguage="en"/);
 assert.match(html,/sessionStorage\.getItem\(VUE_LANGUAGE_KEY\)/);
 assert.match(html,/if\(supportedLanguages\.has\(saved\)\)initialLanguage=saved/);
 assert.match(html,/setLanguage\(initialLanguage\)/);
 assert.match(html,/picker\.addEventListener\("change"/);
});
