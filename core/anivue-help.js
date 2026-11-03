import { VueHelp } from './help.js';

/** Native VUECORE ANIVUE Help. Emergency triage is separate and always visible. */
export class AniVueHelp extends VueHelp {
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
      },
      topics: {
        en: [{ title: 'Using ANIVUE', body: 'Choose dog, cat or horse and describe symptoms. This VUECORE preview does not yet offer full standalone photo analysis.' }],
        es: [{ title: 'Usar ANIVUE', body: 'Elige perro, gato o caballo y describe los síntomas. Esta vista previa de VUECORE aún no ofrece el análisis completo de fotos.' }],
        sv: [{ title: 'Använd ANIVUE', body: 'Välj hund, katt eller häst och beskriv symtomen. Denna VUECORE-förhandsversion har ännu inte fullständig bildanalys.' }],
        hi: [{ title: 'ANIVUE का उपयोग', body: 'कुत्ता, बिल्ली या घोड़ा चुनें और लक्षण लिखें। इस VUECORE पूर्वावलोकन में पूरी फोटो जाँच उपलब्ध नहीं है।' }],
        'zh-CN': [{ title: '使用 ANIVUE', body: '选择狗、猫或马并描述症状。此 VUECORE 预览尚不支持完整照片分析。' }],
        ru: [{ title: 'Как использовать ANIVUE', body: 'Выберите собаку, кошку или лошадь и опишите симптомы. В этой версии VUECORE пока нет полного анализа фотографий.' }],
        ar: [{ title: 'استخدام ANIVUE', body: 'اختر كلبًا أو قطًا أو حصانًا وصف الأعراض. لا تتوفر بعد إمكانات تحليل الصور الكاملة في معاينة VUECORE.' }],
      },
    });
  }
}
