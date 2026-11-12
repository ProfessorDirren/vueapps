import test from 'node:test';
import assert from 'node:assert/strict';
import { vueDisplayName, vueNameTranslations, VUE_NAME_LANGUAGES } from './vue-display-names.js';

test('presentation labels cover all eleven languages for initial domains', () => {
  for (const id of ['commutvue','anivue','anyvue']) {
    const translations=vueNameTranslations(id);
    for (const lang of VUE_NAME_LANGUAGES) {
      assert.ok(translations[lang]?.trim(), `${id} missing ${lang}`);
      assert.equal(vueDisplayName(id,lang),translations[lang]);
    }
  }
});
test('stable internal IDs are never translated or rewritten', () => {
  assert.equal(vueDisplayName('commutvue','sv'),'Kollektivtrafik');
  assert.equal(vueDisplayName('commutvue','en'),'Commute');
  assert.equal(vueDisplayName('commutvue','xx'),'Commute');
  assert.equal(vueDisplayName('martialartsvue','sv'),'MARTIALARTSVUE');
  assert.equal(vueDisplayName('../invalid','en'),'');
});
