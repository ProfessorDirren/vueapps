import {VueDomain,VueCoreError,normalizeAssessment,LANGUAGES} from './index.js';
import {routingFields} from './router.js';

/**
 * Deterministic, VUECORE-native animal emergency adapter.
 * Symptom IDs follow the standalone ANIVUE registry. Equine mapping remains
 * marked for licensed equine-veterinarian review before clinical sign-off.
 * https://aaep.org/wp-content/uploads/2024/02/Be_Prepared_for_an_Equine_Health_Emergency.pdf
 * https://ceh.vetmed.ucdavis.edu/health-topics/esophageal-obstruction-choke-horses
 */
export const HORSE_EMERGENCY_IDS=Object.freeze([
 'horseColic','horseChoke','horseBreathingDistress','horseSevereBleeding',
 'horseUnableStand','horseNeuro','horseEyeTrauma','horseFoalingDifficulty','horseCannotBearWeight','horseHighFever'
]);
export const COMPANION_EMERGENCY_IDS=Object.freeze(['breathing','collapse','severeBleeding']);
export const HORSE_PROMPT_CONTACT_IDS=Object.freeze(['horseDiarrhea','horseNotEating','horseOther']);
const MESSAGES={
 en:'Seek emergency veterinary care now. Do not wait for AI or photo analysis.',
 es:'Busca atención veterinaria urgente ahora. No esperes a la IA ni al análisis de fotos.',
 sv:'Sök akut veterinärvård nu. Vänta inte på AI eller bildanalys.',
 hi:'तुरंत आपात पशु चिकित्सा लें। AI या फोटो विश्लेषण की प्रतीक्षा न करें।',
 'zh-CN':'立即寻求急诊兽医帮助。不要等待 AI 或照片分析。',
 ru:'Срочно обратитесь за ветеринарной помощью. Не ждите ИИ или анализа фото.',
 ar:'اطلب رعاية بيطرية طارئة الآن. لا تنتظر الذكاء الاصطناعي أو تحليل الصور.'
};
const EQUINE={
 en:'Contact an equine emergency veterinarian immediately.',
 es:'Contacta inmediatamente con un veterinario de urgencias equinas.',
 sv:'Kontakta hästjour eller hästveterinär omedelbart.',
 hi:'तुरंत घोड़ों के आपातकालीन पशु चिकित्सक से संपर्क करें।',
 'zh-CN':'立即联系马科急诊兽医。',
 ru:'Немедленно свяжитесь с экстренным ветеринаром для лошадей.',
 ar:'اتصل فوراً بطبيب بيطري طارئ متخصص بالخيول.'
};
const URGENT_RE=/(breathing difficulty|trouble breathing|difficulty breathing|cannot breathe|struggling to breathe|andningssvårigheter|kan inte andas|svårt att andas|dificultad para respirar|le cuesta respirar|no puede respirar|saans lene mein dikkat|सांस लेने में (?:दिक्कत|कठिनाई|परेशानी)|साँस लेने में (?:दिक्कत|कठिनाई|परेशानी)|呼吸困难|呼吸困難|无法呼吸|затруднен(?:о|ное|ное) дыхание|трудно дышать|صعوبة (?:في )?التنفس|لا يستطيع التنفس)/i;
/** Explicit equine Celsius readings above 39.5°C warrant emergency contact. */
function highHorseFever(description){
 const text=String(description||'');
 const readings=[...text.matchAll(/(?:^|[^\d])([34]\d(?:[.,]\d+)?)\s*(?:°\s*C|°C|celsius|grader\s*C|degrees\s*C)(?![a-z])/gi)];
 return readings.some(match=>Number(match[1].replace(',','.'))>39.5);
}
export class AniVueDomain extends VueDomain {
 constructor({fetcher=fetch}={}){super({id:'anivue',name:'ANIVUE',capabilities:{imageAnalysis:true,videoAnalysis:false}});this.fetcher=fetcher}
 /** Native VUECORE specialist text response, independent of deterministic emergency checks. */
 async analyzeText({species,description='',symptoms=[],language='en'}={}){
  if(!LANGUAGES.includes(language))throw new VueCoreError('invalid_language','Unsupported language');
  if(!['dog','cat','horse'].includes(species))throw new VueCoreError('invalid_species','Unsupported species');
  if(typeof description!=='string'||description.trim().length<3||description.length>2000)throw new VueCoreError('invalid_description','Description must be 3–2000 characters');
  const symptom=Array.isArray(symptoms)?symptoms.filter(x=>typeof x==='string').slice(0,12).join(' '):'';
  const response=await this.fetcher('/api/vue-router',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({question:species+' '+symptom+' '+description.trim(),language,previous:'anivue',newCase:true}),
   signal:AbortSignal.timeout(90000)
  });
  const data=await response.json();
  if(!response.ok)throw new VueCoreError('service_unavailable',data?.error||'ANIVUE text analysis unavailable');
  if(data?.domain!=='anivue'||typeof data.answer!=='string'||!data.answer.trim())throw new VueCoreError('invalid_analysis','Invalid ANIVUE response');
  return data;
 }
 /** Optional supplementary photo analysis via the VUECORE-native server endpoint. */
 async analyzePhoto({image,species,description='',symptoms=[],language='en'}={}){
  if(!LANGUAGES.includes(language))throw new VueCoreError('invalid_language','Unsupported language');
  if(!['dog','cat','horse'].includes(species))throw new VueCoreError('invalid_species','Unsupported species');
  if(typeof image!=='string'||!image.startsWith('data:image/'))throw new VueCoreError('invalid_image','Image required');
  const response=await this.fetcher('/api/vue-router',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action:'anivue_analyze',image,species,description,symptoms,language}),
   signal:AbortSignal.timeout(90000)
  });
  const data=await response.json();
  if(!response.ok)throw new VueCoreError('image_analysis_unavailable',data.error||'Image analysis unavailable');
  if(!data||typeof data.summary!=='string'||!Array.isArray(data.visibleObservations))throw new VueCoreError('invalid_analysis','Invalid image analysis response');
  return data;
 }
 emergencyCheck({category='',species='',symptoms=[],description='',language='en'}={}){
  const animal=species||category;
  const selected=new Set(Array.isArray(symptoms)?symptoms:[]);
  const horse=animal==='horse';
  const explicit=horse?HORSE_EMERGENCY_IDS:COMPANION_EMERGENCY_IDS;
  const route=routingFields('anivue',description);
  const routeBreathing=route.selected==='["breathing"]';
  const urgent=explicit.some(id=>selected.has(id))||selected.has('breathing')||routeBreathing||URGENT_RE.test(description)||(horse&&highHorseFever(description));
  if(!urgent)return null;
  return normalizeAssessment({
   severity:'emergency',
   summary:(horse?EQUINE[language]||EQUINE.en:MESSAGES[language]||MESSAGES.en)+' '+(horse?MESSAGES[language]||MESSAGES.en:''),
   limitations:['Deterministic triage is not a diagnosis. Veterinary review required for equine mapping.']
  });
 }
 async assess({category='',species='',symptoms=[],description='',language='en'}={}){
  const result=await this.analyzeText({species:species||category,symptoms,description,language});
  return normalizeAssessment({severity:'monitor',summary:result.answer,limitations:['AI-generated guidance is not a veterinary diagnosis.']});
 }
}
