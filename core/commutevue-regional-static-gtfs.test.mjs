import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRegionalStopTimes} from './commutevue-regional-static-gtfs.js';
test('builds stop sequence sorted by GTFS stop_sequence',()=>{
 const map=parseRegionalStopTimes('trip_id,stop_id,stop_sequence\nt1,StockholmCity,3\nt1,Jordbro,1\nt1,Handen,2\n');
 assert.deepEqual(map.get('t1'),['Jordbro','Handen','StockholmCity']);
});
test('accepts BOM and quoted CSV fields',()=>{
 const map=parseRegionalStopTimes('\uFEFFstop_sequence,stop_id,trip_id\n1,"Jordbro, platform",t1\n2,StockholmCity,t1');
 assert.deepEqual(map.get('t1'),['Jordbro, platform','StockholmCity']);
});
test('rejects duplicate stop sequence',()=>assert.throws(()=>parseRegionalStopTimes('trip_id,stop_id,stop_sequence\nt1,J,1\nt1,C,1')));
test('rejects missing required columns',()=>assert.throws(()=>parseRegionalStopTimes('trip_id,stop_id\nt1,J')));
test('rejects row cap overflow',()=>assert.throws(()=>parseRegionalStopTimes('trip_id,stop_id,stop_sequence\nt1,J,1\nt1,C,2',{maxRows:1})));

test('accepts a larger regional stop_times dataset within bounded limits',()=>{
 const rows=['trip_id,stop_id,stop_sequence'];
 for(let i=0;i<500001;i++)rows.push('t'+Math.floor(i/10)+',s'+(i%10)+','+(i%10+1));
 const map=parseRegionalStopTimes(rows.join('\n'));
 assert.equal(map.size,50001);
});
test('rejects unsafe row and trip limits',()=>{
 const csv='trip_id,stop_id,stop_sequence\nt1,J,1';
 assert.throws(()=>parseRegionalStopTimes(csv,{maxRows:5000001}));
 assert.throws(()=>parseRegionalStopTimes(csv,{maxTrips:250001}));
});
