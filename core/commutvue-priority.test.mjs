import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUT_ROLLOUT,COMMUT_PROVIDERS} from './commutvue.js';
import {commutePriority,prioritizedCommuteRegions} from './commutvue-priority.js';
test('Sweden first, Chile second, EU third, remaining countries last',()=>{
 assert.equal(commutePriority('SE'),1);
 assert.equal(commutePriority('CL'),2);
 for(const country of ['FR','ES','GR','DE','DK','FI'])assert.equal(commutePriority(country),3);
 for(const country of ['GB','TR','IN','CN','MX','AR','RU','US'])assert.equal(commutePriority(country),4);
});
test('rollout covers every registered region exactly once, without inferring geography from language',()=>{
 assert.equal(COMMUT_ROLLOUT.length,Object.keys(COMMUT_PROVIDERS).length);
 assert.equal(new Set(COMMUT_ROLLOUT.map(r=>r.id)).size,COMMUT_ROLLOUT.length);
 assert.equal(COMMUT_ROLLOUT[0].id,'stockholm');
 assert.equal(COMMUT_ROLLOUT[0].priority,1);
 const firstEU=COMMUT_ROLLOUT.findIndex(r=>r.priority===3);
 const firstRest=COMMUT_ROLLOUT.findIndex(r=>r.priority===4);
 assert.ok(COMMUT_ROLLOUT.filter(r=>r.country==='CL').every(r=>r.priority===2));
 assert.ok(firstEU>0&&firstRest>firstEU);
 assert.deepEqual(prioritizedCommuteRegions(COMMUT_PROVIDERS),COMMUT_ROLLOUT);
});
