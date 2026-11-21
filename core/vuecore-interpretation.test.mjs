import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretVueInput,vueCorrectionNotice} from './vuecore-interpretation.js';

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
