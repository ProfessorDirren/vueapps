/** Offline-only GTFS extraction: never run on the user request path. */
import {stat,readFile,writeFile} from 'node:fs/promises';
import {parseRegionalGTFSZip} from '../core/commutevue-regional-gtfs-zip.js';
const MAX_ARCHIVE=80*1024*1024;
export async function extractOfflineRegionalStops(inputPath,outputPath){
 if(typeof inputPath!=='string'||!inputPath||typeof outputPath!=='string'||!outputPath||inputPath===outputPath)throw new TypeError('Separate input ZIP and output JSON paths required');
 const metadata=await stat(inputPath);
 if(!metadata.isFile()||metadata.size<22||metadata.size>MAX_ARCHIVE)throw new Error('Offline GTFS ZIP exceeds safe archive limit');
 const bytes=await readFile(inputPath);
 const trips=parseRegionalGTFSZip(bytes,{maxArchiveBytes:MAX_ARCHIVE});
 const entries=[...trips.entries()].sort(([a],[b])=>a.localeCompare(b));
 const result={format:'commutevue-regional-trip-stops-v1',tripCount:entries.length,trips:Object.fromEntries(entries)};
 await writeFile(outputPath,JSON.stringify(result));
 return {tripCount:entries.length,outputPath};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 extractOfflineRegionalStops(input,output).then(result=>console.info(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
