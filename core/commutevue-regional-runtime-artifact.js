import {verifySignedRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';

/**
 * Server-only runtime loader for a pre-provisioned signed snapshot.
 * No remote fetch, GTFS archive download or per-request ZIP decompression.
 * The deployment supplies the signed envelope as a base64 UTF-8 environment
 * variable. Authentication and service-day checks remain mandatory.
 */
// Environment variables have much tighter platform limits than signed files.\n// Reject larger snapshots rather than assuming they fit in Vercel settings.\nconst MAX_ENVELOPE_BYTES=16*1024;
export function loadRegionalSnapshotFromEnvironment({
 encodedEnvelope,signingKey,expectedServiceDate,now=Date.now()
}={}){
 const unavailable=(reason)=>({status:'unavailable',reason});
 if(typeof encodedEnvelope!=='string'||!encodedEnvelope.length||encodedEnvelope.length>Math.ceil(MAX_ENVELOPE_BYTES/3)*4+4)return unavailable('missing_or_oversized_artifact');
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedEnvelope))return unavailable('invalid_artifact_encoding');
 try{
  const raw=Buffer.from(encodedEnvelope,'base64');
  if(raw.length>MAX_ENVELOPE_BYTES||raw.toString('base64')!==encodedEnvelope)return unavailable('invalid_artifact_encoding');
  return verifySignedRegionalSnapshot(raw.toString('utf8'),{key:signingKey,expectedServiceDate,now});
 }catch{return unavailable('invalid_artifact_encoding');}
}
