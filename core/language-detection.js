// VUECORE: conservative, offline language detection. Null means keep the current selection.
const WORDS={
 sv:['jag','min','mitt','mina','är','och','inte','har','hund','sjuk','hjälp','kan','vad','hur','det','som','med','för','tack','behöver','vill','hej','varför','fungerar','klickar'],
 es:['mi','mis','perro','enfermo','enferma','hola','gracias','necesito','ayuda','quiero','cómo','porque','está','estoy','tengo','puedo','qué','una','unos','para','con','por','del','los','las'],
 en:['my','dog','sick','hello','thanks','need','help','please','what','how','why','the','this','that','with','have','does','can','not','and','is','are','broken','works','want']
};
const UNIQUE={sv:['jag','är','och','inte','sjuk','hjälp','behöver','varför','klickar','mitt'],es:['perro','enfermo','enferma','hola','gracias','necesito','ayuda','quiero','cómo','está','estoy','tengo','qué'],en:['hello','thanks','please','the','this','that','does','broken','works']};
export function detectInputLanguage(value){
 if(typeof value!=='string')return null;
 const text=value.trim();if(text.length<8)return null;
 const letters=[...text].filter(c=>/\p{L}/u.test(c));if(letters.length<6)return null;
 // A stray character from another script must never override the user's language.
 const scripts=[['ar',/[\u0600-\u06ff]/u],['hi',/[\u0900-\u097f]/u],['zh-CN',/[\u4e00-\u9fff]/u],['ru',/[\u0400-\u04ff]/u]];
 const counts=scripts.map(([lang,re])=>({lang,count:letters.filter(c=>re.test(c)).length})).sort((a,b)=>b.count-a.count);
 if(counts[0].count>=4&&counts[0].count/letters.length>=0.6&&counts[0].count>counts[1].count)return counts[0].lang;
 if(counts[0].count>0)return null;
 const words=(text.toLocaleLowerCase().match(/[\p{L}]+/gu)||[]);
 if(words.length<3)return null;
 const scores=Object.fromEntries(Object.entries(WORDS).map(([lang,terms])=>[lang,words.reduce((score,w)=>score+(terms.includes(w)?1:0)+(UNIQUE[lang].includes(w)?2:0),0)]));
 const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
 return sorted[0][1]>=3&&sorted[0][1]>=sorted[1][1]+2?sorted[0][0]:null;
}
