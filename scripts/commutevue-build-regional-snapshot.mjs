/**
 * Offline-only builder. Usage:
 *   COMMUTEVUE_SNAPSHOT_SIGNING_KEY=... node scripts/commutevue-build-regional-snapshot.mjs input.zip output.json
 * Downloads and production API calls are intentionally out of scope.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {parseRegionalGTFSZip,parseRegionalGTFSStopsZip,parseRegionalGTFSServiceMetadataZip,inspectRegionalGTFSZip} from '../core/commutevue-regional-gtfs-zip.js';
import {parseRegionalServiceMetadata} from '../core/commutevue-regional-static-gtfs.js';
import {buildRegionalServiceSnapshot,resolveRegionalStationStopIds} from '../core/commutevue-regional-snapshot.js';
import {encodeRegionalSnapshot} from '../core/commutevue-regional-snapshot-codec.js';
import {signRegionalSnapshot} from '../core/commutevue-regional-snapshot-auth.js';
import {regionalCorridorProvisioning} from '../core/commutevue-regional-provisioning.js';

export function stockholmServiceDate(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 return parts.year+parts.month+parts.day;
}
export function selectDirectRegionalTrips(tripStops,originStopIds,destinationStopIds){
 if(!(tripStops instanceof Map)||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!originStopIds.size||!destinationStopIds.size)throw new Error('Missing route stops');
 const ids=new Set();
 for(const [tripId,sequence] of tripStops){
  let originSeen=false;
  for(const entry of sequence){
   const stop=typeof entry==='string'?entry:entry?.stop;
   if(originSeen&&destinationStopIds.has(stop)){ids.add(tripId);break;}
   if(originStopIds.has(stop))originSeen=true;
  }
 }
 return ids;
}
export function buildSignedRegionalCorridorSnapshot({archive,serviceDate=stockholmServiceDate(),validatedAtMs=Date.now(),signingKey,originName='Jordbro',destinationName='Stockholm City'}={}){
 inspectRegionalGTFSZip(archive);
 const stops=parseRegionalGTFSStopsZip(archive);
 // Keep scheduled stop times alongside stop order so runtime can show a real timetable.
 const tripStops=parseRegionalGTFSZip(archive,{includeTimes:true});
 const metadata=parseRegionalServiceMetadata(parseRegionalGTFSServiceMetadataZip(archive));
 const snapshot=buildRegionalServiceSnapshot({tripStops,serviceMetadata:metadata,serviceDate,validatedAtMs,archiveVerified:true});
 if(snapshot.status!=='validated')throw new Error('No validated regional service snapshot');
 const originStopIds=resolveRegionalStationStopIds(stops,originName);
 const destinationStopIds=resolveRegionalStationStopIds(stops,destinationName);
 const allowedTripIds=selectDirectRegionalTrips(snapshot.tripStops,originStopIds,destinationStopIds);
 // Resolve each selected trip's actual final stop from the same GTFS archive.
 // GTFS trip_headsign may be absent. Never assume the destination from line number.
 const terminalStopIds=[...allowedTripIds].map(id=>{
  const sequence=snapshot.tripStops.get(id);
  const last=sequence?.at(-1);
  return typeof last==='string'?last:last?.stop;
 }).filter(Boolean);
 const terminalStops=parseRegionalGTFSStopsZip(archive,{matchTerms:[],matchStopIds:[...new Set(terminalStopIds)]});
 const terminalNames=new Map(terminalStops.map(s=>[s.stopId,s.stopName]));
 for(const id of allowedTripIds){
  const sequence=snapshot.tripStops.get(id),last=sequence?.at(-1);
  const terminalId=typeof last==='string'?last:last?.stop;
  const terminalName=terminalNames.get(terminalId)||null;
  const meta=snapshot.tripMetadata.get(id)||{};
  if(!meta.tripHeadsign&&terminalName)snapshot.tripMetadata.set(id,{...meta,tripHeadsign:terminalName});
 }
 const payload=encodeRegionalSnapshot(snapshot,{allowedTripIds});
 if(!allowedTripIds.size)throw new Error('No direct active corridor trips');
 const envelope=signRegionalSnapshot(payload,{key:signingKey});
 return {envelope,selectedTripCount:allowedTripIds.size,serviceDate,originStopIds,destinationStopIds};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [, ,input,output,manifestPath]=process.argv;
 if(!input||!output)throw new Error('Input archive and output file paths required');
 const archive=await readFile(input);
 const result=buildSignedRegionalCorridorSnapshot({archive,signingKey:process.env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY});
 const provisioning=regionalCorridorProvisioning(result);
 if(manifestPath){
  if(manifestPath===output)throw new Error('Manifest path must differ from envelope path');
  await writeFile(manifestPath,JSON.stringify(provisioning,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 await writeFile(output,result.envelope,{flag:'wx',mode:0o600});
 console.info(JSON.stringify({status:'signed_offline_artifact',serviceDate:result.serviceDate,selectedTripCount:result.selectedTripCount}));
}
