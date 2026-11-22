import test from 'node:test';
import assert from 'node:assert/strict';
import {stockholmWallClockToInstant} from './commutevue-stockholm-clock.js';
test('winter and summer Sweden wall-clock times convert to correct UTC instants',()=>{
 assert.equal(stockholmWallClockToInstant('2026-11-23T07:00:00'),'2026-11-23T06:00:00.000Z');
 assert.equal(stockholmWallClockToInstant('2026-07-23T07:00:00'),'2026-07-23T05:00:00.000Z');
});
test('spring forward nonexistent Sweden local hour is rejected',()=>{
 assert.equal(stockholmWallClockToInstant('2026-03-29T02:30:00'),null);
 assert.equal(stockholmWallClockToInstant('2026-03-29T03:30:00'),'2026-03-29T01:30:00.000Z');
});
test('autumn repeated local hour is rejected instead of choosing an arbitrary train',()=>{
 assert.equal(stockholmWallClockToInstant('2026-10-25T02:30:00'),null);
 assert.equal(stockholmWallClockToInstant('2026-10-25T03:30:00'),'2026-10-25T02:30:00.000Z');
});
test('malformed and invalid dates are rejected',()=>{
 for(const value of ['2026-02-30T10:00:00','2026-11-23T25:00:00','2026-11-23T07:99:00','2026-11-23','not-a-time',null])assert.equal(stockholmWallClockToInstant(value),null);
});
