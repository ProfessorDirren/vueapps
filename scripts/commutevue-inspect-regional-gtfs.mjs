import {readFile} from 'node:fs/promises';
import {createSLRegionalRealtimeSource} from '../core/commutevue-sl-regional-realtime.js';
import {extractGTFSRealtimeTripEvidence} from '../core/commutevue-gtfsrt-trip-evidence.js';
import {verifyRegionalJourney} from '../core/commutevue-regional-journey-proof.js';
import {findRegionalDirectJourneys,filterRegionalActiveTrips,parseRegionalServiceMetadata} from '../core/commutevue-regional-static-gtfs.js';
import {inspectRegionalGTFSZip,parseRegionalGTFSZip,parseRegionalGTFSStopsZip,parseRegionalGTFSServiceMetadataZip} from '../core/commutevue-regional-gtfs-zip.js';
const path=process.argv[2];
if(!path)throw new Error('GTFS archive path required');
const archive=await readFile(path);
const metadata=inspectRegionalGTFSZip(archive);
const trips=parseRegionalGTFSZip(archive,{includeTimes:true});
const matchingStops=parseRegionalGTFSStopsZip(archive);
const rawDirectJourneys=findRegionalDirectJourneys(trips,matchingStops);
// GitHub Actions runners use UTC; SL service dates must follow Sweden's local date.
const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
const stockholmDate=dateParts.year+dateParts.month+dateParts.day;
const serviceDate=process.env.GTFS_SERVICE_DATE||stockholmDate;
const serviceMetadata=parseRegionalServiceMetadata(parseRegionalGTFSServiceMetadataZip(archive));
const routeTypeCounts={};
for(const [tripId] of trips){const trip=serviceMetadata.tripById.get(tripId);const type=trip?serviceMetadata.routeTypes.get(trip.routeId):undefined;const key=type===undefined?'unknown':String(type);routeTypeCounts[key]=(routeTypeCounts[key]||0)+1;}
const sampleDirectRouteTypes={};
for(const example of rawDirectJourneys.examples){const trip=serviceMetadata.tripById.get(example.tripId);const type=trip?serviceMetadata.routeTypes.get(trip.routeId):undefined;const key=type===undefined?'unknown':String(type);sampleDirectRouteTypes[key]=(sampleDirectRouteTypes[key]||0)+1;}
const activeServices=filterRegionalActiveTrips(trips,serviceMetadata,serviceDate);
const directJourneys=findRegionalDirectJourneys(activeServices.trips,matchingStops);
const stopIds=new Set();
for(const sequence of trips.values())for(const item of sequence)stopIds.add(typeof item==='string'?item:item.stop);
console.info(JSON.stringify({archiveBytes:metadata.archiveBytes,stopTimesUncompressedBytes:metadata.uncompressedBytes,tripCount:trips.size,uniqueStopIdCount:stopIds.size,matchingStops,rawDirectJourneys,routeTypeCounts,sampleDirectRouteTypes,serviceFilter:{serviceDate,activeTripCount:activeServices.activeTripCount,activeByType:activeServices.activeByType,inactiveTripCount:activeServices.inactiveTripCount,unknownRouteTypeTripCount:activeServices.unknownRouteTypeTripCount,missingMetadataTripCount:activeServices.missingMetadataTripCount},directJourneys}));


// Optional private diagnostic: the realtime key is a separate Trafiklab product.
// Print only bounded aggregate counts, never keys or raw trip IDs.
if(process.env.TRAFIKLAB_REGIONAL_REALTIME_KEY){
 try{
  const feed=await createSLRegionalRealtimeSource({apiKey:process.env.TRAFIKLAB_REGIONAL_REALTIME_KEY}).tripUpdates();
  const evidence=extractGTFSRealtimeTripEvidence(feed.bytes);
  const activeTripIds=new Set(activeServices.trips.keys());
  const allTripIds=new Set(trips.keys());
  const matchingIds=evidence.trips.filter(t=>allTripIds.has(t.tripId));
  const activeMatchingIds=evidence.trips.filter(t=>activeTripIds.has(t.tripId));
  const origins=new Set(matchingStops.filter(s=>s.stopName?.toLowerCase()==='jordbro').flatMap(s=>[s.stopId]));
  const destinations=new Set(matchingStops.filter(s=>s.stopName?.toLowerCase()==='stockholm city').flatMap(s=>[s.stopId]));
  for(const stop of matchingStops){
   if(origins.has(stop.parentStation))origins.add(stop.stopId);
   if(destinations.has(stop.parentStation))destinations.add(stop.stopId);
  }
  const proof=verifyRegionalJourney({evidence,tripStops:activeServices.trips,originStopIds:origins,destinationStopIds:destinations});
  console.info('commutevue_private_live_join',JSON.stringify({status:'diagnostic_only',feedAgeSeconds:evidence.feedTimestampMs===null?null:Math.round((Date.now()-evidence.feedTimestampMs)/1000),realtimeTripCount:evidence.trips.length,staticTripCount:trips.size,activeStaticTripCount:activeServices.trips.size,matchingStaticTripIdCount:matchingIds.length,matchingActiveTripIdCount:activeMatchingIds.length,verifiedDirectJourneyCount:proof.departures.length,journeyStatus:proof.status}));
 }catch(error){
  console.info('commutevue_private_live_join',JSON.stringify({status:'unavailable',reason:typeof error?.reason==='string'?error.reason:'diagnostic_error'}));
 }
}else{
 console.info('commutevue_private_live_join',JSON.stringify({status:'skipped',reason:'missing_realtime_secret'}));
}
