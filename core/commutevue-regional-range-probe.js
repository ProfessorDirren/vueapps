/** Safe, bounded HTTP Range capability probe for the separately authorized SL GTFS ZIP. */
export async function probeRegionalStaticRange({url,fetcher=fetch}={}){
 let endpoint;
 try{endpoint=new URL(url);}catch{return {status:'invalid_endpoint'};}
 if(endpoint.protocol!=='https:'||endpoint.hostname!=='opendata.samtrafiken.se'||endpoint.username||endpoint.password||endpoint.hash)return {status:'invalid_endpoint'};
 try{
  const response=await fetcher(endpoint.toString(),{method:'GET',headers:{Range:'bytes=0-0',Accept:'application/zip'},redirect:'error',signal:AbortSignal.timeout(5000)});
  // Never consume an unrestricted body, including servers ignoring Range.
  if(response.status!==206){await response.body?.cancel?.().catch(()=>{});return {status:response.status===200?'range_ignored':response.status===401||response.status===403?'authorization':response.status===416?'range_not_satisfiable':response.status===429?'rate_limited':'http_error'};}
  const range=response.headers?.get?.('content-range')||'';
  const match=/^bytes 0-0\/(\d+)$/.exec(range);
  if(!match){await response.body?.cancel?.().catch(()=>{});return {status:'invalid_content_range'};}
  const total=Number(match[1]);
  if(!Number.isSafeInteger(total)||total<22){await response.body?.cancel?.().catch(()=>{});return {status:'invalid_archive_size'};}
  const bytes=new Uint8Array(await response.arrayBuffer());
  return {status:bytes.length===1?'range_supported':'invalid_range_body',archiveBytes:total};
 }catch{return {status:'network_or_timeout'};}
}
