import {usableImage} from './image-input.js';
import {createPhotoEvidencePipeline} from './photo-evidence.js';
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
