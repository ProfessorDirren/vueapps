/**
 * Fail-closed evidence matching for Trafikverket train announcements.
 * Both station boards must independently report the same train, with arrival
 * after departure inside a bounded journey window (including midnight).
 * An estimated departure is never inferred from the destination board.
 */
const timestamp=value=>typeof value==='string'&&value.trim()?Date.parse(value):NaN;
const id=value=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
const validTrain=value=>/^\d{1,8}$/.test(id(value));
const validStation=value=>typeof value==='string'&&/^[A-Za-zÅÄÖåäö0-9]{1,12}$/.test(value);
export function matchTrafikverketTrainRoute({origin,destination,originSignature,destinationSignature,now=Date.now()}={}){
 if(!Array.isArray(origin)||!Array.isArray(destination)||!validStation(originSignature)||!validStation(destinationSignature)||originSignature===destinationSignature||!Number.isFinite(now))return [];
 const destinationByTrain=new Map();
 for(const d of destination){
  const t=timestamp(d?.AdvertisedTimeAtLocation),train=id(d?.AdvertisedTrainIdent);
  if(d?.LocationSignature!==destinationSignature||d?.ActivityType!=='Ankomst'||d?.Canceled===true||!validTrain(train)||!Number.isFinite(t))continue;
  const key=train;
  const entries=destinationByTrain.get(key)||new Set();entries.add(t);destinationByTrain.set(key,entries);
 }
 const matched=[];
 const originForecasts=new Map();
 for(const o of origin){
  const train=id(o?.AdvertisedTrainIdent),advertised=timestamp(o?.AdvertisedTimeAtLocation);
  if(o?.LocationSignature!==originSignature||o?.ActivityType!=='Avgang'||o?.Canceled===true||!validTrain(train)||!Number.isFinite(advertised))continue;
  const key=train+'|'+advertised;
  const forecast=Number.isFinite(timestamp(o?.EstimatedTimeAtLocation))?timestamp(o.EstimatedTimeAtLocation):null;
  const known=originForecasts.get(key)||new Set();known.add(forecast);originForecasts.set(key,known);
 }
 const seenOrigin=new Set();
 for(const o of origin){
  const advertised=timestamp(o?.AdvertisedTimeAtLocation),estimated=timestamp(o?.EstimatedTimeAtLocation),actual=timestamp(o?.TimeAtLocation),modified=timestamp(o?.ModifiedTime),train=id(o?.AdvertisedTrainIdent);
  if(o?.LocationSignature!==originSignature||o?.ActivityType!=='Avgang'||o?.Canceled===true||!validTrain(train)||!Number.isFinite(advertised)||advertised<now-120000||advertised>now+7200000)continue;
  // Train identity and chronological stop order establish the same journey,
  // including services that legitimately cross Swedish midnight.
  // A strict calendar-date equality would discard those journeys.
  const later=[...(destinationByTrain.get(train)||[])].filter(t=>t>advertised&&t-advertised<=10800000);
  if(later.length!==1)continue;
  const originKey=train+'|'+advertised;
  // Conflicting forecasts for the same departure cannot be resolved safely.
  if(originForecasts.get(originKey)?.size!==1||seenOrigin.has(originKey))continue;
  seenOrigin.add(originKey);
  matched.push({train,advertisedTime:o.AdvertisedTimeAtLocation,estimatedTime:Number.isFinite(estimated)?o.EstimatedTimeAtLocation:null,destinationArrival:new Date(later[0]).toISOString(),hasEstimatedTime:Number.isFinite(estimated),hasActualTime:Number.isFinite(actual),hasModifiedTime:Number.isFinite(modified)});
 }
 return matched;
}
