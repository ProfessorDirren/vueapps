/** CORE-VUE memory v1. Injected storage only: no implicit network, images or credentials. */
export const MEMORY_VERSION=1;
export const MEMORY_DOMAINS=['anyvue','anivue','antiqvue','armvue','estatevue','foodvue','homevue','medivue','motovue','musicgearvue','plantvue','slumpvue','vinylvue','wardrobevue'];
export const MEMORY_LIMITS=Object.freeze({cases:50,turns:100,bytes:1000000,question:3000,answer:8000,context:4000});
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export function obviousIdentifier(v){return /(?:\b(?:19|20)?\d{6}[-+ ]?\d{4}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:personnummer|social security|patientnamn|receptnummer)\s*[:#]|\b(?:\+46|0046)[\s\d()-]{7,})/i.test(String(v||''))}
const safeText=v=>!/(?:data:image|data:video|Bearer\s+|sk-[A-Za-z\d]{12,}|-----BEGIN .*PRIVATE KEY)/i.test(v)&&!obviousIdentifier(v);
export function sanitizeFields(fields){if(!fields||typeof fields!=='object'||Array.isArray(fields))return {};const result={};for(const [key,value]of Object.entries(fields).slice(0,35)){if(!/^[a-zA-Z][\w-]{0,60}$/.test(key)||/password|token|secret|image|photo|video|file|privacy|confirmed|patient|assigned/i.test(key))continue;if(typeof value!=='string'||value.length>20000||!safeText(value))continue;result[key]=value}return result}
export function validateMemory(input,domain){
 if(!MEMORY_DOMAINS.includes(domain)||!input||input.version!==1||input.domain!==domain||!Array.isArray(input.cases)||input.cases.length>MEMORY_LIMITS.cases||new TextEncoder().encode(JSON.stringify(input)).length>MEMORY_LIMITS.bytes)throw Error('Invalid memory backup');
 const seen=new Set();const cases=input.cases.map(c=>{if(!c||typeof c.id!=='string'||!/^[\w-]{1,80}$/.test(c.id)||seen.has(c.id)||typeof c.title!=='string'||c.title.length>120||!safeText(c.title)||!Array.isArray(c.turns)||c.turns.length>MEMORY_LIMITS.turns||!Number.isFinite(Date.parse(c.updatedAt)))throw Error('Invalid case');seen.add(c.id);const turns=c.turns.map(t=>{if(!t||typeof t.question!=='string'||t.question.length>3000||typeof t.answer!=='string'||t.answer.length>8000||!safeText(t.question)||!safeText(t.answer)||!Number.isFinite(Date.parse(t.at))||!['ai_unverified','local_guidance','draft','research_passages'].includes(t.kind))throw Error('Invalid turn');return {question:t.question,answer:t.answer,at:t.at,kind:t.kind}});return {id:c.id,title:c.title,updatedAt:c.updatedAt,fields:sanitizeFields(c.fields),turns}});
 return {version:1,domain,active:cases.some(c=>c.id===input.active)?input.active:null,cases};
}
function words(v){return new Set((String(v).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).slice(0,200))}
export function selectHistory(turns,question,max=MEMORY_LIMITS.context){
 const target=words(question),recent=Array.isArray(turns)?turns.slice(-100):[];
 const ranked=recent.map((t,i)=>({t,i,score:[...words(t.question)].filter(w=>target.has(w)).length+(i>=recent.length-2?2:0)})).sort((a,b)=>b.score-a.score||b.i-a.i).slice(0,4).sort((a,b)=>a.i-b.i);
 let size=0;const output=[];for(const {t}of ranked){const q=text(t.question,1200),a=text(t.answer,1800);if(!safeText(q)||!safeText(a))continue;const answer=a.slice(0,Math.max(0,max-size-q.length));if(size+q.length>max)continue;output.push({question:q,answer,at:t.at,kind:t.kind});size+=q.length+answer.length}return output;
}
export class VueMemory {
 constructor({domain,storage=null,persistent=true}){if(!MEMORY_DOMAINS.includes(domain))throw Error('Unknown VUE');this.domain=domain;this.storage=storage;this.persistent=persistent&&domain!=='medivue';this.key='vue-core-memory-v1:'+domain;this.error=null;this.db={version:1,domain,active:null,cases:[]};if(this.persistent&&storage){try{const raw=storage.getItem(this.key);if(raw)this.db=validateMemory(JSON.parse(raw),domain)}catch{this.error='corrupt'}}}
 commit(db){const valid=validateMemory(db,this.domain);if(this.error==='corrupt')throw Error('Corrupt memory: export/reset first');if(this.persistent&&this.storage)this.storage.setItem(this.key,JSON.stringify(valid));this.db=valid;return this.active()}
 active(){return this.db.cases.find(c=>c.id===this.db.active)||null}
 create(title,fields={}){if(this.db.cases.length>=50)throw Error('Memory full');const now=new Date().toISOString(),c={id:id(),title:text(title,120)||this.domain.toUpperCase(),updatedAt:now,fields:sanitizeFields(fields),turns:[]};if(!safeText(c.title))throw Error('Private identifier');return this.commit({...this.db,active:c.id,cases:[...this.db.cases,c]})}
 switch(caseId){if(!this.db.cases.some(c=>c.id===caseId))throw Error('Unknown case');return this.commit({...this.db,active:caseId})}
 update(fields){const c=this.active();if(!c)return null;return this.commit({...this.db,cases:this.db.cases.map(x=>x.id===c.id?{...x,fields:sanitizeFields(fields),updatedAt:new Date().toISOString()}:x)})}
 append({question,answer,kind='ai_unverified'}){const q=text(question,3000),a=text(answer,8000);if(!safeText(q)||!safeText(a))throw Error('Private identifier');let c=this.active();if(!c)c=this.create(text(question,70));if(!q&&!a)return c;if(c.turns.length>=100)throw Error('Case full');const previous=c.turns.at(-1);if(previous?.question===q&&previous.answer===a&&previous.kind===kind)return c;const turn={question:q,answer:a,kind,at:new Date().toISOString()};return this.commit({...this.db,cases:this.db.cases.map(x=>x.id===c.id?{...x,turns:[...x.turns,turn],updatedAt:turn.at}:x)})}
 history(question){return selectHistory(this.active()?.turns,question)}
 remove(caseId){const cases=this.db.cases.filter(c=>c.id!==caseId);return this.commit({...this.db,cases,active:this.db.active===caseId?null:this.db.active})}
 reset(){if(this.persistent&&this.storage)this.storage.removeItem(this.key);this.error=null;this.db={version:1,domain:this.domain,active:null,cases:[]}}
 export(){return this.error==='corrupt'&&this.storage?this.storage.getItem(this.key):JSON.stringify(this.db,null,2)}
 import(raw){const next=validateMemory(raw,this.domain),map=new Map(this.db.cases.map(c=>[c.id,c]));for(const c of next.cases){const old=map.get(c.id);if(!old||Date.parse(c.updatedAt)>Date.parse(old.updatedAt))map.set(c.id,c)}return this.commit({...this.db,cases:[...map.values()]})}
}
