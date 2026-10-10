/** E-number syntax identifies label tokens, never authorization or safety. */
export function eNumbers(text){const seen=new Set();for(const match of String(text||'').matchAll(/\bE\s*[-–]?\s*(\d{3,4})([a-z])?(?:\s*\((i|ii|iii|iv|v|vi)\))?(?![a-z\d])/gi)){const code='E'+match[1]+(match[2]||'').toLowerCase()+(match[3]?'('+match[3].toLowerCase()+')':'');seen.add(code)}return [...seen]}
export function canonicalCode(value){return eNumbers(String(value)).length===1&&String(value).replace(/\s/g,'').toLowerCase()===eNumbers(value)[0].toLowerCase()?eNumbers(value)[0]:null}
