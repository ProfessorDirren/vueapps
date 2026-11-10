import {createProviderRegistry} from './provider-registry.js';
/**
 * COMMUTVUE: provider-neutral realtime transport contracts.
 * No fabricated departures: unknown and unavailable are explicit states.
 * Credentials are server-side only; callers must supply a provider adapter.
 */
export const COMMUT_LOCALES=Object.freeze(['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa']);
export const COMMUT_MESSAGES=Object.freeze({
 en:['Live traffic data is unavailable.','No verified departures found.','Source','Updated','Scheduled','Expected','Cancelled','Delay'],
 es:['No hay datos de tráfico en tiempo real.','No se encontraron salidas verificadas.','Fuente','Actualizado','Programado','Previsto','Cancelado','Retraso'],
 sv:['Trafikdata i realtid är inte tillgänglig.','Inga verifierade avgångar hittades.','Källa','Uppdaterad','Tidtabell','Beräknad','Inställd','Försening'],
 hi:['लाइव यातायात डेटा उपलब्ध नहीं है।','कोई सत्यापित प्रस्थान नहीं मिला।','स्रोत','अपडेट','निर्धारित','अनुमानित','रद्द','देरी'],
 'zh-CN':['无法获取实时交通数据。','未找到已核实的班次。','来源','更新于','计划','预计','取消','延误'],
 ru:['Данные о движении недоступны.','Подтверждённые отправления не найдены.','Источник','Обновлено','По расписанию','Ожидается','Отменено','Задержка'],
 ar:['بيانات النقل المباشرة غير متاحة.','لم يتم العثور على رحلات مؤكدة.','المصدر','تم التحديث','الموعد','المتوقع','ملغاة','التأخير'],
 fr:['Données de trafic en temps réel indisponibles.','Aucun départ vérifié trouvé.','Source','Mis à jour','Prévu','Estimé','Annulé','Retard'],
 el:['Δεν υπάρχουν διαθέσιμα δεδομένα κίνησης.','Δεν βρέθηκαν επαληθευμένες αναχωρήσεις.','Πηγή','Ενημέρωση','Προγραμματισμένο','Εκτιμώμενο','Ακυρώθηκε','Καθυστέρηση'],
 tr:['Canlı ulaşım verileri kullanılamıyor.','Doğrulanmış kalkış bulunamadı.','Kaynak','Güncelleme','Planlanan','Tahmini','İptal','Gecikme'],
 fa:['داده زنده حمل‌ونقل در دسترس نیست.','حرکت تأییدشده‌ای یافت نشد.','منبع','به‌روزرسانی','برنامه‌ریزی‌شده','پیش‌بینی‌شده','لغوشده','تأخیر']
});
export const COMMUT_PROVIDERS=Object.freeze({
 stockholm:{country:'SE',timezone:'Europe/Stockholm',source:'Trafiklab',docs:'https://www.trafiklab.se/api/our-apis/trafiklab-realtime-apis/',credential:'TRAFIKLAB_API_KEY'},
 paris:{country:'FR',timezone:'Europe/Paris',source:'Île-de-France Mobilités PRIM',docs:'https://prim.iledefrance-mobilites.fr/',credential:'IDFM_API_KEY'},
 santiago:{country:'CL',timezone:'America/Santiago',source:'Red Movilidad / Metro de Santiago',docs:'https://www.red.cl/',credential:null}
});
export function commuteLocale(locale){return COMMUT_LOCALES.includes(locale)?locale:'en'}
export function normalizeDeparture(raw){
 if(!raw||typeof raw!=='object')throw new TypeError('Invalid departure');
 const scheduled=raw.scheduled?Date.parse(raw.scheduled):NaN;
 const expected=raw.expected?Date.parse(raw.expected):NaN;
 if(!Number.isFinite(scheduled))throw new TypeError('Verified scheduled timestamp required');
 if(typeof raw.id!=='string'||!raw.id.trim()||typeof raw.line!=='string'||!raw.line.trim()||typeof raw.destination!=='string'||!raw.destination.trim())throw new TypeError('Verified departure identity required');
 if(raw.expected&&!Number.isFinite(expected))throw new TypeError('Invalid expected timestamp');
 return Object.freeze({id:String(raw.id||''),line:String(raw.line||''),destination:String(raw.destination||''),scheduled:new Date(scheduled).toISOString(),expected:Number.isFinite(expected)?new Date(expected).toISOString():null,delayMinutes:Number.isFinite(expected)?Math.max(0,Math.round((expected-scheduled)/60000)):null,cancelled:raw.cancelled===true});
}
export function normalizeTrafficResult({provider,sourceUrl,updatedAt,departures,journeyEvidence,status='ok'}){
 if(!COMMUT_PROVIDERS[provider])throw new TypeError('Unknown provider');
 if(status!=='ok')return {status:'unavailable',provider,departures:[]};
 if(typeof sourceUrl!=='string'||!/^https:\/\//i.test(sourceUrl)||!Number.isFinite(Date.parse(updatedAt)))throw new TypeError('HTTPS source and timestamp required');
 if(!journeyEvidence||journeyEvidence.verified!==true||typeof journeyEvidence.originId!=='string'||!journeyEvidence.originId.trim()||typeof journeyEvidence.destinationId!=='string'||!journeyEvidence.destinationId.trim()||journeyEvidence.originId===journeyEvidence.destinationId||!Array.isArray(journeyEvidence.departureIds)||journeyEvidence.departureIds.length===0)throw new TypeError('Verified journey evidence required');
 if(!Array.isArray(departures)||departures.some(d=>typeof d.id!=='string'||!journeyEvidence.departureIds.includes(d.id)))throw new TypeError('Departure not covered by journey evidence');
 if(!Array.isArray(departures)||departures.length===0)throw new TypeError('No verified journey departures');
 return {status:'ok',provider,sourceUrl,updatedAt:new Date(updatedAt).toISOString(),departures:(departures||[]).map(normalizeDeparture)};
}
/** COMMUTVUE configures CORE's generic provider lifecycle, never duplicates it. */
export function createCommuteRegistry(){return createProviderRegistry({providers:COMMUT_PROVIDERS,normalize:normalizeTrafficResult});}
export async function queryCommute({provider,from,to,adapter}){
 const registry=createCommuteRegistry();
 if(typeof adapter==='function')registry.register(provider,adapter);
 return registry.query({region:provider,from,to});
}
