import {POST as analyzeAnimal} from '../core/anivue-vision.js';
import {usableImage} from '../core/image-input.js';
import {specialistPath} from '../core/specialist-tree.js';
import {isRegisteredSpecialist} from '../core/specialists.js';
import {POST as followup,validImage,urgentFollowup} from './vue-followup.js';
import {routeQuestion,routingFields} from '../core/router.js';
import {subSpecialist} from '../core/sub-specialists.js';
import {classifyImage,ImageRoutingError} from '../core/image-routing.js';
import {obviousIdentifier,MEMORY_DOMAINS} from '../core/memory.js';
import {ROUTER_TEXT} from '../apps/router-content.js';
import {COMMUT_MESSAGES,commuteLocale} from '../core/commutvue.js';
import {parseCommuteQuestion} from '../core/commutvue-query.js';
import {createModelTimetablePipeline} from '../core/commutvue-photo.js';
import {createStructuredImageRunner} from '../core/structured-image-runner.js';
import {budget,ready} from './vue-followup.js';
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 let b;try{const raw=await request.text();if(raw.length>4250000)return json(413,{error:'Too large'});b=JSON.parse(raw)}catch{return json(400,{error:'Invalid JSON'})}
 // Video must never be silently treated as a text/image assessment before the shared video pipeline is ready.
 if(b?.video!==undefined||b?.video_public!==undefined||b?.video_url!==undefined||b?.video_frames!==undefined||b?.video_evidence!==undefined)return json(415,{error:'Video analysis is not yet supported. No video was processed.'});
 if(b?.action==='anivue_analyze')return analyzeAnimal(new Request('https://localhost/api/anivue-analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}));
 if(!b||!ROUTER_TEXT[b.language])return json(400,{error:'Invalid language'});
 if(b.image!==undefined&&(!validImage(b.image)||!usableImage(b.image)||b.image_public!==true))return json(400,{error:'A valid public image and confirmation are required'});
 if(b.question!==undefined&&typeof b.question!=='string')return json(400,{error:'Invalid question'});
 const text=ROUTER_TEXT[b.language];const question=b.question?.trim()|| (b.image?text[24]:'');
 if(question.length<3||question.length>3000||obviousIdentifier(question))return json(400,{error:'Invalid public question'});
 let route=routeQuestion(question,b.previous);
 const urgent=route.domain&&urgentFollowup(route.domain,question,routingFields(route.domain,question),b.language);
 if(route.domain==='anivue'&&urgent)return json(200,{domain:'anivue',answer:urgent,kind:'safety_rule',emergency:true,workspace:'./?vue=anivue#vue-router',image_analyzed:false});
 try{if(b.image&&!urgent)route=await classifyImage(b.image,question)}catch(e){return json(e instanceof ImageRoutingError?e.status:502,{error:'Image routing unavailable'})}
 if(!route.clarify&&!isRegisteredSpecialist(route.domain))return json(422,{error:'Unregistered VUE specialist'});
 if(route.clarify)return json(200,{domain:null,answer:text[route.private?6:9],clarify:true,private:!!route.private});
 // Fail closed until a verified transport adapter is connected: AI must not guess live train status.
 if(route.domain==='commutvue'){
  let photoEvidence=null,photoStatus=b.image?'disabled':'not_supplied';
  // Explicitly opt-in: the shared model quota is finite and must never be bypassed.
  // CORE image classification above remains the privacy gate for all photos.
  if(b.image&&process.env.COMMUTVUE_PHOTO_ENABLED==='true'&&ready()){
   try{
    const run=createStructuredImageRunner({apiKey:process.env.OPENAI_API_KEY,model:process.env.CORE_VUE_MODEL||process.env.ANTIQVUE_MODEL||'gpt-4.1-mini'});
    const result=await createModelTimetablePipeline({run,allow:()=>budget()}).analyze({image:b.image,question,language:b.language});
    photoStatus=result.status;
    if(result.status==='extracted_unverified')photoEvidence=result.evidence;
   }catch{photoStatus='unavailable';}
  }
  const journey=parseCommuteQuestion(question);return json(200,{photo_status:photoStatus,photo_evidence:photoEvidence,image_analyzed:photoStatus==='extracted_unverified'||photoStatus==='needs_clarification',domain:'commutvue',answer:journey.needsClarification?({sv:'Ange avreseort, destination och stad så kan COMMUTVUE identifiera rätt trafiksystem.',fr:'Indiquez la gare de départ, la destination et la ville.',es:'Indica el origen, destino y ciudad.',hi:'कृपया प्रस्थान स्टेशन, गंतव्य और शहर बताएं।','zh-CN':'请提供出发站、目的地和城市。',ru:'Укажите станцию отправления, пункт назначения и город.',ar:'يرجى تحديد محطة المغادرة والوجهة والمدينة.',el:'Δώστε σταθμό αναχώρησης, προορισμό και πόλη.',tr:'Kalkış istasyonu, varış noktası ve şehri belirtin.',fa:'لطفاً ایستگاه مبدأ، مقصد و شهر را مشخص کنید.',en:'Please specify departure station, destination and city.'}[b.language]||'Please specify departure station, destination and city.'):COMMUT_MESSAGES[commuteLocale(b.language)][0],kind:'local_guidance',verified:false,evidence_status:journey.needsClarification?'needs_stations':'live_unavailable',clarify:journey.needsClarification,region:journey.region,workspace:'./?vue=commutvue#vue-router'});}
 if(route.domain==='medivue')return json(200,{domain:'medivue',sub_specialist:'leaflets',answer:text[10],workspace:'./medivue.html',kind:'local_guidance'});
 const current=MEMORY_DOMAINS.includes(b.previous)&&route.domain===b.previous&&b.newCase!==true;
 const focused=subSpecialist(route.domain,question,route.sub_specialist),branch=specialistPath(route.domain,question,route.specialist_path,focused);
 const r=await followup(new Request('https://localhost/api/vue-followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:route.domain,sub_specialist:focused,specialist_path:branch.path,question,language:b.language,history:current?b.history:[],fields:{...(current&&b.fields||{}),...routingFields(route.domain,question)},...(b.image?{image:b.image,image_public:true}:{})})}));
 const d=await r.json();return json(r.status,{...d,...(d.kind==='ai_unverified'?{verified:false,evidence_status:'not_live_verified',followup_scheduled:false}:{}),domain:route.domain,sub_specialist:focused,specialist_path:branch.path,lineage:branch.lineage.map(n=>n.path),image_analyzed:!!b.image&&d.kind==='ai_unverified',workspace:'./?vue='+encodeURIComponent(route.domain)+'#vue-router'});
}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'POST required'});const r=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:typeof req.body==='string'?req.body:JSON.stringify(req.body)}));return res.status(r.status).json(await r.json());}
