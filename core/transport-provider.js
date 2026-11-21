/**
 * VUECORE transport provider contract. Country and operator are separate from mode:
 * e.g. Sweden/SJ/train, Sweden/SL/bus, Chile/Metro de Santiago/metro.
 * Subclasses implement queryJourney; CORE owns the safe result boundary.
 */
export class TransportProvider {
 constructor({country,operator,modes=[]}={}){
  if(typeof country!=='string'||!country.trim()||typeof operator!=='string'||!operator.trim()||!Array.isArray(modes)||modes.some(x=>typeof x!=='string'||!x.trim()))throw new TypeError('Invalid transport provider identity');
  this.country=country.trim().toUpperCase();this.operator=operator.trim();
  this.modes=Object.freeze([...new Set(modes.map(x=>x.trim().toLowerCase()))]);
 }
 supports(mode){return mode==null||this.modes.includes(String(mode).trim().toLowerCase());}
 async queryJourney(){throw new Error('Provider queryJourney not implemented');}
 async query({provider,from,to,mode}={}){
  if(!this.supports(mode))return {provider,status:'unavailable',departures:[]};
  if(typeof from!=='string'||!from.trim()||typeof to!=='string'||!to.trim())return {provider,status:'needs_stations',departures:[]};
  try{
   const result=await this.queryJourney({provider,from:from.trim(),to:to.trim(),mode});
   if(!result||result.status!=='ok'||!Array.isArray(result.departures))return {provider,status:'unavailable',departures:[]};
   return {...result,provider};
  }catch{return {provider,status:'unavailable',departures:[]};}
 }
}
/** Wrap an existing provider adapter without duplicating its transport logic. */
export class AdapterTransportProvider extends TransportProvider {
 constructor({adapter,...identity}={}){super(identity);if(typeof adapter!=='function')throw new TypeError('Provider adapter required');this.adapter=adapter;}
 async queryJourney({provider,from,to,mode}){return this.adapter({provider,from,to,mode});}
}
