import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrafiklabAdapter,createParisAdapter} from './commutvue-providers.js';
import {queryCommute} from './commutvue.js';
test('Stockholm adapter never claims a journey from an unverified station board',async()=>{
 let requests=0;
 const adapter=createTrafiklabAdapter({
  apiKey:'fixture-key',
  resolveStop:async name=>name==='Jordbro'?'740000001':'740000002',
  fetcher:async url=>{requests++;assert.match(url,/740000001/);return {ok:true,json:async()=>({departures:[{line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:00:00Z'}]})};}
 });
 const response=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(requests,1);
 assert.equal(response.status,'unavailable');
 assert.deepEqual(response.departures,[]);
});
test('invalid Stockholm stop ids fail closed without contacting a provider',async()=>{
 let requests=0;
 const adapter=createTrafiklabAdapter({apiKey:'fixture-key',resolveStop:async()=> 'unverified',fetcher:async()=>{requests++;throw Error('unexpected')}});
 const response=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter});
 assert.equal(response.status,'unavailable');
 assert.equal(requests,0);
});
test('Paris cannot claim live traffic without verified route mapping',async()=>{
 const adapter=createParisAdapter({apiKey:'fixture-key',fetcher:async()=>{throw Error('should not call')}});
 const response=await queryCommute({provider:'paris',from:'Gare du Nord',to:'Châtelet',adapter});
 assert.equal(response.status,'unavailable');
 assert.deepEqual(response.departures,[]);
});

test('Stockholm route proof must bind origin, destination and actual board departure IDs',async()=>{
 const departure={id:'journey-1',line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:00:00Z',expected:'2026-11-10T08:07:00Z'};
 const base={apiKey:'fixture-key',resolveStop:async name=>name==='Jordbro'?'740000001':'740000002',
  fetcher:async()=>({ok:true,json:async()=>({departures:[departure]})})};
 const proof={verified:true,originId:'740000001',destinationId:'740000002',departureIds:['journey-1'],updatedAt:'2026-11-10T07:58:00Z'};
 const valid=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:createTrafiklabAdapter({...base,verifyJourney:async()=>proof})});
 assert.equal(valid.status,'ok');
 assert.equal(valid.departures[0].delayMinutes,7);
 assert.equal(valid.sourceUrl.includes('key='),false);
 for(const bad of [
  {...proof,verified:false},{...proof,destinationId:'740000003'},
  {...proof,departureIds:['not-on-board']},{...proof,departureIds:['journey-1','journey-1']},
  {...proof,updatedAt:'invalid'}
 ]){
  const result=await queryCommute({provider:'stockholm',from:'Jordbro',to:'Stockholm City',adapter:createTrafiklabAdapter({...base,verifyJourney:async()=>bad})});
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.departures,[]);
 }
});
