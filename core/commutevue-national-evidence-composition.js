import {verifyStationCandidates} from './commutevue-provider-station-verification.js';
import {resolveNationalLegStations} from './commutevue-station-crosswalk.js';
import {joinNationalTrainEvidence} from './commutevue-strict-train-evidence-join.js';
/**
 * Shadow-only composition of independently verified national train evidence.
 * No production publication or assumption that ResRobot and Trafikverket
 * train identifiers are interchangeable. Missing proof always returns null.
 */
export async function composeNationalTrainEvidence(leg,{stationCandidates,trafikverket,probe,resolveTrainIdentity}={}){
 if(!leg||typeof leg.serviceId!=='string'||!/^[0-9]{1,8}$/.test(leg.serviceId)||!Array.isArray(stationCandidates)||typeof probe!=='function'||typeof resolveTrainIdentity!=='function')return null;
 const names=[leg.from,leg.to];
 if(names.some(name=>typeof name!=='string'||!name.trim())||names[0]===names[1])return null;
 const candidates=names.map(name=>stationCandidates.filter(item=>item?.resRobotName===name));
 if(candidates.some(matches=>matches.length!==1))return null;
 const verified=await verifyStationCandidates(candidates.map(matches=>matches[0]),trafikverket);
 if(!verified)return null;
 const stations=resolveNationalLegStations(leg,verified);
 if(!stations)return null;
 // ResRobot product numbers and Trafikverket AdvertisedTrainIdent are
 // separate provider namespaces. Never assume the numeric strings are equal.
 let identity;
 try{identity=await resolveTrainIdentity({resRobotServiceId:leg.serviceId,from:leg.from,to:leg.to,departure:leg.departure,arrival:leg.arrival,resRobotStopIds:{from:candidates[0][0].resRobotStopId,to:candidates[1][0].resRobotStopId}});}catch{return null;}
 if(!identity||identity.verified!==true||identity.resRobotServiceId!==leg.serviceId||typeof identity.trafikverketTrainIdent!=='string'||! /^[0-9]{1,8}$/.test(identity.trafikverketTrainIdent))return null;
 let result;
 try{result=await probe({from:leg.from,to:leg.to});}catch{return null;}
 return joinNationalTrainEvidence({...leg,serviceId:identity.trafikverketTrainIdent},result,stations);
}
