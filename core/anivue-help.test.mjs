import test from 'node:test';
import assert from 'node:assert/strict';
import { AniVueHelp } from './anivue-help.js';
import { VueHelp } from './help.js';

test('ANIVUE inherits VUECORE Help in all seven languages', () => {
  const specialist = new AniVueHelp();
  assert.ok(specialist instanceof VueHelp);
  for (const language of ['en','es','sv','hi','zh-CN','ru','ar']) {
    const copy = specialist.getHelp(language);
    assert.equal(copy.language, language);
    assert.ok(copy.title);
    assert.ok(copy.topics.length);
    assert.equal(copy.direction, language === 'ar' ? 'rtl' : 'ltr');
  }
});

test('Spanish ANIVUE Help never falls through to Swedish', () => {
  const copy = new AniVueHelp().getHelp('es');
  assert.equal(copy.button, 'Ayuda');
  assert.match(copy.topics[0].body, /perro, gato o caballo/);
  assert.doesNotMatch(JSON.stringify(copy), /Välj hund/);
});

test('Help is informational and does not replace emergency guidance', () => {
  assert.match(new AniVueHelp().getHelp('en').topics[0].body, /preview/);
});
