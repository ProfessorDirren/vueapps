import test from 'node:test';
import assert from 'node:assert/strict';
import {specialistPath} from './specialist-tree.js';
test('ANIVUE dog respiratory cases select focused SIMULA method',()=>{
 const result=specialistPath('anivue','My dog has difficulty breathing');
 assert.equal(result.path,'corevue/anivue/dog/breathing');
 assert.match(result.focus,/emergency veterinary contact/);
});
test('ANIVUE Spanish cat respiratory cases select focused method',()=>{
 const result=specialistPath('anivue','Mi gato no puede respirar');
 assert.equal(result.path,'corevue/anivue/cat/breathing');
});
test('ANIVUE horse colic cases select equine method',()=>{
 const result=specialistPath('anivue','My horse has colic');
 assert.equal(result.path,'corevue/anivue/horse/colic');
 assert.match(result.focus,/equine veterinarian/);
});
test('ANIVUE unrelated animal cases retain ordinary species specialist',()=>{
 assert.equal(specialistPath('anivue','My dog is scratching').path,'corevue/anivue/dog');
});
