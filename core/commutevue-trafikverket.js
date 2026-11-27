import {stockholmWallClockToInstant} from './commutevue-stockholm-clock.js';
/**
 * Server-only Trafikverket API client for COMMUTEVUE.
 * This module does not publish departures until a route is independently verified.
 * No API credentials are written to logs, URLs or client responses.
 */
const ENDPOINT='https://api.trafikinfo.trafikverket.se/v2/data.json';
const xmlEscape=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export class TrafikverketError extends Error{
 constructor(reason){super('Trafikverket request failed');this.name='TrafikverketError';this.reason=reason;}
}
export function createTrafikverketClient({apiKey,fetcher=fetch}={}){
 if(typeof apiKey!=='string'||!apiKey.trim()||typeof fetcher!=='function')throw new TypeError('Server-side API key and fetcher required');
 async function query(objecttype,version,filter,fields,limit=30){
  const body='<REQUEST><LOGIN authenticationkey="'+xmlEscape(apiKey)+'"/><QUERY objecttype="'+objecttype+'" schemaversion="'+version+'" limit="'+limit+'"><FILTER>'+filter+'</FILTER>'+fields.map(field=>'<INCLUDE>'+field+'</INCLUDE>').join('')+'</QUERY></REQUEST>';
  let response;
  try{response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/xml'},body,signal:AbortSignal.timeout(6500)});}catch{throw new TrafikverketError('network');}
  if(!response.ok)throw new TrafikverketError('http_error');
  const raw=await response.text();
  if(raw.length>350000)throw new TrafikverketError('response_too_large');
  let json;try{json=JSON.parse(raw);}catch{throw new TrafikverketError('invalid_json');}
  if(!Array.isArray(json?.RESPONSE?.RESULT))throw new TrafikverketError('invalid_response');
  const result=json.RESPONSE.RESULT[0]||{};
  if(result.ERROR||json.RESPONSE.ERROR||json.ERROR)throw new TrafikverketError('provider_error');
  return Array.isArray(result[objecttype])?result[objecttype]:[];
 }
 async function station(name){
  if(typeof name!=='string'||!name.trim()||name.length>100)throw new TrafikverketError('invalid_station');
  const stations=await query('TrainStation','1.4','<EQ name="AdvertisedLocationName" value="'+xmlEscape(name.trim())+'"/>',['LocationSignature','AdvertisedLocationName'],30);
  const matches=stations.filter(x=>x.AdvertisedLocationName?.toLocaleLowerCase('sv-SE')===name.trim().toLocaleLowerCase('sv-SE')&&/^[A-Za-zÅÄÖåäö0-9]{1,12}$/.test(x.LocationSignature||''));
  if(matches.length!==1)throw new TrafikverketError(matches.length?'ambiguous_station':'station_not_found');
  return matches[0].LocationSignature;
 }
 async function announcementsAt(signature,activity,arrivalTime){
  if(!/^[A-Za-zÅÄÖåäö0-9]{1,12}$/.test(signature))throw new TrafikverketError('invalid_signature');
  if(!['Avgang','Ankomst'].includes(activity))throw new TrafikverketError('invalid_activity');
  const arrival=arrivalTime?Date.parse(stockholmWallClockToInstant(arrivalTime)||''):NaN;
  const lower=Number.isFinite(arrival)?new Date(arrival-30*60000).toISOString():'$dateadd(-00:02:00)';
  const upper=Number.isFinite(arrival)?new Date(arrival+30*60000).toISOString():'$dateadd(02:00:00)';
  return query('TrainAnnouncement','1.9','<AND><EQ name="LocationSignature" value="'+xmlEscape(signature)+'"/><EQ name="ActivityType" value="'+activity+'"/><GT name="AdvertisedTimeAtLocation" value="'+lower+'"/><LT name="AdvertisedTimeAtLocation" value="'+upper+'"/></AND>',['ActivityType','AdvertisedTrainIdent','AdvertisedTimeAtLocation','EstimatedTimeAtLocation','PlannedEstimatedTimeAtLocation','PlannedEstimatedTimeAtLocationIsValid','TimeAtLocation','LocationSignature','Canceled','Deviation','ToLocation' ,'ViaToLocation','ModifiedTime'],60);
 }
 return {station,departuresAt:signature=>announcementsAt(signature,'Avgang'),arrivalsAt:(signature,arrivalTime)=>announcementsAt(signature,'Ankomst',arrivalTime)};
}
