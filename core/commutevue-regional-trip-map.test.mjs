import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRegionalTripStops} from './commutevue-regional-trip-map.js';
import {joinRegionalTripEvidence} from './commutevue-regional-trip-join.js';
const dataset={format:'commutevue-regional-trip-stops-v1',tripCount:1,trips:{'trip-1':['Jordbro','Handen','StockholmCity']}};
test('validated offline dataset feeds exact realtime trip join',()=>{
 const tripStops=loadRegionalTripStops(dataset);
 const result=joinRegionalTripEvidence({tripStops,evidence:{trips:[{tripId:'trip-1',stops:[{stopId:'Jordbro',departure:{unixTime:1795250000,delaySeconds:60}}]}]},originStopId:'Jordbro',destinationStopId:'StockholmCity'});
 assert.equal(result.matches.length,1);
 assert.equal(result.matches[0].delaySeconds,60);
});
test('rejects mismatched counts and invalid stop lists',()=>{
 assert.throws(()=>loadRegionalTripStops({...dataset,tripCount:2}));
 assert.throws(()=>loadRegionalTripStops({...dataset,trips:{'trip-1':['Jordbro']}}));
 assert.throws(()=>loadRegionalTripStops({...dataset,trips:{'trip-1':['Jordbro',null]}}));
});
