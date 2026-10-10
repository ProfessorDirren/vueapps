import {validImage} from '../../api/vue-followup.js';
import {ApiError} from './auth.js';
import {MEMORY_DOMAINS,obviousIdentifier,sanitizeFields} from '../memory.js';
export const LANGUAGES=['en','sv','es','hi','zh-CN','ru','ar'];
export const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const bad=message=>{throw new ApiError(400,'invalid_request',message)};
export function subjectId(request){const s=request.headers.get('x-vue-subject');if(!s||!/^usr_[A-Za-z0-9_-]{16,64}$/.test(s))bad('X-VUE-Subject must be an opaque usr_ identifier with 16–64 random characters; never a name, email or national ID.');return s}
export function idempotency(request){const s=request.headers.get('idempotency-key');if(!s||!/^[A-Za-z0-9_-]{8,128}$/.test(s))bad('Idempotency-Key is required and must contain 8–128 letters, digits, underscores or hyphens.');return s}
function plain(b){if(!b||typeof b!=='object'||Array.isArray(b))bad('A JSON object is required.')}
function known(b,fields){if(Object.keys(b).some(k=>!fields.includes(k)))bad('The request contains unsupported fields.')}
function safe(s){return !obviousIdentifier(s)&&!/(data:(?:image|video)|Bearer\s|vue_[A-Za-z0-9_-]{43}|sk-[A-Za-z0-9]{12,}|-----BEGIN .*PRIVATE KEY)/i.test(s)}
export async function body(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw new ApiError(415,'unsupported_media_type','Content-Type must be application/json.');
  if(Number(request.headers.get('content-length'))>4250000)throw new ApiError(413,'request_too_large','Request bodies are limited to 4,250,000 bytes.');
  const reader=request.body?.getReader();let bytes=0,chunks=[];
  if(reader){try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4250000){await reader.cancel();throw new ApiError(413,'request_too_large','Request bodies are limited to 4,250,000 bytes.')}chunks.push(value)}}finally{reader.releaseLock()}}
  try{const all=new Uint8Array(bytes);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length}const b=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));plain(b);return b}catch(e){if(e instanceof ApiError)throw e;bad('A valid JSON object is required.')}
}
export function validateAsk(b){
  plain(b);known(b,['question','language','specialist','case_id','fields','image','image_public','sub_specialist','specialist_path']);
  if(b.image!==undefined&&(!validImage(b.image)||b.image_public!==true))bad('image must be a JPEG, PNG or WebP data URL of at most 3 MiB; image_public must be true.');
  if(b.image===undefined&&b.image_public!==undefined)bad('image_public requires image.');
  if(b.image&&b.question===undefined)b={...b,question:'Describe the photographed object and guide me.'};
  if(b.specialist_path!==undefined&&(typeof b.specialist_path!=='string'||!/^corevue(?:\/[a-z][a-z0-9_-]*)+$/.test(b.specialist_path)))bad('Invalid specialist_path.');
  if(b.sub_specialist!==undefined&&(typeof b.sub_specialist!=='string'||!/^[a-z_]{2,32}$/.test(b.sub_specialist)))bad('Invalid sub_specialist.');
  if(typeof b.question!=='string'||b.question.trim().length<3||b.question.length>3000||!safe(b.question))bad('question must contain 3–3000 characters and no identifiers or credentials.');
  const language=b.language??'en';if(!LANGUAGES.includes(language))bad('Unsupported language.');
  const specialist=b.specialist??'auto';if(specialist!=='auto'&&!MEMORY_DOMAINS.includes(specialist))bad('Unknown specialist.');
  if(b.case_id!==undefined&&(typeof b.case_id!=='string'||!uuidPattern.test(b.case_id)))bad('Invalid case_id.');
  let fields={};if(b.fields!==undefined){plain(b.fields);if(Object.keys(b.fields).length>20||Object.entries(b.fields).some(([k,v])=>!/^[a-zA-Z][\w-]{0,60}$/.test(k)||typeof v!=='string'||v.length>1200||!safe(v)))bad('fields must contain at most 20 public string values, each at most 1200 characters.');fields=sanitizeFields(b.fields);if(Object.keys(fields).length!==Object.keys(b.fields).length)bad('Unsupported or private field name.')}
  return {question:b.question.trim(),language,specialist,case_id:b.case_id||null,fields,...(b.image?{image:b.image,image_public:true}:{}),sub_specialist:b.sub_specialist||null,specialist_path:b.specialist_path||null};
}
export function validateCase(b){plain(b);known(b,['specialist','title']);if(!MEMORY_DOMAINS.includes(b.specialist)||b.specialist==='medivue')bad('Select a non-medical specialist for a persistent case.');if(typeof b.title!=='string'||!b.title.trim()||b.title.length>120||!safe(b.title))bad('title must contain 1–120 characters and no identifiers or credentials.');return {specialist:b.specialist,title:b.title.trim()}}
