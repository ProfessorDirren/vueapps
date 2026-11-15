import {COMMUT_MESSAGES,commuteLocale} from './commutvue.js';

// Display the actual verified departure time, never mistake delay for time-to-departure.
export function formatVerifiedDepartures(departures,language='en'){
 const locale=commuteLocale(language);
 const labels=COMMUT_MESSAGES[locale];
 return departures.map(d=>{
  const timestamp=d.expected||d.scheduled;
  const millis=Date.parse(timestamp||'');
  if(!Number.isFinite(millis))throw new TypeError('Verified departure timestamp required');
  const time=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(millis);
  const delay=d.delayMinutes>0?' · '+labels[7]+': '+d.delayMinutes+' min':'';
  return time+' · '+d.line+' · '+d.destination+delay;
 }).join('\n');
}
