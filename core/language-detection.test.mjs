import test from 'node:test';import assert from 'node:assert/strict';import {detectInputLanguage as detect} from './language-detection.js';
test('VUECORE detects Swedish, Spanish and English',()=>{
 assert.equal(detect('Min hund är sjuk och behöver hjälp'),'sv');
 assert.equal(detect('Mi perro está enfermo y necesito ayuda'),'es');
 assert.equal(detect('My dog is sick and I need help'),'en');
});
test('VUECORE detects supported non-Latin scripts',()=>{
 assert.equal(detect('مرحبا أحتاج إلى المساعدة'),'ar');
 assert.equal(detect('मेरा कुत्ता बीमार है'),'hi');
 assert.equal(detect('我的小狗生病了怎么办'),'zh-CN');
 assert.equal(detect('Моя собака заболела сегодня'),'ru');
});
test('ambiguous short inputs do not override explicit language',()=>{
 for(const value of ['308 klickar','Testing testing','ok','1234567890','Gandalf','Min 308'])assert.equal(detect(value),null);
});

test('stray Devanagari or other foreign-script letters cannot hijack Swedish input',()=>{
 assert.equal(detect('Min hund är sjuk och behöver hjälp अ'),null);
 assert.equal(detect('Jag behöver hjälp med hunden अ'),null);
 assert.equal(detect('Min hund är sjuk och behöver hjälp'),'sv');
 assert.equal(detect('मेरा कुत्ता बीमार है'),'hi');
});
