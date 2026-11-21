/** Bounded metadata-only probe using Trafiklab's documented HEAD method. */
export async function probeRegionalStaticHead({url,fetcher=fetch}={}){
 let endpoint;
 try{endpoint=new URL(url);}catch{return {status:'invalid_endpoint'};}
 if(endpoint.protocol!=='https:'||endpoint.hostname!=='opendata.samtrafiken.se'||endpoint.username||endpoint.password||endpoint.hash)return {status:'invalid_endpoint'};
 try{
  const response=await fetcher(endpoint.toString(),{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(5000)});
  await response.body?.cancel?.().catch(()=>{});
  const code=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:null;
  const lengthHeader=response.headers?.get?.('content-length');
  const size=typeof lengthHeader==='string'&&/^\\d+$/.test(lengthHeader)?Number(lengthHeader):null;
  const archiveBytes=Number.isSafeInteger(size)&&size>=0?size:null;
  return {status:code===200?'metadata_available':code===401||code===403?'authorization':code===429?'rate_limited':'http_error',httpStatus:code,archiveBytes};
 }catch{return {status:'network_or_timeout'};}
}
