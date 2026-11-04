/** Global atomic quota for paid music recognition. Fail closed if Redis is absent. */
export async function musicBudget({env=process.env,fetcher=fetch,now=new Date()}={}){
 const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL;
 const token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
 const limit=Number(env.MUSIC_DAILY_RECOGNITION_LIMIT||20);
 if(!url||!token||!Number.isSafeInteger(limit)||limit<1||limit>1000)return false;
 let origin;try{const parsed=new URL(url);if(parsed.protocol!=='https:')return false;origin=parsed.origin}catch{return false}
 const script="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],172800) end; return n";
 try{
  const response=await fetcher(origin,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,'1','music:global:'+now.toISOString().slice(0,10)]),signal:AbortSignal.timeout(3500)});
  if(!response.ok)return false;
  const data=await response.json();
  return Number.isSafeInteger(data?.result)&&data.result<=limit;
 }catch{return false}
}
