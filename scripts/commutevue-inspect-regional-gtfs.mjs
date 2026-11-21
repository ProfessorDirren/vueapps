import {readFile} from 'node:fs/promises';
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
const stockholmDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
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
