import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRegionalActiveTripIndex} from './commutevue-regional-active-trip-index.js';
import {loadRegionalTripStops} from './commutevue-regional-trip-map.js';
test('offline active SL index retains only relevant trips and preserves stop order',()=>{
 const trips=new Map([['active-direct',[{stop:'J',departureTime:'08:54:00'},{stop:'S'},{stop:'C'}]],['other',['A','B']],['active-return',['C','J']]]);
 const index=buildRegionalActiveTripIndex({activeTrips:trips,serviceDate:'20261121',stopIds:new Set(['J'])});
 assert.equal(index.tripCount,2);
 assert.equal(index.serviceDate,'20261121');
 assert.deepEqual(loadRegionalTripStops(index).get('active-direct'),['J','S','C']);
 assert.equal(loadRegionalTripStops(index).has('other'),false);
});
test('offline active SL index fails closed for oversized and invalid records',()=>{
 const base={activeTrips:new Map([['one',['J','C']],['two',['J','C']]]),serviceDate:'20261121',stopIds:new Set(['J'])};
 assert.throws(()=>buildRegionalActiveTripIndex({...base,maxTrips:1}));
 assert.throws(()=>buildRegionalActiveTripIndex({...base,serviceDate:'today'}));
 assert.throws(()=>buildRegionalActiveTripIndex({...base,activeTrips:new Map([['broken',[{stop:'J'},{}]]])}));
});
