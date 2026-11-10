import {COMMUT_PROVIDERS} from './commutvue.js';
/**
 * Provider boundary. No API key ever reaches a browser.
 * Server-only transport is injected so tests can use fixtures without network calls.
 */
export function createTrafiklabAdapter({apiKey,fetcher=fetch,resolveStop,verifyJourney,now=()=>Date.now()}={}){
 if(!apiKey||typeof resolveStop!=='function'||typeof now!=='function')throw new Error('Trafiklab server key and stop resolver required');
 return async ({provider,from,to})=>{
  if(provider!=='stockholm')throw new Error('Wrong provider');
  const [fromId,toId]=await Promise.all([resolveStop(from),resolveStop(to)]);
  if(!/^740\d{6}$/.test(String(fromId))||!/^740\d{6}$/.test(String(toId)))throw new Error('Stop not verified');
  const url=new URL('https://realtime-api.trafiklab.se/v1/departures/'+fromId);
  url.searchParams.set('key',apiKey);
  const response=await fetcher(url.toString(),{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error('Provider unavailable');
  const payload=await response.json();
  // A station board does not by itself prove that a service calls at the requested destination.
  // Require explicit route verification before showing a departure as belonging to this journey.
  if(!Array.isArray(payload.departures))throw new Error('Invalid provider response');
  // Verification must come from an independent, provider-backed route check.
  // A station board, even with a matching destination label, is not route proof.
  if(typeof verifyJourney!=='function')return {provider,status:'unavailable',departures:[]};
  const proof=await verifyJourney({originId:String(fromId),destinationId:String(toId),departures:payload.departures});
  if(!proof||proof.verified!==true||proof.originId!==String(fromId)||proof.destinationId!==String(toId)||!Array.isArray(proof.departureIds)||!proof.departureIds.length)return {provider,status:'unavailable',departures:[]};
  const ids=new Set(proof.departureIds);
  if(ids.size!==proof.departureIds.length||[...ids].some(id=>typeof id!=='string'||!id.trim()))return {provider,status:'unavailable',departures:[]};
  const matched=payload.departures.filter(d=>d&&typeof d.id==='string'&&ids.has(d.id));
  if(matched.length!==ids.size||matched.some(d=>typeof d.line!=='string'||!d.line.trim()||typeof d.destination!=='string'||!d.destination.trim()))return {provider,status:'unavailable',departures:[]};
  if(typeof proof.updatedAt!=='string'||!Number.isFinite(Date.parse(proof.updatedAt)))return {provider,status:'unavailable',departures:[]};
  // A verified historical route is not live evidence. Reject stale/future snapshots.
  const age=now()-Date.parse(proof.updatedAt);
  if(!Number.isFinite(age)||age<0||age>120000)return {provider,status:'unavailable',departures:[]};
  return {provider,status:'ok',sourceUrl:'https://realtime-api.trafiklab.se/v1/departures/'+fromId,updatedAt:proof.updatedAt,journeyEvidence:{verified:true,originId:String(fromId),destinationId:String(toId),departureIds:[...ids]},departures:matched};
 };
}
/**
 * Paris PRIM needs a separately verified stop/line mapping and response schema.
 * Until configured, return no data rather than fabricate a train status.
 */
export function createParisAdapter({apiKey,fetcher}={}){
 if(!apiKey||typeof fetcher!=='function')throw new Error('Paris PRIM server credentials and transport required');
 return async()=>{throw new Error('Paris route mapping not configured');};
}
