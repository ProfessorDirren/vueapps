import {MEMORY_DOMAINS} from './memory.js';
// Conservative topic routing. Historical answers are never used to classify a new topic.
const rules=[
 ['estatevue',7,/dödsbo|arvskifte|inventera (?:hem|hus)|hela (?:hemmet|huset)|estate inventory|deceased estate|succession|遗产|наследств|تركة|विरासत/iu],
 ['medivue',6,/bipacksedel|läkemedel|medicin|biverkning|medication|medicine|leaflet|side effects|prospecto|medicamento|药品|药物|лекарств|دواء|दवा/iu],
 ['vinylvue',5,/vinyl|grammofon|skivor|skiva|(?<![\p{L}\p{N}_])lp(?![\p{L}\p{N}_])|discogs|runout|pressning|record collection|黑胶|винил|أسطوان|विनाइल/iu],
 ['musicgearvue',5,/gitarr|guitar|förstärkar|amplifier|marshall|fender|gibson|synt(?:h|ar)|trumm|piano|instrument|dj[- ]|turntable|guitarra|吉他|乐器|гитар|усилител|غيتار|गिटार/iu],
 ['wardrobevue',5,/kläder|klänning|jacka|skor|handväska|wardrobe|clothing|dress|jacket|shoes|handbag|ropa|vestido|衣服|服装|одежд|плать|ملابس|कपड़े/iu],
 ['anivue',5,/\bhund\b|\bkatt\b|\bhäst\b|\bdog\b|\bcat\b|\bhorse\b|veterinär|perro|gato|caballo|宠物|小狗|小猫|狗|猫|собак|кошк|лошад|كلب|قط|حصان|कुत्ता|बिल्ली|घोड़ा/iu],
 ['motovue',5,/\bbil\b|motorcykel|motorcycle|\bcar\b|\bmotor\b|broms|brake|verkstad|starter|coche|automóvil|汽车|摩托|автомоб|тормоз|سيارة|कार/iu],
 ['foodvue',5,/e[- ]?nummer|\be\d{3,4}[a-z]?\b|ingredien|livsmedel|recept|matlagning|recipe|food|additive|receta|alimento|食品|食谱|пищ|рецепт|طعام|وصفة|भोजन/iu],
 ['plantvue',5,/växt|blomma|krukväxt|vattna|plant|flower|watering|planta|植物|цвет|растен|نبات|पौधा/iu],
 ['antiqvue',4,/antik|antique|möbel|byrå|\bstol\b|smycke|jewell?ery|furniture|armoire|antigüedad|古董|家具|антик|мебел|تحف|पुरावस्तु/iu],
 ['armvue',4,/vapenvård|vapen|firearm|equipment maintenance|utrustningsvård|hunting rifle|skjutvapen|arma|枪械|оруж|سلاح/iu],
 ['homevue',4,/husunderhåll|hemunderhåll|luftfilter|ventilation|rökdetektor|brandvarnare|home maintenance|air filter|smoke detector|mantenimiento del hogar|家居维护|обслуживание дома|صيانة المنزل/iu],
 ['slumpvue',4,/överraska mig|slump|surprise me|random idea|bored|uttråkad|sorpréndeme|随机|удиви|فاجئني/iu]
];
export function routeQuestion(question,previous=null){const q=String(question||'').trim();const hits=rules.filter(([, ,pattern])=>pattern.test(q)).map(([domain,score])=>({domain,score:domain==='estatevue'&&!/inventer|inventory|hela (?:hemmet|huset)|whole (?:home|house)/iu.test(q)?3:score})).sort((a,b)=>b.score-a.score);if(hits.length&&hits[0].score>(hits[1]?.score||0))return {domain:hits[0].domain,clarify:false};if(hits.length>1&&hits[0].score===hits[1].score)return {domain:null,clarify:true,candidates:hits.filter(x=>x.score===hits[0].score).map(x=>x.domain)};return {domain:MEMORY_DOMAINS.includes(previous)?previous:'anyvue',clarify:false};}
export function routingFields(domain,question){const q=String(question).toLowerCase();if(domain==='anivue'&&/kan inte andas|svårt att andas|andningssvår|cannot breathe|can't breathe|difficulty breathing|trouble breathing|no puede respirar|dificultad para respirar|problemas para respirar|呼吸困难|无法呼吸|не может дышать|трудно дышать|सांस लेने में कठिनाई/.test(q))return {selected:'["breathing"]'};if(domain==='motovue'&&/broms|brake/.test(q))return {symptom:'brakes'};return {};}
