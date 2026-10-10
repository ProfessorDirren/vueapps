import {SPECIALIST_TREE,specialistPath} from '../specialist-tree.js';
import {classifyImage,ImageRoutingError} from '../image-routing.js';
import {SUB_SPECIALISTS,subSpecialist} from '../sub-specialists.js';
import {randomUUID} from 'node:crypto';
import {ApiError,authenticate,digest,registry,requireScope,requireDomain} from './auth.js';
import {RedisStore,caseStorageKey,idempotencyKey,CASE_TTL} from './store.js';
import {body,validateAsk,validateCase,subjectId,idempotency,uuidPattern,LANGUAGES} from './validation.js';
import {SPECIALISTS} from '../specialists.js';
import {routeQuestion,routingFields} from '../router.js';
import {selectHistory} from '../memory.js';
import {ROUTER_TEXT} from '../../apps/router-content.js';
import {POST as followup,urgentFollowup} from '../../api/vue-followup.js';
export const API_VERSION='1.0.0';
const endpoint='/api/v1';
function response(status,data,requestId,extra={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Request-ID':requestId,'X-VUE-API-Version':API_VERSION,...extra}})}
const errorBody=(e,id)=>({error:{code:e.code,message:e.message,request_id:id}});
export function createApi({env=process.env,storeFactory=()=>new RedisStore({env}),answer=followup,classify=classifyImage,now=()=>Date.now(),uuid=randomUUID,logger=record=>console.info(JSON.stringify(record))}={}){
  return async function handle(request){
    const requestId=uuid(),started=now();let status=500,principal=null,route='',store=null,idemLock=null,caseLock=null,lockToken=null,providerStarted=false,idemKeyForError=null,hashForError=null;
    try{
      const url=new URL(request.url);route=url.pathname.replace(/\/$/,'');
      if(url.search)throw new ApiError(400,'invalid_request','This API does not accept query parameters.');
      if(request.method==='GET'&&route===endpoint+'/health'){
        let configured=false;try{registry(env);configured=true}catch{}
        status=200;return response(status,{service:'CORE-VUE API',version:API_VERSION,status:'up',access_configured:configured},requestId);
      }
      if(request.method==='GET'&&route===endpoint+'/tree'){status=200;return response(status,{version:API_VERSION,root:'corevue',fixed_depth_limit:null,nodes:[...SPECIALIST_TREE.values()].map(({path,parent,domain,method})=>({path,parent,specialist:domain,method}))},requestId);}
      if(request.method==='GET'&&route===endpoint+'/specialists'){
        status=200;return response(status,{version:API_VERSION,languages:LANGUAGES,specialists:Object.entries(SPECIALISTS).map(([id,p])=>({id,scope:p.scope,method:p.method,capabilities:{text:true,images:id!=='medivue',persistent_cases:id!=='medivue',verified_valuation:false},sub_specialists:Object.entries(SUB_SPECIALISTS[id]||{}).map(([id,method])=>({id,method})),references:(p.sources||[]).map(([name,url])=>({name,url}))}))},requestId);
      }
      const isAsk=route===endpoint+'/ask',isCreate=route===endpoint+'/cases',match=new RegExp('^'+endpoint+'/cases/([a-f0-9-]+)$').exec(route);
      if(!isAsk&&!isCreate&&!match)throw new ApiError(404,'not_found','API endpoint not found.');
      const methods=isAsk||isCreate?['POST']:['GET','DELETE'];
      if(!methods.includes(request.method)){status=405;return response(status,errorBody(new ApiError(405,'method_not_allowed','Method not allowed.'),requestId),requestId,{Allow:methods.join(', ')})}
      if(match&&!uuidPattern.test(match[1]))throw new ApiError(400,'invalid_request','Invalid case ID.');
      principal=authenticate(request,env,now());requireScope(principal,isAsk?'ask':'cases');
      const subject=subjectId(request),mutating=request.method!=='GET';
      const b=isAsk?validateAsk(await body(request)):isCreate?validateCase(await body(request)):{};
      if(isCreate)requireDomain(principal,b.specialist);
      if(isAsk&&b.specialist!=='auto')requireDomain(principal,b.specialist);
      const idem=mutating?idempotency(request):null,hash=digest(JSON.stringify({method:request.method,route,body:b}));
      const idemKey=mutating?idempotencyKey(principal.tenant,subject,idem):null;idemKeyForError=idemKey;hashForError=hash;
      store=storeFactory();
      // Replays must work even if the original call consumed the last quota unit.
      if(mutating){const existing=await store.get(idemKey);if(existing){if(existing.data?.specialist)requireDomain(principal,existing.data.specialist);if(existing.data?.case?.specialist)requireDomain(principal,existing.data.case.specialist);if(existing.hash!==hash)throw new ApiError(409,'idempotency_conflict','This idempotency key was used for a different request.');status=existing.status;return response(status,existing.data,existing.requestId,{'Idempotency-Replayed':'true'})}}
      const quota=await store.quota(principal.tenant,principal,now());if(!quota.allowed)throw new ApiError(429,quota.reason,'Tenant request quota reached.',quota.retryAfter);
      const headers={'X-RateLimit-Limit':String(principal.requests_per_minute),'X-RateLimit-Remaining':String(quota.remaining)};
      if(!mutating){const c=await store.get(caseStorageKey(principal.tenant,subject,match[1]));if(!c)throw new ApiError(404,'not_found','Case not found.');requireDomain(principal,c.specialist);status=200;return response(status,{case:c},requestId,headers)}
      lockToken=uuid();idemLock=idemKey+':lock';
      if(!await store.lock(idemLock,lockToken)){idemLock=null;throw new ApiError(409,'request_in_progress','A request with this idempotency key is still in progress.',2)}
      const concurrentReplay=await store.get(idemKey);if(concurrentReplay){if(concurrentReplay.data?.specialist)requireDomain(principal,concurrentReplay.data.specialist);if(concurrentReplay.data?.case?.specialist)requireDomain(principal,concurrentReplay.data.case.specialist);if(concurrentReplay.hash!==hash)throw new ApiError(409,'idempotency_conflict','This idempotency key was used for a different request.');status=concurrentReplay.status;return response(status,concurrentReplay.data,concurrentReplay.requestId,{'Idempotency-Replayed':'true'})}
      let c=null,caseKey=null,caseValue;
      const caseId=isAsk?b.case_id:match?.[1];
      if(caseId){caseKey=caseStorageKey(principal.tenant,subject,caseId);caseLock=caseKey+':lock';if(!await store.lock(caseLock,lockToken)){caseLock=null;throw new ApiError(409,'case_busy','Another request is updating this case.',2)}c=await store.get(caseKey);if(!c)throw new ApiError(404,'not_found','Case not found.');requireDomain(principal,c.specialist)}
      let result;
      if(isCreate){const time=new Date(now()).toISOString(),id=uuid();caseKey=caseStorageKey(principal.tenant,subject,id);caseLock=caseKey+':lock';if(!await store.lock(caseLock,lockToken))throw new ApiError(409,'case_busy','Case creation conflict.',2);caseValue={id,specialist:b.specialist,title:b.title,created_at:time,updated_at:time,expires_at:new Date(now()+CASE_TTL*1000).toISOString(),fields:{},turns:[],emergency_caution:false};status=201;result={case:caseValue}}
      else if(request.method==='DELETE'){caseValue=null;status=200;result={deleted:true,case_id:c.id}}
      else {
        let selected;
        if(b.specialist_path){const node=SPECIALIST_TREE.get(b.specialist_path);if(!node||!node.domain||b.specialist!=='auto'&&node.domain!==b.specialist)throw new ApiError(400,'invalid_request','specialist_path must belong to the requested specialist.');selected={domain:node.domain,specialist_path:b.specialist_path,clarify:false};}
        else if(b.image&&b.specialist==='auto'){const current=routeQuestion(b.question,c?.specialist);if(current.domain&&urgentFollowup(current.domain,b.question,routingFields(current.domain,b.question),b.language))selected=current;else{providerStarted=true;selected=await classify(b.image,b.question)}}
        else selected=b.specialist==='auto'?routeQuestion(b.question,c?.specialist):{domain:b.specialist,clarify:false};
        if(selected.clarify){status=200;result={request_id:requestId,specialist:null,case_id:c?.id||null,answer:ROUTER_TEXT[b.language][selected.private?6:9],kind:'clarification',verified:false,candidates:selected.candidates,requires_verification:true};caseValue=c?{...c,expires_at:new Date(now()+CASE_TTL*1000).toISOString()}:undefined}
        else{
          requireDomain(principal,selected.domain);
          if(b.sub_specialist&&!Object.hasOwn(SUB_SPECIALISTS[selected.domain]||{},b.sub_specialist))throw new ApiError(400,'invalid_request','sub_specialist is not supported by the selected specialist.');
          const focused=subSpecialist(selected.domain,b.question,b.sub_specialist||selected.sub_specialist);
          let branch;try{branch=specialistPath(selected.domain,b.question,selected.specialist_path||(!focused||focused===c?.specialist_path?.split('/')[2]?c?.specialist_path:null),focused)}catch{throw new ApiError(400,'invalid_request','Unknown specialist path.');}
          if(c&&c.specialist!==selected.domain)throw new ApiError(409,'case_specialist_mismatch','This question belongs to another specialist. Start a separate case or ask without case_id.');
          if(c&&c.turns.length>=100)throw new ApiError(409,'case_full','This case has reached 100 turns. Start a new case.');
          const fields={...(c?.fields||{}),...b.fields,...routingFields(selected.domain,b.question)};
          if(Object.keys(fields).length>35)throw new ApiError(400,'invalid_request','A case may contain at most 35 public fields.');
          if(c?.emergency_caution)fields.emergencyCaution='true';
          let data;
          if(selected.domain==='medivue')data={answer:ROUTER_TEXT[b.language][10],kind:'local_guidance',verified:false};
          else{providerStarted=true;const r=await answer(new Request('https://internal/api/vue-followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:selected.domain,question:b.question,language:b.language,history:selectHistory(c?.turns,b.question),fields,sub_specialist:focused,specialist_path:branch.path,...(b.image?{image:b.image,image_public:true}:{})})}));data=await r.json();if(!r.ok)throw new ApiError(r.status===429?429:r.status===503?503:502,r.status===429?'model_budget_reached':'specialist_unavailable',r.status===429?'The shared specialist model budget is reached or unavailable.':'The specialist is currently unavailable.',r.status===429?60:null)}
          if(typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>8000||!['ai_unverified','local_guidance','safety_rule'].includes(data.kind))throw new ApiError(502,'invalid_specialist_response','The specialist returned an invalid response.');
          status=200;result={request_id:requestId,specialist:selected.domain,sub_specialist:focused,specialist_path:branch.path,lineage:branch.lineage.map(n=>n.path),image_analyzed:!!b.image&&data.kind==='ai_unverified',case_id:c?.id||null,answer:data.answer,kind:data.kind,verified:false,requires_verification:true};
          if(c){const time=new Date(now()).toISOString();caseValue={...c,fields,specialist_path:branch.path,updated_at:time,expires_at:new Date(now()+CASE_TTL*1000).toISOString(),emergency_caution:c.emergency_caution||selected.domain==='anivue'&&data.kind==='safety_rule',turns:[...c.turns,{question:b.question,answer:data.answer,kind:data.kind,at:time}]}}
        }
      }
      await store.finish({idemKey,idemLock,caseKey,caseLock,token:lockToken,record:{hash,status,data:result,requestId},caseValue});
      idemLock=null;caseLock=null;
      return response(status,result,requestId,headers);
    }catch(e){
      const error=e instanceof ImageRoutingError?new ApiError(e.status,'image_routing_unavailable',e.message):e instanceof ApiError?e:new ApiError(500,'internal_error','An internal error occurred.');status=error.status;
      if(providerStarted&&store&&idemLock&&lockToken){
        try{await store.finish({idemKey:idemKeyForError,idemLock,token:lockToken,record:{hash:hashForError,status,data:errorBody(error,requestId),requestId}});idemLock=null}catch{}
      }
      return response(status,errorBody(error,requestId),requestId,{...(error.retryAfter?{'Retry-After':String(error.retryAfter)}:{}),...(status===401?{'WWW-Authenticate':'Bearer realm="CORE-VUE API"'}:{})});
    }finally{
      // A failed request releases only its own locks. Payloads and keys never enter logs.
      if(store&&lockToken){for(const key of [caseLock,idemLock])if(key)try{await store.unlock(key,lockToken)}catch{}}
      try{logger({event:'core_api_request',request_id:requestId,method:request.method,operation:route.startsWith(endpoint+'/cases/')?'case':['health','specialists','tree','ask','cases'].find(name=>route===endpoint+'/'+name)||'unknown',status,duration_ms:Math.max(0,now()-started),tenant:principal?digest(principal.tenant).slice(0,12):null})}catch{}
    }
  };
}
