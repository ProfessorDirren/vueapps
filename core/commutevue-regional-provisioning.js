/**
 * Offline provisioning of one signed regional corridor, generated from the
 * same inspected GTFS archive. Never includes the HMAC signing key.
 * Reject env artifacts too large for the runtime's 16KiB envelope limit.
 */
const MAX_ENVELOPE_BYTES=16*1024;
const STOP_ID=/^[A-Za-z0-9_.:-]{1,96}$/;
export function regionalCorridorProvisioning({envelope,originStopIds,destinationStopIds,selectedTripCount}={}){
 if(typeof envelope!=='string'||!Buffer.byteLength(envelope,'utf8')||Buffer.byteLength(envelope,'utf8')>MAX_ENVELOPE_BYTES)throw new Error('signed_artifact_exceeds_runtime_limit');
 if(!Number.isSafeInteger(selectedTripCount)||selectedTripCount<1)throw new Error('no_direct_trips');
 function encode(ids){
  if(!(ids instanceof Set)||!ids.size||ids.size>40||[...ids].some(id=>typeof id!=='string'||!STOP_ID.test(id)))throw new Error('invalid_station_ids');
  return [...ids].sort().join(',');
 }
 const origin=encode(originStopIds),destination=encode(destinationStopIds);
 if([...originStopIds].some(id=>destinationStopIds.has(id)))throw new Error('overlapping_station_ids');
 return {
  COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64:Buffer.from(envelope,'utf8').toString('base64'),
  COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS:origin,
  COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS:destination
 };
}
