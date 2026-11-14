import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-router.js';
test('COMMUTVUE does not generate invented live train delays',async()=>{
 const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Är pendeltågen från Jordbro till T-Centralen försenade?',language:'sv'})});
 const response=await POST(request);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.domain,'commutvue');
 assert.equal(data.verified,false);
 assert.equal(data.evidence_status,'live_unavailable');
 assert.equal(data.photo_status,'not_supplied');
 assert.equal(data.photo_evidence,null);
 assert.match(data.answer,/inte tillgänglig/);
});

test('COMMUTVUE asks for missing stations in the requested language',async()=>{
 const request=new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'RER B delayed?',language:'fr'})});
 const response=await POST(request);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.domain,'commutvue');
 assert.equal(data.clarify,true);
 assert.equal(data.evidence_status,'needs_stations');
 assert.match(data.answer,/gare de départ/);
});
