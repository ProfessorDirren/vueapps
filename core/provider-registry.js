/**
 * VUECORE's shared transport-provider orchestration contract.
 * Specialists register region adapters; CORE owns validation and execution.
 * No network, credentials or provider-specific rules belong in this layer.
 */
export function createProviderRegistry({providers,normalize}){
 if(!providers||typeof providers!=='object'||typeof normalize!=='function')throw new TypeError('Invalid registry configuration');
 const adapters=new Map();
 const supported=Object.freeze(Object.keys(providers));
 function register(region,adapter){
  if(!Object.hasOwn(providers,region))throw new TypeError('Unsupported provider region');
  if(typeof adapter!=='function'&&!(adapter&&typeof adapter.query==='function'))throw new TypeError('Provider adapter must be a function or provider instance');
  adapters.set(region,adapter);
 }
 async function query({region,from,to}){
  if(!Object.hasOwn(providers,region))throw new TypeError('Unsupported provider region');
  if(typeof from!=='string'||!from.trim()||typeof to!=='string'||!to.trim())return {status:'needs_stations',provider:region,departures:[]};
  const adapter=adapters.get(region);
  if(!adapter)return {status:'unavailable',provider:region,departures:[]};
  try{
   const input={provider:region,from:from.trim(),to:to.trim()};
   const raw=await (typeof adapter==='function'?adapter(input):adapter.query(input));
   if(!raw||raw.provider!==region||raw.status!=='ok')return {status:'unavailable',provider:region,departures:[]};
   return normalize(raw);
  }catch{return {status:'unavailable',provider:region,departures:[]};}
 }
 return Object.freeze({supported,register,query});
}
