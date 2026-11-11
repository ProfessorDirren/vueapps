import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommuteQuestion} from './commutvue-query.js';
test('extract Stockholm commute without inventing stops',()=>{
 const q=parseCommuteQuestion('Är pendeltågen från Jordbro till T-Centralen försenade?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'T-Centralen',needsClarification:false});
});
test('recognize Paris region and stations',()=>{
 const q=parseCommuteQuestion('Train from Gare du Nord to Châtelet delayed?');
 assert.equal(q.region,'paris');
 assert.equal(q.from,'Gare du Nord');
 assert.equal(q.to,'Châtelet');
 assert.equal(q.needsClarification,false);
});
test('unknown geography and missing stops require clarification',()=>{
 assert.equal(parseCommuteQuestion('Is my train delayed?').needsClarification,true);
 assert.equal(parseCommuteQuestion('RER B delayed?').needsClarification,true);
 assert.equal(parseCommuteQuestion('Train from Jordbro to Gare du Nord?').region,null);
});

test('Unicode city names are detected as complete words',()=>{
 assert.equal(parseCommuteQuestion('Train from Gare du Nord to Châtelet delayed?').to,'Châtelet');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Stockholm City delayed?').region,'stockholm');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Stockholm City delayed?').to,'Stockholm City');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Gare du Nord?').needsClarification,true);
});

test('Chile Santiago Spanish transit journey resolves without guessing live status',()=>{
 const q=parseCommuteQuestion('Metro de Santiago desde Baquedano a Tobalaba');
 assert.deepEqual(q,{region:'santiago',from:'Baquedano',to:'Tobalaba',needsClarification:false});
});
test('Chile geography is not confused with Stockholm or Paris',()=>{
 assert.equal(parseCommuteQuestion('Bus de Maipú a Plaza de Armas').region,'santiago');
 assert.equal(parseCommuteQuestion('Metro de Santiago desde Baquedano a Gare du Nord').needsClarification,true);
 assert.equal(parseCommuteQuestion('Bus de una parada a otra').needsClarification,true);
});

test('native-script route questions preserve the origin and destination',()=>{
 const cases=[
  ['मुंबई से दादर तक','mumbai','मुंबई','दादर'],
  ['从北京到西直门','beijing','北京','西直门'],
  ['из Москва до Комсомольская','moscow','Москва','Комсомольская'],
  ['من دبي إلى BurJuman','dubai','دبي','BurJuman'],
  ['από Αθήνα προς Σύνταγμα','athens','Αθήνα','Σύνταγμα'],
  ['از تهران به تجریش','tehran','تهران','تجریش'],
  ['İstanbul konumundan Taksim konumuna','istanbul','İstanbul','Taksim']
 ];
 for(const [text,region,from,to] of cases){
  const result=parseCommuteQuestion(text);
  assert.equal(result.region,region,text);
  assert.equal(result.from,from,text);
  assert.equal(result.to,to,text);
  assert.equal(result.needsClarification,false,text);
 }
});

test('incidental country references do not override identified journey endpoints',()=>{
 const q=parseCommuteQuestion('I speak Spanish and live in Chile. Train from Jordbro to Stockholm City?');
 assert.equal(q.region,'stockholm');
 assert.equal(q.needsClarification,false);
});
test('two different endpoint regions always require clarification',()=>{
 const q=parseCommuteQuestion('Train from Baquedano to Gare du Nord?');
 assert.equal(q.region,null);
 assert.equal(q.needsClarification,true);
});

test('actual Swedish next-train phrasing extracts Stockholm stations',()=>{
 const q=parseCommuteQuestion('När går nästa tåg från Jordbro till Stockholm City?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
});

test('Jordbro question with a second disruption sentence preserves both station endpoints',()=>{
 const q=parseCommuteQuestion('När går nästa pendeltåg från Jordbro till Stockholm City? Finns det några trafikstörningar?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
});
