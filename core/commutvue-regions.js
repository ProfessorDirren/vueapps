/**
 * COMMUTVUE geographic expansion catalog.
 * A language is not a country. Locations are explicit and never inferred from UI locale.
 * These are DISCOVERY regions, not active live-data integrations.
 * Only providers with independent route verification may report live status.
 */
export const COMMUT_EXPANSION_REGIONS=Object.freeze({
 london:{country:'GB',timezone:'Europe/London',locales:['en'],hints:['London','Waterloo','King’s Cross','Paddington']},
 madrid:{country:'ES',timezone:'Europe/Madrid',locales:['es'],hints:['Madrid','Atocha','Chamartín']},
 mexico_city:{country:'MX',timezone:'America/Mexico_City',locales:['es'],hints:['Ciudad de México','CDMX','Pantitlán']},
 mumbai:{country:'IN',timezone:'Asia/Kolkata',locales:['hi','en'],hints:['Mumbai','मुंबई','Dadar','Andheri']},
 delhi:{country:'IN',timezone:'Asia/Kolkata',locales:['hi','en'],hints:['Delhi','दिल्ली','Rajiv Chowk']},
 beijing:{country:'CN',timezone:'Asia/Shanghai',locales:['zh-CN'],hints:['Beijing','北京','西直门']},
 shanghai:{country:'CN',timezone:'Asia/Shanghai',locales:['zh-CN'],hints:['Shanghai','上海','人民广场']},
 moscow:{country:'RU',timezone:'Europe/Moscow',locales:['ru'],hints:['Moscow','Москва','Комсомольская']},
 dubai:{country:'AE',timezone:'Asia/Dubai',locales:['ar','en'],hints:['Dubai','دبي','BurJuman']},
 riyadh:{country:'SA',timezone:'Asia/Riyadh',locales:['ar'],hints:['Riyadh','الرياض','KAFD']},
 athens:{country:'GR',timezone:'Europe/Athens',locales:['el'],hints:['Athens','Αθήνα','Σύνταγμα']},
 istanbul:{country:'TR',timezone:'Europe/Istanbul',locales:['tr'],hints:['Istanbul','İstanbul','Kadıköy','Taksim']},
 tehran:{country:'IR',timezone:'Asia/Tehran',locales:['fa'],hints:['Tehran','تهران','تجریش']},
 montreal:{country:'CA',timezone:'America/Toronto',locales:['fr','en'],hints:['Montréal','Montreal','Berri-UQAM']},
 buenos_aires:{country:'AR',timezone:'America/Argentina/Buenos_Aires',locales:['es'],hints:['Buenos Aires','Retiro','Constitución']},
 valparaiso:{country:'CL',timezone:'America/Santiago',locales:['es'],hints:['Valparaíso','Viña del Mar','Limache']},
 concepcion:{country:'CL',timezone:'America/Santiago',locales:['es'],hints:['Concepción','Talcahuano','Biotrén']}
});
export function expansionRegionsForLocale(locale){
 return Object.entries(COMMUT_EXPANSION_REGIONS).filter(([,r])=>r.locales.includes(locale)).map(([id])=>id);
}
