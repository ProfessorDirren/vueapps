import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUT_LOCALES,COMMUT_MESSAGES,COMMUT_PROVIDERS,commuteLocale,normalizeDeparture,normalizeTrafficResult,queryCommute} from './commutvue.js';
test('COMMUTVUE supports every portal language',()=>{
 assert.equal(COMMUT_LOCALES.length,12);
 for(const locale of COMMUT_LOCALES){assert.equal(COMMUT_MESSAGES[locale].length,8);assert.ok(COMMUT_MESSAGES[locale][0]);}
 assert.equal(commuteLocale('xx'),'en');
});
test('Stockholm and Paris providers are configured without embedded credentials',()=>{
 assert.equal(COMMUT_PROVIDERS.stockholm.country,'SE');
 assert.equal(COMMUT_PROVIDERS.paris.country,'FR');
 assert.match(COMMUT_PROVIDERS.stockholm.credential,/API_KEY/);
});
test('unknown realtime delay is never reported as zero',()=>{
 const result=normalizeDeparture({id:'trip-43',line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:00:00Z'});
 assert.equal(result.delayMinutes,null);
 assert.equal(result.expected,null);
});
test('verified timestamps produce a delay',()=>{
 const result=normalizeDeparture({id:'trip-43',line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:00:00Z',expected:'2026-11-10T08:07:00Z'});
 assert.equal(result.delayMinutes,7);
 assert.throws(()=>normalizeDeparture({id:'trip-43',line:'43',destination:'Stockholm City',scheduled:'tomorrow'}));
});
test('results require source provenance and timestamp',()=>{
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',departures:[]}));
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',departures:[]}));
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',sourceUrl:'http://example.org',updatedAt:'2026-11-10T08:00:00Z',departures:[{scheduled:'2026-11-10T08:01:00Z'}]}));
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',departures:[{scheduled:'2026-11-10T08:01:00Z',destination:'Stockholm City'}]}));
 const result=normalizeTrafficResult({provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',journeyEvidence:{verified:true,originId:'stop-A',destinationId:'stop-B',departureIds:['trip-1']},departures:[{id:'trip-1',line:'43',scheduled:'2026-11-10T08:01:00Z',destination:'Stockholm City'}]});
 assert.equal(result.status,'ok');
});
test('missing provider, stations or data never invents a departure',async()=>{
 assert.deepEqual((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City'})).departures,[]);
 assert.equal((await queryCommute({provider:'paris',from:'',to:'Châtelet'})).status,'needs_stations');
 assert.equal((await queryCommute({provider:'paris',from:'Gare du Nord',to:'Châtelet',adapter:async()=>{throw Error('offline')}})).status,'unavailable');
});

test('journey evidence must cover each individual departure',()=>{
 const base={provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',journeyEvidence:{verified:true,originId:'stop-A',destinationId:'stop-B',departureIds:['trip-1']}};
 assert.throws(()=>normalizeTrafficResult({...base,departures:[{id:'trip-2',line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:01:00Z'}]}));
 assert.throws(()=>normalizeTrafficResult({...base,journeyEvidence:{...base.journeyEvidence,originId:'stop-B'},departures:[{id:'trip-1',scheduled:'2026-11-10T08:01:00Z'}]}));
});

test('departure identity must include provider trip ID, line and destination',()=>{
 const base={id:'trip-1',line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:00:00Z'};
 for(const field of ['id','line','destination'])assert.throws(()=>normalizeDeparture({...base,[field]:''}));
});

test('all eleven commute locales preserve distinct translated status labels across specialist transitions',()=>{
 const keys=['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa','pt-BR'];
 assert.deepEqual(COMMUT_LOCALES,keys);
 const english=COMMUT_MESSAGES.en;
 for(const locale of keys){
  assert.equal(commuteLocale(locale),locale,`selected locale ${locale} must persist`);
  const messages=COMMUT_MESSAGES[locale];
  assert.equal(messages.length,english.length,`message count ${locale}`);
  for(let i=0;i<messages.length;i++){
   assert.equal(typeof messages[i],'string');
   assert.ok(messages[i].trim(),`empty status label ${locale}/${i}`);
   if(locale!=='en' && !(locale==='fr' && i===2))assert.notEqual(messages[i],english[i],`unexpected English status label ${locale}/${i}`);
  }
 }
 assert.equal(commuteLocale('unknown'),'en');
});

test('all eleven localized commute status labels are complete and never fall back to English',()=>{
 const english=COMMUT_MESSAGES.en;
 assert.deepEqual(Object.keys(COMMUT_MESSAGES).sort(),[...COMMUT_LOCALES].sort());
 for(const locale of COMMUT_LOCALES){
  const labels=COMMUT_MESSAGES[locale];
  assert.equal(labels.length,english.length,locale);
  for(const [index,label] of labels.entries()){
   assert.equal(typeof label,'string',locale+' '+index);
   assert.equal(label.trim(),label,locale+' '+index);
   assert.ok(label.length>0,locale+' '+index);
   if(locale!=='en' && !(locale==='fr' && index===2))assert.notEqual(label,english[index],locale+' '+index);
  }
 }
});
