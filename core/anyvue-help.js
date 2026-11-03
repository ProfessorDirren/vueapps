import { VueHelp } from './help.js';

export class AnyVueHelp extends VueHelp {
  constructor() {
    super({
      id: 'anyvue',
      translations: {
        en: { title: 'ANYVUE help', button: 'Help', close: 'Close help' },
        es: { title: 'Ayuda de ANYVUE', button: 'Ayuda', close: 'Cerrar ayuda' },
        sv: { title: 'Hjälp för ANYVUE', button: 'Hjälp', close: 'Stäng hjälp' },
        ar: { title: 'مساعدة ANYVUE', button: 'المساعدة', close: 'إغلاق' },
      },
      topics: {
        en: [{ title: 'Ask a question', body: 'Describe your question. ANYVUE compares available AI perspectives and explains uncertainty.' }],
        es: [{ title: 'Haz una pregunta', body: 'Describe tu pregunta. ANYVUE compara perspectivas de IA disponibles y explica la incertidumbre.' }],
        sv: [{ title: 'Ställ en fråga', body: 'Beskriv din fråga. ANYVUE jämför tillgängliga AI-perspektiv och förklarar osäkerheter.' }],
        ar: [{ title: 'اطرح سؤالاً', body: 'صف سؤالك. يقارن ANYVUE وجهات نظر الذكاء الاصطناعي المتاحة.' }],
      },
    });
  }
}
