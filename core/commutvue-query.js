import {interpretVueInput,suggestVueTerms} from './vuecore-interpretation.js';
import {COMMUT_EXPANSION_REGIONS} from './commutvue-regions.js';
/** Deterministic extraction; never guess a station, route or region. */
export const COMMUT_REGION_HINTS=Object.freeze({
 gothenburg:/(?:^|[^\p{L}\p{N}])(?:göteborg|gothenburg)(?=$|[^\p{L}\p{N}])/iu,
 stockholm:/(?:^|[^\p{L}\p{N}])(?:stockholm|jordbro|handen|haninge|tyresö|gullmarsplan|södertälje|uppsala|märsta|solna|sundbyberg|t-centralen|stockholm city|sl pendeltåg)(?=$|[^\p{L}\p{N}])/iu,
 santiago:/(?:^|[^\p{L}\p{N}])(?:chile|santiago(?: de chile)?|providencia|maipú|maipu|puente alto|las condes|estación central|estacion central|plaza de armas|baquedano|tobalaba|pajaritos|los héroes|los heroes|metro de santiago|red movilidad)(?=$|[^\p{L}\p{N}])/iu,
 paris:/(?:^|[^\p{L}\p{N}])(?:paris|châtelet|chatelet|gare du nord|saint-lazare|la défense|la defense|rer\s*[a-e]|transilien)(?=$|[^\p{L}\p{N}])/iu
});
// Explicitly verified station names; do not treat region/city hints as station truth.
const VERIFIED_STOCKHOLM_STATIONS=Object.freeze(['Jordbro','Handen','T-Centralen','Stockholm City','Södertälje','Märsta','Uppsala']);
const escapeRegex=value=>[...value].map(ch=>'.*+?^$()|[]{}\\'.includes(ch)?'\\'+ch:ch).join('');
const expansionHints=Object.fromEntries(Object.entries(COMMUT_EXPANSION_REGIONS).map(([id,region])=>[id,new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+region.hints.map(escapeRegex).join('|')+')(?:$|[^\\p{L}\\p{N}])','iu')]));
const ALL_REGION_HINTS=Object.freeze({...COMMUT_REGION_HINTS,...expansionHints});
const PATTERNS=[
 // Natural Swedish shorthand: explicitly named verified origin and destination, no 'från' required.
 /^\s*(Jordbro|Handen|T-Centralen|Stockholm City|Södertälje|Märsta|Uppsala)\s+till\s+(Jordbro|Handen|T-Centralen|Stockholm City|Södertälje|Märsta|Uppsala)(?=\s*(?:[,?.!]|$))/iu,
 /(.+?)\s+से\s+(.+?)\s+तक(?=[?.!,।]|$)/iu,
 /从\s*(.+?)\s*到\s*(.+?)(?=[?.!,。！？]|$)/iu,
 /из\s+(.+?)\s+до\s+(.+?)(?=[?.!,]|$)/iu,
 /من\s+(.+?)\s+(?:إلى|الى)\s+(.+?)(?=[?.!,؟]|$)/iu,
 /από\s+(.+?)\s+(?:προς|σε)\s+(.+?)(?=[?.!,;]|$)/iu,
 /از\s+(.+?)\s+به\s+(.+?)(?=[?.!,؟]|$)/iu,
 /(.+?)\s+konumundan\s+(.+?)\s+konumuna(?=[?.!,]|$)/iu,
 /(?:desde|de)\s+(.+?)\s+(?:a|hacia)\s+(.+?)(?=\s+(?:con retraso|atrasad[oa]s?|demorad[oa]s?|retrasad[oa]s?)(?=$|[\s?.!,])|[?.!,]|$)/iu,
 /(?:från|from|de|desde)\s+(.+?)\s+(?:till|to|à|hasta)\s+(.+?)(?=\s+(?:försenad(?:e|t)?|delayed|late|en retard|retrasad[oa]s?)(?=$|[\s?.!,])|[?.!,]|$)/iu,
 /(?:between|mellan|entre)\s+(.+?)\s+(?:and|och|et|y)\s+(.+?)(?=[?.!,]|$)/iu
];
const clean=s=>s.trim().replace(/^.*\bdesde\s+/iu,'').replace(/^(?:stationen|station|the station)\s+/iu,'').replace(/\s+(?:station|stationen)$/iu,'').replace(/\s+(?:idag|imorgon|i morgon|ikväll|i kväll)$/iu,'').trim();
export function parseCommuteQuestion(question){
 const text=String(question||'').trim();
 const regions=Object.entries(ALL_REGION_HINTS).filter(([,re])=>re.test(text)).map(([region])=>region);
 const match=PATTERNS.map(re=>re.exec(text)).find(Boolean);
 const singleOrigin=!match?/(?:\bfrån|\bfrom)\s+([\p{L}\p{N} -]+?)(?=[?.!,]|$)/iu.exec(text):null;
 const rawFrom=match?clean(match[1]):singleOrigin?clean(singleOrigin[1]):null,rawTo=match?clean(match[2]):null;
 const origin=rawFrom?interpretVueInput(rawFrom):null,destination=rawTo?interpretVueInput(rawTo.replace(/\s+(?:visa|show|mostrar|afficher)\s+(?:linjenummer|line|planned|planerad|realtid|real[- ]?time).*$/iu,'').trim()):null;
 const from=origin?.question||null,to=destination?.question||null;
 // Region must be grounded in an endpoint, not incidental context in the question.
 const endpointRegions=from&&to?Object.entries(ALL_REGION_HINTS).filter(([,re])=>re.test(from)||re.test(to)).map(([region])=>region):[];
 const selected=endpointRegions.length?endpointRegions:regions;
 const result={region:selected.length===1?selected[0]:null,from:from||null,to:to||null,needsClarification:selected.length!==1||!from||!to};
 const corrections=[...(origin?.corrections||[]).map(c=>({role:'from',...c})),...(destination?.corrections||[]).map(c=>({role:'to',...c}))];
 if(corrections.length)result.stationCorrections=corrections;
 // Suggestions are metadata only: never silently route a trip using a guessed stop.
 if(selected.length===1&&selected[0]==='stockholm'&&from&&to){
  const suggestions=[...suggestVueTerms(from,VERIFIED_STOCKHOLM_STATIONS).map(x=>({role:'from',...x})),...suggestVueTerms(to,VERIFIED_STOCKHOLM_STATIONS).map(x=>({role:'to',...x}))];
  if(suggestions.length){result.stationSuggestions=suggestions;result.needsClarification=true;}
 }
 return result;
}

/** Shared Swedish transport-mode classification for the provider-neutral journey API.
 * Null means no explicit mode: do not silently narrow a multimodal journey.
 */
export function commuteTransportMode(question){
 const q=String(question||'');
 const modes=[
  ['BOAT',/\b(?:färj(?:a|an|or|orna)|pendelbåt(?:en|ar)?|båt(?:en|ar|arna)|ferry|boat)\b/iu],
  ['TRAM',/\b(?:spårvagn(?:en|ar|arna)?|tram(?:s)?)\b/iu],
  ['METRO',/\b(?:tunnelban(?:a|an)|t-bana(?:n)?|metro|subway)\b/iu],
  ['BUS',/\b(?:buss(?:en|ar|arna)?|expressbuss(?:en|ar)?|regionalbuss(?:en|ar)?|bus(?:es)?)\b/iu],
  ['TRAIN',/\b(?:pendeltåg(?:et|en)?|regionaltåg(?:et|en)?|fjärrtåg(?:et|en)?|tåg(?:et|en)?|train(?:s)?)\b/iu]
 ];
 const found=modes.filter(([,pattern])=>pattern.test(q)).map(([mode])=>mode);
 return found.length===1?found[0]:null;
}
