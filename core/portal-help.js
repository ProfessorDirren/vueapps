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
    const voiceSetupTopics = {
        "en": { title: "Voice playback on Android", body: "If speech sounds like the wrong language, install a voice for your selected language. On Samsung: Settings → General management → Text-to-speech output → gear icon beside the preferred engine → Install voice data → download your language (for example Swedish (Sweden)). Return to Chrome and try Listen again. You can keep your phone menus in English. The exact menu names vary by device; other Android phones may use Speech Services by Google. Speech playback requires a compatible installed voice." },
        "sv": { title: "Röstuppläsning på Android", body: "Om uppläsningen låter som fel språk behöver du installera en röst för språket. På Samsung: Inställningar (Settings) → Allmän hantering (General management) → Text-till-tal (Text-to-speech output) → kugghjulet vid vald motor → Install voice data → ladda ned t.ex. Swedish (Sweden). Gå tillbaka till Chrome och prova Lyssna igen. Telefonens menyer kan fortsätta vara på engelska. Menynamnen varierar mellan mobiler; andra Android-telefoner kan använda Googles taltjänster." },
        "es": { title: "Lectura en voz alta en Android", body: "Si la voz suena en otro idioma, instala una voz para el idioma seleccionado. En Samsung: Ajustes (Settings) → Administración general (General management) → Salida de texto a voz (Text-to-speech output) → engranaje junto al motor preferido → Install voice data → descarga el idioma deseado. Vuelve a Chrome y pulsa Escuchar otra vez. No necesitas cambiar el idioma de los menús del teléfono. Las opciones varían según el dispositivo; algunos Android usan Speech Services by Google." },
        "fr": { title: "Lecture vocale sur Android", body: "Si la voix prononce mal la langue choisie, installez une voix adaptée. Sur Samsung : Paramètres → Gestion globale → Synthèse vocale → roue dentée du moteur préféré → Installer les données vocales, puis téléchargez la langue souhaitée. Revenez dans Chrome et réessayez Écouter. Vous n'avez pas besoin de changer la langue des menus du téléphone. Les intitulés varient selon l'appareil." },
        "it": { title: "Lettura vocale su Android", body: "Se la voce usa la pronuncia di un'altra lingua, installa una voce per la lingua selezionata. Su Samsung: Impostazioni → Gestione generale → Sintesi vocale → ingranaggio del motore preferito → Installa dati vocali; scarica la lingua desiderata. Torna a Chrome e riprova Ascolta. Non serve cambiare la lingua dei menu del telefono. I nomi delle opzioni possono variare." },
        "hi": { title: "Android पर आवाज़ में उत्तर", body: "यदि आवाज़ गलत भाषा में सुनाई देती है, तो चुनी हुई भाषा की आवाज़ डाउनलोड करें। Samsung में: Settings → General management → Text-to-speech output → पसंदीदा इंजन के पास गियर → Install voice data → अपनी भाषा डाउनलोड करें। फिर Chrome में लौटकर सुनने वाला बटन दबाएँ। फ़ोन के मेनू की भाषा बदलने की ज़रूरत नहीं है। अलग-अलग फ़ोन में मेनू बदल सकते हैं।" },
        "zh-CN": { title: "Android 语音朗读", body: "如果朗读使用了错误语言的口音，请安装所选语言的语音。在三星手机上打开 Settings → General management → Text-to-speech output → 首选引擎旁的齿轮 → Install voice data，然后下载需要的语言。返回 Chrome 再次点击朗读。无需更改手机菜单语言。不同设备的菜单名称可能不同。" },
        "ru": { title: "Озвучивание на Android", body: "Если голос произносит текст с акцентом другого языка, установите голос для выбранного языка. На Samsung: Settings → General management → Text-to-speech output → шестерёнка рядом с выбранным движком → Install voice data → загрузите нужный язык. Вернитесь в Chrome и снова нажмите прослушивание. Язык меню телефона менять не нужно. Названия пунктов могут отличаться." },
        "ar": { title: "قراءة الرد بصوت على Android", body: "إذا كانت القراءة بلكنة لغة أخرى، نزّل صوتًا للغة المختارة. على Samsung: Settings → General management → Text-to-speech output → رمز الترس بجانب المحرك المفضل → Install voice data → نزّل اللغة المطلوبة. ارجع إلى Chrome واضغط زر الاستماع مجددًا. لا تحتاج إلى تغيير لغة قوائم الهاتف. قد تختلف أسماء القوائم حسب الجهاز." },
        "el": { title: "Φωνητική ανάγνωση σε Android", body: "Αν η φωνή προφέρει το κείμενο με λάθος προφορά, εγκαταστήστε φωνή για την επιλεγμένη γλώσσα. Σε Samsung: Settings → General management → Text-to-speech output → γρανάζι δίπλα στην προτιμώμενη μηχανή → Install voice data → κατεβάστε τη γλώσσα. Επιστρέψτε στο Chrome και δοκιμάστε ξανά. Δεν χρειάζεται αλλαγή της γλώσσας των μενού." },
        "tr": { title: "Android'de sesli okuma", body: "Ses yanlış dilin aksanıyla okunuyorsa seçili dil için ses yükleyin. Samsung'da: Settings → General management → Text-to-speech output → tercih edilen motorun yanındaki dişli → Install voice data → istediğiniz dili indirin. Chrome'a dönüp Dinle düğmesini tekrar deneyin. Telefon menülerinin dilini değiştirmeniz gerekmez. Menü adları cihaza göre değişebilir." },
        "fa": { title: "خواندن پاسخ با صدا در Android", body: "اگر صدا متن را با تلفظ زبان دیگری می‌خواند، صدای زبان انتخابی را نصب کنید. در Samsung به Settings → General management → Text-to-speech output → چرخ‌دنده کنار موتور انتخابی → Install voice data بروید و زبان موردنظر را دانلود کنید. سپس به Chrome برگردید و دوباره دکمه شنیدن را بزنید. نیازی به تغییر زبان منوهای گوشی نیست." },
    };
    for (const [lang, topic] of Object.entries(voiceSetupTopics)) {
      this.topics[lang] ??= [];
      this.topics[lang].push(topic);
    }
  }
}
