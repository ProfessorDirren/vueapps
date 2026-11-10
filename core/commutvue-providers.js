import {COMMUT_PROVIDERS} from './commutvue.js';
/**
 * Provider boundary. No API key ever reaches a browser.
 * Server-only transport is injected so tests can use fixtures without network calls.
 */
export function createTrafiklabAdapter({apiKey,fetcher=fetch,resolveStop}={}){
 if(!apiKey||typeof resolveStop!=='function')throw new Error('Trafiklab server key and stop resolver required');
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
  // Provider responded, but journey matching is not yet implemented: never report success.
  return {provider,status:'unavailable',departures:[]};
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
