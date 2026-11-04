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

test('specialist follow-up forbids fabricated live verification and contradictory question limits',()=>{
 const source=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
 assert.match(source,/Do not claim to have checked a live website/);
 assert.match(source,/do not substitute a plausible-looking URL, number or quotation/);
 assert.match(source,/Ask at most one precise missing-information question/);
 assert.doesNotMatch(source,/Use at most three precise missing-information questions/);
});

test('specialists propose verifiable next actions without claiming background follow-up',()=>{
 const source=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
 assert.match(source,/identify the most useful next verification step/);
 assert.match(source,/do not promise to research later, monitor, contact anyone, or return with findings/);
});
