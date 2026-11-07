import {MEMORY_DOMAINS} from './memory.js';
import {isRegisteredSpecialist} from './specialists.js';
// Conservative topic routing. Historical answers are never used to classify a new topic.
const rules=[
 ['martialartsvue',6,/martial arts|kampsport|artes marciales|taekwondo|karate|judo|jiu[ -]?jitsu|muay thai|kickboxing|武术|боевые искусства|الفنون القتالية|मार्शल आर्ट/iu],
 ['estatevue',7,/dödsbo|arvskifte|inventera (?:hem|hus)|hela (?:hemmet|huset)|estate inventory|deceased estate|succession|遗产|наследств|تركة|विरासत/iu],
 ['medivue',6,/bipacksedel|läkemedel|medicin|biverkning|medication|medicine|leaflet|side effects|prospecto|medicamento|药品|药物|лекарств|دواء|दवा/iu],
 ['vinylvue',5,/vinyl|grammofon|skivor|skiva|(?<![\p{L}\p{N}_])lp(?![\p{L}\p{N}_])|discogs|runout|pressning|record collection|黑胶|винил|أسطوان|विनाइल/iu],
 ['musicgearvue',5,/gitarr|guitar|förstärkar|amplifier|marshall|fender|gibson|synt(?:h|ar)|trumm|piano|instrument|dj[- ]|turntable|guitarra|吉他|乐器|гитар|усилител|غيتار|गिटार/iu],
 ['wardrobevue',5,/kläder|klänning|jacka|skor|handväska|wardrobe|clothing|dress|jacket|shoes|handbag|ropa|vestido|衣服|服装|одежд|плать|ملابس|कपड़े/iu],
 ['anivue',5,/\bhund(?:en|ens|ar|arna)?\b|\bkatt(?:en|ens|er|erna)?\b|\bhäst(?:en|ens|ar|arna|arnas)?\b|\bdogs?\b|\bcats?\b|\bhorses?\b|\bmare\b|\bfoal\b|veterinär|perro|gato|caballo|yegua|potro|宠物|小狗|小猫|狗|猫|собак|кошк|лошад|كلب|قط|حصان|कुत्ता|कुत्ते|बिल्ली|घोड़ा/iu],
 ['motovue',5,/\bbil\b|motorcykel|motorcycle|\bcar\b|\bmotor\b|broms|brake|verkstad|starter|coche|automóvil|汽车|摩托|автомоб|тормоз|سيارة|कार/iu],
 ['foodvue',5,/e[- ]?nummer|\be\d{3,4}[a-z]?\b|ingredien|livsmedel|recept|matlagning|recipe|food|additive|receta|alimento|食品|食谱|пищ|рецепт|طعام|وصفة|भोजन/iu],
 ['plantvue',5,/växt|blomma|krukväxt|vattna|plant|flower|watering|planta|植物|цвет|растен|نبات|पौधा/iu],
 ['antiqvue',4,/antik|antique|möbel|byrå|\bstol\b|smycke|jewell?ery|furniture|armoire|antigüedad|古董|家具|антик|мебел|تحف|पुरावस्तु/iu],
 ['armvue',5,/\bpistol(?:en|er|erna)?\b|\bgevär(?:et|en)?\b|vapenvård|vapen|firearm|equipment maintenance|utrustningsvård|hunting rifle|skjutvapen|(?:^|[^\p{L}\p{N}])\.308(?:[\s'’]*(?:a|an))?(?=$|[^\p{L}\p{N}])|(?:^|[^\p{L}\p{N}])308(?:[\s'’]*(?:a|an))?\s+(?:klickar|klick|clicks?|misfires?|fungerar inte)(?=$|[^\p{L}\p{N}])|arma|枪械|оруж|سلاح/iu],
 ['homevue',4,/husunderhåll|hemunderhåll|luftfilter|ventilation|rökdetektor|brandvarnare|home maintenance|air filter|smoke detector|mantenimiento del hogar|家居维护|обслуживание дома|صيانة المنزل/iu],
 ['slumpvue',4,/överraska mig|slump|surprise me|random idea|bored|uttråkad|sorpréndeme|随机|удиви|فاجئني/iu]
];
/** Routing declarations for registry consistency checks; never expose regex patterns to clients. */
export const ROUTED_SPECIALIST_IDS=Object.freeze(rules.map(([id])=>id));
export function routeRegisteredQuestion(question,previous=null){
 const route=routeQuestion(question,previous);
 if(route.clarify)return route;
 if(!isRegisteredSpecialist(route.domain))return {domain:null,clarify:true,candidates:[]};
 return route;
}
export function routeQuestion(question,previous=null){const q=String(question||'').trim();const hits=rules.filter(([, ,pattern])=>pattern.test(q)).map(([domain,score])=>({domain,score:domain==='estatevue'&&!/inventer|inventory|hela (?:hemmet|huset)|whole (?:home|house)/iu.test(q)?3:score})).sort((a,b)=>b.score-a.score);if(hits.length&&hits[0].score>(hits[1]?.score||0))return {domain:hits[0].domain,clarify:false};if(hits.length>1&&hits[0].score===hits[1].score)return {domain:null,clarify:true,candidates:hits.filter(x=>x.score===hits[0].score).map(x=>x.domain)};return {domain:'anyvue',clarify:false};}
export function routingFields(domain,question){const q=String(question).toLowerCase();if(domain==='anivue'&&/kan inte andas|svårt att andas|andningssvår|cannot breathe|can't breathe|difficulty breathing|trouble breathing|no puede respirar|dificultad para respirar|problemas para respirar|呼吸困难|无法呼吸|не может дышать|трудно дышать|सांस लेने में कठिनाई|لا يستطيع التنفس|لا تستطيع التنفس|صعوبة في التنفس|صعوبة بالتنفس|يتنفس بصعوبة|تتنفس بصعوبة/.test(q))return {selected:'["breathing"]'};if(domain==='motovue'&&/broms|brake/.test(q))return {symptom:'brakes'};return {};}
