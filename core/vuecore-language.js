/** Shared VUECORE input-language detection. Conservative: retain UI locale when uncertain. */
const markers=Object.freeze({
 'pt-BR':["você", "vocês", "português", "brasileiro", "obrigado", "obrigada", "cachorro", "cachorra", "doente", "ajuda", "preciso", "gostaria", "estou", "quanto", "pode", "fazer", "frango", "forno", "receita", "cozinhar", "ônibus", "trem", "trens", "estação", "próximo", "próxima", "metrô", "horário", "funciona", "não", "meu", "minha", "onde", "saída", "chegada", "atraso", "respirar", "freios", "língua", "quero"],
 it:['ciao','come','posso','usare','italiano','italiana','grazie','aiuto','vorrei','bisogno','quando','dove','perché'],
 sv:['hur','länge','ska','från','till','nästa','kycklingen','ugnen','varmluftsugnen','vilken','bussen','försenad','min','hund','svårt','andas','när','går','buss','tåg','tåget','pendeltåg','förseningar','station','avgår','var','är','trafiken'],
 en:['how','long','should','from','next','chicken','oven','when','does','train','where','please','bus','departure','late','station','is','the','today'],
 es:['cuánto','cuándo','desde','hasta','pollo','horno','dónde','necesito','quiero'],
 fr:['combien','quand','depuis','poulet','four','où','pourquoi','avec'],
 tr:['ne','zaman','nereden','nereye','tavuk','fırında','nasıl','kaç'],
 el:['πότε','πόσο','από','προς','κοτόπουλο','φούρνο','πώς'],
 ru:['когда','сколько','откуда','куда','курица','духовке','как'],
 hi:['कब','कितना','कहाँ','मुर्गा','ओवन','कैसे'],
 ar:['متى','كم','أين','الدجاج','الفرن','كيف'],
 fa:['کی','چقدر','کجا','مرغ','فر','چگونه'],
 'zh-CN':['什么时候','多久','鸡肉','烤箱','怎么','哪里']
});
const scripts=[
 ['zh-CN',/[\u3400-\u9fff]/u],['hi',/[\u0900-\u097f]/u],['el',/[\u0370-\u03ff]/u],
 ['ru',/[\u0400-\u052f]/u]
];
export function detectVueInputLanguage(question,fallback='en'){
 const value=String(question??'').trim().toLocaleLowerCase();
 if(value.length<4)return fallback;
 for(const [lang,script] of scripts)if(script.test(value))return lang;
 const words=value.match(/[\p{L}]+/gu)||[];
 if(!words.length)return fallback;
 const scores=Object.entries(markers).map(([lang,terms])=>({
  lang,score:terms.filter(term=>words.includes(term)||(!term.includes(' ')&&term.length>2&&value.includes(term)&&!['sv','en','es','fr','tr','pt-BR'].includes(lang))).length
 })).sort((a,b)=>b.score-a.score);
 // Avoid guessing between closely related languages or short, contextless messages.
 if(scores[0].score<2||scores[0].score===scores[1].score)return fallback;
 return scores[0].lang;
}
