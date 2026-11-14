import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUT_LOCALES,COMMUT_PROVIDERS,queryCommute} from './commutvue.js';
import {COMMUT_EXPANSION_REGIONS,expansionRegionsForLocale} from './commutvue-regions.js';
import {parseCommuteQuestion} from './commutvue-query.js';
test('all eleven languages have at least one discoverable region',()=>{
 for(const locale of COMMUT_LOCALES)assert.ok(expansionRegionsForLocale(locale).length>0||(locale==='sv'&&Object.hasOwn(COMMUT_PROVIDERS,'stockholm')),locale);
});
test('all regions have valid timezone and ISO country, but no unverified live provider',()=>{
 for(const [id,region] of Object.entries(COMMUT_EXPANSION_REGIONS)){
  assert.match(region.country,/^[A-Z]{2}$/);
  assert.doesNotThrow(()=>new Intl.DateTimeFormat('en',{timeZone:region.timezone}).format(new Date()),id);
  assert.equal(COMMUT_PROVIDERS[id].liveConfigured,false);
 }
});
test('global discovery uses explicit place names, not the selected UI language',()=>{
 for(const [text,region] of [['Train from London to Waterloo','london'],['Metro de Madrid a Atocha','madrid'],['Train from Mumbai to Andheri','mumbai'],['Train from Beijing to 西直门','beijing'],['Train from Москва to Комсомольская','moscow'],['Train from Dubai to BurJuman','dubai'],['Train from Αθήνα to Σύνταγμα','athens'],['Train from İstanbul to Taksim','istanbul'],['Train from Tehran to تجریش','tehran'],['Train from Montréal to Berri-UQAM','montreal'],['Train from Valparaíso to Limache','valparaiso']]){
  assert.equal(parseCommuteQuestion(text).region,region,text);
 }
 assert.equal(parseCommuteQuestion('Train from London to Madrid').needsClarification,true);
});
test('unconfigured worldwide regions never claim live traffic',async()=>{
 const result=await queryCommute({provider:'madrid',from:'Atocha',to:'Chamartín'});
 assert.equal(result.status,'unavailable');assert.deepEqual(result.departures,[]);
});
