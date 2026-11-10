import {usableImage} from './image-input.js';
import {createPhotoEvidencePipeline} from './photo-evidence.js';
import {createVisionExtractor} from './vision-extractor.js';
/**
 * COMMUTVUE only defines the transit-specific evidence contract.
 * Reading timetable text from a photograph does not establish live status.
 */
const isoWithOffset=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;
function validAbsoluteTime(value){
 if(typeof value!=='string'||!isoWithOffset.test(value))return false;
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
 if(!match)return false;
 const [,y,m,d,h,min,sec='00']=match.map(String);
 const year=Number(y),month=Number(m),day=Number(d);
 const days=new Date(Date.UTC(year,month,0)).getUTCDate();
 return year>=2000&&year<=2100&&month>=1&&month<=12&&day>=1&&day<=days&&Number(h)<=23&&Number(min)<=59&&Number(sec)<=59&&Number.isFinite(Date.parse(value));
}
export function validateTimetableEvidence(e){
 if(!e||typeof e!=='object'||!Array.isArray(e.departures)||e.departures.length===0||e.departures.length>30)return false;
 if(typeof e.station!=='string'||!e.station.trim()||typeof e.city!=='string'||!e.city.trim())return false;
 return e.departures.every(d=>d&&typeof d.line==='string'&&d.line.trim()&&typeof d.destination==='string'&&d.destination.trim()&&typeof d.scheduled==='string'&&validAbsoluteTime(d.scheduled));
}
export function createTimetablePhotoPipeline({extract,validateImage=usableImage}){
 return createPhotoEvidencePipeline({extract,validate:validateTimetableEvidence,validateImage});
}

/** Domain-only extraction schema. The CORE transport owns the model call. */
export const TIMETABLE_SCHEMA=Object.freeze({
 type:'object',properties:{
  station:{type:['string','null']},city:{type:['string','null']},
  departures:{type:'array',items:{type:'object',properties:{
   line:{type:'string'},destination:{type:'string'},scheduled:{type:['string','null']}
  },required:['line','destination','scheduled'],additionalProperties:false}}
 },required:['station','city','departures'],additionalProperties:false
});
/**
 * A timetable photo rarely contains a full date and UTC offset. Never infer
 * those from the device clock or a city name: ask for clarification instead.
 * A real-time provider must independently verify any later departure.
 */
export function createModelTimetablePipeline({run,allow,validateImage=usableImage}){
 const extract=createVisionExtractor({
  run:args=>run({...args,schema:TIMETABLE_SCHEMA,instructions:'Transcribe ONLY visible public transport timetable text. If the photo does not show an explicit calendar date and timezone offset, use null for scheduled. Do not infer any city, station, date, timezone, destination or live delay. Do not return passenger identifiers.',name:'commutvue_timetable'}),
  allow,parse:x=>x
 });
 return createTimetablePhotoPipeline({extract,validateImage});
}
