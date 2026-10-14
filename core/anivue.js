import {VueDomain,normalizeAssessment} from './index.js';
import {routingFields} from './router.js';
/** ANIVUE safety adapter. The shared VueFlow calls emergencyCheck before assess. */
export class AniVueDomain extends VueDomain {
 constructor(){super({id:'anivue',name:'ANIVUE',capabilities:{imageAnalysis:false,videoAnalysis:false}})}
 emergencyCheck({description='',language='en'}={}){
  const urgent=routingFields('anivue',description).selected==='["breathing"]'||/\bcollaps(?:e|ed|ing)\b|\bunconscious\b|\bsevere bleeding\b|\bheavy bleeding\b|kollaps|medvetslös|kraftig blödning|desmayo|inconsciente|hemorragia grave|коллапс|без сознания|сильное кровотечение|昏倒|失去意识|严重出血|बेहोश|गंभीर रक्तस्राव|انهيار|فاقد الوعي|نزيف شديد/iu.test(description);
  const messages={en:'Seek urgent veterinary care now. Do not wait for AI.',sv:'Sök akut veterinärvård nu. Vänta inte på AI.',es:'Busca atención veterinaria urgente ahora. No esperes a la IA.',hi:'तुरंत आपात पशु चिकित्सा लें। AI की प्रतीक्षा न करें।','zh-CN':'立即寻求急诊兽医帮助，不要等待AI。',ru:'Срочно обратитесь к ветеринару. Не ждите ИИ.',ar:'اطلب رعاية بيطرية عاجلة الآن. لا تنتظر الذكاء الاصطناعي.'};
  const answer=urgent?(messages[language]||messages.en):null;
  return answer?normalizeAssessment({severity:'emergency',summary:answer,limitations:['Urgent guidance is a deterministic safety rule, not a diagnosis.']}):null;
 }
 async assess(){
  return normalizeAssessment({severity:'monitor',summary:'Use the VUECORE ANIVUE specialist API for observations; this adapter does not claim image analysis.',limitations:['No diagnosis or independent verification.']});
 }
}
