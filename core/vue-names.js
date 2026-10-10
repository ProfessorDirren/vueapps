const names={
 en:['Anything','Animals','Antiques','Weapons','Food','Home','Vehicles','Music gear','Plants','Random','Vinyl'],
 es:['Cualquier tema','Animales','Antigüedades','Armas','Comida','Hogar','Vehículos','Equipo musical','Plantas','Azar','Vinilos'],
 sv:['Allt','Djur','Antikviteter','Vapen','Mat','Hem','Fordon','Musikutrustning','Växter','Slump','Vinyl'],
 hi:['कुछ भी','पशु','प्राचीन वस्तुएँ','हथियार','भोजन','घर','वाहन','संगीत उपकरण','पौधे','यादृच्छिक','विनाइल'],
 'zh-CN':['万事','动物','古董','武器','食物','家居','车辆','音乐设备','植物','随机','黑胶'],
 ru:['Любая тема','Животные','Антиквариат','Оружие','Еда','Дом','Транспорт','Музыкальное оборудование','Растения','Случайное','Винил'],
 ar:['أي موضوع','الحيوانات','التحف','الأسلحة','الطعام','المنزل','المركبات','المعدات الموسيقية','النباتات','العشوائي','الفينيل']
};
export const VUE_NAMES=['anyvue','anivue','antiqvue','armvue','foodvue','homevue','motovue','musicgearvue','plantvue','slumpvue','vinylvue'];
export function localizedVueName(domain,language='en'){const index=VUE_NAMES.indexOf(domain);return index<0?'':(names[language]||names.en)[index]+'-VUE'}
export function renderVueNames(document,language){for(const domain of VUE_NAMES){const heading=document.querySelector('#app-'+domain+' h3');if(!heading)continue;const brand=document.createElement('bdi');brand.dir='ltr';brand.textContent=domain.toUpperCase();const local=document.createElement('bdi');local.dir='auto';local.textContent='('+localizedVueName(domain,language)+')';local.style.fontSize='0.78em';local.style.fontWeight='500';heading.replaceChildren(brand,document.createTextNode(' '),local)}}
