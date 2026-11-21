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

test('joins timed SL Regional GTFS static stops to matching realtime trip updates',()=>{
 const timedTrips=new Map([['sl-real-trip',[{stop:'9022001006161002',departureTime:'08:54:00',sequence:10},{stop:'intermediate',sequence:11},{stop:'9022001005310001',arrivalTime:'09:24:00',sequence:19}]]]);
 const live={trips:[{tripId:'sl-real-trip',stops:[{stopId:'9022001006161002',departure:{unixTime:1795250000,delaySeconds:120}}]}]};
 assert.deepEqual(joinRegionalTripEvidence({tripStops:timedTrips,evidence:live,originStopId:'9022001006161002',destinationStopId:'9022001005310001'}).matches,[{tripId:'sl-real-trip',originStopId:'9022001006161002',destinationStopId:'9022001005310001',departureUnixTime:1795250000,delaySeconds:120}]);
 assert.equal(joinRegionalTripEvidence({tripStops:timedTrips,evidence:live,originStopId:'9022001005310001',destinationStopId:'9022001006161002'}).matches.length,0);
});
