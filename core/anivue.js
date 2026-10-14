import {VueDomain,normalizeAssessment} from './index.js';
import {urgentFollowup} from '../api/vue-followup.js';
import {routingFields} from './router.js';
/** ANIVUE safety adapter. The shared VueFlow calls emergencyCheck before assess. */
export class AniVueDomain extends VueDomain {
 constructor(){super({id:'anivue',name:'ANIVUE',capabilities:{imageAnalysis:false,videoAnalysis:false}})}
 emergencyCheck({description='',language='en'}={}){
  const answer=urgentFollowup('anivue',description,routingFields('anivue',description),language);
  return answer?normalizeAssessment({severity:'emergency',summary:answer,limitations:['Urgent guidance is a deterministic safety rule, not a diagnosis.']}):null;
 }
 async assess(){
  return normalizeAssessment({severity:'monitor',summary:'Use the VUECORE ANIVUE specialist API for observations; this adapter does not claim image analysis.',limitations:['No diagnosis or independent verification.']});
 }
}
