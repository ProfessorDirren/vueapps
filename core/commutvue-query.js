/** Deterministic extraction only; never guess a station or region. */
export const COMMUT_REGION_HINTS=Object.freeze({
 stockholm:/\b(?:stockholm|jordbro|handen|haninge|södertälje|uppsala|märsta|solna|sundbyberg|t-centralen|stockholm city|sl pendeltåg)\b/iu,
 paris:/\b(?:paris|châtelet|chatelet|gare du nord|saint-lazare|la défense|la defense|rer\s*[a-e]|transilien)\b/iu
});
const PATTERNS=[
 /(?:från|from|de|desde)\s+(.+?)\s+(?:till|to|à|a|hasta)\s+(.+?)(?:\s+(?:försenad|försenade|delayed|late|en retard|retrasad[oa]s?)\b|[?.!,]|$)/iu,
 /(?:between|mellan|entre)\s+(.+?)\s+(?:and|och|et|y)\s+(.+?)(?:[?.!,]|$)/iu
];
const clean=s=>s.trim().replace(/^(?:stationen|station|the station)\s+/iu,'').replace(/\s+(?:station|stationen)$/iu,'').trim();
export function parseCommuteQuestion(question){
 const text=String(question||'').trim();
 const regions=Object.entries(COMMUT_REGION_HINTS).filter(([,re])=>re.test(text)).map(([region])=>region);
 const match=PATTERNS.map(re=>re.exec(text)).find(Boolean);
 const from=match?clean(match[1]):null,to=match?clean(match[2]):null;
 return {region:regions.length===1?regions[0]:null,from:from||null,to:to||null,needsClarification:regions.length!==1||!from||!to};
}
