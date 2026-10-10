import {randomUUID} from 'node:crypto';
export class VueApiError extends Error {
  constructor(response,payload){super(payload?.error?.message||'CORE-VUE request failed');this.status=response.status;this.code=payload?.error?.code;this.requestId=response.headers.get('x-request-id');this.retryAfter=Number(response.headers.get('retry-after'))||null}
}
// Server-side only. No automatic retries: callers retain the same key and body on retry.
export class VueClient {
  constructor({apiKey,subject,baseUrl='https://www.vueapps.se/api/v1',fetcher=fetch}){const u=new URL(baseUrl);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error('HTTPS is required');this.apiKey=apiKey;this.subject=subject;this.baseUrl=baseUrl.replace(/\/$/,'');this.fetcher=fetcher}
  async request(path,{method='GET',body,idempotencyKey}={}){
    const key=method!=='GET'?(idempotencyKey||randomUUID()):null;
    const headers={'Authorization':'Bearer '+this.apiKey,'X-VUE-Subject':this.subject};
    if(body!==undefined)headers['Content-Type']='application/json';if(key)headers['Idempotency-Key']=key;
    try{
      const r=await this.fetcher(this.baseUrl+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(125000)});
      let payload;try{payload=await r.json()}catch{throw new VueApiError(r,{error:{message:'The API returned a non-JSON response.'}})}
      if(!r.ok)throw new VueApiError(r,payload);return payload;
    }catch(error){if(key&&error&&typeof error==='object')error.idempotencyKey=key;throw error}
  }
  ask(body,idempotencyKey){return this.request('/ask',{method:'POST',body,idempotencyKey})}
  createCase(body,idempotencyKey){return this.request('/cases',{method:'POST',body,idempotencyKey})}
  getCase(id){return this.request('/cases/'+encodeURIComponent(id))}
  deleteCase(id,idempotencyKey){return this.request('/cases/'+encodeURIComponent(id),{method:'DELETE',idempotencyKey})}
}
