import {ApiError,digest} from './auth.js';
export const CASE_TTL=30*24*60*60, IDEMPOTENCY_TTL=24*60*60, LOCK_TTL=150;
export function redisOptions(env=process.env){
  const modern=env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN;const url=modern?env.UPSTASH_REDIS_REST_URL:env.KV_REST_API_URL,token=modern?env.UPSTASH_REDIS_REST_TOKEN:env.KV_REST_API_TOKEN;
  try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!token)throw Error();return {url:u.origin,token}}catch{throw new ApiError(503,'storage_unavailable','API storage is unavailable.')}
}
// All storage operations are durable Redis REST commands. No process-local production state.
export class RedisStore {
  constructor({env=process.env,fetcher=fetch}={}){this.options=redisOptions(env);this.fetcher=fetcher}
  async command(...command){
    try{const r=await this.fetcher(this.options.url,{method:'POST',headers:{Authorization:'Bearer '+this.options.token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(3500)});if(!r.ok)throw Error();const data=await r.json();if(data.error||!Object.hasOwn(data,'result'))throw Error();return data.result}catch{throw new ApiError(503,'storage_unavailable','API storage is unavailable.')}
  }
  async get(key){const value=await this.command('GET',key);if(value===null)return null;try{return typeof value==='string'?JSON.parse(value):value}catch{throw new ApiError(503,'storage_unavailable','API storage is unavailable.')}}
  async set(key,value,ttl){await this.command('SET',key,JSON.stringify(value),'EX',ttl)}
  async delete(key){await this.command('DEL',key)}
  async lock(key,token){return await this.command('SET',key,token,'NX','EX',LOCK_TTL)==='OK'}
  async unlock(key,token){return this.command('EVAL',"-- core_api_unlock\nif redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0",'1',key,token)}
  async quota(tenant,limits,now){
    const minute=Math.floor(now/60000),day=new Date(now).toISOString().slice(0,10),prefix=namespace(tenant);
    const result=await this.command('EVAL',`-- core_api_quota
local m=tonumber(redis.call('GET',KEYS[1]) or '0'); local d=tonumber(redis.call('GET',KEYS[2]) or '0');
if m>=tonumber(ARGV[1]) then return {0,1,0,math.max(1,redis.call('TTL',KEYS[1]))} end;
if d>=tonumber(ARGV[2]) then return {0,2,0,tonumber(ARGV[3])} end;
m=redis.call('INCR',KEYS[1]); if m==1 then redis.call('EXPIRE',KEYS[1],120) end;
d=redis.call('INCR',KEYS[2]); if d==1 then redis.call('EXPIRE',KEYS[2],172800) end;
return {1,0,tonumber(ARGV[1])-m,60};`,'2',prefix+':minute:'+minute,prefix+':day:'+day,String(limits.requests_per_minute),String(limits.requests_per_day),String(Math.ceil((Date.parse(day+'T00:00:00Z')+86400000-now)/1000)));
    if(!Array.isArray(result)||result.length!==4)throw new ApiError(503,'storage_unavailable','API storage is unavailable.');
    return {allowed:result[0]===1,reason:result[1]===2?'daily_limit':'rate_limit',remaining:result[2],retryAfter:result[3]};
  }
  // Compare-and-set protects against an expired lock committing over a newer request.
  async finish({idemKey,idemLock,caseKey,caseLock,token,record,caseValue}){
    const r=await this.command('EVAL',`-- core_api_finish
if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end;
if ARGV[4] == '1' and redis.call('GET',KEYS[3]) ~= ARGV[1] then return 0 end;
if ARGV[4] == '1' and ARGV[5] == 'delete' then
 local cached=redis.call('SMEMBERS',KEYS[4]..':replays');
 for _,k in ipairs(cached) do
  local raw=redis.call('GET',k);
  if raw then
   local old=cjson.decode(raw); old.status=410;
   old.data={error={code='case_deleted',message='This case was deleted. Start a new request.',request_id=old.requestId}};
   redis.call('SET',k,cjson.encode(old),'EX',${IDEMPOTENCY_TTL});
  end;
 end;
 redis.call('DEL',KEYS[4]..':replays');
end;
redis.call('SET',KEYS[2],ARGV[2],'EX',${IDEMPOTENCY_TTL});
if ARGV[4] == '1' and ARGV[5] ~= 'delete' then
 redis.call('SADD',KEYS[4]..':replays',KEYS[2]); redis.call('EXPIRE',KEYS[4]..':replays',${CASE_TTL});
end;
if ARGV[4] == '1' then
 if ARGV[5] == 'delete' then redis.call('DEL',KEYS[4]) else redis.call('SET',KEYS[4],ARGV[3],'EX',${CASE_TTL}) end;
 redis.call('DEL',KEYS[3]);
end;
redis.call('DEL',KEYS[1]); return 1;`,'4',idemLock,idemKey,caseLock||idemLock,caseKey||idemKey,token,JSON.stringify(record),JSON.stringify(caseValue||null),caseKey?'1':'0',caseValue===null?'delete':'save');
    if(r!==1)throw new ApiError(503,'commit_failed','The request outcome could not be committed. Do not submit it with a different idempotency key.');
  }
}
export const namespace=tenant=>'core-api:v1:'+digest(tenant);
export const caseStorageKey=(tenant,subject,id)=>namespace(tenant)+':subject:'+digest(subject)+':case:'+id;
export const idempotencyKey=(tenant,subject,key)=>namespace(tenant)+':subject:'+digest(subject)+':idempotency:'+digest(key);
