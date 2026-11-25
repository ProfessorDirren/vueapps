// GTFS times are elapsed seconds from local noon minus twelve hours.
const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function regionalScheduledTimeMs(serviceDate,time){
 if(typeof serviceDate!=='string'||!/^\d{8}$/.test(serviceDate)||typeof time!=='string'||!/^\d{2,3}:[0-5]\d:[0-5]\d$/.test(time))return null;
 const y=Number(serviceDate.slice(0,4)),m=Number(serviceDate.slice(4,6)),d=Number(serviceDate.slice(6,8));
 const noon=Date.UTC(y,m-1,d,12);
 const date=new Date(noon);
 if(y<2000||y>2100||date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
 const parts=Object.fromEntries(clock.formatToParts(date).map(p=>[p.type,p.value]));
 const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
 const localNoon=noon-(local-noon);
 const [h,min,s]=time.split(':').map(Number);
 return localNoon-43200000+(h*3600+min*60+s)*1000;
}
