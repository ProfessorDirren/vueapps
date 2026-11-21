#!/usr/bin/env node
/** Offline zero-dependency regression launcher; never deploys or calls live providers. */
import {spawnSync} from 'node:child_process';
import {SPECIALISTS} from '../core/specialists.js';
import {preflightVue} from './vue-release-check.mjs';
const args=process.argv.slice(2);
if(args.includes('--help')){console.log('npm run regression -- [--quick|--full] [--vue specialist-id --question "smoke question"]');process.exit(0)}
if(args.includes('--quick')&&args.includes('--full')){console.error('Choose one profile');process.exit(2)}
const vi=args.indexOf('--vue'),qi=args.indexOf('--question');
const id=vi<0?null:args[vi+1],question=qi<0?null:args[qi+1];
if((vi>=0&&!id)||(qi>=0&&!question)||(question&&!id)){console.error('Invalid --vue/--question arguments');process.exit(2)}
const ids=id?[id]:Object.keys(SPECIALISTS);
const errors=ids.flatMap(v=>preflightVue(v,id?question:null).problems.map(e=>v+': '+e));
if(errors.length){errors.forEach(e=>console.error('BLOCKED '+e));process.exit(1)}
const quick=args.includes('--quick');
const files=quick?['core/regression-framework.test.mjs','core/vuecore-language.test.mjs']:['core/*.test.mjs','scripts/commutevue-download-regional-gtfs.test.mjs'];
console.log('VUECORE REGRESSION '+(quick?'QUICK':'FULL')+' | '+ids.length+' specialists | 11 languages');
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit',shell:true});
if(result.error){console.error(result.error);process.exit(1)}
process.exit(result.status??1);
