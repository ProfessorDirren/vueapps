import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrafikverketJourneyProbe} from './commutevue-trafikverket-adapter.js';
const origin={LocationSignature:'J',ActivityType:'Avgang',AdvertisedTrainIdent:'43',AdvertisedTimeAtLocation:'2026-11-21T10:00:00+01:00',EstimatedTimeAtLocation:'2026-11-21T10:03:00+01:00'};
const destination={LocationSignature:'Sci',ActivityType:'Ankomst',AdvertisedTrainIdent:'43',AdvertisedTimeAtLocation:'2026-11-21T10:25:00+01:00'};
const result=(type,items)=>new Response(JSON.stringify({RESPONSE:{RESULT:[{[type]:items}]}}));
test('COMMUTEVUE probe combines independent station, departure and arrival evidence',async()=>{
 const seen=[];
 const fetcher=async(_url,options)=>{
  const body=options.body;seen.push(body);
  if(body.includes('TrainStation'))return result('TrainStation',[body.includes('Jordbro')?{AdvertisedLocationName:'Jordbro',LocationSignature:'J'}:{AdvertisedLocationName:'Stockholm City',LocationSignature:'Sci'}]);
  return result('TrainAnnouncement',[body.includes('value="Avgang"')?origin:destination]);
 };
 const probe=createTrafikverketJourneyProbe({apiKey:'fake',fetcher,now:()=>Date.parse('2026-11-21T09:55:00+01:00')});
 const response=await probe({from:'Jordbro',to:'Stockholm City'});
 assert.equal(response.status,'matched');
 assert.equal(response.departures.length,1);
 assert.equal(seen.length,4);
});
test('COMMUTEVUE probe refuses missing destination evidence',async()=>{
 const fetcher=async(_url,options)=>{
  const body=options.body;
  if(body.includes('TrainStation'))return result('TrainStation',[body.includes('Jordbro')?{AdvertisedLocationName:'Jordbro',LocationSignature:'J'}:{AdvertisedLocationName:'Stockholm City',LocationSignature:'Sci'}]);
  return result('TrainAnnouncement',body.includes('value="Avgang"')?[origin]:[]);
 };
 const probe=createTrafikverketJourneyProbe({apiKey:'fake',fetcher,now:()=>Date.parse('2026-11-21T09:55:00+01:00')});
 const response=await probe({from:'Jordbro',to:'Stockholm City'});
 assert.equal(response.status,'unavailable');
 assert.equal(response.departures.length,0);
});

test('COMMUTEVUE probe fails closed on station lookup provider errors',async()=>{
 const probe=createTrafikverketJourneyProbe({apiKey:'fake',fetcher:async()=>new Response('{}')});
 const result=await probe({from:'Jordbro',to:'Stockholm City'});
 assert.equal(result.status,'unavailable');
 assert.equal(result.reason,'invalid_response');
 assert.deepEqual(result.departures,[]);
});
test('COMMUTEVUE probe fails closed when announcement provider is unavailable',async()=>{
 const fetcher=async(_url,options)=>options.body.includes('TrainStation')
  ?result('TrainStation',[options.body.includes('Jordbro')?{AdvertisedLocationName:'Jordbro',LocationSignature:'J'}:{AdvertisedLocationName:'Stockholm City',LocationSignature:'Sci'}])
  :new Response('upstream unavailable',{status:503});
 const probe=createTrafikverketJourneyProbe({apiKey:'fake',fetcher});
 const response=await probe({from:'Jordbro',to:'Stockholm City'});
 assert.equal(response.status,'unavailable');
 assert.equal(response.reason,'http_error');
 assert.deepEqual(response.departures,[]);
});
