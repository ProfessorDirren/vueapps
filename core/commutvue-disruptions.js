/** Provider-neutral disruption contract shared by every COMMUTVUE region.
 * A provider must supply authenticated, current evidence. Missing data is UNKNOWN, never "clear".
 */
export const DISRUPTION_STATUS=Object.freeze({verified:'verified',unknown:'unknown',unavailable:'unavailable'});
export function normalizeDisruptions({provider,sourceUrl,updatedAt,alerts}={}){
 if(typeof provider!=='string'||!provider.trim())throw new TypeError('Provider required');
 if(typeof sourceUrl!=='string'||!/^https:\/\//i.test(sourceUrl)||!Number.isFinite(Date.parse(updatedAt)))throw new TypeError('Verified HTTPS source and timestamp required');
 if(!Array.isArray(alerts)||alerts.length>100)throw new TypeError('Bounded alerts required');
 const items=alerts.map(a=>{
  if(!a||typeof a.id!=='string'||!a.id.trim()||typeof a.title!=='string'||!a.title.trim()||!['delay','cancellation','suspension','maintenance','disruption','other'].includes(a.type)||!Array.isArray(a.affectedLines)||a.affectedLines.some(x=>typeof x!=='string')||!['active','upcoming','resolved'].includes(a.status))throw new TypeError('Invalid provider alert');
  return Object.freeze({id:a.id,title:a.title,type:a.type,status:a.status,affectedLines:[...a.affectedLines],description:typeof a.description==='string'?a.description:'',startAt:Number.isFinite(Date.parse(a.startAt))?new Date(a.startAt).toISOString():null,endAt:Number.isFinite(Date.parse(a.endAt))?new Date(a.endAt).toISOString():null});
 });
 return Object.freeze({status:DISRUPTION_STATUS.verified,provider,sourceUrl,updatedAt:new Date(updatedAt).toISOString(),alerts:items});
}
export async function queryDisruptions({provider,from,to,adapter}={}){
 if(typeof adapter!=='function')return {status:DISRUPTION_STATUS.unknown,provider,alerts:[]};
 try{
  const result=await adapter({provider,from,to});
  return normalizeDisruptions({...result,provider});
 }catch{
  return {status:DISRUPTION_STATUS.unavailable,provider,alerts:[]};
 }
}
