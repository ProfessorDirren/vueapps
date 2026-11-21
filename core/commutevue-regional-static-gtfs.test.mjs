import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRegionalStopTimes,parseRegionalStopNames,findRegionalDirectJourneys,parseRegionalServiceMetadata,filterRegionalActiveRailTrips,filterRegionalActiveTrips} from './commutevue-regional-static-gtfs.js';
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

test('matches Jordbro and Stockholm City stops and returns GTFS IDs',()=>{
 const rows='stop_id,stop_name,location_type,parent_station\n100,Jordbro,1,\n200,Stockholm City,1,\n300,Handen,1,\n';
 assert.deepEqual(parseRegionalStopNames(rows),[
  {stopId:'100',stopName:'Jordbro',parentStation:'',locationType:'1'},
  {stopId:'200',stopName:'Stockholm City',parentStation:'',locationType:'1'}
 ]);
});


test('matches direct ordered Jordbro to Stockholm City trips via platform IDs',()=>{
 const stops=[
  {stopId:'J',stopName:'Jordbro',locationType:'1',parentStation:''},
  {stopId:'J1',stopName:'Jordbro',locationType:'0',parentStation:'J'},
  {stopId:'JB',stopName:'Jordbro centrum Bussar',locationType:'2',parentStation:'J'},
  {stopId:'C',stopName:'Stockholm City',locationType:'1',parentStation:''},
  {stopId:'C1',stopName:'Stockholm City',locationType:'0',parentStation:'C'},
  {stopId:'S',stopName:'Södra Jordbrovägen',locationType:'1',parentStation:''}
 ];
 const trips=new Map([['direct',['J1','H','C1']],['reverse',['C1','H','J1']],['bus',['JB','H','C1']]]);
 assert.deepEqual(findRegionalDirectJourneys(trips,stops),{
  originName:'Jordbro',destinationName:'Stockholm City',originStopIdCount:2,destinationStopIdCount:2,
  matchingTripCount:1,examples:[{tripId:'direct',originStopId:'J1',destinationStopId:'C1',originSequence:1,destinationSequence:3,departureTime:null,arrivalTime:null}]
 });
});

test('retains scheduled departure and arrival times when requested',()=>{
 const csv='trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,08:01:00,08:02:00,J1,1\nt1,08:25:00,08:25:00,C1,9\n';
 const map=parseRegionalStopTimes(csv,{includeTimes:true});
 assert.deepEqual(map.get('t1'),[
  {stop:'J1',arrivalTime:'08:01:00',departureTime:'08:02:00',sequence:1},
  {stop:'C1',arrivalTime:'08:25:00',departureTime:'08:25:00',sequence:9}
 ]);
});

test('filters direct trips to active rail service on the selected date',()=>{
 const metadata=parseRegionalServiceMetadata({
  tripsCsv:'route_id,service_id,trip_id\nr1,sat,t1\nr1,off,t2\nr2,sat,t3\n',
  routesCsv:'route_id,route_type\nr1,2\nr2,3\n',
  calendarCsv:'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nsat,0,0,0,0,0,1,0,20260101,20261231\noff,0,0,0,0,0,0,0,20260101,20261231\n',
  calendarDatesCsv:'service_id,date,exception_type\noff,20261121,1\nsat,20261121,2\n'
 });
 const trips=new Map([['t1',['J','C']],['t2',['J','C']],['t3',['J','C']]]);
 const result=filterRegionalActiveRailTrips(trips,metadata,'20261121');
 assert.deepEqual([...result.trips.keys()],['t2']);
 assert.equal(result.nonRailTripCount,1);
 assert.equal(result.inactiveTripCount,1);
 assert.equal(result.missingMetadataTripCount,0);
});
test('rejects malformed service date and missing trip metadata',()=>{
 const metadata=parseRegionalServiceMetadata({tripsCsv:'trip_id,route_id,service_id\nt1,r1,s1\n',routesCsv:'route_id,route_type\nr1,2\n'});
 assert.throws(()=>filterRegionalActiveRailTrips(new Map(),metadata,'2026-11-21'));
 assert.throws(()=>filterRegionalActiveRailTrips(new Map(),metadata,'20260230'));
});

test('parses regional service calendar metadata with CRLF line endings',()=>{
 const metadata=parseRegionalServiceMetadata({
  tripsCsv:'trip_id,route_id,service_id\r\nt1,r1,s1\r\n',
  routesCsv:'route_id,route_type\r\nr1,2\r\n',
  calendarCsv:'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\r\ns1,0,0,0,0,0,1,0,20260101,20261231\r\n',
  calendarDatesCsv:'service_id,date,exception_type\r\ns1,20261121,2\r\n'
 });
 const result=filterRegionalActiveRailTrips(new Map([['t1',['J','C']]]),metadata,'20261121');
 assert.equal(result.trips.size,0);
 assert.equal(result.inactiveTripCount,1);
});

test('multimodal active trips retain buses, trains, ferries and extended GTFS route types',()=>{
 const metadata=parseRegionalServiceMetadata({
  tripsCsv:'trip_id,route_id,service_id\ntbus,rbus,s1\ntrail,rrail,s1\ntferry,rferry,s1\next,rext,s1\noff,rbus,s2\n',
  routesCsv:'route_id,route_type\nrbus,3\nrrail,2\nrferry,4\nrext,109\n',
  calendarCsv:'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ns1,0,0,0,0,0,1,0,20260101,20261231\ns2,0,0,0,0,0,0,0,20260101,20261231\n'
 });
 const trips=new Map(['tbus','trail','tferry','ext','off'].map(k=>[k,['A','B']]));
 const all=filterRegionalActiveTrips(trips,metadata,'20261121');
 assert.deepEqual([...all.trips.keys()],['tbus','trail','tferry','ext']);
 assert.deepEqual(all.activeByType,{'2':1,'3':1,'4':1,'109':1});
 const onlyBus=filterRegionalActiveTrips(trips,metadata,'20261121',{routeTypes:new Set([3])});
 assert.deepEqual([...onlyBus.trips.keys()],['tbus']);
 assert.equal(onlyBus.excludedRouteTypeTripCount,3);
});
