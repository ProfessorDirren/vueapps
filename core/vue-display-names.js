/** VUECORE-owned presentation names. IDs remain stable for routing and APIs. */
export const VUE_NAME_LANGUAGES = Object.freeze(['en','es','sv','fr','hi','zh-CN','ru','ar','el','tr','fa']);
const names = Object.freeze({
  commutvue: Object.freeze({en:'Commute',es:'Transporte público',sv:'Kollektivtrafik',fr:'Transports en commun',hi:'सार्वजनिक परिवहन','zh-CN':'公共交通',ru:'Общественный транспорт',ar:'النقل العام',el:'Δημόσιες συγκοινωνίες',tr:'Toplu taşıma',fa:'حمل‌ونقل عمومی'}),
  anivue: Object.freeze({en:'Animal health',es:'Salud animal',sv:'Djurhälsa',fr:'Santé animale',hi:'पशु स्वास्थ्य','zh-CN':'动物健康',ru:'Здоровье животных',ar:'صحة الحيوانات',el:'Υγεία ζώων',tr:'Hayvan sağlığı',fa:'سلامت حیوانات'}),
  martialartsvue: Object.freeze({"en":"Martial arts","es":"Artes marciales","sv":"Kampsport","fr":"Arts martiaux","hi":"मार्शल आर्ट","zh-CN":"武术","ru":"Боевые искусства","ar":"الفنون القتالية","el":"Πολεμικές τέχνες","tr":"Dövüş sanatları","fa":"هنرهای رزمی"}),
  medivue: Object.freeze({"en":"Medicines","es":"Medicamentos","sv":"Läkemedel","fr":"Médicaments","hi":"दवाइयाँ","zh-CN":"药品","ru":"Лекарства","ar":"الأدوية","el":"Φάρμακα","tr":"İlaçlar","fa":"داروها"}),
  estatevue: Object.freeze({"en":"Estate planning","es":"Inventario de bienes","sv":"Bohag och arv","fr":"Inventaire des biens","hi":"संपत्ति सूची","zh-CN":"财产清单","ru":"Опись имущества","ar":"جرد الممتلكات","el":"Απογραφή περιουσίας","tr":"Mülk envanteri","fa":"فهرست اموال"}),
  wardrobevue: Object.freeze({"en":"Wardrobe","es":"Guardarropa","sv":"Garderob","fr":"Garde-robe","hi":"अलमारी","zh-CN":"衣橱","ru":"Гардероб","ar":"خزانة الملابس","el":"Γκαρνταρόμπα","tr":"Gardırop","fa":"کمد لباس"}),
  antiqvue: Object.freeze({"en":"Antiques","es":"Antigüedades","sv":"Antikviteter","fr":"Antiquités","hi":"प्राचीन वस्तुएँ","zh-CN":"古董","ru":"Антиквариат","ar":"التحف","el":"Αντίκες","tr":"Antikalar","fa":"اشیای عتیقه"}),
  vinylvue: Object.freeze({"en":"Vinyl records","es":"Discos de vinilo","sv":"Vinylskivor","fr":"Disques vinyles","hi":"विनाइल रिकॉर्ड","zh-CN":"黑胶唱片","ru":"Виниловые пластинки","ar":"أسطوانات الفينيل","el":"Δίσκοι βινυλίου","tr":"Plaklar","fa":"صفحه‌های وینیل"}),
  musicgearvue: Object.freeze({"en":"Music equipment","es":"Equipo musical","sv":"Musikutrustning","fr":"Matériel musical","hi":"संगीत उपकरण","zh-CN":"音乐设备","ru":"Музыкальное оборудование","ar":"معدات موسيقية","el":"Μουσικός εξοπλισμός","tr":"Müzik ekipmanı","fa":"تجهیزات موسیقی"}),
  motovue: Object.freeze({"en":"Vehicles","es":"Vehículos","sv":"Fordon","fr":"Véhicules","hi":"वाहन","zh-CN":"车辆","ru":"Транспортные средства","ar":"المركبات","el":"Οχήματα","tr":"Araçlar","fa":"وسایل نقلیه"}),
  homevue: Object.freeze({"en":"Home maintenance","es":"Mantenimiento del hogar","sv":"Hemunderhåll","fr":"Entretien de la maison","hi":"घर का रखरखाव","zh-CN":"家居维护","ru":"Уход за домом","ar":"صيانة المنزل","el":"Συντήρηση σπιτιού","tr":"Ev bakımı","fa":"نگهداری خانه"}),
  plantvue: Object.freeze({"en":"Plant care","es":"Cuidado de plantas","sv":"Växtskötsel","fr":"Entretien des plantes","hi":"पौधों की देखभाल","zh-CN":"植物养护","ru":"Уход за растениями","ar":"العناية بالنباتات","el":"Φροντίδα φυτών","tr":"Bitki bakımı","fa":"مراقبت از گیاهان"}),
  armvue: Object.freeze({"en":"Equipment service","es":"Mantenimiento de equipos","sv":"Utrustningsservice","fr":"Entretien du matériel","hi":"उपकरण रखरखाव","zh-CN":"设备保养","ru":"Обслуживание оборудования","ar":"صيانة المعدات","el":"Συντήρηση εξοπλισμού","tr":"Ekipman bakımı","fa":"سرویس تجهیزات"}),
  foodvue: Object.freeze({"en":"Food and ingredients","es":"Alimentos e ingredientes","sv":"Mat och ingredienser","fr":"Aliments et ingrédients","hi":"भोजन और सामग्री","zh-CN":"食品与配料","ru":"Еда и ингредиенты","ar":"الطعام والمكونات","el":"Τρόφιμα και συστατικά","tr":"Gıda ve malzemeler","fa":"غذا و مواد اولیه"}),
  slumpvue: Object.freeze({"en":"Random discoveries","es":"Descubrimientos al azar","sv":"Slumpmässiga upptäckter","fr":"Découvertes aléatoires","hi":"यादृच्छिक खोजें","zh-CN":"随机发现","ru":"Случайные открытия","ar":"اكتشافات عشوائية","el":"Τυχαίες ανακαλύψεις","tr":"Rastgele keşifler","fa":"کشف‌های تصادفی"}),
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
