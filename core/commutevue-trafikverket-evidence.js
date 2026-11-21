/**
 * Classify Trafikverket departure evidence without confusing a timetable
 * or a modification timestamp with a live delay prediction.
 */
const parse=value=>typeof value==='string'&&value.trim()?Date.parse(value):NaN;
export function classifyTrafikverketDeparture(departure,{now=Date.now()}={}){
 const advertised=parse(departure?.advertisedTime);
 const estimated=parse(departure?.estimatedTime);
 if(!Number.isFinite(advertised)||!Number.isFinite(now))return {status:'unavailable',delayMinutes:null,departureTime:null};
 // A forecast is meaningful only for a not-yet-passed departure and
 // cannot be inferred from ModifiedTime or a previously recorded actual.
 if(Number.isFinite(estimated)&&advertised>=now-120000){
  const delayMinutes=Math.round((estimated-advertised)/60000);
  return {status:'estimated',delayMinutes,departureTime:new Date(estimated).toISOString()};
 }
 return {status:'timetable_only',delayMinutes:null,departureTime:new Date(advertised).toISOString()};
}
