import test from 'node:test';
import assert from 'node:assert/strict';
import {subSpecialist} from './sub-specialists.js';
import {specialistPath} from './specialist-tree.js';

test('horse routing recognizes inflections and multilingual owner descriptions',()=>{
 for(const q of ['hästen har kolik','hästar med kolik','my horse has colic','two horses have colic','the mare has colic','caballo con cólico','yegua con cólico','лошадь колик','حصان مغص']){
  assert.equal(subSpecialist('anivue',q),'horse',q);
 }
});
test('horse colic reaches deep expert while preserving inherited safety methods',()=>{
 const selection=specialistPath('anivue','hästen har kolik');
 assert.equal(selection.path,'corevue/anivue/horse/colic');
 assert.deepEqual(selection.lineage.map(n=>n.path),['corevue','corevue/anivue','corevue/anivue/horse','corevue/anivue/horse/colic']);
 assert.match(selection.focus,/urgent contact with an equine veterinarian/i);
});
test('unrelated words do not trigger horse routing',()=>{
 assert.equal(subSpecialist('anivue','a seahorse illustration'),null);
});
