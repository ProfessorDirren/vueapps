import { createHmac, timingSafeEqual } from 'node:crypto';
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const existing=new Set(['ANYVUE','ANIVUE','ANTIQVUE','ARMVUE','FOODVUE','HOMEVUE','MOTOVUE','MUSICGEARVUE','PLANTVUE','SLUMPVUE','VINYLVUE']);
const states=['proposed','planned','building','released'];
function config(){return {url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN}}
export function configured(){const c=config();return !!(c.url&&c.token)}
async function redis(command){const c=config();const u=new URL(c.url);if(u.protocol!=='https:')throw Error('config');const r=await fetch(u.origin,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('storage');const d=await r.json();if(d.error)throw Error('storage');return d.result}
export function verifyMemberCookie(cookie,secret=process.env.VUE_MEMBER_SIGNING_SECRET,now=Date.now()){
 if(typeof secret!=='string'||secret.length<32||typeof cookie!=='string'||cookie.length>5000)return null;
 try{const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('vue_member='))?.slice(11);if(!token)return null;const [payload,signature,extra]=token.split('.');if(extra!==undefined||!payload||!signature)return null;
 const expected=createHmac('sha256',secret).update(payload).digest(),actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!timingSafeEqual(expected,actual))return null;
 const member=JSON.parse(Buffer.from(payload,'base64url').toString());if(member.iss!=='vueapps'||member.aud!=='vue-voting'||typeof member.sub!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(member.sub)||!Number.isSafeInteger(member.exp)||member.exp*1000<=now)return null;return member.sub;
 }catch{return null}
}
async function memberFor(request){const sub=verifyMemberCookie(request.headers.get('cookie')||'');if(!sub)return null;const raw=await redis(['GET','vue:member:'+sub]);if(!raw)return null;let member;try{member=typeof raw==='string'?JSON.parse(raw):raw}catch{return null}return member.status==='active'&&Number.isSafeInteger(member.paidUntil)&&member.paidUntil>Date.now()?sub:null}
export function validateProposal(body){if(typeof body?.name!=='string'||typeof body.description!=='string')return null;const name=body.name.trim().toUpperCase(),description=body.description.trim();if(!/^[A-Z][A-Z0-9]{1,24}VUE$/.test(name)||existing.has(name)||description.length<20||description.length>1000)return null;return {name,description}}
const proposeScript=`local old=redis.call('HGET',KEYS[1],ARGV[1]); if old then return 'duplicate' end
if redis.call('HLEN',KEYS[1])>=200 then return 'full' end
local n=redis.call('INCR',KEYS[2]); if n==1 then redis.call('EXPIRE',KEYS[2],172800) end
if n>5 then return 'limit' end
redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]); return 'created'`;
const voteScript=`local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 'missing' end
local item=cjson.decode(raw); if item.status~='proposed' and item.status~='planned' then return 'closed' end
local voted=redis.call('SISMEMBER',KEYS[2],ARGV[2]); if voted==1 then redis.call('SREM',KEYS[2],ARGV[2]); item.votes=math.max(0,item.votes-1); voted=0 else redis.call('SADD',KEYS[2],ARGV[2]); item.votes=item.votes+1; voted=1 end
redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(item)); return cjson.encode({votes=item.votes,voted=voted==1})`;
const statusScript=`local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 'missing' end
local item=cjson.decode(raw); item.status=ARGV[2]; item.updatedAt=ARGV[3]; redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(item)); return 'updated'`;
export async function GET(request){
 if(!configured())return json(503,{error:'Backlog storage is not available.',items:[],votingConfigured:false});
 try{const [raw,member]=await Promise.all([redis(['HGETALL','vue:backlog']),memberFor(request)]);const values=Array.isArray(raw)?raw.filter((_,i)=>i%2===1):Object.values(raw||{});const items=values.map(v=>JSON.parse(v)).filter(i=>typeof i.id==='string'&&states.includes(i.status)&&Number.isSafeInteger(i.votes)&&i.votes>=0).sort((a,b)=>b.votes-a.votes||a.createdAt.localeCompare(b.createdAt));
 if(member){const commands=items.map(i=>['SISMEMBER','vue:voters:'+i.id,member]);if(commands.length){const checks=await Promise.all(commands.map(redis));items.forEach((i,n)=>i.voted=checks[n]===1)}}
 const votingConfigured=typeof process.env.VUE_MEMBER_SIGNING_SECRET==='string'&&process.env.VUE_MEMBER_SIGNING_SECRET.length>=32;
 return json(200,{items,votingConfigured,canVote:!!member,accountUrl:accountUrl()});
 }catch{return json(503,{error:'Backlog temporarily unavailable.'})}
}
function accountUrl(){try{const u=new URL(process.env.VUE_ACCOUNT_URL);return u.protocol==='https:'?u.href:null}catch{return null}}
export async function POST(request){
 if(!configured())return json(503,{error:'Backlog storage is not available.'});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json(403,{error:'Same-origin request required.'});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json(415,{error:'JSON required.'});
 let b;try{const raw=await request.text();if(raw.length>5000)return json(413,{error:'Request too large.'});b=JSON.parse(raw)}catch{return json(400,{error:'Invalid JSON.'})}
 try{
 if(b?.action==='status'){
 const secret=process.env.VUE_BACKLOG_ADMIN_TOKEN,token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!secret||secret.length<32||!token||Buffer.byteLength(token)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(token),Buffer.from(secret)))return json(403,{error:'Administrator required.'});
 if(typeof b.id!=='string'||!/^[-A-Z0-9]{3,40}$/.test(b.id)||!states.includes(b.status))return json(400,{error:'Invalid status.'});
 const result=await redis(['EVAL',statusScript,'1','vue:backlog',b.id,b.status,new Date().toISOString()]);return result==='missing'?json(404,{error:'Proposal not found.'}):json(200,{status:b.status});
 }
 const member=await memberFor(request);if(!member)return json(403,{error:'Verified paid membership required.'});
 if(b?.action==='propose'){
 const proposal=validateProposal(b);if(!proposal)return json(400,{error:'Use a new VUE name and a description of 20–1000 characters.'});
 const item={id:proposal.name,...proposal,status:'proposed',votes:0,createdAt:new Date().toISOString()};
 const result=await redis(['EVAL',proposeScript,'2','vue:backlog','vue:proposals:'+member+':'+new Date().toISOString().slice(0,10),item.id,JSON.stringify(item)]);
 return result==='created'?json(201,{item}):json(result==='duplicate'?409:429,{error:result});
 }
 if(b?.action==='vote'){
 if(typeof b.id!=='string'||!/^[-A-Z0-9]{3,40}$/.test(b.id))return json(400,{error:'Invalid proposal.'});
 const result=await redis(['EVAL',voteScript,'2','vue:backlog','vue:voters:'+b.id,b.id,member]);if(result==='missing')return json(404,{error:'Proposal not found.'});if(result==='closed')return json(409,{error:'Voting closed for this proposal.'});return json(200,JSON.parse(result));
 }
 return json(400,{error:'Unknown action.'});
 }catch{return json(503,{error:'Backlog temporarily unavailable.'})}
}
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return res.status(405).setHeader('Allow','GET, POST').json({error:'Method not allowed.'});
 const headers=new Headers();for(const name of ['content-type','cookie','origin','authorization'])if(typeof req.headers[name]==='string')headers.set(name,req.headers[name]);
 const request=new Request('https://'+(req.headers.host||'www.vueapps.se')+'/api/vue-backlog',{method:req.method,headers,...(req.method==='POST'?{body:typeof req.body==='string'?req.body:JSON.stringify(req.body)}:{})});const response=await (req.method==='GET'?GET:POST)(request);return res.status(response.status).setHeader('Cache-Control','no-store').json(await response.json());
}
