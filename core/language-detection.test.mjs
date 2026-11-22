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

test('Swedish commuter question selects Swedish rather than keeping English UI',()=>{
 assert.equal(detect('När går nästa pendeltåg från Jordbro till Stockholm City? Finns det några trafikstörningar?'),'sv');
 assert.equal(detect('När går nästa pendeltåg från Jordbro till Stockholm City?'),'sv');
});

// The UI language is authoritative when a question has no reliable language signal.
// This protects all supported VUECORE locales, not just Swedish and Spanish.
test('all supported selected languages remain selected for ambiguous questions',()=>{
 const locales=['en','es','sv','fr','hi','zh-CN','ru','ar','el','tr','fa'];
 for(const selected of locales){
  const detected=detect('Jordbro Stockholm City 43');
  assert.equal(detected,null);
  assert.equal(detected||selected,selected);
 }
});
test('Spanish questions do not switch an explicitly Spanish VUE to English',()=>{
 for(const question of ['Mi perro está enfermo y necesito ayuda','Hola, necesito ayuda para mi perro']){
  const detected=detect(question);
  assert.equal(detected,'es');
  assert.equal(detected||'es','es');
 }
});
test('unambiguous questions in additional supported languages select their own language',()=>{
 for(const [question,expected] of [
  ['Bonjour mon chien est malade','fr'],
  ['Merhaba köpek hasta yardım','tr'],
  ['Γεια σας, ο σκύλος μου είναι άρρωστος','el'],
  ['Моя собака заболела сегодня','ru'],
  ['मेरा कुत्ता बीमार है','hi'],
  ['我的小狗生病了怎么办','zh-CN'],
  ['مرحبا أحتاج إلى المساعدة','ar']
 ])assert.equal(detect(question),expected,question);
});

test('Italian questions are recognized without switching a saved explicit locale',()=>{
 assert.equal(detect('Ciao! Come posso usare VUEAPPS in italiano?'),'it');
 assert.equal(detect('Come posso usare VUEAPPS in italiano?'),'it');
});

test('Spanish commuter request automatically selects Spanish UI without changing explicit selection',()=>{
 const q='Muéstrame los próximos trenes de cercanías desde la estación de Jordbro hasta Stockholm City. Comprueba las salidas en tiempo real, los retrasos y los trenes cancelados. Responde en español.';
 assert.equal(detect(q),'es');
 assert.equal(detect('Jordbro Stockholm City 43'),null);
});

test('all twelve VUE languages detect unambiguous commuting questions',()=>{
 const examples={
  en:'Show the next train from Jordbro to Stockholm City please',
  es:'Muéstrame los próximos trenes de cercanías desde la estación de Jordbro hasta Stockholm City',
  sv:'När går nästa pendeltåg från Jordbro till Stockholm City?',
  fr:'Bonjour, comment trouver mon train avec vous pour Paris?',
  it:'Ciao, come posso usare il treno per andare a Roma?',
  tr:'Merhaba, nasıl gidebilirim tren ile İstanbul için yardım lütfen',
  el:'Πώς μπορώ να πάω από Αθήνα προς Πειραιά με τρένο;',
  fa:'سلام من می‌خواهم از تهران به کرج با قطار بروم',
  hi:'मुझे अगली ट्रेन से स्टेशन तक जाना है',
  'zh-CN':'请问下一班火车什么时候从车站出发',
  ru:'Когда следующий поезд отправляется со станции?',
  ar:'متى يغادر القطار القادم من المحطة؟'
 };
 for(const [locale,question] of Object.entries(examples))assert.equal(detect(question),locale,locale+': '+question);
});
test('shared Spanish hasta and Turkish hasta cannot hijack a dominant language',()=>{
 assert.equal(detect('Muéstrame los próximos trenes de cercanías desde la estación de Jordbro hasta Stockholm City. Comprueba los retrasos y responde en español.'),'es');
 assert.equal(detect('Merhaba köpek hasta yardım'),'tr');
});
