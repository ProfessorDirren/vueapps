/**
 * Convert a ResRobot wall-clock timestamp to a unique Sweden-local instant.
 * Ambiguous fall-back hours and nonexistent spring-forward hours fail closed.
 * This is an isolated boundary; no production provider wiring occurs here.
 */
const WALL=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const wallAt=instant=>{
 const parts=Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join('-')+'T'+[parts.hour,parts.minute,parts.second].join(':');
};
export function stockholmWallClockToInstant(value){
 const match=typeof value==='string'?WALL.exec(value):null;
 if(!match)return null;
 const [,year,month,day,hour,minute,second='00']=match;
 const canonical=year+'-'+month+'-'+day+'T'+hour+':'+minute+':'+second;
 const utc=Date.UTC(Number(year),Number(month)-1,Number(day),Number(hour),Number(minute),Number(second));
 if(!Number.isFinite(utc))return null;
 const candidates=[utc-3600000,utc-7200000].filter(x=>wallAt(x)===canonical);
 return candidates.length===1?new Date(candidates[0]).toISOString():null;
}
