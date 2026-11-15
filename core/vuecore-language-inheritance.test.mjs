import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, validateLanguage, languageDirection, VueCoreError } from './index.js';
import { AniVueDomain } from './anivue.js';
import { AniVueHelp } from './anivue-help.js';

const expected=['en','sv','es','fr','hi','zh-CN','ru','ar','el','tr','fa'];
test('VUECORE centrally validates all eleven supported languages',()=>{
 assert.deepEqual([...LANGUAGES],expected);
 for(const language of expected)assert.equal(validateLanguage(language),language);
 assert.throws(()=>validateLanguage('xx'),e=>e instanceof VueCoreError&&e.code==='invalid_language');
});
test('ANIVUE inherits VUECORE language policy and help direction',()=>{
 const help=new AniVueHelp();
 for(const language of expected)assert.equal(help.getHelp(language).language,language);
 assert.equal(help.getHelp('fa').direction,'rtl');
 assert.equal(help.getHelp('ar').direction,'rtl');
 assert.equal(help.getHelp('fr').direction,'ltr');
 const domain=new AniVueDomain({fetcher:async()=>{throw Error('No provider calls expected')}});
 assert.equal(domain.id,'anivue');
 assert.equal(domain.emergencyCheck({species:'horse',symptoms:['horseColic'],language:'fa'}).severity,'emergency');
});

test('all specialist text direction is defined once in VUECORE',()=>{
 for(const language of expected)assert.equal(languageDirection(language),['ar','fa'].includes(language)?'rtl':'ltr');
});
