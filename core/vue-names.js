const names={
 en:["Anything", "Animals", "Antiques", "Weapons", "Estate", "Food", "Home", "Medicines", "Vehicles", "Music gear", "Plants", "Random", "Vinyl", "Wardrobe"],
 es:["Cualquier tema", "Animales", "Antigüedades", "Armas", "Herencia", "Comida", "Hogar", "Medicamentos", "Vehículos", "Equipo musical", "Plantas", "Azar", "Vinilos", "Armario"],
 sv:["Allt", "Djur", "Antikviteter", "Vapen", "Dödsbo", "Mat", "Hem", "Läkemedel", "Fordon", "Musikutrustning", "Växter", "Slump", "Vinyl", "Garderob"],
 hi:["कुछ भी", "पशु", "प्राचीन वस्तुएँ", "हथियार", "विरासत", "भोजन", "घर", "दवाएँ", "वाहन", "संगीत उपकरण", "पौधे", "यादृच्छिक", "विनाइल", "अलमारी"],
 'zh-CN':["万事", "动物", "古董", "武器", "遗产", "食物", "家居", "药品", "车辆", "音乐设备", "植物", "随机", "黑胶", "衣橱"],
 ru:["Любая тема", "Животные", "Антиквариат", "Оружие", "Наследство", "Еда", "Дом", "Лекарства", "Транспорт", "Музыкальное оборудование", "Растения", "Случайное", "Винил", "Гардероб"],
 ar:["أي موضوع", "الحيوانات", "التحف", "الأسلحة", "التركة", "الطعام", "المنزل", "الأدوية", "المركبات", "المعدات الموسيقية", "النباتات", "العشوائي", "الفينيل", "خزانة الملابس"]
};
const additionalLanguages={
 fr:['Tous les sujets','Animaux','Antiquités','Armes','Succession','Alimentation','Maison','Médicaments','Véhicules','Matériel musical','Plantes','Aléatoire','Vinyles','Garde-robe'],
 el:['Κάθε θέμα','Ζώα','Αντίκες','Όπλα','Κληρονομιά','Τρόφιμα','Σπίτι','Φάρμακα','Οχήματα','Μουσικός εξοπλισμός','Φυτά','Τυχαία επιλογή','Βινύλια','Γκαρνταρόμπα'],
 tr:['Her konu','Hayvanlar','Antikalar','Silahlar','Miras','Yiyecek','Ev','İlaçlar','Araçlar','Müzik ekipmanı','Bitkiler','Rastgele','Plaklar','Gardırop'],
 fa:['هر موضوعی','حیوانات','عتیقه‌ها','سلاح‌ها','ارث','غذا','خانه','داروها','وسایل نقلیه','تجهیزات موسیقی','گیاهان','تصادفی','صفحات وینیل','کمد لباس']
};
Object.assign(names,additionalLanguages);
const extraNames={
 commutvue:{en:'Commuting',sv:'Pendling',es:'Transporte público',hi:'सार्वजनिक परिवहन','zh-CN':'公共交通',ru:'Общественный транспорт',ar:'النقل العام',fr:'Transports en commun',el:'Δημόσιες συγκοινωνίες',tr:'Toplu taşıma',fa:'حمل‌ونقل عمومی'},
 martialartsvue:{en:'Martial arts',sv:'Kampsport',es:'Artes marciales',hi:'मार्शल आर्ट','zh-CN':'武术',ru:'Боевые искусства',ar:'الفنون القتالية',fr:'Arts martiaux',el:'Πολεμικές τέχνες',tr:'Dövüş sanatları',fa:'هنرهای رزمی'}
};
export const VUE_NAMES=['anyvue','anivue','antiqvue','armvue','estatevue','foodvue','homevue','medivue','motovue','musicgearvue','plantvue','slumpvue','vinylvue','wardrobevue','commutvue','martialartsvue'];
/** True only when the requested language has its own non-empty translation. */
export function hasLocalizedVueName(domain,language){
 if(typeof language!=='string')return false;
 if(extraNames[domain])return typeof extraNames[domain][language]==='string'&&extraNames[domain][language].trim().length>0;
 const index=VUE_NAMES.indexOf(domain);
 return index>=0&&Array.isArray(names[language])&&typeof names[language][index]==='string'&&names[language][index].trim().length>0;
}
export function localizedVueName(domain,language='en'){
 if(extraNames[domain])return (extraNames[domain][language]||extraNames[domain].en)+'-VUE';
 const index=VUE_NAMES.indexOf(domain);
 return index<0?'':(names[language]||names.en)[index]+'-VUE';
}
export function vueBrandName(domain){return domain==='commutvue'?'COMMUTEVUE':String(domain).toUpperCase();}
/** Render the selected-language name first; retain a small stable brand for recognition. */
export function renderVueNames(document,language){
 for(const domain of VUE_NAMES){
  const heading=document.querySelector('#app-'+domain+' h3');
  if(!heading)continue;
  const local=document.createElement('bdi');
  local.dir='auto';
  local.textContent=localizedVueName(domain,language);
  const brand=document.createElement('bdi');
  brand.dir='ltr';
  brand.textContent='('+vueBrandName(domain)+')';
  brand.style.fontSize='0.7em';
  brand.style.fontWeight='400';
  heading.replaceChildren(local,document.createTextNode(' '),brand);
 }
}
