import test from 'node:test';
import assert from 'node:assert/strict';
import { AnyVueHelp } from './anyvue-help.js';
import { PortalVueHelp } from './portal-help.js';
import { VueHelp } from './help.js';

test('ANYVUE and portal both inherit VUECORE Help', () => {
  assert.ok(new AnyVueHelp() instanceof VueHelp);
  assert.ok(new PortalVueHelp() instanceof VueHelp);
});

test('ANYVUE Spanish Help is specialist-specific and not Swedish', () => {
  const copy = new AnyVueHelp().getHelp('es');
  assert.equal(copy.button, 'Ayuda');
  assert.match(copy.topics[0].body, /perspectivas/);
  assert.doesNotMatch(JSON.stringify(copy), /Ställ en fråga/);
});

test('ANYVUE defaults to English and preserves Arabic RTL', () => {
  assert.equal(new AnyVueHelp().getHelp().language, 'en');
  assert.equal(new AnyVueHelp().getHelp('ar').direction, 'rtl');
});

test('ANYVUE Help is translated for all seven supported languages', () => {
  for (const language of ['en', 'es', 'sv', 'hi', 'zh-CN', 'ru', 'ar']) {
    const copy = new AnyVueHelp().getHelp(language);
    assert.equal(copy.language, language);
    assert.ok(copy.title.length > 0);
    assert.ok(copy.topics.length > 0);
    assert.equal(copy.direction, language === 'ar' ? 'rtl' : 'ltr');
  }
});
