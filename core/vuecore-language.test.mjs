import test from 'node:test';
import assert from 'node:assert/strict';
import {detectVueInputLanguage} from './vuecore-language.js';
import {POST} from '../api/vue-router.js';
const req=b=>new Request('https://local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
test('VUECORE recognizes supported language evidence independently of UI locale',()=>{
 for(const [q,lang] of [
  ['Hur länge ska kycklingen vara i varmluftsugnen?','sv'],
  ['How long should chicken stay in the oven?','en'],
  ['¿Cuánto tiempo necesita el pollo en el horno?','es'],
  ['Combien de temps pour le poulet au four?','fr'],
  ['Πότε και πόσο στο φούρνο;','el'],
  ['Когда курица будет в духовке?','ru'],
  ['什么时候鸡肉放进烤箱？','zh-CN'],
  ['मुर्गा ओवन में कब और कैसे?','hi'],
  ['متى يوضع الدجاج في الفرن؟','ar'],
  ['مرغ را چگونه در فر بپزم؟','fa'],
  ['Tavuk fırında ne zaman pişer?','tr']
 ])assert.equal(detectVueInputLanguage(q,'en'),lang,q);
});
test('VUECORE retains UI language for ambiguous short input',()=>{
 assert.equal(detectVueInputLanguage('OK','sv'),'sv');
 assert.equal(detectVueInputLanguage('12345','fr'),'fr');
});
test('Urgent ANI-VUE uses detected Swedish response language even when UI is English',async()=>{
 const response=await POST(req({question:'Min hund har svårt att andas.',language:'en',previous:'commutvue'}));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.domain,'anivue');
 assert.match(data.answer,/veterinärvård/i);
});
