import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretVueInput,vueCorrectionNotice,suggestVueTerms} from './vuecore-interpretation.js';

test('VUECORE correction is available independent of specialist',()=>{
 for(const domain of ['commutvue','anivue','foodvue','motovue','anyvue']){
  const input='Question in '+domain+': C-tentralen';
  const result=interpretVueInput(input);
  assert.equal(result.question,'Question in '+domain+': T-Centralen');
  assert.deepEqual(result.corrections,[{original:'C-tentralen',corrected:'T-Centralen'}]);
 }
});
test('VUECORE leaves unknown and partial names unchanged',()=>{
 for(const input of ['Blåbärscentralen','X-C-tentralenY','Stockholm Centralstation']){
  assert.deepEqual(interpretVueInput(input),{question:input,corrections:[]});
 }
});
test('VUECORE correction notice tells user what was changed',()=>{
 assert.match(vueCorrectionNotice(interpretVueInput('T-tentralen').corrections,'sv'),/T-tentralen.*T-Centralen/);
});


test('VUECORE suggests a unique close match from any verified VUE vocabulary',()=>{
 assert.deepEqual(suggestVueTerms('Jordbrp',['Jordbro','Handen']),[{original:'Jordbrp',suggested:'Jordbro',requiresConfirmation:true}]);
 assert.deepEqual(suggestVueTerms('Marshll',['Marshall','Fender']),[{original:'Marshll',suggested:'Marshall',requiresConfirmation:true}]);
 assert.deepEqual(suggestVueTerms('Gibson',['Gibson','Fender']),[]);
});
test('VUECORE refuses ambiguous or unverified fuzzy corrections',()=>{
 assert.deepEqual(suggestVueTerms('Marsch',['March','Marsh']),[]);
 assert.deepEqual(suggestVueTerms('Jordbrp',[]),[]);
 assert.deepEqual(suggestVueTerms('T-Centralen',['T-Centralen','Stockholm City']),[]);
});
test('multiple corrections are separated by actual newlines',()=>{
 const text=vueCorrectionNotice([{original:'A',corrected:'B'},{original:'C',corrected:'D'}],'sv');
 assert.ok(text.includes('\n'));
 assert.equal(text.includes('\\\\n'),false);
});
