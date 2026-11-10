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

test('Swedish input never becomes Hindi, even when typing word by word',()=>{
 const parts=['Min','hund','är','sjuk'];
 for(let i=1;i<=parts.length;i++){
  const result=detect(parts.slice(0,i).join(' '));
  assert.ok(result===null||result==='sv',`Unexpected ${result} for ${parts.slice(0,i).join(' ')}`);
 }
 assert.equal(detect(parts.join(' ')),'sv');
});
test('mixed Latin text with stray non-Latin characters cannot trigger script language',()=>{
 for(const fragment of ['अ','م','中','Ж']){
  assert.notEqual(detect('Min hund är sjuk '+fragment),'hi');
  assert.notEqual(detect('Min hund är sjuk '+fragment),'ar');
  assert.notEqual(detect('Min hund är sjuk '+fragment),'zh-CN');
  assert.notEqual(detect('Min hund är sjuk '+fragment),'ru');
 }
});

test('mixed Spanish Swedish English question preserves currently selected UI language',()=>{
 assert.equal(detect('Mi perro esta enfermo, vad skall jag göra? Do you have a solution?'),null);
 assert.equal(detect('Mi perro está enfermo, vad skall jag göra? Do you have a solution?'),null);
 assert.equal(detect('Min hund är sjuk och behöver hjälp'), 'sv');
 assert.equal(detect('Mi perro está enfermo y necesito ayuda'), 'es');
});

test('language detection remains conservative for multilingual user input',()=>{
 const mixed=[
  'Hola necesito ayuda, min hund är sjuk och behöver hjälp',
  'My dog is sick and I need help, mi perro está enfermo y necesito ayuda',
  'Jag behöver hjälp med min hund, my dog is sick and I need help',
  'Mi perro está enfermo, vad skall jag göra? Do you have a solution?'
 ];
 for(const question of mixed)assert.equal(detect(question),null,question);
});
