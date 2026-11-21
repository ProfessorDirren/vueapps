import {createHmac,timingSafeEqual} from 'node:crypto';
import {decodeRegionalSnapshot} from './commutevue-regional-snapshot-codec.js';

// Authenticate the exact bytes produced by the offline GTFS snapshot builder.
// Keys are server-only secrets. Never log them, embed them in artifacts or expose
// this verifier to browser code. A signed snapshot is still subject to date/age checks.
const MAX_PAYLOAD_BYTES=4*1024*1024;
const KEY_MIN_BYTES=32;
function validKey(key){return typeof key==='string'&&Buffer.byteLength(key,'utf8')>=KEY_MIN_BYTES;}
function mac(payload,key){return createHmac('sha256',key).update('COMMUTEVUE-REGIONAL-GTFS-V1\n').update(payload,'utf8').digest('hex');}

export function signRegionalSnapshot(payload,{key}={}){
 if(!validKey(key)||typeof payload!=='string'||!payload.length||Buffer.byteLength(payload,'utf8')>MAX_PAYLOAD_BYTES)throw new Error('Invalid regional snapshot signing input');
 return JSON.stringify({version:1,payload,signature:mac(payload,key)});
}

export function verifySignedRegionalSnapshot(envelope,{key,now=Date.now(),expectedServiceDate}={}){
 const unavailable={status:'unavailable',reason:'unauthenticated_snapshot'};
 try{
  if(!validKey(key)||typeof envelope!=='string'||Buffer.byteLength(envelope,'utf8')>MAX_PAYLOAD_BYTES+512)return unavailable;
  const parsed=JSON.parse(envelope);
  if(parsed?.version!==1||typeof parsed.payload!=='string'||typeof parsed.signature!=='string'||!/^[a-f0-9]{64}$/.test(parsed.signature))return unavailable;
  const expected=Buffer.from(mac(parsed.payload,key),'hex'),received=Buffer.from(parsed.signature,'hex');
  if(!timingSafeEqual(expected,received))return unavailable;
  return decodeRegionalSnapshot(parsed.payload,{now,expectedServiceDate});
 }catch{return unavailable;}
}
