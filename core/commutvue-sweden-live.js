/**
 * Trafiklab's actual Timetables + Trips API, not a mock station-board contract.
 * Fail closed when a stop match, route order, timestamp or realtime flag is missing.
 * Server-side only. Never expose API keys in source URLs.
 */
import {queryCommute} from './commutvue.js';
const ROOT='https://realtime-api.trafiklab.se/v1/';
const area=id=>/^740\d{6}$/.test(String(id));
const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d));
const timestamp=t=>typeof t==='string'&&Number.isFinite(Date.parse(t.endsWith('Z')?t:t+'+01:00'));
const fresh=(t,now)=>timestamp(t)&&Math.abs(now-Date.parse(t.endsWith('Z')?t:t+'+01:00'))<=120000;
export function createVerifiedSwedenAdapter({apiKey,fetcher=fetch,resolveStop,now=()=>Date.now(),maxTrips=8}={}){
 if(!apiKey||typeof fetcher!=='function'||typeof resolveStop!=='function'||typeof now!=='function')throw new TypeError('Server-only Trafiklab credentials, fetcher and stop lookup required');
 async function get(path){
  const url=new URL(path,ROOT);url.searchParams.set('key',apiKey);
  const res=await fetcher(url.toString(),{headers:{accept:'application/json'}});
  if(!res.ok)throw Error('Trafiklab unavailable');
  return res.json();
 }
 return async({provider,from,to})=>{
  if(provider!=='stockholm')throw Error('Unexpected region');
  const [origin,destination]=await Promise.all([resolveStop(from),resolveStop(to)]);
  if(!area(origin)||!area(destination)||origin===destination)return {provider,status:'unavailable',departures:[]};
  const board=await get('departures/'+origin);
  if(!Array.isArray(board.departures)||!fresh(board.timestamp,now()))return {provider,status:'unavailable',departures:[]};
  const departures=[];const ids=[];const seen=new Set();
  for(const d of board.departures){
   if(departures.length>=maxTrips)break;
   const tripId=d?.trip?.trip_id,startDate=d?.trip?.start_date;
   if(typeof tripId!=='string'||!tripId||!date(startDate)||!d.is_realtime||!d.stop?.id)continue;
   const id=tripId+'|'+startDate+'|'+d.stop.id;
   if(seen.has(id))continue;seen.add(id);
   const details=await get('trips/'+encodeURIComponent(tripId)+'/'+startDate);
   if(!fresh(details.timestamp,now())||!Array.isArray(details.calls)||details.trip?.trip_id!==tripId||details.trip?.start_date!==startDate)continue;
   const calls=details.calls;
   const i=calls.findIndex(c=>c.stop?.id===d.stop.id&&c.stop?.area_id===origin);
   const j=calls.findIndex((c,k)=>k>i&&c.stop?.area_id===destination);
   if(i<0||j<=i||!calls[i].is_realtime||!timestamp(d.scheduled)||!timestamp(d.realtime))continue;
   const scheduled=Date.parse(d.scheduled+'+01:00'),expected=Date.parse(d.realtime+'+01:00');
   if(!Number.isFinite(scheduled)||!Number.isFinite(expected))continue;
   departures.push({id,line:String(d.route?.designation||d.route?.name||''),destination:String(d.route?.direction||d.route?.destination?.name||''),scheduled:new Date(scheduled).toISOString(),expected:new Date(expected).toISOString(),cancelled:d.canceled===true});
   ids.push(id);
  }
  if(!departures.length)return {provider,status:'unavailable',departures:[]};
  return {provider,status:'ok',sourceUrl:ROOT+'departures/'+origin,updatedAt:new Date(now()).toISOString(),journeyEvidence:{verified:true,originId:origin,destinationId:destination,departureIds:ids},departures};
 };
}
