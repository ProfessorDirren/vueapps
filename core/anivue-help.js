import { VueHelp } from './help.js';
import { localizedVueName } from './vue-names.js';

/** Native VUECORE ANIVUE Help. Emergency triage is separate and always visible. */
export class AniVueHelp extends VueHelp {
  getLanguage(language) {
    return ['fr','el','tr','fa'].includes(language) ? language : super.getLanguage(language);
  }
  getHelp(language='en') {
    const data=super.getHelp(language);
    return {...data,title:data.title.replaceAll('ANIVUE',localizedVueName('anivue',data.language))};
  }
  constructor() {
    super({
      id: 'anivue',
      translations: {
        en: { title: 'ANIVUE help', button: 'Help', close: 'Close help' },
        es: { title: 'Ayuda de ANIVUE', button: 'Ayuda', close: 'Cerrar ayuda' },
        sv: { title: 'Hjälp för ANIVUE', button: 'Hjälp', close: 'Stäng hjälp' },
        hi: { title: 'ANIVUE सहायता', button: 'सहायता', close: 'बंद करें' },
        'zh-CN': { title: 'ANIVUE 帮助', button: '帮助', close: '关闭' },
        ru: { title: 'Помощь ANIVUE', button: 'Помощь', close: 'Закрыть' },
        ar: { title: 'مساعدة ANIVUE', button: 'المساعدة', close: 'إغلاق' },
        fr: { title: 'Aide ANIVUE', button: 'Aide', close: 'Fermer l’aide' },
        el: { title: 'Βοήθεια ANIVUE', button: 'Βοήθεια', close: 'Κλείσιμο βοήθειας' },
        tr: { title: 'ANIVUE yardımı', button: 'Yardım', close: 'Yardımı kapat' },
        fa: { title: 'راهنمای ANIVUE', button: 'راهنما', close: 'بستن راهنما' },
      },
      topics: {
        en: [{ title: 'Using ANIVUE', body: 'Choose dog, cat or horse and describe symptoms. This VUECORE preview does not yet offer full standalone photo analysis.' }],
        es: [{ title: 'Usar ANIVUE', body: 'Elige perro, gato o caballo y describe los síntomas. Esta vista previa de VUECORE aún no ofrece el análisis completo de fotos.' }],
        sv: [{ title: 'Använd ANIVUE', body: 'Välj hund, katt eller häst och beskriv symtomen. Denna VUECORE-förhandsversion har ännu inte fullständig bildanalys.' }],
        hi: [{ title: 'ANIVUE का उपयोग', body: 'कुत्ता, बिल्ली या घोड़ा चुनें और लक्षण लिखें। इस VUECORE पूर्वावलोकन में पूरी फोटो जाँच उपलब्ध नहीं है।' }],
        'zh-CN': [{ title: '使用 ANIVUE', body: '选择狗、猫或马并描述症状。此 VUECORE 预览尚不支持完整照片分析。' }],
        ru: [{ title: 'Как использовать ANIVUE', body: 'Выберите собаку, кошку или лошадь и опишите симптомы. В этой версии VUECORE пока нет полного анализа фотографий.' }],
        ar: [{ title: 'استخدام ANIVUE', body: 'اختر كلبًا أو قطًا أو حصانًا وصف الأعراض. لا تتوفر بعد إمكانات تحليل الصور الكاملة في معاينة VUECORE.' }],
        fr: [{ title: 'Utiliser ANIVUE', body: 'Choisissez chien, chat ou cheval et décrivez les symptômes. Cette version VUECORE ne propose pas encore une analyse photo autonome complète.' }],
        el: [{ title: 'Χρήση ANIVUE', body: 'Επιλέξτε σκύλο, γάτα ή άλογο και περιγράψτε τα συμπτώματα. Αυτή η έκδοση VUECORE δεν παρέχει ακόμη πλήρη αυτόνομη ανάλυση φωτογραφιών.' }],
        tr: [{ title: 'ANIVUE kullanımı', body: 'Köpek, kedi veya at seçin ve belirtileri açıklayın. Bu VUECORE sürümü henüz tam bağımsız fotoğraf analizi sunmuyor.' }],
        fa: [{ title: 'استفاده از ANIVUE', body: 'سگ، گربه یا اسب را انتخاب کنید و علائم را شرح دهید. این نسخه VUECORE هنوز تحلیل کامل و مستقل عکس ارائه نمی‌کند.' }],
      },
    });
  }
}
