import {usableImage} from '../core/image-input.js';
import {specialistPath} from '../core/specialist-tree.js';
import {POST as followup,validImage,urgentFollowup} from './vue-followup.js';
import {routeQuestion,routingFields} from '../core/router.js';
import {subSpecialist} from '../core/sub-specialists.js';
import {classifyImage,ImageRoutingError} from '../core/image-routing.js';
import {obviousIdentifier,MEMORY_DOMAINS} from '../core/memory.js';
import {ROUTER_TEXT} from '../apps/router-content.js';
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 let b;try{const raw=await request.text();if(raw.length>4250000)return json(413,{error:'Too large'});b=JSON.parse(raw)}catch{return json(400,{error:'Invalid JSON'})}
 if(!b||!ROUTER_TEXT[b.language])return json(400,{error:'Invalid language'});
 if(b.image!==undefined&&(!validImage(b.image)||!usableImage(b.image)||b.image_public!==true))return json(400,{error:'A valid public image and confirmation are required'});
 if(b.question!==undefined&&typeof b.question!=='string')return json(400,{error:'Invalid question'});
 const text=ROUTER_TEXT[b.language];const question=b.question?.trim()|| (b.image?text[24]:'');
 if(question.length<3||question.length>3000||obviousIdentifier(question))return json(400,{error:'Invalid public question'});
 let route=routeQuestion(question,b.previous);
 const urgent=route.domain&&urgentFollowup(route.domain,question,routingFields(route.domain,question),b.language);
 try{if(b.image&&!urgent)route=await classifyImage(b.image,question)}catch(e){return json(e instanceof ImageRoutingError?e.status:502,{error:'Image routing unavailable'})}
 if(route.clarify)return json(200,{domain:null,answer:text[route.private?6:9],clarify:true,private:!!route.private});
 if(route.domain==='medivue')return json(200,{domain:'medivue',sub_specialist:'leaflets',answer:text[10],workspace:'./medivue.html',kind:'local_guidance'});
 const current=MEMORY_DOMAINS.includes(b.previous)&&route.domain===b.previous&&b.newCase!==true;
 const focused=subSpecialist(route.domain,question,route.sub_specialist),branch=specialistPath(route.domain,question,route.specialist_path,focused);
 const r=await followup(new Request('https://localhost/api/vue-followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:route.domain,sub_specialist:focused,specialist_path:branch.path,question,language:b.language,history:current?b.history:[],fields:{...(current&&b.fields||{}),...routingFields(route.domain,question)},...(b.image?{image:b.image,image_public:true}:{})})}));
 const d=await r.json();return json(r.status,{...d,domain:route.domain,sub_specialist:focused,specialist_path:branch.path,lineage:branch.lineage.map(n=>n.path),image_analyzed:!!b.image&&d.kind==='ai_unverified',workspace:route.domain==='anivue'?'https://www.anivueapp.se':'./'+route.domain+'.html'});
}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'POST required'});const r=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:typeof req.body==='string'?req.body:JSON.stringify(req.body)}));return res.status(r.status).json(await r.json());}
