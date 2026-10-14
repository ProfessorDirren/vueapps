import {VueDomain,normalizeAssessment} from './index.js';
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
 'horseUnableStand','horseNeuro','horseEyeTrauma','horseFoalingDifficulty','horseCannotBearWeight'
]);
export const COMPANION_EMERGENCY_IDS=Object.freeze(['breathing']);
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
const URGENT_RE=/(breathing difficulty|difficulty breathing|cannot breathe|struggling to breathe|andningssvårigheter|svårt att andas|dificultad para respirar)/i;
export class AniVueDomain extends VueDomain {
 constructor(){super({id:'anivue',name:'ANIVUE',capabilities:{imageAnalysis:false,videoAnalysis:false}})}
 emergencyCheck({category='',species='',symptoms=[],description='',language='en'}={}){
  const animal=species||category;
  const selected=new Set(Array.isArray(symptoms)?symptoms:[]);
  const horse=animal==='horse';
  const explicit=horse?HORSE_EMERGENCY_IDS:COMPANION_EMERGENCY_IDS;
  const route=routingFields('anivue',description);
  const routeBreathing=route.selected==='["breathing"]';
  const urgent=explicit.some(id=>selected.has(id))||selected.has('breathing')||routeBreathing||URGENT_RE.test(description);
  if(!urgent)return null;
  return normalizeAssessment({
   severity:'emergency',
   summary:(horse?EQUINE[language]||EQUINE.en:MESSAGES[language]||MESSAGES.en)+' '+(horse?MESSAGES[language]||MESSAGES.en:''),
   limitations:['Deterministic triage is not a diagnosis. Veterinary review required for equine mapping.']
  });
 }
 async assess(){
  return normalizeAssessment({severity:'monitor',summary:'VUECORE ANIVUE image analysis is not yet integrated. Use the standalone ANIVUE for full functionality.',limitations:['No diagnosis, image analysis or feature parity is claimed.']});
 }
}
