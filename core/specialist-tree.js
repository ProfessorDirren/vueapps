import {SPECIALISTS} from './specialists.js';
import {SUB_SPECIALISTS,subSpecialist} from './sub-specialists.js';
/** Flat path registry, iterative traversal: the architecture imposes no fixed depth. */
export function buildSpecialistTree(extra=[]){
 const nodes=[{path:'corevue',parent:null,domain:null,method:'Coordinate specialist selection, isolated case continuity and verification boundaries.',matches:[]}];
 for(const [domain,profile]of Object.entries(SPECIALISTS)){
  nodes.push({path:'corevue/'+domain,parent:'corevue',domain,method:profile.method,matches:[]});
  for(const [id,method]of Object.entries(SUB_SPECIALISTS[domain]||{}))nodes.push({path:'corevue/'+domain+'/'+id,parent:'corevue/'+domain,domain,method,matches:[]});
 }
 nodes.push(...extra);const map=new Map();
 for(const n of nodes){if(!n||typeof n.path!=='string'||!/^corevue(?:\/[a-z][a-z0-9_-]*)*$/.test(n.path)||map.has(n.path)||typeof n.method!=='string'||!n.method.trim()||!Array.isArray(n.matches)||n.matches.some(x=>typeof x!=='string'||!x.trim()))throw Error('Invalid specialist tree node');map.set(n.path,{...n,matches:[...n.matches]})}
 for(const n of map.values())if(n.path!=='corevue'){if(n.parent!==n.path.slice(0,n.path.lastIndexOf('/'))||!map.has(n.parent)||!SPECIALISTS[n.domain]||n.path.split('/')[1]!==n.domain)throw Error('A child must refine an existing parent in the same lead domain.')}
 return map;
}
const refinements=[
 {path:'corevue/anivue/dog/breathing',parent:'corevue/anivue/dog',domain:'anivue',matches:['breathing','breathe','respirar','respira','andning','andas','дыш','呼吸','सांस','تنفس','يتنفس','تتنفس'],method:'Dog respiratory distress: prioritize emergency veterinary contact for difficulty breathing, blue or pale gums, collapse or severe weakness. Avoid remote diagnosis; ask only brief non-delaying observations and never suggest waiting for a photo.'},
 {path:'corevue/anivue/cat/breathing',parent:'corevue/anivue/cat',domain:'anivue',matches:['breathing','breathe','respirar','respira','andning','andas','дыш','呼吸','सांस','تنفس','يتنفس','تتنفس'],method:'Cat respiratory distress: open-mouth breathing, laboured breathing or collapse warrants immediate veterinary assessment. Keep emergency advice ahead of optional image analysis and do not diagnose from text or photos.'},
 {path:'corevue/anivue/horse/colic',parent:'corevue/anivue/horse',domain:'anivue',matches:['colic','kolik','cólico','колик','绞痛','पेट दर्द','مغص'],method:'Equine colic concern: prompt urgent contact with an equine veterinarian; record observed rolling, pawing, appetite and manure only if it does not delay care. Do not advise medication, feeding or walking protocols without veterinary direction.'},
 {path:'corevue/musicgearvue/amplifiers/marshall',parent:'corevue/musicgearvue/amplifiers',domain:'musicgearvue',matches:['marshall'],method:'Marshall amplifier identification: use front/rear panels and chassis markings, distinguish head from cabinet, check originality, modifications and safe voltage/impedance requirements.'},
 {path:'corevue/musicgearvue/amplifiers/marshall/jmp',parent:'corevue/musicgearvue/amplifiers/marshall',domain:'musicgearvue',matches:['jmp'],method:'Marshall JMP: distinguish model number from production year, corroborate date codes and chassis details, separate original transformers and capacitors from modified preamp sections. Do not infer date or value from the JMP badge alone.'},
 {path:'corevue/musicgearvue/amplifiers/marshall/jmp/folkesson',parent:'corevue/musicgearvue/amplifiers/marshall/jmp',domain:'musicgearvue',matches:['folkesson'],method:'Folkesson-modified JMP: verify modification version and documentation, channel controls, footswitch compatibility and service history. Treat modification claims as owner reports until corroborated; do not generalise one amp specification to another.'}
];
export const SPECIALIST_TREE=buildSpecialistTree(refinements);
export function specialistPath(domain,question='',requested=null,sub=null,tree=SPECIALIST_TREE){
 let path=requested||'corevue/'+domain;
 if(!tree.has(path)||tree.get(path).domain!==domain)throw Error('Unknown specialist path for this domain.');
 if(!requested){const focused=subSpecialist(domain,question,sub);if(focused)path+='/'+focused}
 const q=String(question).toLocaleLowerCase();
 while(true){const matches=[...tree.values()].filter(n=>n.parent===path&&n.matches.length&&n.matches.some(x=>q.includes(x.toLocaleLowerCase())));if(matches.length!==1)break;path=matches[0].path}
 const lineage=[];let current=tree.get(path);
 while(current){lineage.push({path:current.path,method:current.method});current=current.parent?tree.get(current.parent):null}
 lineage.reverse();return {path,lineage,focus:lineage.filter(n=>n.path.split('/').length>2).map(n=>n.method).join('\n')};
}
