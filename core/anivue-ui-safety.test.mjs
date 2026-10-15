import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');

test('ANIVUE emergency guidance is shown before supplementary requests',()=>{
 assert.match(page,/if\(urgent\)\{\$\('answer'\)\.textContent=check\.assessment\.summary/);
 assert.match(page,/if\(!imageData&&photo\.files\?\.length===0\)return/);
});
test('ANIVUE text-only follow-up cannot overwrite emergency safety guidance',()=>{
 assert.match(page,/\$\('answer'\)\.textContent=urgent\?check\.assessment\.summary\+'\\n\\n'\+d\.answer:d\.answer/);
});
test('ANIVUE photo response retains emergency guidance',()=>{
 assert.match(page,/\[urgent&&check\.assessment\.summary,aiWarning,d\.emergencyAdvice/);
});
