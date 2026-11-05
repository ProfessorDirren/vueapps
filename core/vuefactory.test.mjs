import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTORY_LANGUAGES,validateVueDefinition,scaffoldVue} from './vuefactory.js';
const definition={
 id:'bookvue',
 scope:'Book identification, edition comparison and collection research',
 method:'Identify author, title, publisher, ISBN, edition, printing, condition and provenance. Distinguish observed details from assumptions, use verifiable catalogues, and never assert authenticity or market value without corroboration.',
 labels:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,'Books'])),
 sources:[['Library of Congress','https://www.loc.gov/']]
};
test('factory generates a deterministic reviewable profile and checklist',()=>{
 const a=scaffoldVue(definition),b=scaffoldVue(definition);
 assert.deepEqual(a,b);
 assert.match(a.files['generated/bookvue/profile.js'],/Book identification/);
 assert.match(a.files['generated/bookvue/RELEASE-CHECKLIST.md'],/manual review required/);
 assert.equal(Object.keys(a.files).length,2);
});
test('factory requires seven languages and substantive methods',()=>{
 assert.throws(()=>validateVueDefinition({...definition,labels:{en:'Books'}}),/Missing\/invalid label/);
 assert.throws(()=>validateVueDefinition({...definition,method:'Short'}),/Method/);
 assert.throws(()=>validateVueDefinition({...definition,id:'../bookvue'}),/id/);
});
test('factory rejects credentialed or insecure sources',()=>{
 assert.throws(()=>validateVueDefinition({...definition,sources:[['bad','http://example.org']]}),/HTTPS/);
 assert.throws(()=>validateVueDefinition({...definition,sources:[['bad','https://user:pass@example.org']]}),/HTTPS/);
});
test('factory never writes, registers, deploys or calls an AI service',()=>{
 const a=scaffoldVue(definition);
 assert.ok(Object.keys(a.files).every(p=>p.startsWith('generated/')));
 assert.ok(!Object.keys(a.files).some(p=>p.includes('api/')));
});
