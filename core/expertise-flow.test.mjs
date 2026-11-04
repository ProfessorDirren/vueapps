import test from 'node:test';
import assert from 'node:assert/strict';
import {specialistPath,expertiseMethods} from './specialist-tree.js';
import {selectSpecialistEvidence} from './specialist-memory.js';
const rows=[
 {domain:'musicgearvue',branch:'corevue/musicgearvue/amplifiers/marshall/jmp',url:'https://www.bonhams.com/jmp',quote:'Marshall JMP Folkesson chassis transformer amplifier verification and modification history',checkedAt:'2026-10-01'},
 {domain:'musicgearvue',branch:'corevue/musicgearvue/instruments',url:'https://www.bonhams.com/guitar',quote:'Marshall JMP Folkesson guitar instrument appraisal and modification history',checkedAt:'2026-10-01'},
 {domain:'vinylvue',branch:'corevue/vinylvue/pressings',url:'https://www.bonhams.com/vinyl',quote:'Marshall JMP Folkesson record pressing matrix details',checkedAt:'2026-10-01'}
];
test('question routes to deep expert and retains all inherited methods',()=>{
 const selected=specialistPath('musicgearvue','Identify Marshall JMP Folkesson amplifier');
 assert.equal(selected.path,'corevue/musicgearvue/amplifiers/marshall/jmp/folkesson');
 assert.equal(expertiseMethods(selected).length,6);
 const context=selectSpecialistEvidence(rows,'musicgearvue','Marshall JMP Folkesson',selected.path);
 assert.ok(context.includes('bonhams.com/jmp'));
 assert.ok(!context.includes('bonhams.com/guitar')&&!context.includes('bonhams.com/vinyl'));
});
test('another branch cannot borrow the JMP specialist source',()=>{
 const selected=specialistPath('musicgearvue','guitar',null,'instruments');
 const context=selectSpecialistEvidence(rows,'musicgearvue','Marshall JMP Folkesson',selected.path);
 assert.ok(!context.includes('bonhams.com/jmp'));
});

test('branch vocabulary alone cannot surface an unrelated archived source',()=>{
 const unrelated=[{domain:'musicgearvue',branch:'corevue/musicgearvue/amplifiers/marshall/jmp',url:'https://www.bonhams.com/jmp',quote:'Marshall JMP amplifier historical catalogue listing with no relevant issue details',checkedAt:'2026-10-01'}];
 const context=selectSpecialistEvidence(unrelated,'musicgearvue','Why does the fuse blow repeatedly?', 'corevue/musicgearvue/amplifiers/marshall/jmp');
 assert.equal(context,'');
});

test('an archive URL cannot manufacture relevance when the passage says nothing about the question',()=>{
 const misleading=[{domain:'musicgearvue',branch:'corevue/musicgearvue/amplifiers/marshall/jmp',url:'https://www.bonhams.com/marshall-jmp-fuse',quote:'Historic catalogue page describing a wooden display cabinet without electrical details.',checkedAt:'2026-10-01'}];
 assert.equal(selectSpecialistEvidence(misleading,'musicgearvue','Marshall JMP fuse', 'corevue/musicgearvue/amplifiers/marshall/jmp'),'');
});

test('partial-word matches do not make an unrelated source relevant',()=>{
 const rows=[{domain:'musicgearvue',branch:'corevue/musicgearvue/amplifiers',url:'https://www.bonhams.com/auction/123',quote:'A sample example of a historic decorative display cabinet.',checkedAt:'2026-10-01'}];
 assert.equal(selectSpecialistEvidence(rows,'musicgearvue','amp','corevue/musicgearvue/amplifiers'),'');
});
