import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../apps/router.js', import.meta.url), 'utf8');

test('router isolates conversation and case memory to each browser tab', () => {
  assert.match(source, /storage=sessionStorage/);
  assert.doesNotMatch(source, /storage=localStorage/);
  assert.match(source, /new VueMemory\(\{domain:saved.domain,storage\}\)/);
  assert.match(source, /storage\?\.setItem\('vue-core-router-active-v1'/);
});

test('favorite VUE preference stays shared across tabs', () => {
  assert.match(source, /favoritesStorage=localStorage/);
  assert.match(source, /readFavorite\(favoritesStorage\)/);
  assert.match(source, /rememberFavorite\(favoritesStorage,/);
});
