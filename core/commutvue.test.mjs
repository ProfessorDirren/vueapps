import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUT_LOCALES,COMMUT_MESSAGES,COMMUT_PROVIDERS,commuteLocale,normalizeDeparture,normalizeTrafficResult,queryCommute} from './commutvue.js';
test('COMMUTVUE supports every portal language',()=>{
 assert.equal(COMMUT_LOCALES.length,11);
 for(const locale of COMMUT_LOCALES){assert.equal(COMMUT_MESSAGES[locale].length,8);assert.ok(COMMUT_MESSAGES[locale][0]);}
 assert.equal(commuteLocale('xx'),'en');
});
test('Stockholm and Paris providers are configured without embedded credentials',()=>{
 assert.equal(COMMUT_PROVIDERS.stockholm.country,'SE');
 assert.equal(COMMUT_PROVIDERS.paris.country,'FR');
 assert.match(COMMUT_PROVIDERS.stockholm.credential,/API_KEY/);
});
test('unknown realtime delay is never reported as zero',()=>{
 const result=normalizeDeparture({line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:00:00Z'});
 assert.equal(result.delayMinutes,null);
 assert.equal(result.expected,null);
});
test('verified timestamps produce a delay',()=>{
 const result=normalizeDeparture({scheduled:'2026-11-10T08:00:00Z',expected:'2026-11-10T08:07:00Z'});
 assert.equal(result.delayMinutes,7);
 assert.throws(()=>normalizeDeparture({scheduled:'tomorrow'}));
});
test('results require source provenance and timestamp',()=>{
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',departures:[]}));
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',departures:[]}));
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',sourceUrl:'http://example.org',updatedAt:'2026-11-10T08:00:00Z',departures:[{scheduled:'2026-11-10T08:01:00Z'}]}));
 assert.throws(()=>normalizeTrafficResult({provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',departures:[{scheduled:'2026-11-10T08:01:00Z',destination:'Stockholm City'}]}));
 const result=normalizeTrafficResult({provider:'stockholm',sourceUrl:'https://www.trafiklab.se/',updatedAt:'2026-11-10T08:00:00Z',journeyVerified:true,departures:[{scheduled:'2026-11-10T08:01:00Z',destination:'Stockholm City'}]});
 assert.equal(result.status,'ok');
});
test('missing provider, stations or data never invents a departure',async()=>{
 assert.deepEqual((await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City'})).departures,[]);
 assert.equal((await queryCommute({provider:'paris',from:'',to:'Châtelet'})).status,'needs_stations');
 assert.equal((await queryCommute({provider:'paris',from:'Gare du Nord',to:'Châtelet',adapter:async()=>{throw Error('offline')}})).status,'unavailable');
});
