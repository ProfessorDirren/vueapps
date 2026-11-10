import {COMMUT_EXPANSION_REGIONS} from './commutvue-regions.js';
/** Deterministic extraction; never guess a station, route or region. */
export const COMMUT_REGION_HINTS=Object.freeze({
 stockholm:/(?:^|[^\p{L}\p{N}])(?:stockholm|jordbro|handen|haninge|södertälje|uppsala|märsta|solna|sundbyberg|t-centralen|stockholm city|sl pendeltåg)(?=$|[^\p{L}\p{N}])/iu,
 santiago:/(?:^|[^\p{L}\p{N}])(?:chile|santiago(?: de chile)?|providencia|maipú|maipu|puente alto|las condes|estación central|estacion central|plaza de armas|baquedano|tobalaba|pajaritos|los héroes|los heroes|metro de santiago|red movilidad)(?=$|[^\p{L}\p{N}])/iu,
 paris:/(?:^|[^\p{L}\p{N}])(?:paris|châtelet|chatelet|gare du nord|saint-lazare|la défense|la defense|rer\s*[a-e]|transilien)(?=$|[^\p{L}\p{N}])/iu
});
const escapeRegex=value=>[...value].map(ch=>'.*+?^$()|[]{}\\'.includes(ch)?'\\'+ch:ch).join('');
const expansionHints=Object.fromEntries(Object.entries(COMMUT_EXPANSION_REGIONS).map(([id,region])=>[id,new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+region.hints.map(escapeRegex).join('|')+')(?:$|[^\\p{L}\\p{N}])','iu')]));
const ALL_REGION_HINTS=Object.freeze({...COMMUT_REGION_HINTS,...expansionHints});
const PATTERNS=[
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
const clean=s=>s.trim().replace(/^(?:stationen|station|the station)\s+/iu,'').replace(/\s+(?:station|stationen)$/iu,'').trim();
export function parseCommuteQuestion(question){
 const text=String(question||'').trim();
 const regions=Object.entries(ALL_REGION_HINTS).filter(([,re])=>re.test(text)).map(([region])=>region);
 const match=PATTERNS.map(re=>re.exec(text)).find(Boolean);
 const from=match?clean(match[1]):null,to=match?clean(match[2]):null;
 return {region:regions.length===1?regions[0]:null,from:from||null,to:to||null,needsClarification:regions.length!==1||!from||!to};
}
