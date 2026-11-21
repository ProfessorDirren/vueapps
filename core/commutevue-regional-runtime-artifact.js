import {verifySignedRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
import {gunzipSync} from 'node:zlib';
import {readFileSync,statSync} from 'node:fs';

/**
 * Server-only runtime loader for a pre-provisioned signed snapshot.
 * No remote fetch, GTFS archive download or per-request ZIP decompression.
 * The deployment supplies the signed envelope as a base64 UTF-8 environment
 * variable. Authentication and service-day checks remain mandatory.
 */
// Environment variables have much tighter platform limits than signed files.
// Reject larger snapshots rather than assuming they fit in Vercel settings.
const MAX_ENVELOPE_BYTES=16*1024;
export function loadRegionalSnapshotFromEnvironment({
 encodedEnvelope,signingKey,expectedServiceDate,now=Date.now()
}={}){
 const unavailable=(reason)=>({status:'unavailable',reason});
 if(typeof encodedEnvelope!=='string'||!encodedEnvelope.length||encodedEnvelope.length>Math.ceil(MAX_ENVELOPE_BYTES/3)*4+4)return unavailable('missing_or_oversized_artifact');
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedEnvelope))return unavailable('invalid_artifact_encoding');
 try{
  const raw=Buffer.from(encodedEnvelope,'base64');
  if(raw.length>MAX_ENVELOPE_BYTES||raw.toString('base64')!==encodedEnvelope)return unavailable('invalid_artifact_encoding');
  // New artifacts use gzip-compressed signed envelopes; legacy plain envelopes remain readable.
  // Bound decompressed bytes before signature verification to prevent zip bombs.
  const envelope=raw[0]===0x1f&&raw[1]===0x8b?gunzipSync(raw,{maxOutputLength:4*1024*1024+512}).toString('utf8'):raw.toString('utf8');
  return verifySignedRegionalSnapshot(envelope,{key:signingKey,expectedServiceDate,now});
 }catch{return unavailable('invalid_artifact_encoding');}
}


/**
 * Server-only alternative to large environment variables.
 * Read a bounded signed envelope from a deployment-local file.
 * The signing key remains exclusively in the environment; never in the file.
 * Caller supplies a trusted, deployment-controlled absolute path, not user input.
 */
export function loadRegionalSnapshotFromFile({
 filePath,signingKey,expectedServiceDate,now=Date.now()
}={}){
 const unavailable=reason=>({status:'unavailable',reason});
 if(typeof filePath!=='string'||!filePath.startsWith('/')||filePath.length>1024)return unavailable('missing_snapshot_file');
 try{
  const stat=statSync(filePath);
  if(!stat.isFile()||stat.size<1||stat.size>MAX_ENVELOPE_BYTES)return unavailable('missing_or_oversized_artifact');
  const raw=readFileSync(filePath);
  if(raw.length>MAX_ENVELOPE_BYTES)return unavailable('missing_or_oversized_artifact');
  const envelope=raw[0]===0x1f&&raw[1]===0x8b?gunzipSync(raw,{maxOutputLength:4*1024*1024+512}).toString('utf8'):raw.toString('utf8');
  return verifySignedRegionalSnapshot(envelope,{key:signingKey,expectedServiceDate,now});
 }catch{return unavailable('invalid_or_missing_snapshot_file');}
}
