import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTrafikverketDeparture} from './commutevue-trafikverket-evidence.js';
const advertisedTime='2026-11-21T10:30:00+01:00';
const now=Date.parse('2026-11-21T10:20:00+01:00');
test('COMMUTEVUE uses only explicit estimated departure to classify delay',()=>{
 const result=classifyTrafikverketDeparture({advertisedTime,estimatedTime:'2026-11-21T10:35:00+01:00'},{now});
 assert.equal(result.status,'estimated');
 assert.equal(result.delayMinutes,5);
 assert.equal(result.departureTime,'2026-11-21T09:35:00.000Z');
});
test('COMMUTEVUE never turns ModifiedTime or actual board data into a prediction',()=>{
 const result=classifyTrafikverketDeparture({advertisedTime,modifiedTime:'2026-11-21T10:25:00+01:00',actualTime:'2026-11-21T10:32:00+01:00'},{now});
 assert.equal(result.status,'timetable_only');
 assert.equal(result.delayMinutes,null);
});
test('COMMUTEVUE rejects invalid advertised time and stale forecasts',()=>{
 assert.equal(classifyTrafikverketDeparture({advertisedTime:'invalid'},{now}).status,'unavailable');
 const stale=classifyTrafikverketDeparture({advertisedTime,estimatedTime:'2026-11-21T10:35:00+01:00'},{now:Date.parse('2026-11-21T10:40:00+01:00')});
 assert.equal(stale.status,'timetable_only');
 assert.equal(stale.delayMinutes,null);
});
