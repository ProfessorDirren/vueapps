import {createTrafiklabSwedenLive,TrafiklabRequestError} from '../core/commutvue-sweden-live.js';
import {normalizeTrafficResult,COMMUT_MESSAGES,commuteLocale} from '../core/commutvue.js';
import {parseCommuteQuestion} from '../core/commutvue-query.js';
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
 const text=ROUTER_TEXT[b.language];const question=b.question?.trim()|| (b.image?text[24]:'');
 if(question.length<3||question.length>3000||obviousIdentifier(question))return json(400,{error:'Invalid public question'});
 let route=routeQuestion(question,b.previous);
 const urgent=route.domain&&urgentFollowup(route.domain,question,routingFields(route.domain,question),b.language);
 if(route.domain==='anivue'&&urgent)return json(200,{domain:'anivue',answer:urgent,kind:'safety_rule',emergency:true,workspace:'./?vue=anivue#vue-router',image_analyzed:false});
 try{if(b.image&&!urgent)route=await classifyImage(b.image,question)}catch(e){return json(e instanceof ImageRoutingError?e.status:502,{error:'Image routing unavailable'})}
 if(!route.clarify&&!isRegisteredSpecialist(route.domain))return json(422,{error:'Unregistered VUE specialist'});
 if(route.clarify)return json(200,{domain:null,answer:text[route.private?6:9],clarify:true,private:!!route.private});
 if(route.domain==='commutvue'){
  const journey=parseCommuteQuestion(question);
  let live=null;
  let liveAlerts=null;
  let liveDiagnostic='not_attempted';
  if(!journey.needsClarification&&journey.region==='stockholm'){
   if(process.env.COMMUTVUE_SWEDEN_LIVE_ENABLED!=='true'||!process.env.TRAFIKLAB_API_KEY){
    liveDiagnostic='not_configured';
   }else{
    try{
     const raw=await createTrafiklabSwedenLive({apiKey:process.env.TRAFIKLAB_API_KEY})({provider:'stockholm',from:journey.from,to:journey.to});
     live=raw.status==='ok'?normalizeTrafficResult(raw):{status:'unavailable',departures:[]};
     if(raw.status==='ok')liveAlerts={sourceUrl:raw.sourceUrl,updatedAt:raw.updatedAt,alerts:raw.alerts||[]};
     liveDiagnostic=live?.status==='ok'?'verified':(['stop_resolution','board_unavailable','no_eligible_departures','scheduled_only','route_not_verified'].includes(raw.reason)?raw.reason:'no_verified_departures');
    }catch(error){
     // Only publish a fixed, non-sensitive category; never expose upstream URLs or credentials.
     liveDiagnostic=error instanceof TrafiklabRequestError?(error.category==='ambiguous_station'&&['origin','destination'].includes(error.stopRole)?'provider_ambiguous_'+error.stopRole+'_station':'provider_'+error.category):'provider_error';
    }
   }
  }
  // All regions use the same fail-closed disruption contract. No connected alert
  // adapter means UNKNOWN, never an invented all-clear.
  const disruptions=await queryDisruptions({provider:journey.region||'unknown',from:journey.from,to:journey.to,adapter:liveAlerts?async()=>liveAlerts:undefined});
  const disruptionLines=disruptions.status==='verified'&&disruptions.alerts.length
   ?disruptions.alerts.filter(a=>a.status==='active'||a.status==='upcoming').slice(0,5).map(a=>'⚠ '+a.title+(a.description?' — '+a.description:'')).join('\n')
   :'';
  const disruptionText=disruptionLines?'\n'+disruptionLines:'';
  const verified=live?.status==='ok';
  // Give users a safe, actionable category without exposing provider secrets or URLs.
  const diagnosticLabels={
   en:{provider_ambiguous_origin_station:"The departure station name matches multiple locations.",provider_ambiguous_destination_station:"The destination station name matches multiple locations.",not_configured:'Live connection is not configured.',no_verified_departures:'No verified departures were returned for this route.',provider_error:'The traffic provider request failed.',provider_invalid_stop_data:'The provider returned unusable or ambiguous station information.',provider_invalid_origin_stop_data:'The provider returned unusable or ambiguous departure station information.',provider_invalid_destination_stop_data:'The provider returned unusable or ambiguous destination station information.',provider_station_not_found:'The requested station was not found in the provider response.',provider_empty_station_results:'The provider returned no stations.',provider_missing_platform_ids:'The station has no usable platform identifiers.',provider_ambiguous_station:'The station name matches multiple locations.',provider_authorization:'The traffic provider rejected the server credentials.',provider_rate_limited:'The traffic provider rate limit was reached.',provider_http_error:'The traffic provider returned an HTTP error.',provider_network_or_timeout:'The traffic provider network request timed out or failed.',stop_resolution:'The requested stops could not be resolved safely.',board_unavailable:'No current departure board was available.',no_eligible_departures:'The departure board contained no eligible real-time trains.',scheduled_only:'The provider returned scheduled departures but no verified real-time departures.',route_not_verified:'Train trips could not be verified through the destination.'},
   sv:{provider_ambiguous_origin_station:"Avresestationens namn motsvarar flera platser.",provider_ambiguous_destination_station:"Destinationsstationens namn motsvarar flera platser.",not_configured:'Realtidsanslutningen är inte konfigurerad.',no_verified_departures:'Inga verifierade avgångar hittades för denna sträcka.',provider_error:'Anropet till trafikleverantören misslyckades.',provider_invalid_stop_data:'Trafikleverantörens stationsuppgifter är felaktiga eller tvetydiga.',provider_invalid_origin_stop_data:'Trafikleverantörens uppgifter om avresestationen är felaktiga eller tvetydiga.',provider_invalid_destination_stop_data:'Trafikleverantörens uppgifter om destinationsstationen är felaktiga eller tvetydiga.',provider_station_not_found:'Stationen hittades inte i trafikleverantörens svar.',provider_empty_station_results:'Trafikleverantören returnerade inga stationer.',provider_missing_platform_ids:'Stationen saknar användbara plattforms-ID.',provider_ambiguous_station:'Stationsnamnet motsvarar flera platser.',provider_authorization:'Trafikleverantören nekade serverns behörighet.',provider_rate_limited:'Trafikleverantörens anropsgräns har nåtts.',provider_http_error:'Trafikleverantören returnerade ett HTTP-fel.',provider_network_or_timeout:'Trafikleverantörens nätverksanrop misslyckades eller tog för lång tid.',stop_resolution:'Hållplatserna kunde inte identifieras säkert.',board_unavailable:'Ingen aktuell avgångstavla fanns tillgänglig.',no_eligible_departures:'Inga användbara realtidsavgångar fanns på avgångstavlan.',scheduled_only:'Trafikleverantören visar tidtabellsavgångar men inga verifierade realtidsavgångar.',route_not_verified:'Tågens färdväg till destinationen kunde inte verifieras.'},
   es:{provider_ambiguous_origin_station:"El nombre de la estación de salida coincide con varios lugares.",provider_ambiguous_destination_station:"El nombre de la estación de destino coincide con varios lugares.",not_configured:'La conexión en tiempo real no está configurada.',no_verified_departures:'No se encontraron salidas verificadas para esta ruta.',provider_error:'Falló la solicitud al proveedor de transporte.',provider_invalid_stop_data:'El proveedor devolvió información de estaciones inválida o ambigua.',provider_invalid_origin_stop_data:'Los datos de la estación de salida son inválidos o ambiguos.',provider_invalid_destination_stop_data:'Los datos de la estación de destino son inválidos o ambiguos.',stop_resolution:'No se pudieron identificar las paradas con seguridad.',board_unavailable:'No había un tablero de salidas actualizado.',no_eligible_departures:'No había trenes en tiempo real aptos.',scheduled_only:'El proveedor muestra horarios previstos, pero ninguna salida verificada en tiempo real.',provider_ambiguous_station:'El nombre de la estación coincide con varias ubicaciones.',route_not_verified:'No se pudo verificar el trayecto hasta el destino.'}
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
  const prompts={en:'Please specify departure station, destination and city.',sv:'Ange avreseort, destination och stad.',es:'Indica el origen, destino y ciudad.',fr:'Indiquez la gare de départ, la destination et la ville.',hi:'कृपया प्रस्थान स्टेशन, गंतव्य और शहर बताएं।','zh-CN':'请提供出发站、目的地和城市。',ru:'Укажите станцию отправления, пункт назначения и город.',ar:'يرجى تحديد محطة المغادرة والوجهة والمدينة.',el:'Προσδιορίστε σταθμό αναχώρησης, προορισμό και πόλη.',tr:'Lütfen kalkış istasyonunu, varış noktasını ve şehri belirtin.',fa:'لطفاً ایستگاه مبدأ، مقصد و شهر را مشخص کنید.'};
  return json(200,{domain:'commutvue',answer:journey.needsClarification?(prompts[b.language]||prompts.en):verified?formatVerifiedDepartures(live.departures,b.language)+disruptionText:COMMUT_MESSAGES[commuteLocale(b.language)][0]+(diagnosticText?' '+diagnosticText:''),kind:verified?'verified_live':'local_guidance',verified,evidence_status:journey.needsClarification?'needs_stations':verified?'live_verified':'live_unavailable',live_diagnostic:liveDiagnostic,departures:verified?live.departures:[],source_url:verified?live.sourceUrl:null,updated_at:verified?live.updatedAt:null,disruptions,photo_status:b.image?'disabled':'not_supplied',photo_evidence:null,clarify:journey.needsClarification,region:journey.region,workspace:'./?vue=commutvue#vue-router'});
 }
 if(route.domain==='medivue')return json(200,{domain:'medivue',sub_specialist:'leaflets',answer:text[10],workspace:'./medivue.html',kind:'local_guidance'});
 const current=MEMORY_DOMAINS.includes(b.previous)&&route.domain===b.previous&&b.newCase!==true;
 const focused=subSpecialist(route.domain,question,route.sub_specialist),branch=specialistPath(route.domain,question,route.specialist_path,focused);
 const r=await followup(new Request('https://localhost/api/vue-followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:route.domain,sub_specialist:focused,specialist_path:branch.path,question,language:b.language,history:current?b.history:[],fields:{...(current&&b.fields||{}),...routingFields(route.domain,question)},...(b.image?{image:b.image,image_public:true}:{})})}));
 const d=await r.json();return json(r.status,{...d,...(d.kind==='ai_unverified'?{verified:false,evidence_status:'not_live_verified',followup_scheduled:false}:{}),domain:route.domain,sub_specialist:focused,specialist_path:branch.path,lineage:branch.lineage.map(n=>n.path),image_analyzed:!!b.image&&d.kind==='ai_unverified',workspace:'./?vue='+encodeURIComponent(route.domain)+'#vue-router'});
}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'POST required'});const r=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:typeof req.body==='string'?req.body:JSON.stringify(req.body)}));return res.status(r.status).json(await r.json());}
