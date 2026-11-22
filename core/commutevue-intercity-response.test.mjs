import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommuteQuestion} from './commutvue-query.js';
import {POST} from '../api/vue-router.js';
const question='Hur kommer jag snabbast och enklast från Tyresö Centrum till Göteborg Centralstation?';
test('Known intercity endpoints do not trigger missing-station clarification',()=>{
 const journey=parseCommuteQuestion(question);
 assert.equal(journey.from,'Tyresö Centrum');
 assert.equal(journey.to,'Göteborg Centralstation');
 assert.equal(journey.needsClarification,false);
 assert.equal(journey.unsupportedIntercity,true);
 assert.equal(journey.region,null);
});
test('API acknowledges endpoints and fails closed without invented departures',async()=>{
 const response=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language:'sv',auto_language:false})}));
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.domain,'commutvue');
 assert.equal(body.clarify,false);
 assert.equal(body.verified,false);
 assert.equal(body.evidence_status,'unsupported_intercity');
 assert.match(body.answer,/Tyresö Centrum/);
 assert.match(body.answer,/Göteborg Centralstation/);
 assert.doesNotMatch(body.answer,/Ange avreseort/);
 assert.deepEqual(body.departures,[]);
});
