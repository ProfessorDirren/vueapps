import test from 'node:test';
import assert from 'node:assert/strict';
import {addSlBusCancellations} from './commutevue-sl-cancellations.js';

test('verified Blockhusudden timetable rows get only unambiguous SL cancellation evidence',async()=>{
 const departure={line:'67',destination:'Frösundavik via Odenplan',scheduled:'2026-11-27T16:40:00.000Z',cancelled:false};
 const row={line:{designation:'67',transport_mode:'BUS'},destination:'Frösundavik',direction:'Odenplan',scheduled:'2026-11-27T17:40:00',stop_area:{id:11054},state:'CANCELLED'};
 const check=rows=>addSlBusCancellations([departure],{from:'Blockhusudden',mode:'BUS',fetcher:async()=>({ok:true,json:async()=>({departures:rows})})});
 assert.deepEqual(await check([row]),[{...departure,cancelled:true,expected:null,cancellationSource:'SL Transport'}]);
 for(const rows of [[{...row,direction:'Annat håll'}],[{...row,scheduled:'2026-11-27T18:00:00'}],[row,{...row,state:'EXPECTED'}],[{...row,stop_area:{id:8006}}]]){
  assert.deepEqual(await check(rows),[departure]);
 }
});
