import {createApi} from '../core/http-api/service.js';
const handle=createApi();
export const GET=handle,POST=handle,DELETE=handle;
// This repository uses standalone Vercel Node Functions, not Next.js App Router.
export default async function handler(req,res){
  try{
    const original=new URL(req.url,'https://www.vueapps.se');
    let path=original.pathname;
    if(path.startsWith('/api/v1/')&&original.searchParams.getAll('path').length===1&&original.searchParams.get('path')===path.slice('/api/v1/'.length))original.searchParams.delete('path');
    if(path==='/api/core-api'){const route=original.searchParams.get('path')||'';if(!/^[a-zA-Z0-9/-]*$/.test(route))return res.status(400).json({error:{code:'invalid_request',message:'Invalid API path.'}});path='/api/v1/'+route;original.searchParams.delete('path')}
    const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):String(value));
    const method=req.method||'GET';let body;
    if(!['GET','HEAD'].includes(method)){body=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});if(Buffer.byteLength(body)>4250000)return res.status(413).json({error:{code:'request_too_large',message:'Request bodies are limited to 4,250,000 bytes.'}})}
    const r=await handle(new Request('https://www.vueapps.se'+path+original.search,{method,headers,...(body!==undefined?{body}:{})}));
    for(const [key,value]of r.headers)res.setHeader(key,value);
    return res.status(r.status).send(await r.text());
  }catch{res.setHeader('Cache-Control','no-store');return res.status(500).json({error:{code:'internal_error',message:'An internal error occurred.'}})}
}
