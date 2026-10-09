import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addDays,calendarDate,dueState,scaleIngredients,validateRecords} from './planning.js';
import {UI,DOMAINS} from '../apps/content.js';
import {LANGUAGES,validateMedia} from './index.js';
test('dates handle month/year transitions and reject impossible calendar dates',()=>{
 assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(addDays('2028-02-28',1),'2028-02-29');
 assert.throws(()=>calendarDate('2026-02-30'));assert.throws(()=>addDays('2026-10-10',0));
 assert.equal(dueState('2026-10-09','2026-10-10'),'overdue');assert.equal(dueState('2026-10-10','2026-10-10'),'today');
});
test('recipes scale quantities without changing ingredient identity or unit',()=>{
 const input=[{name:'Flour',quantity:500,unit:'g'},{name:'Water',quantity:300,unit:'ml'}];
 assert.deepEqual(scaleIngredients(input,4,6),[{name:'Flour',quantity:750,unit:'g'},{name:'Water',quantity:450,unit:'ml'}]);
 assert.equal(input[0].quantity,500);assert.throws(()=>scaleIngredients(input,0,6));assert.throws(()=>scaleIngredients([{name:'',quantity:2,unit:'g'}],2,4));assert.throws(()=>scaleIngredients([{name:'X',quantity:2,unit:'unknown'}],2,4));
});
test('backup validation rejects duplicate identities and invalid data without changing input',()=>{
 const item={id:'one',name:'Check',type:0,due:'2026-10-10',interval:30,notes:''};
 assert.equal(validateRecords([item],3).length,1);assert.throws(()=>validateRecords([item,item],3));assert.throws(()=>validateRecords([{...item,type:3}],3));assert.throws(()=>validateRecords([{...item,due:'2026-02-30'}],3));
});
test('all four apps have complete seven-language content, media, and correct portal links',()=>{
 const portal=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const keys=Object.keys(UI.en).sort();
 for(const language of LANGUAGES){assert.deepEqual(Object.keys(UI[language]).sort(),keys);for(const value of Object.values(UI[language]))assert.ok(value.trim())}
 for(const [id,domain]of Object.entries(DOMAINS)){
  const page=readFileSync(new URL('../'+id+'.html',import.meta.url),'utf8');assert.match(page,/<html lang="en">/);assert.match(page,/id="photo"/);assert.match(page,/id="video"/);assert.match(page,/apps\/tools\.js/);assert.ok(portal.includes('href="./'+id+'.html"'));
  for(const language of LANGUAGES){assert.ok(page.includes('value="'+language+'"'));assert.ok(domain.locales[language].title);assert.ok(domain.locales[language].note);assert.equal(domain.locales[language].types.length,domain.locales.en.types.length)}
 }
 assert.doesNotMatch(portal,/Future concept|Framtida koncept|Concepto futuro/);
});
test('shared media limits accept exactly 10 MB images / 50 MB videos and reject overflow',()=>{
 assert.ok(validateMedia({type:'image/png',size:10*1024*1024},'image').ok);assert.equal(validateMedia({type:'image/png',size:10*1024*1024+1},'image').code,'too_large');
 assert.ok(validateMedia({type:'video/mp4',size:50*1024*1024},'video').ok);assert.equal(validateMedia({type:'video/mp4',size:50*1024*1024+1},'video').code,'too_large');assert.equal(validateMedia({type:'text/plain',size:1},'image').code,'unsupported_type');
});
