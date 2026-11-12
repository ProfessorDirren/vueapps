import test from 'node:test';
import assert from 'node:assert/strict';
import { AniVueDomain, HORSE_EMERGENCY_IDS } from './anivue.js';

const locales=['en','es','sv','fr','hi','zh-CN','ru','ar','el','tr','fa'];
test('ANIVUE emergency notices are localized for all eleven portal languages',()=>{
 const domain=new AniVueDomain({fetcher:async()=>{throw Error('must not call provider')}});
 for(const language of locales){
  const dog=domain.emergencyCheck({species:'dog',symptoms:['breathing'],language});
  const horse=domain.emergencyCheck({species:'horse',symptoms:['horseColic'],language});
  assert.equal(dog.severity,'emergency',language+'/dog');
  assert.equal(horse.severity,'emergency',language+'/horse');
  assert.ok(dog.summary.length>15,language+'/dog');
  assert.ok(horse.summary.length>15,language+'/horse');
 }
});
test('ANIVUE preserves equine urgent IDs and no emergency for healthy animals',()=>{
 const domain=new AniVueDomain({fetcher:async()=>{throw Error('must not call provider')}});
 assert.ok(HORSE_EMERGENCY_IDS.includes('horseColic'));
 assert.ok(HORSE_EMERGENCY_IDS.includes('horseChoke'));
 assert.ok(HORSE_EMERGENCY_IDS.includes('horseFoalingDifficulty'));
 assert.equal(domain.emergencyCheck({species:'horse',description:'Horse is healthy',language:'sv'}),null);
});

test('ANIVUE detects urgent breathing distress in newer supported languages',()=>{
 const domain=new AniVueDomain({fetcher:async()=>{throw Error('must not call provider')}});
 const cases=[
  ['fr','Mon chien a des difficultés à respirer'],
  ['el','Ο σκύλος έχει δυσκολία στην αναπνοή'],
  ['tr','Köpeğim nefes alamıyor'],
  ['fa','سگ من مشکل در تنفس دارد']
 ];
 for(const [language,description] of cases){
  const result=domain.emergencyCheck({species:'dog',description,language});
  assert.equal(result?.severity,'emergency',language);
 }
 assert.equal(domain.emergencyCheck({species:'dog',description:'My dog is playing normally',language:'en'}),null);
});
