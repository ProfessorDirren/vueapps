import {VueDomain,VueCoreError,LANGUAGES} from './index.js';

/**
 * Reusable onboarding adapter for new informational VUEs.
 * Registration does not add a domain to the server router, UI, or safety policy.
 * Those integrations must be reviewed separately before production.
 */
export function createInformationalVueClass({id,method,endpoint='/api/vue-router',timeoutMs=30000}={}){
 if(typeof id!=='string'||!/^[a-z][a-z0-9-]*$/.test(id))throw new VueCoreError('invalid_domain','Invalid VUE id');
 if(typeof method!=='string'||!method.trim())throw new VueCoreError('invalid_method','A specialist method is required');
 if(typeof endpoint!=='string'||!endpoint.startsWith('/api/')||endpoint.startsWith('//')||endpoint.includes('?')||endpoint.includes('#')||endpoint.includes('..'))
  throw new VueCoreError('invalid_endpoint','Only local API endpoints are supported');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>90000)throw new VueCoreError('invalid_timeout','Invalid request timeout');
 return class InformationalVue extends VueDomain{
  constructor({fetcher=fetch}={}){
   super({id,name:id.toUpperCase(),capabilities:{imageAnalysis:false,videoAnalysis:false}});
   if(typeof fetcher!=='function')throw new VueCoreError('invalid_fetcher','Expected fetch function');
   this.method=method;this.fetcher=fetcher;
  }
  async assess({description,language='en'}={}){
   if(!LANGUAGES.includes(language))throw new VueCoreError('invalid_language','Unsupported language');
   if(typeof description!=='string'||description.trim().length<3||description.length>2000)throw new VueCoreError('invalid_question','Enter a question of 3–2000 characters');
   let response;
   try{
    response=await this.fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(timeoutMs),body:JSON.stringify({question:description.trim(),language,previous:id,newCase:true})});
   }catch(error){
    throw new VueCoreError(['TimeoutError','AbortError'].includes(error?.name)?'service_timeout':'service_unavailable','Specialist routing unavailable');
   }
   if(!response||typeof response.json!=='function')throw new VueCoreError('invalid_response','Specialist router returned no readable response');
   if(!response.ok)throw new VueCoreError('service_unavailable','Specialist routing unavailable');
   let data;
   try{data=await response.json()}catch{throw new VueCoreError('invalid_response','Specialist response could not be read')}
   if(!data||data.domain!==id||typeof data.answer!=='string'||!data.answer.trim())
    throw new VueCoreError('specialist_mismatch','No matching specialist answer available');
   return {domain:id,answer:data.answer,kind:data.kind||'unverified',sub_specialist:data.sub_specialist||null};
  }
 };
}
