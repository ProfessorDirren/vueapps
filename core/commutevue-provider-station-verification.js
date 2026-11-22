import {validateStationCrosswalk} from './commutevue-station-crosswalk.js';
/**
 * Independently check candidate ResRobot/Trafikverket station crosswalk entries
 * against Trafikverket's exact station lookup. A caller-provided verified flag
 * is not evidence. The caller must obtain ResRobot names from ResRobot itself.
 * No provider credentials are exposed by this module.
 */
export async function verifyStationCandidates(candidates,trafikverket){
 if(!Array.isArray(candidates)||!candidates.length||typeof trafikverket?.station!=='function')return null;
 const verified=[];
 for(const candidate of candidates){
  const name=candidate?.resRobotName,stopId=candidate?.resRobotStopId,expected=candidate?.trafikverketSignature;
  if(typeof name!=='string'||!name.trim()||typeof stopId!=='string'||!/^A=\d+@?$/.test(stopId)||typeof expected!=='string')return null;
  let actual;
  try{actual=await trafikverket.station(name);}catch{return null;}
  if(actual!==expected)return null;
  verified.push({resRobotName:name,resRobotStopId:stopId,trafikverketSignature:actual,verified:true});
 }
 return validateStationCrosswalk(verified)?verified:null;
}
