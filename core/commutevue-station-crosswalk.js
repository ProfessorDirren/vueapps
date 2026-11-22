/**
 * Station crosswalk boundary. A ResRobot stop and Trafikverket signature are
 * linked only by a separately verified explicit mapping, never by fuzzy names.
 */
const signature=value=>typeof value==='string'&&/^[A-Za-zÅÄÖåäö0-9]{1,12}$/.test(value);
export function validateStationCrosswalk(entries){
 if(!Array.isArray(entries)||!entries.length)return null;
 const byName=Object.create(null),seenSignatures=new Set();
 for(const entry of entries){
  const name=entry?.resRobotName,station=entry?.trafikverketSignature;
  if(typeof name!=='string'||!name.trim()||name!==name.trim()||!signature(station)||entry?.verified!==true)return null;
  if(Object.hasOwn(byName,name)||seenSignatures.has(station))return null;
  byName[name]=station;seenSignatures.add(station);
 }
 return byName;
}
export function resolveNationalLegStations(leg,entries){
 const map=validateStationCrosswalk(entries);
 if(!map||!leg||typeof leg.from!=='string'||typeof leg.to!=='string')return null;
 const originSignature=map[leg.from],destinationSignature=map[leg.to];
 if(!originSignature||!destinationSignature||originSignature===destinationSignature)return null;
 return {originSignature,destinationSignature,stationMap:map};
}
