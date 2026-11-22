/**
 * Station crosswalk boundary. A ResRobot stop and Trafikverket signature are
 * linked only by a separately verified explicit mapping, never by fuzzy names.
 */
const signature=value=>typeof value==='string'&&/^[A-Za-zÅÄÖåäö0-9]{1,12}$/.test(value);
export function validateStationCrosswalk(entries){
 if(!Array.isArray(entries)||!entries.length)return null;
 const byName=Object.create(null),byStopId=new Set(),seenSignatures=new Set();
 for(const entry of entries){
  const name=entry?.resRobotName,stopId=entry?.resRobotStopId,station=entry?.trafikverketSignature;
  if(typeof name!=='string'||!name.trim()||name!==name.trim()||typeof stopId!=='string'||!/^A=\d+@?$/.test(stopId)||!signature(station)||entry?.verified!==true)return null;
  if(Object.hasOwn(byName,name)||byStopId.has(stopId)||seenSignatures.has(station))return null;
  byName[name]={station,stopId};byStopId.add(stopId);seenSignatures.add(station);
 }
 return byName;
}
export function resolveNationalLegStations(leg,entries){
 const map=validateStationCrosswalk(entries);
 if(!map||!leg||typeof leg.from!=='string'||typeof leg.to!=='string')return null;
 const origin=map[leg.from],destination=map[leg.to];
 if(!origin||!destination||origin.station===destination.station||origin.stopId===destination.stopId)return null;
 return {originSignature:origin.station,destinationSignature:destination.station,originStopId:origin.stopId,destinationStopId:destination.stopId,stationMap:Object.fromEntries(Object.entries(map).map(([name,value])=>[name,value.station]))};
}
