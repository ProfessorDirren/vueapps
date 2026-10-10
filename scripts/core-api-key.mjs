#!/usr/bin/env node
// Run locally. The generated secret is shown exactly once; only its hash is configured on Vercel.
import {randomBytes,createHash} from 'node:crypto';
const [tenant,days='90']=process.argv.slice(2);
if(!/^[a-zA-Z0-9_-]{3,64}$/.test(tenant||'')||!/^\d+$/.test(days)||Number(days)<1||Number(days)>365){console.error('Usage: node scripts/core-api-key.mjs <tenant_id> [expiry_days:1-365]');process.exit(1)}
const key='vue_'+randomBytes(32).toString('base64url');
const row={sha256:createHash('sha256').update(key).digest('hex'),tenant,scopes:['ask','cases'],requests_per_minute:10,requests_per_day:100,enabled:true,expires_at:new Date(Date.now()+Number(days)*86400000).toISOString()};
console.log('SECRET — deliver privately to the integrating server, never commit it:\n'+key+'\n\nAppend this public hash record to the CORE_API_KEYS JSON array:\n'+JSON.stringify(row,null,2));
