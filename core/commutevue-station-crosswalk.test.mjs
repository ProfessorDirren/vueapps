import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStationCrosswalk,resolveNationalLegStations} from './commutevue-station-crosswalk.js';
const entries=[{resRobotName:'Stockholm Centralstation',trafikverketSignature:'Cst',verified:true},{resRobotName:'Göteborg Centralstation',trafikverketSignature:'G',verified:true}];
const leg={from:'Stockholm Centralstation',to:'Göteborg Centralstation'};
test('explicitly verified crosswalk resolves exact national station pair',()=>{
 const result=resolveNationalLegStations(leg,entries);
 assert.equal(result.originSignature,'Cst');
 assert.equal(result.destinationSignature,'G');
});
test('missing, unverified, duplicate or invalid mappings fail closed',()=>{
 assert.equal(resolveNationalLegStations(leg,entries.slice(0,1)),null);
 assert.equal(validateStationCrosswalk([{...entries[0],verified:false},entries[1]]),null);
 assert.equal(validateStationCrosswalk([...entries,entries[0]]),null);
 assert.equal(validateStationCrosswalk([{...entries[0],trafikverketSignature:'G'},entries[1]]),null);
 assert.equal(validateStationCrosswalk([{...entries[0],trafikverketSignature:'<bad>'},entries[1]]),null);
 assert.equal(validateStationCrosswalk([]),null);
});
test('station aliases are not guessed from a similar name',()=>{
 assert.equal(resolveNationalLegStations({...leg,from:'Stockholm C'},entries),null);
 assert.equal(resolveNationalLegStations({...leg,to:'Göteborg C'},entries),null);
});
