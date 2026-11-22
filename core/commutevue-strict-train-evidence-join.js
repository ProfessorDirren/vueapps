import {stockholmWallClockToInstant} from './commutevue-stockholm-clock.js';
/**
 * Provider-boundary adapter: turn independently matched train evidence into
 * evidence the national itinerary guard can consume.
 * Do not match stations by fuzzy display names or infer arrival forecasts.
 */
const numeric=value=>typeof value==='string'&&/^[0-9]{1,8}$/.test(value);
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;
const sameMinute=(providerTime,resRobotLocalTime)=>{
 const provider=timestamp(providerTime),local=stockholmWallClockToInstant(resRobotLocalTime);
 return Number.isFinite(provider)&&local!==null&&Math.floor(provider/60000)===Math.floor(Date.parse(local)/60000);
};
export function joinNationalTrainEvidence(leg,probe,{originSignature,destinationSignature,stationMap}={}){
 if(!leg||!numeric(leg.serviceId)||!Array.isArray(probe?.departures)||probe.status!=='matched')return null;
 // Mapping must come from a separately verified station crosswalk.
 if(!stationMap||stationMap[leg.from]!==originSignature||stationMap[leg.to]!==destinationSignature||!originSignature||!destinationSignature||originSignature===destinationSignature)return null;
 if(probe.originSignature!==originSignature||probe.destinationSignature!==destinationSignature)return null;
 const matches=probe.departures.filter(item=>item.train===leg.serviceId&&sameMinute(item.advertisedTime,leg.departure));
 if(matches.length!==1)return null;
 const found=matches[0];
 // The experimental Trafikverket adapter exposes only the planned destination
 // arrival, not a destination realtime forecast. Do not invent one.
 if(typeof found.estimatedDestinationArrival!=='string'||!Number.isFinite(timestamp(found.estimatedDestinationArrival)))return null;
 if(!sameMinute(found.destinationArrival,leg.arrival))return null;
 if(found.cancelled===true)return {...leg,verified:true,cancelled:true};
 return {...leg,verified:true,estimatedDeparture:found.estimatedTime||null,estimatedArrival:found.estimatedDestinationArrival};
}
