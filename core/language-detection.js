// VUECORE: conservative, offline language detection. Null means keep the current selection.
const WORDS={
 fr:['bonjour','merci','besoin','chien','malade','comment','pourquoi','avec','est','mon','une','vous','aide'],
 tr:['merhaba','teşekkürler','köpek','hasta','yardım','nasıl','neden','benim','için','lütfen'],
 el:['γειά','γεια','ευχαριστώ','σκύλος','άρρωστος','βοήθεια','πώς','γιατί','είναι','μου'],
 sv:['jag','min','mitt','mina','är','och','inte','har','hund','sjuk','hjälp','kan','vad','hur','det','som','med','för','tack','behöver','vill','hej','varför','fungerar','klickar','när','går','nästa','pendeltåg','från','till','finns','några','trafikstörningar','avgång','station'],
 es:['mi','mis','perro','enfermo','enferma','hola','gracias','necesito','ayuda','quiero','cómo','porque','está','estoy','tengo','puedo','qué','una','unos','para','con','por','del','los','las'],
 en:['my','dog','sick','hello','thanks','need','help','please','what','how','why','the','this','that','with','have','does','can','not','and','is','are','broken','works','want']
};
const UNIQUE={fr:['bonjour','merci','chien','malade','pourquoi'],tr:['merhaba','teşekkürler','köpek','hasta','yardım','nasıl'],el:['γειά','γεια','ευχαριστώ','σκύλος','άρρωστος','βοήθεια'],sv:['jag','är','och','inte','sjuk','hjälp','behöver','varför','klickar','mitt','när','pendeltåg','trafikstörningar','avgång'],es:['perro','enfermo','enferma','hola','gracias','necesito','ayuda','quiero','cómo','está','estoy','tengo','qué'],en:['hello','thanks','please','the','this','that','does','broken','works','dog','sick','need']};
export function detectInputLanguage(value){
 if(typeof value!=='string')return null;
 const text=value.trim();if(text.length<8)return null;
 const letters=[...text].filter(c=>/\p{L}/u.test(c));if(letters.length<6)return null;
 // A stray character from another script must never override the user's language.
 const persianMarkers=(text.match(/[پچژگکۍیۀ]/gu)||[]).length;
 const arabicLetters=letters.filter(c=>/[\u0600-\u06ff]/u.test(c)).length;
 if(persianMarkers>=2&&arabicLetters>=4&&arabicLetters/letters.length>=0.6)return 'fa';
 const scripts=[['el',/[\u0370-\u03ff\u1f00-\u1fff]/u],['ar',/[\u0600-\u06ff]/u],['hi',/[\u0900-\u097f]/u],['zh-CN',/[\u4e00-\u9fff]/u],['ru',/[\u0400-\u04ff]/u]];
 const counts=scripts.map(([lang,re])=>({lang,count:letters.filter(c=>re.test(c)).length})).sort((a,b)=>b.count-a.count);
 if(counts[0].count>=4&&counts[0].count/letters.length>=0.6&&counts[0].count>counts[1].count)return counts[0].lang;
 if(counts[0].count>0)return null;
 const words=(text.toLocaleLowerCase().match(/[\p{L}]+/gu)||[]);
 if(words.length<3)return null;
 const scores=Object.fromEntries(Object.entries(WORDS).map(([lang,terms])=>[lang,words.reduce((score,w)=>score+(terms.includes(w)?1:0)+(UNIQUE[lang].includes(w)?2:0),0)]));
 // A genuinely multilingual question must not hijack the user's current UI language.
 // Require independent language-specific evidence before treating shared words as multilingual.
 // Common words such as 'mi', 'can' or 'is' alone must not freeze a clear language switch.
 const uniqueScores=Object.fromEntries(Object.entries(UNIQUE).map(([lang,terms])=>[lang,words.reduce((score,w)=>score+(terms.includes(w)?1:0),0)]));
 const supported=Object.entries(scores).filter(([lang,score])=>score>=3&&uniqueScores[lang]>=1);
 if(supported.length>1)return null;
 const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
 return sorted[0][1]>=3&&sorted[0][1]>=sorted[1][1]+2?sorted[0][0]:null;
}
