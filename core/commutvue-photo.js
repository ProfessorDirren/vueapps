import {createPhotoEvidencePipeline} from './photo-evidence.js';
/**
 * COMMUTVUE only defines the transit-specific evidence contract.
 * Reading timetable text from a photograph does not establish live status.
 */
export function validateTimetableEvidence(e){
 if(!e||typeof e!=='object'||!Array.isArray(e.departures)||e.departures.length===0||e.departures.length>30)return false;
 if(typeof e.station!=='string'||!e.station.trim()||typeof e.city!=='string'||!e.city.trim())return false;
 return e.departures.every(d=>d&&typeof d.line==='string'&&d.line.trim()&&typeof d.destination==='string'&&d.destination.trim()&&typeof d.scheduled==='string'&&Number.isFinite(Date.parse(d.scheduled))&&d.scheduled.includes('T')&&/(?:Z|[+-]\d\d:\d\d)$/.test(d.scheduled));
}
export function createTimetablePhotoPipeline({extract}){
 return createPhotoEvidencePipeline({extract,validate:validateTimetableEvidence});
}
