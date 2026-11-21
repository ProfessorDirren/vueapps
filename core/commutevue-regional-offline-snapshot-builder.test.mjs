import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDirectRegionalTrips,stockholmServiceDate} from '../scripts/commutevue-build-regional-snapshot.mjs';
test('offline snapshot builder selects only forward direct trips',()=>{
 const trips=new Map([
 ['forward',['A','X','B']],
 ['reverse',['B','X','A']],
 ['disconnected',['A','X']],
 ['duplicate-origin',['A','A','B']],
 ['wrong',['C','D']]
 ]);
 assert.deepEqual([...selectDirectRegionalTrips(trips,new Set(['A']),new Set(['B']))],['forward','duplicate-origin']);
});
test('offline snapshot builder rejects unresolved station sets',()=>{
 assert.throws(()=>selectDirectRegionalTrips(new Map(),new Set(),new Set(['B'])));
});
test('Stockholm service day handles midnight and daylight saving',()=>{
 assert.equal(stockholmServiceDate(new Date('2026-11-20T23:30:00Z')),'20261121');
 assert.equal(stockholmServiceDate(new Date('2026-07-01T22:30:00Z')),'20260702');
});
