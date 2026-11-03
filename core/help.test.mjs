import test from 'node:test';
import assert from 'node:assert/strict';
import { VueHelp } from './help.js';

class AniVueHelp extends VueHelp {
  constructor() {
    super({
      id: 'anivue',
      translations: {
        en: { title: 'How to use ANIVUE', button: 'Help', close: 'Close help' },
        es: { title: 'Cómo usar ANIVUE', button: 'Ayuda', close: 'Cerrar ayuda' },
        ar: { title: 'كيفية استخدام ANIVUE', button: 'المساعدة', close: 'إغلاق المساعدة' },
      },
      topics: {
        en: [{ title: 'Emergency', body: 'Contact a veterinarian immediately for severe symptoms.' }],
        es: [{ title: 'Urgencias', body: 'Contacta inmediatamente con un veterinario.' }],
      },
    });
  }
}

test('specialists inherit default English help', () => {
  const help = new AniVueHelp().getHelp();
  assert.equal(help.language, 'en');
  assert.equal(help.title, 'How to use ANIVUE');
  assert.equal(help.topics.length, 1);
});

test('specialists supply Spanish content without Swedish leakage', () => {
  const help = new AniVueHelp().getHelp('es');
  assert.equal(help.title, 'Cómo usar ANIVUE');
  assert.equal(help.topics[0].title, 'Urgencias');
  assert.equal(help.direction, 'ltr');
});

test('Arabic uses right-to-left direction', () => {
  const help = new AniVueHelp().getHelp('ar');
  assert.equal(help.direction, 'rtl');
  assert.equal(help.button, 'المساعدة');
});

test('unsupported language falls back to English', () => {
  const help = new AniVueHelp().getHelp('xx');
  assert.equal(help.language, 'en');
  assert.equal(help.title, 'How to use ANIVUE');
});

test('missing localized copy falls back to English', () => {
  const help = new AniVueHelp().getHelp('hi');
  assert.equal(help.title, 'How to use ANIVUE');
  assert.equal(help.topics[0].title, 'Emergency');
});

test('invalid help configuration is rejected', () => {
  assert.throws(() => new VueHelp({ id: '!', translations: {} }));
});
