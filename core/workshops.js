export function workshopQuery(vehicle,location,help='workshop'){
 if(!['car','motorcycle'].includes(vehicle)||typeof location!=='string'||!location.trim()||location.length>120||!['workshop','roadside'].includes(help))throw new Error('Choose a vehicle and enter a town or postcode.');
 const service=help==='roadside'?vehicle==='motorcycle'?'motorcycle roadside assistance towing':'car roadside assistance towing':vehicle==='motorcycle'?'motorcycle repair workshop':'car repair workshop';
 return service+' '+location.trim();
}
