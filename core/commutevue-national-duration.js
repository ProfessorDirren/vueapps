import {stockholmWallClockToInstant} from './commutevue-stockholm-clock.js';
/**
 * Duration of a Swedish scheduled journey, independent of the server timezone.
 * Unknown, invalid and ambiguous wall-clock times never produce a duration.
 */
export function nationalJourneyDurationMinutes(departure,arrival){
 const start=stockholmWallClockToInstant(departure);
 const end=stockholmWallClockToInstant(arrival);
 if(!start||!end)return null;
 const minutes=Math.round((Date.parse(end)-Date.parse(start))/60000);
 return Number.isFinite(minutes)&&minutes>0?minutes:null;
}
