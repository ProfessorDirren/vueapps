/** VUECORE shared, conservative typo interpretation for every VUE. */
const ALIASES=Object.freeze({'t-tentralen':'T-Centralen','c-tentralen':'T-Centralen'});
export function interpretVueInput(input){
 const original=String(input??'');
 const corrections=[];
 // Only whole station-name tokens, never arbitrary substrings or fuzzy guesses.
 const question=original.replace(/(?<![\p{L}\p{N}])(?:t-tentralen|c-tentralen)(?![\p{L}\p{N}])/giu,match=>{
  const corrected=ALIASES[match.toLocaleLowerCase('sv')];
  if(corrected)corrections.push({original:match,corrected});
  return corrected||match;
 });
 return {question,corrections};
}

/** Shared VUECORE suggestion engine: caller supplies verified domain terms.
 * Fuzzy candidates are suggestions, never silent replacements. */
const distanceOne=(a,b)=>{
 const x=[...a.toLocaleLowerCase('sv')],y=[...b.toLocaleLowerCase('sv')];
 if(Math.abs(x.length-y.length)>1)return false;
 let i=0,j=0,edits=0;
 while(i<x.length&&j<y.length){
  if(x[i]===y[j]){i++;j++;continue;}
  if(++edits>1)return false;
  if(x.length>y.length)i++;
  else if(y.length>x.length)j++;
  else{i++;j++;}
 }
 return edits+(x.length-i)+(y.length-j)===1;
};
export function suggestVueTerms(input,verifiedTerms=[]){
 const value=String(input??'').trim();
 if(value.length<5||value.length>80||!Array.isArray(verifiedTerms)||verifiedTerms.length>500)return [];
 const terms=[...new Set(verifiedTerms.filter(term=>typeof term==='string'&&term.length>=5&&term.length<=80))];
 if(terms.some(term=>term.toLocaleLowerCase('sv')===value.toLocaleLowerCase('sv')))return [];
 const matches=terms.filter(term=>distanceOne(value,term));
 // Ambiguous matches must be clarified rather than ranked arbitrarily.
 return matches.length===1?[{original:value,suggested:matches[0],requiresConfirmation:true}]:[];
}
export function vueCorrectionNotice(corrections,language='en'){
 return corrections.map(({original,corrected})=>{
  if(language==='sv')return 'Jag tolkade ”'+original+'” som ”'+corrected+'” och rättade stavningen.';
  if(language==='es')return 'Interpreté «'+original+'» como «'+corrected+'» y corregí la escritura.';
  if(language==='fr')return 'J’ai interprété « '+original+' » comme « '+corrected+' » et corrigé l’orthographe.';
  return 'I interpreted “'+original+'” as “'+corrected+'” and corrected the spelling.';
 }).join('\n');
}
