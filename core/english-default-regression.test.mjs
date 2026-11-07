import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('a fresh page loads English even after a previous Hindi selection',()=>{assert.match(html,/setLanguage\("en"\);/);assert.doesNotMatch(html,/initialLanguage\s*=\s*saved/);assert.match(html,/picker\.addEventListener\("change"/)});
