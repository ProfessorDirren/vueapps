import test from 'node:test';
import assert from 'node:assert/strict';
import {specialistPath,expertiseMethods} from './specialist-tree.js';
import {readFileSync} from 'node:fs';
test('deep Marshall branch inherits all ancestor expertise methods',()=>{
 const selection=specialistPath('musicgearvue','Marshall JMP Folkesson','corevue/musicgearvue/amplifiers/marshall/jmp/folkesson');
 const methods=expertiseMethods(selection);
 assert.equal(methods.at(-1).path,'corevue/musicgearvue/amplifiers/marshall/jmp/folkesson');
 assert.equal(methods.length,6);
 assert.match(methods.at(-1).method,/Folkesson/);
 assert.match(methods.at(-2).method,/JMP/);
});
test('server uses inherited expertise in specialist prompt',()=>{
 const source=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
 assert.match(source,/expertiseMethods\(selected\)/);
 assert.match(source,/Inherited expertise methods/);
 assert.match(source,/never overrides parent safety/);
});

test('follow-up specialist policy explicitly handles conflicting and missing evidence',()=>{
 const source=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
 assert.match(source,/If sources disagree, state the disagreement/);
 assert.match(source,/An archived passage is not live verification/);
 assert.match(source,/Never invent citations, measurements/);
});
