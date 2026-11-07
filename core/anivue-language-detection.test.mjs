import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
test('ANIVUE inherits the VUECORE language detector rather than a local heuristic',()=>{
 assert.match(page,/import \{detectInputLanguage\} from '\.\/core\/language-detection\.js'/);
 assert.match(page,/const detected=detectInputLanguage\(\$\('question'\)\.value\)/);
});
test('ANIVUE refreshes its UI on detected language while preserving manual preference',()=>{
 assert.match(page,/picker\.value=detected;\s*render\(\)/);
 assert.match(page,/if\(!event\.isComposing\)syncQuestionLanguage\(\)/);
 assert.match(page,/addEventListener\('compositionend'/);
 assert.match(page,/syncQuestionLanguage\(\);busy=true/);
 const automatic=page.match(/function syncQuestionLanguage\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
 assert.doesNotMatch(automatic,/localStorage\.setItem/);
});
