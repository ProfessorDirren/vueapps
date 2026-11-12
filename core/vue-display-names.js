/** VUECORE-owned presentation names. IDs remain stable for routing and APIs. */
export const VUE_NAME_LANGUAGES = Object.freeze(['en','es','sv','fr','hi','zh-CN','ru','ar','el','tr','fa']);
const names = Object.freeze({
  commutvue: Object.freeze({en:'Commute',es:'Transporte público',sv:'Kollektivtrafik',fr:'Transports en commun',hi:'सार्वजनिक परिवहन','zh-CN':'公共交通',ru:'Общественный транспорт',ar:'النقل العام',el:'Δημόσιες συγκοινωνίες',tr:'Toplu taşıma',fa:'حمل‌ونقل عمومی'}),
  anivue: Object.freeze({en:'Animal health',es:'Salud animal',sv:'Djurhälsa',fr:'Santé animale',hi:'पशु स्वास्थ्य','zh-CN':'动物健康',ru:'Здоровье животных',ar:'صحة الحيوانات',el:'Υγεία ζώων',tr:'Hayvan sağlığı',fa:'سلامت حیوانات'}),
  anyvue: Object.freeze({en:'Ask anything',es:'Pregunta lo que quieras',sv:'Fråga om vad som helst',fr:'Posez toutes vos questions',hi:'कुछ भी पूछें','zh-CN':'随心提问',ru:'Спросите о чём угодно',ar:'اسأل عن أي شيء',el:'Ρωτήστε οτιδήποτε',tr:'Her şeyi sorun',fa:'هرچه می‌خواهید بپرسید'})
});
/** Presentation-only; never translate the stable domain ID or URL. */
export function vueDisplayName(id, language='en') {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) return '';
  const locale = VUE_NAME_LANGUAGES.includes(language) ? language : 'en';
  return names[id]?.[locale] ?? names[id]?.en ?? id.toUpperCase();
}
export function vueNameTranslations(id) {
  return names[id] ? Object.freeze({...names[id]}) : null;
}
