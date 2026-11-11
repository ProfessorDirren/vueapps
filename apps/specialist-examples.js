import {isRegisteredSpecialist} from '../core/specialists.js';

// Central VUECORE examples: never show an unrelated specialist's prompt.
const examples=Object.freeze({
 anivue:['My dog has been limping since yesterday. What should I check?','Min hund har haltat sedan igår. Vad bör jag kontrollera?','Mi perro cojea desde ayer. ¿Qué debo revisar?'],
 anyvue:['Compare the evidence for these two explanations.','Jämför bevisen för de här två förklaringarna.','Compara las pruebas de estas dos explicaciones.'],
 antiqvue:['Can you help identify and date this antique?','Kan du hjälpa mig identifiera och datera antikviteten?','¿Puedes ayudarme a identificar y fechar esta antigüedad?'],
 armvue:['Help me identify this firearm model from its markings.','Hjälp mig identifiera modellen utifrån märkningarna.','Ayúdame a identificar este modelo por sus marcas.'],
 commutvue:['Are there verified departures from Jordbro to Stockholm City right now?','Finns det verifierade avgångar från Jordbro till Stockholm City just nu?','¿Hay salidas verificadas de Jordbro a Stockholm City ahora?'],
 estatevue:['Help me inventory the contents of this room.','Hjälp mig inventera innehållet i det här rummet.','Ayúdame a inventariar el contenido de esta habitación.'],
 foodvue:['What do the ingredients and E-numbers on this label mean?','Vad betyder ingredienserna och E-numren på etiketten?','¿Qué significan los ingredientes y números E de esta etiqueta?'],
 homevue:['Help me plan maintenance for my bathroom.','Hjälp mig planera underhåll av badrummet.','Ayúdame a planificar el mantenimiento del baño.'],
 martialartsvue:['Explain the rules and training basics of judo.','Förklara reglerna och grunderna i judoträning.','Explica las reglas y los fundamentos del judo.'],
 medivue:['What does the official leaflet say about this medicine?','Vad säger bipacksedeln om det här läkemedlet?','¿Qué dice el prospecto oficial de este medicamento?'],
 motovue:['What should I check before buying a used motorcycle?','Vad bör jag kontrollera innan jag köper en begagnad motorcykel?','¿Qué debo revisar antes de comprar una moto usada?'],
 musicgearvue:['What model is this Marshall amplifier and what is it worth?','Vilken modell är den här Marshall-förstärkaren och vad är den värd?','¿Qué modelo es este amplificador Marshall y cuánto vale?'],
 plantvue:['Why are the leaves on my plant turning yellow?','Varför gulnar bladen på min växt?','¿Por qué amarillean las hojas de mi planta?'],
 slumpvue:['Surprise me with an unexpected fact.','Överraska mig med ett oväntat fakta.','Sorpréndeme con un dato inesperado.'],
 vinylvue:['Can you identify this vinyl pressing and estimate its value?','Kan du identifiera den här vinylpressningen och uppskatta värdet?','¿Puedes identificar esta edición de vinilo y estimar su valor?'],
 wardrobevue:['Help identify this jacket and estimate its resale value.','Hjälp mig identifiera jackan och uppskatta andrahandsvärdet.','Ayúdame a identificar esta chaqueta y estimar su valor de reventa.']
});
const commutLocales=Object.freeze({
 fr:'Y a-t-il des départs vérifiés de Jordbro à Stockholm City en ce moment ?',
 el:'Υπάρχουν επιβεβαιωμένες αναχωρήσεις από Jordbro προς Stockholm City τώρα;',
 tr:'Şu anda Jordbro’dan Stockholm City’ye doğrulanmış seferler var mı?',
 fa:'آیا اکنون حرکت‌های تأییدشده از Jordbro به Stockholm City وجود دارد؟',
 hi:'क्या अभी Jordbro से Stockholm City के लिए सत्यापित प्रस्थान हैं?',
 'zh-CN':'现在有从 Jordbro 到 Stockholm City 的已核实发车信息吗？',
 ru:'Есть ли сейчас подтверждённые отправления из Jordbro в Stockholm City?',
 ar:'هل توجد رحلات مغادرة مؤكدة من Jordbro إلى Stockholm City الآن؟'
});
export function specialistExample(domain,language,generic){
 if(!domain||!isRegisteredSpecialist(domain))return generic;
 if(domain==='commutvue'&&commutLocales[language])return commutLocales[language];
 const example=examples[domain];
 if(!example)return generic;
 const index=language==='en'?0:language==='sv'?1:language==='es'?2:-1;
 // For locales without a reviewed translation, keep the existing localized generic example.
 return index<0?generic:example[index];
}
