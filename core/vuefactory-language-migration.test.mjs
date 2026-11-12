import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {LANGUAGES} from './index.js';
import {FACTORY_LANGUAGES,FACTORY_SUPPORTED_LANGUAGES,validateVueDefinition,scaffoldVue} from './vuefactory.js';
const labels=Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,'Test '+lang]));
const base={id:'testvue',scope:'A bounded example domain',method:'This example has a deliberately long reviewable method that explains specialist behavior without unsafe operations or deployment.',labels};
test('factory inherits available locales from VUECORE but preserves legacy minimum',()=>{
 assert.equal(FACTORY_LANGUAGES.length,7);
 assert.equal(FACTORY_SUPPORTED_LANGUAGES,LANGUAGES);
 assert.equal(validateVueDefinition(base).labels.en,'Test en');
});
test('optional VUECORE locale labels are retained and invalid locales rejected',()=>{
 const extended={...base,labels:{...labels,fr:'Essai',fa:'آزمایش'}};
 assert.equal(validateVueDefinition(extended).labels.fr,'Essai');
 assert.equal(validateVueDefinition(extended).labels.fa,'آزمایش');
 assert.throws(()=>validateVueDefinition({...base,labels:{...labels,xx:'Unknown'}}),/Unsupported language/);
});

test('generated factory manifest and contract carry all supplied VUECORE locales',()=>{
 const extended={...base,labels:{...labels,fr:'Essai',fa:'آزمایش'}};
 const result=scaffoldVue(extended);
 const manifest=JSON.parse(result.files['generated/testvue/integration-plan.json']);
 assert.ok(manifest.languages.includes('fr'));
 assert.ok(manifest.languages.includes('fa'));
 assert.equal(manifest.labels.fr,'Essai');
 assert.match(result.files['generated/testvue/contract.test.mjs'],/fr/);
 assert.match(result.files['generated/testvue/contract.test.mjs'],/fa/);
 assert.equal(manifest.deploy.automatic,false);
});

test('factory preview delegates locale availability to VUECORE and translated activation',()=>{
 const source=readFileSync(new URL('./vuefactory.js',import.meta.url),'utf8');
 assert.match(source,/FACTORY_SUPPORTED_LANGUAGES\.includes\(body\.language\)/);
 assert.match(source,/Object\.hasOwn\(definition\.labels,language\)&&Object\.hasOwn\(activation\.questions,language\)/);
 assert.doesNotMatch(source,/add-seven-localized-question-arrays/);
});
