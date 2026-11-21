import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRegionalServiceSnapshot,resolveRegionalStationStopIds} from './commutevue-regional-snapshot.js';

const date='20261121',now=1763718000000;
const trips=new Map([['active',['origin','destination']],['inactive',['origin','destination']]]);
const serviceMetadata={
 tripById:new Map([['active',{routeId:'r',serviceId:'s'}],['inactive',{routeId:'r',serviceId:'off'}]]),
 routeTypes:new Map([['r',2]]),
 serviceCalendars:new Map([['s',{start_date:'20260101',end_date:'20261231',saturday:'1'}],['off',{start_date:'20260101',end_date:'20261231',saturday:'0'}]]),
 serviceExceptions:new Map()
};

test('regional snapshot keeps only trips active on the service date',()=>{
 const result=buildRegionalServiceSnapshot({tripStops:trips,serviceMetadata,serviceDate:date,validatedAtMs:now,archiveVerified:true});
 assert.equal(result.status,'validated');
 assert.deepEqual([...result.tripStops.keys()],['active']);
 assert.equal(result.activeTripCount,1);
});

test('regional snapshot fails closed for unverified archive, bad date and no active trips',()=>{
 const base={tripStops:trips,serviceMetadata,serviceDate:date,validatedAtMs:now,archiveVerified:true};
 assert.equal(buildRegionalServiceSnapshot({...base,archiveVerified:false}).status,'unavailable');
 assert.equal(buildRegionalServiceSnapshot({...base,serviceDate:'not-a-date'}).status,'unavailable');
 assert.equal(buildRegionalServiceSnapshot({...base,routeTypes:new Set([3])}).status,'unavailable');
});

test('regional station lookup matches exact station and includes child platforms',()=>{
 const stops=[
  {stopId:'parent',stopName:'Stockholm City',locationType:'1'},
  {stopId:'platform',stopName:'City platform',parentStation:'parent',locationType:'0'},
  {stopId:'other',stopName:'Stockholm City North',locationType:'1'}
 ];
 assert.deepEqual([...resolveRegionalStationStopIds(stops,'stockholm city')].sort(),['parent','platform']);
 assert.deepEqual([...resolveRegionalStationStopIds(stops,'Stockholm')],[]);
});
