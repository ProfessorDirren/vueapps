#!/usr/bin/env node
/**
 * Zero-dependency, read-only VUE release gate.
 * Usage: node scripts/vue-release-check.mjs <specialist-id> <routing-smoke-question>
 * Validates central registration, all display languages, a real VUECORE route,
 * and the entire regression suite. Never deploys or writes to production.
 */
import {spawnSync} from 'node:child_process';
import {SPECIALISTS} from '../core/specialists.js';
import {routeQuestion} from '../core/router.js';
import {VUE_NAMES,localizedVueName} from '../core/vue-names.js';

export const RELEASE_LANGUAGES=Object.freeze(['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa']);
export function preflightVue(id,question){
 const problems=[];
 if(typeof id!=='string'||!Object.hasOwn(SPECIALISTS,id))problems.push('Specialist not registered in VUECORE');
 if(!VUE_NAMES.includes(id))problems.push('Missing central display-name registration');
 if(typeof question!=='string'||question.trim().length<3)problems.push('Routing smoke question required');
 if(!problems.length){
  for(const lang of RELEASE_LANGUAGES){
   const label=localizedVueName(id,lang);
   if(!label||label.trim()==='-VUE')problems.push('Missing name in '+lang);
  }
  const result=routeQuestion(question);
  if(result.clarify||result.domain!==id)problems.push('Routing mismatch: expected '+id+', got '+(result.domain||'clarification'));
 }
 return {ok:problems.length===0,problems};
}
const invoked=process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href;
if(invoked){
 const [id,question]=process.argv.slice(2);
 const preflight=preflightVue(id,question);
 if(!preflight.ok){
  for(const issue of preflight.problems)console.error('BLOCKED: '+issue);
  process.exitCode=1;
 }else{
  console.log('VUE preflight OK: '+id+'; 11 language names and route checked.');
  const result=spawnSync(process.execPath,['--test','core/*.test.mjs'],{stdio:'inherit',shell:true});
  if(result.error){console.error(result.error.message);process.exitCode=1;}
  else if(result.status!==0){console.error('BLOCKED: regression tests failed');process.exitCode=1;}
  else console.log('GREEN: '+id+' passed full offline release gate. Preview and production still require separate verification.');
 }
}
