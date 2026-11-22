import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalJourneyDurationMinutes} from './commutevue-national-duration.js';
test('winter journey duration is independent of server timezone',()=>{
 assert.equal(nationalJourneyDurationMinutes('2026-11-23T07:00:00','2026-11-23T10:20:00'),200);
});
test('summer journey duration is independent of server timezone',()=>{
 assert.equal(nationalJourneyDurationMinutes('2026-07-23T07:00:00','2026-07-23T10:20:00'),200);
});
test('spring forward skips one real hour',()=>{
 assert.equal(nationalJourneyDurationMinutes('2026-03-29T01:30:00','2026-03-29T03:30:00'),60);
});
test('autumn fall back includes the repeated hour',()=>{
 assert.equal(nationalJourneyDurationMinutes('2026-10-25T01:30:00','2026-10-25T03:30:00'),180);
});
test('ambiguous, nonexistent, invalid and reversed timestamps fail closed',()=>{
 assert.equal(nationalJourneyDurationMinutes('2026-10-25T02:30:00','2026-10-25T03:30:00'),null);
 assert.equal(nationalJourneyDurationMinutes('2026-03-29T02:30:00','2026-03-29T03:30:00'),null);
 assert.equal(nationalJourneyDurationMinutes('invalid','2026-11-23T10:20:00'),null);
 assert.equal(nationalJourneyDurationMinutes('2026-11-23T10:20:00','2026-11-23T07:00:00'),null);
});
