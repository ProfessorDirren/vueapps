const names={
 en:["Anything", "Animals", "Antiques", "Weapons", "Estate", "Food", "Home", "Medicines", "Vehicles", "Music gear", "Plants", "Random", "Vinyl", "Wardrobe"],
 es:["Cualquier tema", "Animales", "Antigüedades", "Armas", "Herencia", "Comida", "Hogar", "Medicamentos", "Vehículos", "Equipo musical", "Plantas", "Azar", "Vinilos", "Armario"],
 sv:["Allt", "Djur", "Antikviteter", "Vapen", "Dödsbo", "Mat", "Hem", "Läkemedel", "Fordon", "Musikutrustning", "Växter", "Slump", "Vinyl", "Garderob"],
 hi:["कुछ भी", "पशु", "प्राचीन वस्तुएँ", "हथियार", "विरासत", "भोजन", "घर", "दवाएँ", "वाहन", "संगीत उपकरण", "पौधे", "यादृच्छिक", "विनाइल", "अलमारी"],
 'zh-CN':["万事", "动物", "古董", "武器", "遗产", "食物", "家居", "药品", "车辆", "音乐设备", "植物", "随机", "黑胶", "衣橱"],
 ru:["Любая тема", "Животные", "Антиквариат", "Оружие", "Наследство", "Еда", "Дом", "Лекарства", "Транспорт", "Музыкальное оборудование", "Растения", "Случайное", "Винил", "Гардероб"],
 ar:["أي موضوع", "الحيوانات", "التحف", "الأسلحة", "التركة", "الطعام", "المنزل", "الأدوية", "المركبات", "المعدات الموسيقية", "النباتات", "العشوائي", "الفينيل", "خزانة الملابس"]
};
const extraNames={
 commutvue:{en:'Commuting',sv:'Pendling',es:'Transporte público',hi:'सार्वजनिक परिवहन','zh-CN':'公共交通',ru:'Общественный транспорт',ar:'النقل العام',fr:'Transports en commun',el:'Δημόσιες συγκοινωνίες',tr:'Toplu taşıma',fa:'حمل‌ونقل عمومی'},
 martialartsvue:{en:'Martial arts',sv:'Kampsport',es:'Artes marciales',hi:'मार्शल आर्ट','zh-CN':'武术',ru:'Боевые искусства',ar:'الفنون القتالية',fr:'Arts martiaux',el:'Πολεμικές τέχνες',tr:'Dövüş sanatları',fa:'هنرهای رزمی'}
};
export const VUE_NAMES=['anyvue','anivue','antiqvue','armvue','estatevue','foodvue','homevue','medivue','motovue','musicgearvue','plantvue','slumpvue','vinylvue','wardrobevue','commutvue','martialartsvue'];
export function localizedVueName(domain,language='en'){
 if(extraNames[domain])return (extraNames[domain][language]||extraNames[domain].en)+'-VUE';
 const index=VUE_NAMES.indexOf(domain);
 return index<0?'':(names[language]||names.en)[index]+'-VUE';
}
export function vueBrandName(domain){return domain==='commutvue'?'COMMUTEVUE':String(domain).toUpperCase();}
export function renderVueNames(document,language){for(const domain of VUE_NAMES){const heading=document.querySelector('#app-'+domain+' h3');if(!heading)continue;const brand=document.createElement('bdi');brand.dir='ltr';brand.textContent=vueBrandName(domain);const local=document.createElement('bdi');local.dir='auto';local.textContent='('+localizedVueName(domain,language)+')';local.style.fontSize='0.78em';local.style.fontWeight='500';heading.replaceChildren(brand,document.createTextNode(' '),local)}}
