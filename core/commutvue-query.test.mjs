import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommuteQuestion,commuteTransportMode} from './commutvue-query.js';
test('extract Stockholm commute without inventing stops',()=>{
 const q=parseCommuteQuestion('Är pendeltågen från Jordbro till T-Centralen försenade?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'T-Centralen',needsClarification:false});
});
test('Swedish mot destination is extracted without unnecessary clarification',()=>{
 const question='Visa nästa pendeltåg från Jordbro station mot Stockholm City.';
 assert.deepEqual(parseCommuteQuestion(question),{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
 assert.equal(commuteTransportMode(question),'TRAIN');
});

test('recognize Paris region and stations',()=>{
 const q=parseCommuteQuestion('Train from Gare du Nord to Châtelet delayed?');
 assert.equal(q.region,'paris');
 assert.equal(q.from,'Gare du Nord');
 assert.equal(q.to,'Châtelet');
 assert.equal(q.needsClarification,false);
});
test('unknown geography and missing stops require clarification',()=>{
 assert.equal(parseCommuteQuestion('Is my train delayed?').needsClarification,true);
 assert.equal(parseCommuteQuestion('RER B delayed?').needsClarification,true);
 assert.equal(parseCommuteQuestion('Train from Jordbro to Gare du Nord?').region,null);
});

test('Unicode city names are detected as complete words',()=>{
 assert.equal(parseCommuteQuestion('Train from Gare du Nord to Châtelet delayed?').to,'Châtelet');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Stockholm City delayed?').region,'stockholm');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Stockholm City delayed?').to,'Stockholm City');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Gare du Nord?').needsClarification,true);
});

test('Chile Santiago Spanish transit journey resolves without guessing live status',()=>{
 const q=parseCommuteQuestion('Metro de Santiago desde Baquedano a Tobalaba');
 assert.deepEqual(q,{region:'santiago',from:'Baquedano',to:'Tobalaba',needsClarification:false});
});
test('Chile geography is not confused with Stockholm or Paris',()=>{
 assert.equal(parseCommuteQuestion('Bus de Maipú a Plaza de Armas').region,'santiago');
 assert.equal(parseCommuteQuestion('Metro de Santiago desde Baquedano a Gare du Nord').needsClarification,true);
 assert.equal(parseCommuteQuestion('Bus de una parada a otra').needsClarification,true);
});

test('native-script route questions preserve the origin and destination',()=>{
 const cases=[
  ['मुंबई से दादर तक','mumbai','मुंबई','दादर'],
  ['从北京到西直门','beijing','北京','西直门'],
  ['из Москва до Комсомольская','moscow','Москва','Комсомольская'],
  ['من دبي إلى BurJuman','dubai','دبي','BurJuman'],
  ['από Αθήνα προς Σύνταγμα','athens','Αθήνα','Σύνταγμα'],
  ['از تهران به تجریش','tehran','تهران','تجریش'],
  ['İstanbul konumundan Taksim konumuna','istanbul','İstanbul','Taksim']
 ];
 for(const [text,region,from,to] of cases){
  const result=parseCommuteQuestion(text);
  assert.equal(result.region,region,text);
  assert.equal(result.from,from,text);
  assert.equal(result.to,to,text);
  assert.equal(result.needsClarification,false,text);
 }
});

test('incidental country references do not override identified journey endpoints',()=>{
 const q=parseCommuteQuestion('I speak Spanish and live in Chile. Train from Jordbro to Stockholm City?');
 assert.equal(q.region,'stockholm');
 assert.equal(q.needsClarification,false);
});
test('two different endpoint regions always require clarification',()=>{
 const q=parseCommuteQuestion('Train from Baquedano to Gare du Nord?');
 assert.equal(q.region,null);
 assert.equal(q.needsClarification,true);
});

test('actual Swedish next-train phrasing extracts Stockholm stations',()=>{
 const q=parseCommuteQuestion('När går nästa tåg från Jordbro till Stockholm City?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
});

test('Jordbro question with a second disruption sentence preserves both station endpoints',()=>{
 const q=parseCommuteQuestion('När går nästa pendeltåg från Jordbro till Stockholm City? Finns det några trafikstörningar?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
});

test('SWAT question extracts Jordbro to T-Centralen even with Spanish selected in UI',()=>{
 const q=parseCommuteQuestion('är det förseningar mellan jordbro och t-centralen?');
 assert.deepEqual(q,{region:'stockholm',from:'jordbro',to:'t-centralen',needsClarification:false});
});

test('SWAT station extraction does not turn incidental station mentions into an invented journey',()=>{
 const q=parseCommuteQuestion('Är det förseningar vid Jordbro?');
 assert.equal(q.needsClarification,true);
 assert.equal(q.from,null);
 assert.equal(q.to,null);
});


test('Swedish day qualifiers are not part of Stockholm station names',()=>{
 for(const suffix of ['imorgon','i morgon','idag','ikväll']){
  const q=parseCommuteQuestion('När går tåget från Jordbro till Stockholm City '+suffix+'?');
  assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false},suffix);
 }
});


test('Stockholm Centralstation remains distinct from Stockholm City in route parsing',()=>{
 const city=parseCommuteQuestion('Är pendeltågen från Jordbro till Stockholm City försenade just nu?');
 const central=parseCommuteQuestion('Är pendeltågen från Jordbro till Stockholm Centralstation försenade just nu?');
 assert.deepEqual(city,{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
 assert.deepEqual(central,{region:'stockholm',from:'Jordbro',to:'Stockholm Centralstation',needsClarification:false});
 assert.notEqual(city.to,central.to);
});


test('known T-Centralen typos are corrected transparently without guessing other stations',()=>{
 for(const typo of ['T-tentralen','C-tentralen']){
  const q=parseCommuteQuestion('Är pendeltågen från Jordbro till '+typo+' försenade?');
  assert.equal(q.region,'stockholm');
  assert.equal(q.to,'T-Centralen');
  assert.equal(q.needsClarification,false);
  assert.deepEqual(q.stationCorrections,[{role:'to',original:typo,corrected:'T-Centralen'}]);
 }
 const unknown=parseCommuteQuestion('Är tågen från Jordbro till Blåbärscentralen försenade?');
 assert.equal(unknown.to,'Blåbärscentralen');
 assert.equal(unknown.stationCorrections,undefined);
 const exact=parseCommuteQuestion('Är tågen från Jordbro till T-Centralen försenade?');
 assert.equal(exact.stationCorrections,undefined);
});


test('COMMUTVUE uses VUECORE suggestions without silently changing unknown station names',()=>{
 const trip=parseCommuteQuestion('från Jordbrp till T-Centralen');
 assert.equal(trip.from,'Jordbrp');
 assert.equal(trip.needsClarification,true);
 assert.deepEqual(trip.stationSuggestions,[{role:'from',original:'Jordbrp',suggested:'Jordbro',requiresConfirmation:true}]);
});

test('COMMUTVUE exposes confirmation before any Trafiklab request',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../api/vue-router.js',import.meta.url),'utf8');
 assert.ok(source.indexOf('if(journey.stationSuggestions?.length)')<source.indexOf('createTrafiklabSwedenLive({apiKey:'));
 assert.match(source,/evidence_status:'station_confirmation_required'/);
});

test('all supported Swedish modes classify without inventing live departures',()=>{
 const cases=[
  ['När går nästa buss från Tyresö centrum till Gullmarsplan?','BUS'],
  ['När går nästa expressbuss från Tyresö centrum till Gullmarsplan?','BUS'],
  ['När går tunnelbanan från T-Centralen till Gullmarsplan?','METRO'],
  ['När går spårvagnen från Stockholm till Solna?','TRAM'],
  ['När går pendelbåten från Stockholm till Solna?','BOAT'],
  ['När går färjan från Stockholm till Solna?','BOAT'],
  ['När går pendeltåget från Jordbro till Stockholm City?','TRAIN'],
  ['När går regionaltåget från Stockholm till Uppsala?','TRAIN']
 ];
 for(const [question,mode] of cases)assert.equal(commuteTransportMode(question),mode,question);
 assert.equal(commuteTransportMode('Hur reser jag från Tyresö till Gullmarsplan?'),null);
 assert.equal(commuteTransportMode('Buss eller tunnelbana från Tyresö till Gullmarsplan?'),null);
});

test('Spanish station wording preserves exact Jordbro and Stockholm City corridor',()=>{
 const q='Muéstrame los próximos trenes de cercanías desde la estación de Jordbro hasta Stockholm City. Comprueba las salidas en tiempo real, los retrasos y los trenes cancelados. Responde en español.';
 assert.deepEqual(parseCommuteQuestion(q),{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
 assert.equal(commuteTransportMode(q),'TRAIN');
});

test('Maria Spanish full future arrive-by question resolves exact stations without guessing',()=>{
 const question='Mañana, lunes 23 de noviembre de 2026, necesito viajar en tren de cercanías desde la estación de Jordbro hasta T-Centralen, en Estocolmo. Tengo que llegar a más tardar a las 10:30 de la mañana. ¿Qué tren debo tomar y a qué hora tengo que salir de Jordbro? Comprueba los horarios, los datos en tiempo real, los retrasos y las cancelaciones. Respóndeme completamente en español.';
 const journey=parseCommuteQuestion(question);
 assert.equal(journey.region,'stockholm');
 assert.equal(journey.from,'Jordbro');
 assert.equal(journey.to,'T-Centralen');
 assert.equal(journey.needsClarification,false);
 assert.equal(commuteTransportMode(question),'TRAIN');
});

test('Swedish explicit travel mode is not included in destination station name',()=>{
 const question='Jag vill åka från Jordbro till Stockholm City med pendeltåg. Visa nästa avgång och eventuella verifierade förseningar.';
 assert.deepEqual(parseCommuteQuestion(question),{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false});
 assert.equal(commuteTransportMode(question),'TRAIN');
 for(const mode of ['buss','tunnelbana','spårvagn','pendelbåt']){
  const journey=parseCommuteQuestion('Jag vill åka från Jordbro till Stockholm City med '+mode+'.');
  assert.equal(journey.to,'Stockholm City',mode);
 }
});

test('Turkish spoken station suffixes resolve verified Stockholm endpoints without guessing',()=>{
 const examples=[
  "Jordbro'dan Stockholm City'ye bir sonraki tren ne zaman kalkıyor?",
  "Jordbro’dan Stockholm City’ye bir sonraki tren ne zaman kalkıyor?"
 ];
 for(const question of examples){
  const parsed=parseCommuteQuestion(question);
  assert.equal(parsed.from,'Jordbro');
  assert.equal(parsed.to,'Stockholm City');
  assert.equal(parsed.region,'stockholm');
  assert.equal(parsed.needsClarification,false);
  assert.equal(commuteTransportMode(question),'TRAIN');
 }
});

test('all eleven supported languages parse explicit travel endpoints without inventing station data',()=>{
 const cases=[
  ['en','Train from Jordbro to Stockholm City?','stockholm','Jordbro','Stockholm City'],
  ['sv','Tåg från Jordbro till Stockholm City?','stockholm','Jordbro','Stockholm City'],
  ['es','Tren desde Jordbro hasta Stockholm City?','stockholm','Jordbro','Stockholm City'],
  ['fr','Train de Jordbro à Stockholm City?','stockholm','Jordbro','Stockholm City'],
  ['tr',"Jordbro'dan Stockholm City'ye bir sonraki tren ne zaman kalkıyor?",'stockholm','Jordbro','Stockholm City'],
  ['hi','मुंबई से दादर तक','mumbai','मुंबई','दादर'],
  ['zh-CN','从北京到西直门','beijing','北京','西直门'],
  ['ru','из Москва до Комсомольская','moscow','Москва','Комсомольская'],
  ['ar','من دبي إلى BurJuman','dubai','دبي','BurJuman'],
  ['el','από Αθήνα προς Σύνταγμα','athens','Αθήνα','Σύνταγμα'],
  ['fa','از تهران به تجریش','tehran','تهران','تجریش']
 ];
 for(const [language,question,region,from,to] of cases){
  const parsed=parseCommuteQuestion(question);
  assert.equal(parsed.region,region,language);
  assert.equal(parsed.from,from,language);
  assert.equal(parsed.to,to,language);
  assert.equal(parsed.needsClarification,false,language);
 }
 for(const question of ['Train delayed?','Tren retrasado?','Tåg försenat?','Tren gecikti mi?']){
  assert.equal(parseCommuteQuestion(question).needsClarification,true,question);
 }
});

test('Swedish travel mode followed by current time preserves destination',()=>{
 for(const mode of ['pendeltåg','tåg','buss','tunnelbana','spårvagn','pendelbåt','färja']) for(const time of ['nu','just nu']){
 const q='Hur tar jag mig från Jordbro station till Stockholm City med '+mode+' '+time+'? Visa de tre närmaste avgångarna.';
 assert.deepEqual(parseCommuteQuestion(q),{region:'stockholm',from:'Jordbro',to:'Stockholm City',needsClarification:false},q);
 }
});

test('Spanish commuter rail wording keeps the train type out of the origin',()=>{
 const question='¿A qué hora sale el próximo tren de cercanías de Jordbro a Stockholm City?';
 for(const suffix of ['', ' Muéstrame la hora programada y la hora prevista en tiempo real.']){
  const journey=parseCommuteQuestion(question+suffix);
  assert.equal(journey.from,'Jordbro');
  assert.equal(journey.to,'Stockholm City');
  assert.equal(journey.needsClarification,false);
 }
});

test('Brazilian Portuguese train requests preserve the Stockholm station pair',()=>{
 const question='Quando sai o próximo trem de Jordbro para Stockholm City?';
 const journey=parseCommuteQuestion(question);
 assert.equal(journey.from,'Jordbro');
 assert.equal(journey.to,'Stockholm City');
 assert.equal(journey.region,'stockholm');
 assert.equal(journey.needsClarification,false);
});
