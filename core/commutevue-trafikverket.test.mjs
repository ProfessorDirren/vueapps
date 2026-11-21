import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrafikverketClient,TrafikverketError} from './commutevue-trafikverket.js';
const result=(type,items)=>new Response(JSON.stringify({RESPONSE:{RESULT:[{[type]:items}]}}),{status:200});
test('COMMUTEVUE Trafikverket client resolves a unique station and fetches announcements',async()=>{
 const calls=[];
 const client=createTrafikverketClient({apiKey:'test-secret',fetcher:async(url,options)=>{
  calls.push({url,options});
  return options.body.includes('objecttype="TrainStation"')?result('TrainStation',[{LocationSignature:'J',AdvertisedLocationName:'Jordbro'}]):result('TrainAnnouncement',[{AdvertisedTrainIdent:'1234',AdvertisedTimeAtLocation:'2026-11-21T10:00:00+01:00'}]);
 }});
 assert.equal(await client.station('Jordbro'),'J');
 assert.equal((await client.departuresAt('J'))[0].AdvertisedTrainIdent,'1234');
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.url==='https://api.trafikinfo.trafikverket.se/v2/data.json'));
 assert.ok(calls.every(c=>c.options.method==='POST'));
 assert.ok(calls.every(c=>!c.url.includes('test-secret')));
});
test('COMMUTEVUE Trafikverket client fails closed on ambiguous stations and invalid provider response',async()=>{
 const ambiguous=createTrafikverketClient({apiKey:'test',fetcher:async()=>result('TrainStation',[{LocationSignature:'A',AdvertisedLocationName:'Jordbro'},{LocationSignature:'B',AdvertisedLocationName:'Jordbro'}])});
 await assert.rejects(ambiguous.station('Jordbro'),e=>e instanceof TrafikverketError&&e.reason==='ambiguous_station');
 const malformed=createTrafikverketClient({apiKey:'test',fetcher:async()=>new Response('{}',{status:200})});
 await assert.rejects(malformed.departuresAt('J'),e=>e instanceof TrafikverketError&&e.reason==='invalid_response');
});
test('COMMUTEVUE Trafikverket client escapes XML in station lookup',async()=>{
 let body='';
 const client=createTrafikverketClient({apiKey:'secret',fetcher:async(_url,options)=>{body=options.body;return result('TrainStation',[]);}});
 await assert.rejects(client.station('A" & <B>'));
 assert.match(body,/A&quot; &amp; &lt;B&gt;/);
});
