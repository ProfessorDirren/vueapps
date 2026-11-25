import test from 'node:test';
import assert from 'node:assert/strict';
import {regionalScheduledTimeMs as time} from './commutevue-regional-service-clock.js';
test('winter, summer and extended GTFS hours',()=>{
 assert.equal(time('20261125','12:00:00'),Date.parse('2026-11-25T11:00:00Z'));
 assert.equal(time('20260725','12:00:00'),Date.parse('2026-07-25T10:00:00Z'));
 assert.equal(time('20261125','25:30:00'),Date.parse('2026-11-26T00:30:00Z'));
});
test('GTFS noon anchor remains unambiguous on DST transition days',()=>{
 assert.equal(time('20260329','00:00:00'),Date.parse('2026-03-28T22:00:00Z'));
 assert.equal(time('20261025','00:00:00'),Date.parse('2026-10-24T23:00:00Z'));
});
test('reject invalid service dates and times',()=>{
 for(const [d,t] of [['20260230','12:00:00'],['20261125','12:60:00'],[null,'12:00:00'],['20261125',null]])assert.equal(time(d,t),null);
});
