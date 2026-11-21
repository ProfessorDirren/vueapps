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
export function vueCorrectionNotice(corrections,language='en'){
 return corrections.map(({original,corrected})=>{
  if(language==='sv')return 'Jag tolkade ”'+original+'” som ”'+corrected+'” och rättade stavningen.';
  if(language==='es')return 'Interpreté «'+original+'» como «'+corrected+'» y corregí la escritura.';
  if(language==='fr')return 'J’ai interprété « '+original+' » comme « '+corrected+' » et corrigé l’orthographe.';
  return 'I interpreted “'+original+'” as “'+corrected+'” and corrected the spelling.';
 }).join('\\n');
}
