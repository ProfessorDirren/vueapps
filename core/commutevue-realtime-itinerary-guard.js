/**
 * Pure, provider-neutral safety gate for planned national journeys.
 * Evidence is supplied by separately verified realtime adapters; never guess a
 * match from a station name or train number alone.
 * No external calls or production routing occur here.
 */
const minute=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)?Date.parse(value):NaN;
const identity=leg=>typeof leg?.serviceId==='string'&&leg.serviceId.trim()&&typeof leg?.departure==='string'&&typeof leg?.from==='string'&&typeof leg?.to==='string'?JSON.stringify([leg.serviceId.trim(),leg.from,leg.to,leg.departure]):null;
export function assessRealtimeJourney(trip,evidence,{arriveBy=null}={}){
 if(!Array.isArray(trip?.legs)||!trip.legs.length||!Array.isArray(evidence))return {status:'unverified',reason:'missing_journey_or_evidence'};
 // A uniquely verified cancellation takes priority over transfer-risk calculations.
 // Otherwise a later walking leg can hide the more important cancelled service.
 for(const leg of trip.legs){
  if(leg?.mode==='WALK')continue;
  const key=identity(leg);
  const matches=key?evidence.filter(item=>identity(item)===key&&item.verified===true):[];
  if(matches.length===1&&matches[0].cancelled===true)return {status:'cancelled',reason:'verified_cancellation',details:[{status:'cancelled'}]};
 }
 let lastArrival=-Infinity,hasUnverified=false,hasCancellation=false,hasDelay=false;
 const details=[];
 for(const leg of trip.legs){
  const plannedDeparture=minute(leg?.departure),plannedArrival=minute(leg?.arrival);
  if(!Number.isFinite(plannedDeparture)||!Number.isFinite(plannedArrival)||plannedArrival<plannedDeparture)return {status:'unverified',reason:'invalid_planned_times'};
  if(leg.mode==='WALK'){
   if(plannedDeparture<lastArrival)return {status:'connection_at_risk',reason:'missed_walking_transfer'};
   lastArrival=plannedArrival;details.push({status:'planned_walk'});continue;
  }
  const key=identity(leg);
  const matches=key?evidence.filter(item=>identity(item)===key&&item.verified===true):[];
  if(matches.length!==1){hasUnverified=true;details.push({status:'unverified'});lastArrival=plannedArrival;continue;}
  const matched=matches[0];
  if(matched.cancelled===true){hasCancellation=true;details.push({status:'cancelled'});continue;}
  if(!matched.estimatedArrival){hasUnverified=true;details.push({status:'unverified',reason:'missing_arrival_forecast'});lastArrival=plannedArrival;continue;}
  const predictedDeparture=minute(matched.estimatedDeparture||leg.departure);
  const predictedArrival=minute(matched.estimatedArrival);
  if(!Number.isFinite(predictedDeparture)||!Number.isFinite(predictedArrival)||predictedArrival<predictedDeparture)return {status:'unverified',reason:'invalid_realtime_times'};
  if(predictedDeparture<lastArrival)return {status:'connection_at_risk',reason:'missed_transfer'};
  if(predictedArrival>plannedArrival)hasDelay=true;
  lastArrival=predictedArrival;details.push({status:'matched',estimatedArrival:matched.estimatedArrival||null});
 }
 if(hasCancellation)return {status:'cancelled',reason:'verified_cancellation',details};
 if(hasUnverified)return {status:'unverified',reason:'incomplete_realtime_coverage',details};
 if(arriveBy){
  const deadline=minute(arriveBy.cutoff);
  if(!Number.isFinite(deadline))return {status:'unverified',reason:'invalid_deadline'};
  if(lastArrival>deadline)return {status:'arrival_deadline_missed',reason:'late_arrival',details};
 }
 return {status:hasDelay?'delayed':'on_time',reason:'verified_evidence',details};
}
