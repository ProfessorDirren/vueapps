import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrafikverketClient} from './commutevue-trafikverket.js';
import {verifyStationCandidates} from './commutevue-provider-station-verification.js';
const response=items=>new Response(JSON.stringify({RESPONSE:{RESULT:[{TrainStation:items}]}}),{status:200});
test('station verification uses actual Trafikverket client query shape',async()=>{
 const requests=[];
 const client=createTrafikverketClient({apiKey:'test-secret',fetcher:async(_url,options)=>{
  requests.push(options.body);
  const name=options.body.includes('value="Jordbro"')?'Jordbro':'Stockholm City';
  return response([{AdvertisedLocationName:name,LocationSignature:name==='Jordbro'?'J':'Sci'}]);
 }});
 const verified=await verifyStationCandidates([{resRobotName:'Jordbro',trafikverketSignature:'J'},{resRobotName:'Stockholm City',trafikverketSignature:'Sci'}],client);
 assert.equal(verified?.length,2);
 assert.equal(requests.length,2);
 assert.ok(requests.every(body=>body.includes('objecttype="TrainStation"')));
 assert.ok(requests.every(body=>body.includes('authenticationkey="test-secret"')));
});
test('ambiguous provider station records fail closed through real client',async()=>{
 const client=createTrafikverketClient({apiKey:'test',fetcher:async()=>response([{AdvertisedLocationName:'Jordbro',LocationSignature:'J'},{AdvertisedLocationName:'Jordbro',LocationSignature:'J2'}])});
 assert.equal(await verifyStationCandidates([{resRobotName:'Jordbro',trafikverketSignature:'J'}],client),null);
});
test('provider mismatches and name aliases fail closed through real client',async()=>{
 const client=createTrafikverketClient({apiKey:'test',fetcher:async()=>response([{AdvertisedLocationName:'Stockholm City',LocationSignature:'Sci'}])});
 assert.equal(await verifyStationCandidates([{resRobotName:'Stockholm C',trafikverketSignature:'Sci'}],client),null);
 assert.equal(await verifyStationCandidates([{resRobotName:'Stockholm City',trafikverketSignature:'Cst'}],client),null);
});
