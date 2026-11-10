import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoEvidencePipeline} from './photo-evidence.js';
import {createTimetablePhotoPipeline,validateTimetableEvidence} from './commutvue-photo.js';
const image='data:image/png;base64,AAAA';
const evidence={station:'Jordbro',city:'Stockholm',departures:[{line:'43',destination:'Stockholm City',scheduled:'2026-11-10T08:42:00+01:00'}]};
test('Simula photo pipeline can serve unrelated specialist extractors',async()=>{
 const generic=createPhotoEvidencePipeline({extract:async()=>({object:'vinyl'}),validate:x=>x?.object==='vinyl'});
 assert.equal((await generic.analyze({image})).status,'extracted_unverified');
 assert.equal((await generic.analyze({image})).verified,false);
});
test('COMMUTVUE photo extraction never claims verified live departures',async()=>{
 const pipeline=createTimetablePhotoPipeline({extract:async()=>evidence,validateImage:()=>true});
 const result=await pipeline.analyze({image,language:'sv'});
 assert.equal(result.status,'extracted_unverified');
 assert.equal(result.verified,false);
 assert.equal(result.evidence.departures[0].destination,'Stockholm City');
});
test('ambiguous station, invalid time and missing destination fail closed',async()=>{
 assert.equal(validateTimetableEvidence({...evidence,station:''}),false);
 assert.equal(validateTimetableEvidence({...evidence,departures:[{line:'43',destination:'',scheduled:'2026-11-10T08:42:00Z'}]}),false);
 assert.equal(validateTimetableEvidence({...evidence,departures:[{line:'43',destination:'Stockholm City',scheduled:'08:42'}]}),false);
 const result=await createTimetablePhotoPipeline({extract:async()=>({station:'Jordbro',departures:[]}),validateImage:()=>true}).analyze({image});
 assert.equal(result.status,'needs_clarification');
 assert.equal(result.verified,false);
});

test('production photo pipeline rejects malformed image before extraction',async()=>{
 let called=false;
 const pipeline=createTimetablePhotoPipeline({extract:async()=>{called=true;return evidence}});
 const result=await pipeline.analyze({image});
 assert.equal(result.status,'invalid_image');
 assert.equal(called,false);
});

test('shared CORE image gate exception cannot trigger specialist extraction',async()=>{
 let called=false;
 const pipeline=createTimetablePhotoPipeline({validateImage:()=>{throw Error('corrupt image')},extract:async()=>{called=true;return evidence}});
 const result=await pipeline.analyze({image});
 assert.equal(result.status,'unavailable');
 assert.equal(result.verified,false);
 assert.equal(called,false);
});

test('timetable evidence rejects timezone ambiguity and impossible dates',()=>{
 const depart=scheduled=>({...evidence,departures:[{line:'43',destination:'Stockholm City',scheduled}]});
 assert.equal(validateTimetableEvidence(depart('2026-11-10T08:42:00')),false);
 assert.equal(validateTimetableEvidence(depart('2026-11-10T08:42:00+01:00')),true);
 assert.equal(validateTimetableEvidence(depart('tomorrow')),false);
 assert.equal(validateTimetableEvidence(depart('2026-02-30T08:42:00+01:00')),false);
 assert.equal(validateTimetableEvidence(depart('2026-11-10T25:42:00+01:00')),false);
 assert.equal(validateTimetableEvidence(depart('2026-11-10T08:61:00+01:00')),false);
 assert.equal(validateTimetableEvidence(depart('2024-02-29T08:42:00+01:00')),true);
});
