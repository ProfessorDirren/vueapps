/**
 * COMMUTEVUE implementation priority, independent of the user's chosen language.
 * Tier 1 Sweden, tier 2 Chile, tier 3 EU, tier 4 remaining countries.
 * Discovery support does NOT imply verified live-data availability.
 */
export const EU_COUNTRIES=Object.freeze(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']);
export function commutePriority(country){
 if(country==='SE')return 1;
 if(country==='CL')return 2;
 if(EU_COUNTRIES.includes(country))return 3;
 return 4;
}
export function prioritizedCommuteRegions(providers){
 return Object.entries(providers).map(([id,provider])=>({id,country:provider.country,priority:commutePriority(provider.country)}))
  .sort((a,b)=>a.priority-b.priority||a.country.localeCompare(b.country)||a.id.localeCompare(b.id));
}
