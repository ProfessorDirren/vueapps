import test from 'node:test';
import assert from 'node:assert/strict';
import {joinRegionalTripEvidence} from './commutevue-regional-trip-join.js';
const tripStops=new Map([['trip-1',['Jordbro','Handen','StockholmCity']],['trip-2',['StockholmCity','Handen','Jordbro']]]);
const evidence={trips:[{tripId:'trip-1',stops:[{stopId:'Jordbro',departure:{unixTime:1795250000,delaySeconds:120}}]},{tripId:'unknown',stops:[{stopId:'Jordbro',departure:{unixTime:1795250000,delaySeconds:999}}]},{tripId:'trip-2',stops:[{stopId:'Jordbro',departure:{unixTime:1795250000,delaySeconds:300}}]}]};
test('matches only same-feed trip with origin before destination',()=>{
 const result=joinRegionalTripEvidence({tripStops,evidence,originStopId:'Jordbro',destinationStopId:'StockholmCity'});
 assert.deepEqual(result.matches,[{tripId:'trip-1',originStopId:'Jordbro',destinationStopId:'StockholmCity',departureUnixTime:1795250000,delaySeconds:120}]);
});
test('rejects duplicate origin stop events',()=>{
 const result=joinRegionalTripEvidence({tripStops,evidence:{trips:[{tripId:'trip-1',stops:[{stopId:'Jordbro',departure:{delaySeconds:1}},{stopId:'Jordbro',departure:{delaySeconds:2}}]}]},originStopId:'Jordbro',destinationStopId:'StockholmCity'});
 assert.equal(result.matches.length,0);
});
test('rejects missing static map and same origin/destination',()=>{
 assert.throws(()=>joinRegionalTripEvidence({tripStops:null,evidence,originStopId:'Jordbro',destinationStopId:'StockholmCity'}),TypeError);
 assert.throws(()=>joinRegionalTripEvidence({tripStops,evidence,originStopId:'Jordbro',destinationStopId:'Jordbro'}),TypeError);
});
