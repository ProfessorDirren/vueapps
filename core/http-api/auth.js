import {createHash, timingSafeEqual} from 'node:crypto';
import {MEMORY_DOMAINS} from '../memory.js';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export class ApiError extends Error {
  constructor(status,code,message,retryAfter=null){super(message);Object.assign(this,{status,code,retryAfter})}
}
const invalid=()=>new ApiError(503,'api_not_configured','API credentials are not configured correctly.');
export function registry(env=process.env){
  if(!env.CORE_API_KEYS)throw invalid();
  let rows;try{rows=JSON.parse(env.CORE_API_KEYS)}catch{throw invalid()}
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw invalid();
  const hashes=new Set();
  for(const row of rows){
    if(!row||typeof row!=='object'||!/^[a-f0-9]{64}$/.test(row.sha256)||hashes.has(row.sha256)||!/^[a-zA-Z0-9_-]{3,64}$/.test(row.tenant)||!Array.isArray(row.scopes)||!row.scopes.length||row.scopes.some(s=>!['ask','cases'].includes(s))||!Number.isSafeInteger(row.requests_per_minute)||row.requests_per_minute<1||row.requests_per_minute>1000||!Number.isSafeInteger(row.requests_per_day)||row.requests_per_day<1||row.requests_per_day>100000||typeof row.enabled!=='boolean'||!Number.isFinite(Date.parse(row.expires_at))||row.domains!==undefined&&(!Array.isArray(row.domains)||!row.domains.length||row.domains.some(d=>!MEMORY_DOMAINS.includes(d))))throw invalid();
    hashes.add(row.sha256);
    // Quotas are tenant-wide. Rotating a key must not change its tenant policy.
    const peers=rows.filter(r=>r!==row&&r.tenant===row.tenant);
    if(peers.some(r=>r.requests_per_minute!==row.requests_per_minute||r.requests_per_day!==row.requests_per_day))throw invalid();
  }
  return rows;
}
export function authenticate(request,env=process.env,now=Date.now()){
  const rows=registry(env),header=request.headers.get('authorization')||'';
  if(!/^Bearer vue_[A-Za-z0-9_-]{43}$/.test(header))throw new ApiError(401,'unauthorized','A valid Bearer API key is required.');
  const hash=Buffer.from(digest(header.slice(7)),'hex');
  const row=rows.find(r=>timingSafeEqual(hash,Buffer.from(r.sha256,'hex')));
  if(!row||!row.enabled||Date.parse(row.expires_at)<=now)throw new ApiError(401,'unauthorized','A valid Bearer API key is required.');
  return row;
}
export function requireScope(principal,scope){if(!principal.scopes.includes(scope))throw new ApiError(403,'scope_denied','The API key does not allow this operation.')}
export function requireDomain(principal,domain){if(principal.domains&&!principal.domains.includes(domain))throw new ApiError(403,'domain_denied','The API key does not allow this specialist.')}
