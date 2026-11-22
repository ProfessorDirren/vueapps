import {nationalJourneyDurationMinutes} from '../core/commutevue-national-duration.js';
import {detectVueInputLanguage} from '../core/vuecore-language.js';
import {interpretVueInput,vueCorrectionNotice,suggestVueIntent} from '../core/vuecore-interpretation.js';
import {createTrafiklabSwedenLive,TrafiklabRequestError} from '../core/commutvue-sweden-live.js';
import {createTrafikverketJourneyProbe} from '../core/commutevue-trafikverket-adapter.js';
import {createSLRegionalRealtimeSource} from '../core/commutevue-sl-regional-realtime.js';
import {extractGTFSRealtimeTripEvidence} from '../core/commutevue-gtfsrt-trip-evidence.js';
import {probeRegionalStaticHead} from '../core/commutevue-regional-head-probe.js';
import {runRegionalRouterShadow,runRegionalRouterPublication} from '../core/commutevue-regional-router-shadow.js';
import {normalizeTrafficResult,COMMUT_MESSAGES,commuteLocale} from '../core/commutvue.js';
import {parseCommuteQuestion,commuteTransportMode} from '../core/commutvue-query.js';
import {planNationalSwedenJourney,parseSwedishArrivalDeadline,parseSpanishArrivalDeadline} from '../core/commutvue-resrobot.js';
import {formatVerifiedDepartures} from '../core/commutvue-format.js';
import {queryDisruptions} from '../core/commutvue-disruptions.js';
import {POST as analyzeAnimal} from '../core/anivue-vision.js';
import {usableImage} from '../core/image-input.js';
import {specialistPath} from '../core/specialist-tree.js';
import {isRegisteredSpecialist} from '../core/specialists.js';
import {POST as followup,validImage,urgentFollowup} from './vue-followup.js';
import {routeQuestion,routingFields} from '../core/router.js';
import {subSpecialist} from '../core/sub-specialists.js';
import {classifyImage,ImageRoutingError} from '../core/image-routing.js';
import {obviousIdentifier,MEMORY_DOMAINS} from '../core/memory.js';
import {ROUTER_TEXT} from '../apps/router-content.js';
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 let b;try{const raw=await request.text();if(raw.length>4250000)return json(413,{error:'Too large'});b=JSON.parse(raw)}catch{return json(400,{error:'Invalid JSON'})}
 // Video must never be silently treated as a text/image assessment before the shared video pipeline is ready.
 if(b?.video!==undefined||b?.video_public!==undefined||b?.video_url!==undefined||b?.video_frames!==undefined||b?.video_evidence!==undefined)return json(415,{error:'Video analysis is not yet supported. No video was processed.'});
 if(b?.action==='anivue_analyze')return analyzeAnimal(new Request('https://localhost/api/anivue-analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}));
 if(!b||!ROUTER_TEXT[b.language])return json(400,{error:'Invalid language'});
 if(b.image!==undefined&&(!validImage(b.image)||!usableImage(b.image)||b.image_public!==true))return json(400,{error:'A valid public image and confirmation are required'});
 if(b.question!==undefined&&typeof b.question!=='string')return json(400,{error:'Invalid question'});
 // The question's language overrides the UI language only with sufficient evidence.
 // Uncertain or short follow-ups retain the chosen UI locale.
 if(b.auto_language===true&&typeof b.question==='string'&&b.question.trim()){
  b={...b,language:detectVueInputLanguage(b.question,b.language)};
 }
 const text=ROUTER_TEXT[b.language];const interpreted=interpretVueInput(b.question?.trim()|| (b.image?text[24]:''));const question=interpreted.question;
 const correctionNotice=vueCorrectionNotice(interpreted.corrections,b.language);
 const respond=(status,data)=>json(status,correctionNotice&&data&&typeof data.answer==='string'?{...data,answer:correctionNotice+'\n'+data.answer,input_corrections:interpreted.corrections}:data);
 if(question.length<3||question.length>3000||obviousIdentifier(question))return json(400,{error:'Invalid public question'});
 let route=routeQuestion(question,b.previous);
 // Ask before interpreting an uncertain domain-changing typo; never run a provider on a guess.
 if(!b.image&&!route.clarify&&!(route.domain==='anivue'&&urgentFollowup('anivue',question,routingFields('anivue',question),b.language))){
  const candidates=suggestVueIntent(question);
  if(candidates.length===1){
   const candidate=candidates[0];
   const prompt=b.language==='sv'?'Menade du':b.language==='es'?'¿Quisiste decir':b.language==='fr'?'Vouliez-vous dire':'Did you mean';
   return respond(200,{domain:null,clarify:true,reason:'possible_typo',answer:prompt+' “'+candidate.suggested+'” istället för “'+candidate.original+'”?',suggestions:[candidate],verified:false});
  }
 }
 const urgent=route.domain&&urgentFollowup(route.domain,question,routingFields(route.domain,question),b.language);
 if(route.domain==='anivue'&&urgent)return json(200,{domain:'anivue',answer:urgent,kind:'safety_rule',emergency:true,workspace:'./?vue=anivue#vue-router',image_analyzed:false});
 try{if(b.image&&!urgent)route=await classifyImage(b.image,question)}catch(e){return json(e instanceof ImageRoutingError?e.status:502,{error:'Image routing unavailable'})}
 if(!route.clarify&&!isRegisteredSpecialist(route.domain))return json(422,{error:'Unregistered VUE specialist'});
 if(route.clarify)return respond(200,{domain:null,answer:text[route.private?6:9],clarify:true,private:!!route.private});
 if(route.domain==='commutvue'){
  const arrivalDeadline=parseSwedishArrivalDeadline(question)||parseSpanishArrivalDeadline(question);
  // Keep the arrival constraint out of the station-name parser.
  const routeQuestion=arrivalDeadline?question.replace(/\b(?:jag\s+vill\s+vara\s+)?(?:framme|ankomma|anlända)\s+senast\s+(?:kl\.?\s*)?\d{1,2}[.:]\d{2}\s+den\s+\d{1,2}\s+\p{L}+(?:\s+\d{4})?/iu,'').trim():question;
  let journey=parseCommuteQuestion(routeQuestion);
  // A destination-only reply may complete the immediately preceding journey question.
  // Never infer a route from unrelated history or from an unrecognized station.
  if(!journey.from&&!journey.to&&Array.isArray(b.history)&&b.history.length){
   const last=b.history[b.history.length-1];
   const previous=typeof last?.question==='string'?parseCommuteQuestion(last.question):null;
   const destination=question.trim();
   const knownDestinations=['Stockholm City','T-Centralen','Jordbro','Handen','Södertälje','Märsta','Uppsala'];
   if(previous?.from&&!previous.to&&previous.region==='stockholm'&&knownDestinations.some(x=>x.toLowerCase()===destination.toLowerCase())&&typeof last.answer==='string'&&/vilken station vill du resa till|which station are you traveling to/i.test(last.answer)){
    journey=parseCommuteQuestion('från '+previous.from+' till '+destination);
   }
  }
  if(journey.stationSuggestions?.length){
   const prompt={sv:'Menade du',en:'Did you mean',es:'¿Quisiste decir',fr:'Vouliez-vous dire',hi:'क्या आपका मतलब था', 'zh-CN':'你是指',ru:'Вы имели в виду',ar:'هل تقصد',el:'Εννοούσατε',tr:'Şunu mu demek istediniz',fa:'منظورتان این بود'};
   const suggestions=journey.stationSuggestions.map(x=>({role:x.role,original:x.original,suggested:x.suggested,requiresConfirmation:true}));
   const lines=suggestions.map(x=>(prompt[b.language]||prompt.en)+' “'+x.suggested+'” ('+x.original+')?');
   return respond(200,{domain:'commutvue',answer:lines.join('\n')+'\n'+({sv:'Skriv hela resfrågan igen med rätt stationsnamn för att bekräfta.',en:'Repeat the full trip question using the correct station name to confirm.',es:'Repite la pregunta completa del viaje con el nombre correcto para confirmar.',fr:'Répétez la question complète avec le bon nom de gare pour confirmer.'}[b.language]||'Repeat the full trip question using the correct station name to confirm.'),kind:'local_guidance',verified:false,evidence_status:'station_confirmation_required',live_diagnostic:'not_attempted',station_suggestions:suggestions,departures:[],source_url:null,updated_at:null,disruptions:{status:'unknown',alerts:[]},photo_status:b.image?'disabled':'not_supplied',photo_evidence:null,clarify:true,region:journey.region,workspace:'./?vue=commutvue#vue-router'});
  }
  // A verified timetable is appropriate for a future local journey; realtime is not.
  // Only an explicit date/time and exact Stockholm corridor may enter this branch.
  let futureScheduleDiagnostic=null;
  if(arrivalDeadline&&!arrivalDeadline.invalid&&!journey.needsClarification&&journey.region==='stockholm'&&
     journey.from==='Jordbro'&&['Stockholm City','T-Centralen'].includes(journey.to)&&process.env.RESROBOT_API_KEY){
   const schedule=await planNationalSwedenJourney('Jordbro','Stockholm City',{
    apiKey:process.env.RESROBOT_API_KEY,arriveBy:arrivalDeadline
   });
   futureScheduleDiagnostic=schedule.status;
   if(schedule.status==='schedule_available'){
    const clock=iso=>typeof iso==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)?iso.slice(11,16):'—';
    const intro={sv:'Tidtabellsresor för angivet datum (inte realtid):',es:'Viajes según el horario para la fecha solicitada (no en tiempo real):',en:'Timetable journeys for the requested date (not real-time):'};
    const rows=schedule.trips.map((trip,i)=>(i+1)+'. '+clock(trip.departure)+' Jordbro → '+clock(trip.arrival)+' Stockholm City'+
     (trip.legs.length>1?' ('+trip.legs.length+' etapper)':''));
    const note={sv:'Tiderna gäller ankomst till Stockholm City, INTE till T-Centralen. Tid för att gå mellan stationerna ingår inte. Välj en tidigare avgång med marginal och kontrollera trafikläget på resdagen.',es:'Las horas de llegada corresponden a Stockholm City, NO a T-Centralen. No incluyen el tiempo para caminar entre las estaciones. Elige una salida anterior con margen y vuelve a comprobar el tráfico el día del viaje.',en:'Arrival times are for Stockholm City, NOT T-Centralen. Walking time between stations is not included. Choose an earlier departure with a buffer and recheck traffic on the travel day.'};
    return respond(200,{domain:'commutvue',answer:(intro[b.language]||intro.en)+'\n'+rows.join('\n')+'\n'+(note[b.language]||note.en),kind:'verified_schedule',verified:false,evidence_status:'schedule_verified',live_diagnostic:'future_schedule_only',departures:[],source_url:'https://www.trafiklab.se/',updated_at:null,disruptions:{status:'unknown',alerts:[]},clarify:false,region:journey.region,workspace:'./?vue=commutvue#vue-router'});
   }
  }
  // A future-date request must never be answered with today's realtime board.
  if(arrivalDeadline||/(?:^|[^\p{L}\p{N}])(?:imorgon|i morgon|övermorgon|i övermorgon|tomorrow|day after tomorrow|mañana|pasado mañana)(?=$|[^\p{L}\p{N}])/iu.test(question)){
   const futureMessages={sv:'Realtidsavgångar för ett framtida datum kan inte verifieras idag. Fråga igen på resdagen.',en:'Real-time departures for a future date cannot be verified today. Please check again on the travel day.',es:'No se pueden verificar hoy las salidas en tiempo real de una fecha futura. Consulta de nuevo el día del viaje. Para planificar una llegada antes de la hora indicada hace falta consultar el horario de esa fecha; no se deben usar las salidas de hoy.',fr:'Les départs en temps réel pour une date future ne peuvent pas être vérifiés aujourd’hui. Vérifiez le jour du voyage.',hi:'भविष्य की तारीख की रीयल-टाइम ट्रेन जानकारी आज सत्यापित नहीं की जा सकती। यात्रा के दिन फिर जाँचें।','zh-CN':'今天无法核实未来日期的列车实时发车信息。请在出行当天再次查询。',ru:'Сегодня невозможно проверить отправления в реальном времени на будущую дату. Проверьте снова в день поездки.',ar:'لا يمكن التحقق اليوم من مواعيد القطارات الفورية لتاريخ مستقبلي. يُرجى التحقق مجددًا يوم السفر.',el:'Οι αναχωρήσεις σε πραγματικό χρόνο για μελλοντική ημερομηνία δεν μπορούν να επαληθευτούν σήμερα. Ελέγξτε ξανά την ημέρα του ταξιδιού.',tr:'Gelecekteki bir tarihin gerçek zamanlı tren kalkışları bugün doğrulanamaz. Seyahat günü tekrar kontrol edin.',fa:'اطلاعات لحظه‌ای حرکت قطارهای یک تاریخ آینده را نمی‌توان امروز تأیید کرد. روز سفر دوباره بررسی کنید.'};
   const providerDiagnostic=futureScheduleDiagnostic?('resrobot_'+futureScheduleDiagnostic):'future_date';
   const diagnosticLabel={sv:'Tidtabellsdiagnostik',es:'Diagnóstico del horario',en:'Timetable diagnostic'};
   const visibleDiagnostic=futureScheduleDiagnostic?'\n'+(diagnosticLabel[b.language]||diagnosticLabel.en)+': '+providerDiagnostic:'';
   return respond(200,{domain:'commutvue',answer:(futureMessages[b.language]||futureMessages.en)+visibleDiagnostic,kind:'local_guidance',verified:false,evidence_status:'future_date_unavailable',live_diagnostic:providerDiagnostic,departures:[],source_url:null,updated_at:null,disruptions:{status:'unknown',alerts:[]},photo_status:b.image?'disabled':'not_supplied',photo_evidence:null,clarify:false,region:journey.region,workspace:'./?vue=commutvue#vue-router'});
  }
  // National journeys use ResRobot timetable evidence; never label these as realtime.
  // Keep the existing regional provider path unchanged.
  if(journey.unsupportedIntercity&&journey.from&&journey.to&&process.env.RESROBOT_API_KEY){
   const national=arrivalDeadline?.invalid?{status:'invalid_arrival_date',trips:[]}:await planNationalSwedenJourney(journey.from,journey.to,{apiKey:process.env.RESROBOT_API_KEY,arriveBy:arrivalDeadline});
   const clock=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)?value.slice(11,16):'—';
   const messages={
    sv:{intro:'Planerade resor enligt ResRobot (inte realtid)',unavailable:'ResRobot kunde inte verifiera en nationell resa med entydiga hållplatser just nu.'},
    en:{intro:'Scheduled journeys from ResRobot (not real-time)',unavailable:'ResRobot could not verify an unambiguous national journey right now.'},
    es:{intro:'Viajes programados de ResRobot (no en tiempo real)',unavailable:'ResRobot no pudo verificar un viaje nacional inequívoco.'},
    fr:{intro:'Trajets prévus par ResRobot (pas en temps réel)',unavailable:'ResRobot ne peut pas confirmer un trajet national sans ambiguïté.'}
   };
   const labels=messages[b.language]||messages.en;
   const cleanStop=name=>String(name||'').replace(/\s*\([^)]*\)\s*$/,'').trim();
   const formatTrip=(trip,i)=>{
    const legs=trip.legs.filter(leg=>cleanStop(leg.from)!==cleanStop(leg.to));
    if(!legs.length)return '';
    const durationMinutes=nationalJourneyDurationMinutes(trip.departure,trip.arrival);
    const duration=Number.isFinite(durationMinutes)&&durationMinutes>0?' ('+Math.floor(durationMinutes/60)+' h '+String(durationMinutes%60).padStart(2,'0')+' min)':'';
    const header=(i+1)+'. '+clock(trip.departure)+'–'+clock(trip.arrival)+duration;
    return header+'\n'+legs.map(leg=>'   '+clock(leg.departure)+' '+cleanStop(leg.from)+' → '+clock(leg.arrival)+' '+cleanStop(leg.to)+(leg.mode?' ('+({'BLT':'Buss','ULT':'Tunnelbana','JST':'Tåg','WALK':({'sv':'Gång','en':'Walk','es':'A pie','fr':'À pied'}[b.language]||'Walk')}[leg.mode]||leg.mode)+')':'')).join('\n');
   };
   const answer=national.status==='schedule_available'?labels.intro+(arrivalDeadline?' — ankomst senast '+arrivalDeadline.date+' '+arrivalDeadline.time:'')+'\n\n'+national.trips.map(formatTrip).filter(Boolean).join('\n\n'):national.status==='no_journeys'&&arrivalDeadline?'Inga verifierade tidtabellsresor uppfyller ankomst senast '+arrivalDeadline.date+' '+arrivalDeadline.time+'.':national.status==='invalid_arrival_date'?'Ogiltigt ankomstdatum eller klockslag. Ange ett giltigt datum och en tid.':labels.unavailable;
   return respond(200,{domain:'commutvue',answer,kind:national.status==='schedule_available'?'verified_schedule':'local_guidance',verified:false,evidence_status:national.status==='schedule_available'?'schedule_verified':'national_'+national.status,live_diagnostic:'not_attempted',departures:[],source_url:national.status==='schedule_available'?'https://www.trafiklab.se/':null,updated_at:null,disruptions:{status:'unknown',alerts:[]},clarify:national.status==='ambiguous_stop',region:journey.region,workspace:'./?vue=commutvue#vue-router'});
  }
  let live=null;
  let scheduled=null;
  let liveAlerts=null;
  let liveDiagnostic='not_attempted';
  let regionalPublished=null;
  // Shadow-only Trafikverket verification: never changes user-facing departures.
  // Explicit opt-in prevents unverified upstream contracts from affecting production.
  if(!journey.needsClarification&&journey.region==='stockholm'&&
     process.env.COMMUTVUE_TRAFIKVERKET_SHADOW_ENABLED==='true'&&
     process.env.TRAFIKVERKET_API_KEY&&
     /pendeltåg|pendeltågen|pendeltågsavgång|commuter rail|commuter train/iu.test(question)){
   try{
    const probe=await createTrafikverketJourneyProbe({apiKey:process.env.TRAFIKVERKET_API_KEY})({from:journey.from,to:journey.to});
    // Only bounded reason codes and counts; no key, station, trip or personal text.
    const reason=typeof probe.reason==='string'&&/^[a-z_]{1,60}$/.test(probe.reason)?probe.reason:'unknown';
    const departures=Array.isArray(probe.departures)?probe.departures:[];
    const estimatedCount=departures.filter(d=>d.hasEstimatedTime===true).length;
    const actualCount=departures.filter(d=>d.hasActualTime===true).length;
    const modifiedCount=departures.filter(d=>d.hasModifiedTime===true).length;
    const forecastCount=departures.filter(d=>d.evidence?.status==='estimated').length;
    const timetableOnlyCount=departures.filter(d=>d.evidence?.status==='timetable_only').length;
    console.info('commutevue_trafikverket_shadow',JSON.stringify({status:probe.status==='matched'?'matched':'unavailable',reason,count:Math.min(departures.length,60),estimatedCount:Math.min(estimatedCount,60),actualCount:Math.min(actualCount,60),modifiedCount:Math.min(modifiedCount,60),forecastCount:Math.min(forecastCount,60),timetableOnlyCount:Math.min(timetableOnlyCount,60),originCount:Math.min(probe.coverage?.originCount||0,60),destinationCount:Math.min(probe.coverage?.destinationCount||0,60),originEstimatedCount:Math.min(probe.coverage?.originEstimatedCount||0,60),originPlannedEstimatedCount:Math.min(probe.coverage?.originPlannedEstimatedCount||0,60),destinationEstimatedCount:Math.min(probe.coverage?.destinationEstimatedCount||0,60),originActualCount:Math.min(probe.coverage?.originActualCount||0,60),originCancelledCount:Math.min(probe.coverage?.originCancelledCount||0,60),originDeviationCount:Math.min(probe.coverage?.originDeviationCount||0,60)}));
   }catch{
    console.info('commutevue_trafikverket_shadow',JSON.stringify({status:'unavailable',reason:'unexpected_error',count:0}));
   }
  }
  // Separate static GTFS product key; bounded one-shot diagnostic per warm instance.
  // Static stop_times is not proof of a journey until station stop IDs are verified.
  if(!journey.needsClarification&&journey.region==='stockholm'&&process.env.TRAFIKLAB_REGIONAL_STATIC_KEY&&!globalThis.__commutvueStaticProbeDone){
   globalThis.__commutvueStaticProbeDone=true;
   try{
    const url=new URL('https://opendata.samtrafiken.se/gtfs/sl/sl.zip');
    url.searchParams.set('key',process.env.TRAFIKLAB_REGIONAL_STATIC_KEY);
    const result=await probeRegionalStaticHead({url:url.toString()});
    console.info('commutvue_regional_head_probe',JSON.stringify({status:result.status,archiveBytes:result.archiveBytes??null,httpStatus:result.httpStatus??null}));
   }catch{
    console.info('commutvue_regional_head_probe',JSON.stringify({status:'unexpected_error'}));
   }
  }
  // Signed static + regional GTFS-RT proof, strictly shadow-only and opt-in.
  // Skip the duplicate shadow fetch when the guarded publication path is enabled.
  // Runs only for the configured corridor; never changes user-facing departures.
  if(!journey.needsClarification&&journey.region==='stockholm'&&
     process.env.COMMUTVUE_REGIONAL_SHADOW_ENABLED==='true'&&
     process.env.COMMUTVUE_REGIONAL_PUBLICATION_ENABLED!=='true'&&
     journey.from==='Jordbro'&&journey.to==='Stockholm City'){
   const proof=await runRegionalRouterShadow({env:process.env,from:journey.from,to:journey.to});
   console.info('commutvue_regional_signed_shadow',JSON.stringify(proof));
  }
  // Shadow-only authorization check. Never publish unjoined GTFS-RT as verified departures.
  // Avoid duplicate requests on the same warm serverless instance for 15 minutes.
  if(!journey.needsClarification&&journey.region==='stockholm'&&process.env.TRAFIKLAB_REGIONAL_REALTIME_KEY){
   const now=Date.now();
   if(!globalThis.__commutvueRegionalProbeAt||now-globalThis.__commutvueRegionalProbeAt>900000){
    globalThis.__commutvueRegionalProbeAt=now;
    try{
     const feed=await createSLRegionalRealtimeSource({apiKey:process.env.TRAFIKLAB_REGIONAL_REALTIME_KEY}).tripUpdates();
     const evidence=extractGTFSRealtimeTripEvidence(feed.bytes);
     const ageMs=evidence.feedTimestampMs===null?null:Date.now()-evidence.feedTimestampMs;
     console.info('commutvue_regional_auth_probe',JSON.stringify({status:'decoded_unverified',tripCount:evidence.trips.length,stopEventCount:evidence.trips.reduce((n,t)=>n+t.stops.length,0),feedAgeSeconds:ageMs===null?null:Math.round(ageMs/1000),fresh:ageMs!==null&&ageMs>=0&&ageMs<=120000}));
    }catch(e){
     const reasons=['authorization','rate_limited','http_error','network_or_timeout','oversized_feed','invalid_body','invalid_size'];
     console.info('commutvue_regional_auth_probe',JSON.stringify({status:'unavailable',reason:reasons.includes(e?.reason)?e.reason:'unknown'}));
    }
   }
  }
  if(!journey.needsClarification&&journey.region==='stockholm'){
   if(process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED!=='true'||!process.env.TRAFIKLAB_API_KEY){
    liveDiagnostic='not_configured';
   }else{
    try{
     const raw=await createTrafiklabSwedenLive({apiKey:process.env.TRAFIKLAB_API_KEY})({provider:'stockholm',from:journey.from,to:journey.to,transportMode:commuteTransportMode(question)||undefined});
     live=raw.status==='ok'?normalizeTrafficResult(raw):{status:'unavailable',departures:[]};
     if(raw.status==='scheduled')scheduled=raw;
     // Operational evidence only: fixed reason code, never station names, trip IDs, query text or API credentials.
     if(raw.status==='scheduled'||raw.status==='unavailable')console.info('commutvue_trafiklab_verification',JSON.stringify({status:raw.status,reason:typeof raw.reason==='string'&&/^[a-z_]{1,60}$/.test(raw.reason)?raw.reason:'unknown'}));
     if(raw.status==='ok')liveAlerts={sourceUrl:raw.sourceUrl,updatedAt:raw.updatedAt,alerts:raw.alerts||[]};
     liveDiagnostic=live?.status==='ok'?'verified':raw.status==='scheduled'?(['realtime_unverified','realtime_time_conflict','no_realtime_at_origin','realtime_origin_unverified','realtime_destination_unverified','realtime_destination_absent','realtime_destination_wrong_order','realtime_destination_id_mismatch','realtime_trip_flag_missing','realtime_timestamp_missing'].includes(raw.reason)?raw.reason:'scheduled_only'):(['stop_resolution','board_unavailable','no_eligible_departures','scheduled_only','route_not_verified','provider_time_conflict','realtime_timestamp_missing','realtime_origin_unverified','realtime_destination_unverified','realtime_destination_absent','realtime_destination_wrong_order','realtime_destination_id_mismatch','realtime_trip_flag_missing'].includes(raw.reason)?raw.reason:'no_verified_departures');
    }catch(error){
     // Only publish a fixed, non-sensitive category; never expose upstream URLs or credentials.
     liveDiagnostic=error instanceof TrafiklabRequestError?(error.category==='ambiguous_station'&&['origin','destination'].includes(error.stopRole)?'provider_ambiguous_'+error.stopRole+'_station':'provider_'+error.category):'provider_error';
    }
   }
  }
  // Regional realtime publication is a separate, explicitly enabled corridor.
  // Never overwrite verified live results from the primary provider.
  if(!journey.needsClarification&&journey.region==='stockholm'&&journey.from==='Jordbro'&&journey.to==='Stockholm City'&&
     process.env.COMMUTVUE_REGIONAL_PUBLICATION_ENABLED==='true'&&live?.status!=='ok'){
   regionalPublished=await runRegionalRouterPublication({env:process.env,from:journey.from,to:journey.to});
   console.info('commutvue_regional_publication',JSON.stringify({status:regionalPublished.status,reason:regionalPublished.reason,count:Math.min(regionalPublished.departures?.length||0,100)}));
  }
  // All regions use the same fail-closed disruption contract. No connected alert
  // adapter means UNKNOWN, never an invented all-clear.
  const disruptions=await queryDisruptions({provider:journey.region||'unknown',from:journey.from,to:journey.to,adapter:liveAlerts?async()=>liveAlerts:undefined});
  const disruptionLines=disruptions.status==='verified'&&disruptions.alerts.length
   ?disruptions.alerts.filter(a=>a.status==='active'||a.status==='upcoming').slice(0,5).map(a=>'⚠ '+a.title+(a.description?' — '+a.description:'')).join('\n')
   :'';
  const disruptionText=disruptionLines?'\n'+disruptionLines:'';
  const verified=live?.status==='ok';
  const regionalVerified=!verified&&regionalPublished?.status==='ready'&&regionalPublished.departures.length>0;
  const scheduledVerified=!verified&&!regionalVerified&&scheduled?.status==='scheduled'&&Array.isArray(scheduled.departures)&&scheduled.departures.length>0;
  const regionalLabels={sv:'Realtidsuppdaterade avgångar från regional källa (ankomst till destinationen ej verifierad):',en:'Regional real-time departure updates (arrival at destination not verified):',es:'Salidas actualizadas en tiempo real (llegada al destino no verificada):',fr:'Départs mis à jour en temps réel (arrivée à destination non vérifiée) :',it:'Partenze aggiornate in tempo reale (arrivo a destinazione non verificato):'};
  const regionalDetailLabels={
   sv:{scheduled:'Tidtabell',predicted:'Uppdaterad avgång',delay:'Försening/inställelse ej verifierad',source:'Källa: SL Regional GTFS-RT'},
   en:{scheduled:'Timetable',predicted:'Updated departure',delay:'Delay/cancellation not verified',source:'Source: SL Regional GTFS-RT'},
   es:{scheduled:'Horario',predicted:'Salida actualizada',delay:'Retraso/cancelación no verificados',source:'Fuente: SL Regional GTFS-RT'},
   fr:{scheduled:'Horaire',predicted:'Départ actualisé',delay:'Retard/annulation non vérifiés',source:'Source : SL Regional GTFS-RT'},
   it:{scheduled:'Orario',predicted:'Partenza aggiornata',delay:'Ritardo/cancellazione non verificati',source:'Fonte: SL Regional GTFS-RT'}
  };
  // Destination arrivals are optional and must originate from the same authenticated
  // regional trip update; never derive them from the timetable or journey duration.
  const arrivalLabels={sv:'Realtidsprognos ankomst Stockholm City',en:'Real-time predicted arrival Stockholm City',es:'Llegada prevista en tiempo real a Stockholm City',fr:'Arrivée prévue en temps réel à Stockholm City',it:'Arrivo previsto in tempo reale a Stockholm City',hi:'Stockholm City पर रीयल-टाइम अनुमानित आगमन','zh-CN':'Stockholm City 实时预计到达',ru:'Прогноз прибытия Stockholm City в реальном времени',ar:'الوصول المتوقع في الوقت الفعلي إلى Stockholm City',el:'Προβλεπόμενη άφιξη σε πραγματικό χρόνο Stockholm City',tr:'Stockholm City gerçek zamanlı tahmini varış',fa:'زمان پیش‌بینی‌شده رسیدن به Stockholm City'};
  const regionalDetails=regionalDetailLabels[b.language]||regionalDetailLabels.en;
  const regionalClock=new Intl.DateTimeFormat(b.language==='sv'?'sv-SE':'en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'});
  const regionalAnswer=regionalVerified?(regionalPublished.departures.some(d=>d.predictedArrival)?({sv:'Realtidsuppdaterade avgångar (ankomst visas endast när verifierad):',en:'Regional real-time departures (arrival shown only when verified):',es:'Salidas en tiempo real (llegada mostrada solo si está verificada):',fr:'Départs en temps réel (arrivée affichée uniquement si vérifiée) :',it:'Partenze in tempo reale (arrivo mostrato solo se verificato):'}[b.language]||'Regional real-time departures (arrival shown only when verified):'):(regionalLabels[b.language]||regionalLabels.en))+'\n'+regionalPublished.departures.map(d=>{
   // GTFS service times can exceed 24:00; show the clock time without inventing a delay.
   const scheduledParts=typeof d.scheduledDeparture==='string'?d.scheduledDeparture.split(':'):[];
   const scheduled=scheduledParts.length===3&&/^[0-9]{2,3}$/.test(scheduledParts[0])?String(Number(scheduledParts[0])%24).padStart(2,'0')+':'+scheduledParts[1]:'—';
   return d.line+' · '+d.destination+' · '+regionalDetails.scheduled+' '+scheduled+' · '+regionalDetails.predicted+' '+regionalClock.format(new Date(d.predictedDeparture))+(d.predictedArrival?' · '+(arrivalLabels[b.language]||arrivalLabels.en)+' '+regionalClock.format(new Date(d.predictedArrival)):'')+' · '+regionalDetails.delay;
  }).join('\n')+'\n'+regionalDetails.source:'';
  const scheduledLabels={en:'Verified timetable departures (not real-time):',es:'Salidas verificadas del horario (no en tiempo real):',sv:'Verifierade tidtabellsavgångar (inte realtid):',hi:'सत्यापित समय-सारणी प्रस्थान (रीयल-टाइम नहीं):','zh-CN':'已核实的时刻表发车时间（非实时）：',ru:'Подтверждённые отправления по расписанию (не в реальном времени):',ar:'مواعيد المغادرة المؤكدة وفق الجدول (ليست بيانات فورية):',el:'Επαληθευμένες αναχωρήσεις βάσει προγράμματος (όχι σε πραγματικό χρόνο):',tr:'Doğrulanmış tarifeli kalkışlar (gerçek zamanlı değil):',fa:'حرکت‌های تأییدشده طبق برنامه (نه اطلاعات لحظه‌ای):',fr:'Départs vérifiés selon les horaires (pas en temps réel) :'};
  // A timetable-only response cannot establish whether a train is delayed.
  const delayUnknown={en:'Delay status cannot be determined without real-time data.',sv:'Det går inte att avgöra om tåget är försenat utan realtidsdata.',es:'No se puede determinar si hay retrasos sin datos en tiempo real.',fr:'Impossible de déterminer les retards sans données en temps réel.',hi:'रीयल-टाइम डेटा के बिना देरी की पुष्टि नहीं की जा सकती।','zh-CN':'没有实时数据，无法确定列车是否晚点。',ru:'Без данных в реальном времени нельзя определить задержку.',ar:'لا يمكن تحديد التأخير دون بيانات فورية.',el:'Δεν είναι δυνατό να διαπιστωθεί καθυστέρηση χωρίς δεδομένα πραγματικού χρόνου.',tr:'Gerçek zamanlı veri olmadan gecikme belirlenemez.',fa:'بدون دادهٔ لحظه‌ای نمی‌توان تأخیر را تعیین کرد.'};
  const scheduleDiagnosticLabels={
   sv:{no_realtime_at_origin:'Trafiklab saknar realtidsmarkering för dessa avgångar.',realtime_unverified:'Trafiklab har realtidsmarkerade avgångar, men resan kunde inte verifieras.',realtime_time_conflict:'Trafiklabs realtid och tidtabell har motstridiga tidsuppgifter.',realtime_origin_unverified:'Avgångens plattform kunde inte matchas mot tågets färdväg.',realtime_destination_unverified:'Destinationen kunde inte verifieras efter avgångsstationen i tågets färdväg.',realtime_destination_absent:'Destinationen saknas i Trafiklabs rapporterade färdväg.',realtime_destination_wrong_order:'Destinationen finns inte efter avgångsstationen i Trafiklabs färdväg.',realtime_destination_id_mismatch:'Trafiklabs färdväg innehåller destinationsområdet men inte en verifierad matchning för rätt station eller plattform.',realtime_trip_flag_missing:'Tågets färdväg saknar bekräftad realtidsmarkering vid avgångsstationen.',realtime_timestamp_missing:'Trafiklab markerar avgången som realtid men saknar en giltig realtidstid.'},
   en:{no_realtime_at_origin:'Trafiklab did not mark these departures as real-time.',realtime_unverified:'Trafiklab provided real-time candidates, but their journeys could not be verified.',realtime_time_conflict:'Trafiklab real-time and timetable data contain conflicting times.',realtime_origin_unverified:'The departure platform could not be matched to the trip route.',realtime_destination_unverified:'The destination could not be verified after the origin on the trip route.',realtime_destination_absent:'The destination is absent from the trip route reported by Trafiklab.',realtime_destination_wrong_order:'The destination does not appear after the origin on the reported trip route.',realtime_destination_id_mismatch:'The trip route includes the destination area but no verified match for the requested station or platform.',realtime_trip_flag_missing:'The trip route lacks a confirmed real-time flag at the origin.',realtime_timestamp_missing:'Trafiklab marks the departure as real-time but provides no valid real-time timestamp.'}
  };
  const scheduleDiagnostic=(scheduleDiagnosticLabels[b.language]||scheduleDiagnosticLabels.en)[liveDiagnostic]||'';
  const scheduledAnswer=scheduledVerified?(scheduledLabels[b.language]||scheduledLabels.en)+'\n'+scheduled.departures.map(d=>d.line+' · '+d.destination+' · '+new Intl.DateTimeFormat(b.language==='sv'?'sv-SE':'en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}).format(new Date(d.scheduled))).join('\n')+'\n'+(delayUnknown[b.language]||delayUnknown.en)+(scheduleDiagnostic?'\n'+scheduleDiagnostic:''):'';
  // Give users a safe, actionable category without exposing provider secrets or URLs.
  const diagnosticLabels={
   en:{provider_ambiguous_origin_station:"The departure station name matches multiple locations.",provider_ambiguous_destination_station:"The destination station name matches multiple locations.",not_configured:'Live connection is not configured.',no_verified_departures:'No verified departures were returned for this route.',provider_error:'The traffic provider request failed.',provider_invalid_stop_data:'The provider returned unusable or ambiguous station information.',provider_invalid_origin_stop_data:'The provider returned unusable or ambiguous departure station information.',provider_invalid_destination_stop_data:'The provider returned unusable or ambiguous destination station information.',provider_station_not_found:'The requested station was not found in the provider response.',provider_empty_station_results:'The provider returned no stations.',provider_missing_platform_ids:'The station has no usable platform identifiers.',provider_ambiguous_station:'The station name matches multiple locations.',provider_authorization:'The traffic provider rejected the server credentials.',provider_rate_limited:'The traffic provider rate limit was reached.',provider_http_error:'The traffic provider returned an HTTP error.',provider_network_or_timeout:'The traffic provider network request timed out or failed.',stop_resolution:'The requested stops could not be resolved safely.',board_unavailable:'No current departure board was available.',no_eligible_departures:'The departure board contained no eligible real-time trains.',scheduled_only:'The provider returned scheduled departures but no verified real-time departures.',route_not_verified:'Train trips could not be verified through the destination.',provider_time_conflict:'The traffic provider returned conflicting departure times; delay status cannot be verified.'},
   sv:{provider_ambiguous_origin_station:"Avresestationens namn motsvarar flera platser.",provider_ambiguous_destination_station:"Destinationsstationens namn motsvarar flera platser.",not_configured:'Realtidsanslutningen är inte konfigurerad.',no_verified_departures:'Inga verifierade avgångar hittades för denna sträcka.',provider_error:'Anropet till trafikleverantören misslyckades.',provider_invalid_stop_data:'Trafikleverantörens stationsuppgifter är felaktiga eller tvetydiga.',provider_invalid_origin_stop_data:'Trafikleverantörens uppgifter om avresestationen är felaktiga eller tvetydiga.',provider_invalid_destination_stop_data:'Trafikleverantörens uppgifter om destinationsstationen är felaktiga eller tvetydiga.',provider_station_not_found:'Stationen hittades inte i trafikleverantörens svar.',provider_empty_station_results:'Trafikleverantören returnerade inga stationer.',provider_missing_platform_ids:'Stationen saknar användbara plattforms-ID.',provider_ambiguous_station:'Stationsnamnet motsvarar flera platser.',provider_authorization:'Trafikleverantören nekade serverns behörighet.',provider_rate_limited:'Trafikleverantörens anropsgräns har nåtts.',provider_http_error:'Trafikleverantören returnerade ett HTTP-fel.',provider_network_or_timeout:'Trafikleverantörens nätverksanrop misslyckades eller tog för lång tid.',stop_resolution:'Hållplatserna kunde inte identifieras säkert.',board_unavailable:'Ingen aktuell avgångstavla fanns tillgänglig.',no_eligible_departures:'Inga användbara realtidsavgångar fanns på avgångstavlan.',scheduled_only:'Trafikleverantören visar tidtabellsavgångar men inga verifierade realtidsavgångar.',route_not_verified:'Tågens färdväg till destinationen kunde inte verifieras.',provider_time_conflict:'Trafikleverantören gav motstridiga avgångstider; förseningen kan inte verifieras.'},
   es:{provider_ambiguous_origin_station:"El nombre de la estación de salida coincide con varios lugares.",provider_ambiguous_destination_station:"El nombre de la estación de destino coincide con varios lugares.",not_configured:'La conexión en tiempo real no está configurada.',no_verified_departures:'No se encontraron salidas verificadas para esta ruta.',provider_error:'Falló la solicitud al proveedor de transporte.',provider_invalid_stop_data:'El proveedor devolvió información de estaciones inválida o ambigua.',provider_invalid_origin_stop_data:'Los datos de la estación de salida son inválidos o ambiguos.',provider_invalid_destination_stop_data:'Los datos de la estación de destino son inválidos o ambiguos.',stop_resolution:'No se pudieron identificar las paradas con seguridad.',board_unavailable:'No había un tablero de salidas actualizado.',no_eligible_departures:'No había trenes en tiempo real aptos.',scheduled_only:'El proveedor muestra horarios previstos, pero ninguna salida verificada en tiempo real.',provider_ambiguous_station:'El nombre de la estación coincide con varias ubicaciones.',route_not_verified:'No se pudo verificar el trayecto hasta el destino.',provider_time_conflict:'El proveedor devolvió horarios contradictorios; no se puede verificar el retraso.'}
  };
  const genericDiagnostic={
   es:'No se pudo verificar la información en tiempo real del proveedor.',
   fr:'Les informations en temps réel du fournisseur n’ont pas pu être vérifiées.',
   hi:'प्रदाता से वास्तविक समय की जानकारी सत्यापित नहीं की जा सकी।',
   'zh-CN':'无法验证交通服务商的实时信息。',
   ru:'Не удалось проверить данные перевозчика в реальном времени.',
   ar:'تعذر التحقق من معلومات مزود النقل في الوقت الفعلي.',
   el:'Δεν ήταν δυνατή η επαλήθευση των δεδομένων πραγματικού χρόνου του παρόχου.',
   tr:'Sağlayıcının gerçek zamanlı bilgileri doğrulanamadı.',
   fa:'اطلاعات لحظه‌ای ارائه‌دهنده قابل تأیید نبود.'
  };
  const diagnosticText=diagnosticLabels[b.language]?.[liveDiagnostic]||genericDiagnostic[b.language]||diagnosticLabels.en[liveDiagnostic]||'';
  const intercityMessages={sv:'Jag förstår resan från '+journey.from+' till '+journey.to+', men kan ännu inte verifiera en sammanhängande resa mellan dessa trafikområden. Jag vill inte hitta på avgångar eller byten.',en:'I understand the journey from '+journey.from+' to '+journey.to+', but cannot yet verify a complete journey across these transit regions. I will not invent departures or connections.',es:'Entiendo el viaje de '+journey.from+' a '+journey.to+', pero todavía no puedo verificar el itinerario completo entre estas regiones.',fr:'Je comprends le trajet de '+journey.from+' à '+journey.to+', mais je ne peux pas encore vérifier un itinéraire complet entre ces régions.'};
  const prompts={en:'Please specify departure station, destination and city.',sv:'Ange avreseort, destination och stad.',es:'Indica el origen, destino y ciudad.',fr:'Indiquez la gare de départ, la destination et la ville.',hi:'कृपया प्रस्थान स्टेशन, गंतव्य और शहर बताएं।','zh-CN':'请提供出发站、目的地和城市。',ru:'Укажите станцию отправления, пункт назначения и город.',ar:'يرجى تحديد محطة المغادرة والوجهة والمدينة.',el:'Προσδιορίστε σταθμό αναχώρησης, προορισμό και πόλη.',tr:'Lütfen kalkış istasyonunu, varış noktasını ve şehri belirtin.',fa:'لطفاً ایستگاه مبدأ، مقصد و شهر را مشخص کنید.'};
  return respond(200,{domain:'commutvue',answer:journey.unsupportedIntercity?(intercityMessages[b.language]||intercityMessages.en):journey.needsClarification?(journey.from&&!journey.to?({sv:'Vilken station vill du resa till från '+journey.from+'?',en:'Which station are you traveling to from '+journey.from+'?',es:'¿A qué estación quieres viajar desde '+journey.from+'?'}[b.language]||'Please specify the destination station from '+journey.from+'.'):(prompts[b.language]||prompts.en)):verified?formatVerifiedDepartures(live.departures,b.language)+disruptionText:regionalVerified?regionalAnswer+disruptionText:scheduledVerified?scheduledAnswer:COMMUT_MESSAGES[commuteLocale(b.language)][0]+(diagnosticText?' '+diagnosticText:''),kind:verified||regionalVerified?'verified_live':scheduledVerified?'verified_schedule':'local_guidance',verified:verified||regionalVerified,evidence_status:journey.unsupportedIntercity?'unsupported_intercity':journey.needsClarification?'needs_stations':verified||regionalVerified?'live_verified':scheduledVerified?'schedule_verified':'live_unavailable',live_diagnostic:regionalVerified?'regional_live_verified':liveDiagnostic,station_corrections:journey.stationCorrections||[],departures:verified?live.departures:regionalVerified?regionalPublished.departures:scheduledVerified?scheduled.departures:[],source_url:verified?live.sourceUrl:regionalVerified?'https://www.trafiklab.se/':scheduledVerified?scheduled.sourceUrl:null,updated_at:verified?live.updatedAt:regionalVerified?null:scheduledVerified?scheduled.updatedAt:null,disruptions,photo_status:b.image?'disabled':'not_supplied',photo_evidence:null,clarify:journey.needsClarification,region:journey.region,workspace:'./?vue=commutvue#vue-router'});
 }
 if(route.domain==='medivue')return respond(200,{domain:'medivue',sub_specialist:'leaflets',answer:text[10],workspace:'./medivue.html',kind:'local_guidance'});
 const current=MEMORY_DOMAINS.includes(b.previous)&&route.domain===b.previous&&b.newCase!==true;
 const focused=subSpecialist(route.domain,question,route.sub_specialist),branch=specialistPath(route.domain,question,route.specialist_path,focused);
 const r=await followup(new Request('https://localhost/api/vue-followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:route.domain,sub_specialist:focused,specialist_path:branch.path,question,language:b.language,history:current?b.history:[],fields:{...(current&&b.fields||{}),...routingFields(route.domain,question)},...(b.image?{image:b.image,image_public:true}:{})})}));
 const d=await r.json();return json(r.status,{...d,...(d.kind==='ai_unverified'?{verified:false,evidence_status:'not_live_verified',followup_scheduled:false}:{}),domain:route.domain,sub_specialist:focused,specialist_path:branch.path,lineage:branch.lineage.map(n=>n.path),image_analyzed:!!b.image&&d.kind==='ai_unverified',workspace:'./?vue='+encodeURIComponent(route.domain)+'#vue-router'});
}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'POST required'});const r=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:typeof req.body==='string'?req.body:JSON.stringify(req.body)}));return res.status(r.status).json(await r.json());}
