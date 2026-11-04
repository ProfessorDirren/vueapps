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

test('API never mislabels generated expert responses as live verified or scheduled',()=>{
 const source=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
 assert.match(source,/evidence_status:'not_live_verified',followup_scheduled:false/);
});

test('public router preserves unverified provenance for AI-generated answers',()=>{
 const source=readFileSync(new URL('../api/vue-router.js',import.meta.url),'utf8');
 assert.match(source,/d\.kind==='ai_unverified'\?\{verified:false,evidence_status:'not_live_verified',followup_scheduled:false\}/);
});

test('VUECORE UI labels unverified AI answers in all seven languages',()=>{
 const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
 for(const lang of ['en:','es:','sv:','hi:',"'zh-CN':",'ru:','ar:'])assert.ok(source.includes(lang));
 assert.match(source,/if\(kind==='ai_unverified'\)/);
 assert.match(source,/provenanceLabel\[document\.documentElement\.lang\]/);
});

test('restored saved VUECORE turns retain their AI provenance label',()=>{
 const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
 assert.match(source,/if\(previous\)reply\(previous\.question,previous\.answer,active\.domain,previous\.kind,false\)/);
 assert.match(source,/if\(kind==='ai_unverified'\)/);
 assert.match(source,/article\.append\(provenance\)/);
});

test('new VUECORE navigation starts at page top without auto-scrolling restored reply',()=>{
 const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
 assert.match(source,/input\.focus\(\{preventScroll:true\}\)/);
 assert.match(source,/reply\(previous\.question,previous\.answer,active\.domain,previous\.kind,false\)/);
 assert.match(source,/window\.addEventListener\('pageshow',\(\)=>window\.scrollTo\(\{top:0,left:0,behavior:'instant'\}\)\)/);
});
