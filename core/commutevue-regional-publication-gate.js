/**
 * Pure, fail-closed gate between authenticated regional route evidence and
 * customer-visible departures. Does not enable publication by itself.
 * The caller must explicitly opt in after shadow verification.
 */
const GTFS_TIME=/^(?:[0-9]{2,3}):[0-5][0-9]:[0-5][0-9]$/;
const SAFE_LABEL=/^[^\u0000-\u001f\u007f]{1,120}$/u;
export function prepareRegionalPublication({proof,enabled=false,now=Date.now()}={}){
 const unavailable=reason=>({status:'unavailable',reason,departures:[]});
 if(enabled!==true)return unavailable('publication_disabled');
 if(proof?.status!=='route_matched'||!Array.isArray(proof.departures)||!proof.departures.length)return unavailable('no_verified_route');
 if(!Number.isFinite(now))return unavailable('invalid_clock');
 const departures=[];
 for(const d of proof.departures){
  if(typeof d?.tripId!=='string'||!d.tripId||typeof d.originStopId!=='string'||!d.originStopId||typeof d.destinationStopId!=='string'||!d.destinationStopId||d.originStopId===d.destinationStopId||d.evidence!=='regional_trip_update')return unavailable('incomplete_route_evidence');
  if(typeof d.scheduledDeparture!=='string'||!GTFS_TIME.test(d.scheduledDeparture)||typeof d.routeShortName!=='string'||!SAFE_LABEL.test(d.routeShortName)||typeof d.tripHeadsign!=='string'||!SAFE_LABEL.test(d.tripHeadsign))return unavailable('missing_display_metadata');
  const predicted=Date.parse(d.predictedDeparture);
  if(!Number.isFinite(predicted)||predicted<now-120000||predicted>now+7200000)return unavailable('invalid_prediction');
  departures.push(Object.freeze({tripId:d.tripId,originStopId:d.originStopId,destinationStopId:d.destinationStopId,scheduledDeparture:d.scheduledDeparture,predictedDeparture:new Date(predicted).toISOString(),line:d.routeShortName,destination:d.tripHeadsign,source:'SL Regional GTFS-RT'}));
 }
 if(new Set(departures.map(d=>d.tripId)).size!==departures.length)return unavailable('duplicate_trip');
 departures.sort((a,b)=>Date.parse(a.predictedDeparture)-Date.parse(b.predictedDeparture));
 return {status:'ready',reason:'verified_regional_departures',departures};
}
