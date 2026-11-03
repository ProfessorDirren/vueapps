import { VueHelp } from './help.js';

/** VUECORE-provided help content for the portal. Specialist subclasses can add topics. */
export class PortalVueHelp extends VueHelp {
  constructor() {
    super({
      id: 'vuecore',
      translations: {
        en: { title: 'VUECORE help', button: 'Help', close: 'Close help' },
        es: { title: 'Ayuda de VUECORE', button: 'Ayuda', close: 'Cerrar ayuda' },
        sv: { title: 'Hjälp för VUECORE', button: 'Hjälp', close: 'Stäng hjälp' },
        hi: { title: 'VUECORE सहायता', button: 'सहायता', close: 'सहायता बंद करें' },
        'zh-CN': { title: 'VUECORE 帮助', button: '帮助', close: '关闭帮助' },
        ru: { title: 'Помощь VUECORE', button: 'Помощь', close: 'Закрыть справку' },
        ar: { title: 'مساعدة VUECORE', button: 'المساعدة', close: 'إغلاق المساعدة' },
      },
      topics: {
        en: [{ title: 'Get started', body: 'Describe what you need in your own words. VUECORE helps you find the right specialist.' }, { title: 'Specialists', body: 'Each VUE offers topic-specific assistance. Features vary; do not assume photos or videos are analyzed.' }],
        es: [{ title: 'Primeros pasos', body: 'Describe lo que necesitas con tus propias palabras. VUECORE te ayuda a encontrar el especialista adecuado.' }, { title: 'Especialistas', body: 'Cada VUE ofrece ayuda especializada. Las funciones varían; no presupongas que se analizan fotos o vídeos.' }],
        sv: [{ title: 'Kom igång', body: 'Beskriv med egna ord vad du behöver. VUECORE hjälper dig hitta rätt specialist.' }, { title: 'Specialister', body: 'Varje VUE ger specialiserad hjälp. Funktionerna varierar; utgå inte från att bilder eller video analyseras.' }],
        hi: [{ title: 'शुरू करें', body: 'अपनी आवश्यकता अपने शब्दों में लिखें। VUECORE सही विशेषज्ञ खोजने में मदद करता है।' }],
        'zh-CN': [{ title: '开始使用', body: '用自己的话描述需求。VUECORE 会帮助你找到合适的专家。' }],
        ru: [{ title: 'Начало работы', body: 'Опишите задачу своими словами. VUECORE поможет выбрать специалиста.' }],
        ar: [{ title: 'البدء', body: 'صف ما تحتاج إليه بكلماتك. يساعدك VUECORE في العثور على الاختصاص المناسب.' }],
      },
    });
  }
}
