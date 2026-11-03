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
        hi: { title: 'ANYVUE सहायता', button: 'सहायता', close: 'बंद करें' },
        'zh-CN': { title: 'ANYVUE 帮助', button: '帮助', close: '关闭' },
        ru: { title: 'Помощь ANYVUE', button: 'Помощь', close: 'Закрыть' },
      },
      topics: {
        en: [{ title: 'Ask a question', body: 'Describe your question. ANYVUE compares available AI perspectives and explains uncertainty.' }],
        es: [{ title: 'Haz una pregunta', body: 'Describe tu pregunta. ANYVUE compara perspectivas de IA disponibles y explica la incertidumbre.' }],
        sv: [{ title: 'Ställ en fråga', body: 'Beskriv din fråga. ANYVUE jämför tillgängliga AI-perspektiv och förklarar osäkerheter.' }],
        ar: [{ title: 'اطرح سؤالاً', body: 'صف سؤالك. يقارن ANYVUE وجهات نظر الذكاء الاصطناعي المتاحة.' }],
        hi: [{ title: 'प्रश्न पूछें', body: 'अपना प्रश्न लिखें। ANYVUE उपलब्ध AI दृष्टिकोणों की तुलना करता है।' }],
        'zh-CN': [{ title: '提出问题', body: '描述你的问题。ANYVUE 比较可用的 AI 观点并说明不确定性。' }],
        ru: [{ title: 'Задайте вопрос', body: 'Опишите свой вопрос. ANYVUE сравнивает доступные взгляды ИИ и отмечает неопределённость.' }],
      },
    });
  }
}
