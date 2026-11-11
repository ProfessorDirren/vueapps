import test from 'node:test';
import assert from 'node:assert/strict';
import {formatVerifiedDepartures} from './commutvue-format.js';
const departures=[{line:'40',destination:'Central Station',scheduled:'2026-11-11T15:05:00Z',expected:'2026-11-11T15:09:00Z',delayMinutes:4},{line:'41',destination:'Airport',scheduled:'2026-11-11T15:20:00Z',expected:'2026-11-11T15:20:00Z',delayMinutes:0}];
test('verified departures show local clock times, lines and destinations, one per line',()=>{
 const output=formatVerifiedDepartures(departures,'sv');
 assert.match(output,/16:09.*40.*Central Station.*Försening: 4 min/);
 assert.match(output,/16:20.*41.*Airport/);
 assert.equal(output.split('\n').length,2);
 assert.doesNotMatch(output,/Airport.*Försening/);
});
test('verified time follows Stockholm DST rather than server timezone',()=>{
 const summer=[{line:'A',destination:'Station',scheduled:'2026-07-01T10:00:00Z',expected:'2026-07-01T10:00:00Z',delayMinutes:0}];
 assert.match(formatVerifiedDepartures(summer,'en'),/^12:00/);
 assert.match(formatVerifiedDepartures(departures,'en'),/^16:09/);
});
test('missing verified time fails closed',()=>{
 assert.throws(()=>formatVerifiedDepartures([{line:'A',destination:'B'}]),/timestamp/);
});
