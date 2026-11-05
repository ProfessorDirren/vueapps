#!/usr/bin/env node
/**
 * Offline VUEFACTORY CLI.
 * Usage: node scripts/vuefactory.mjs path/to/definition.json [output-directory]
 * Does not register specialists, contact APIs or deploy.
 */
import {readFile,mkdir,writeFile,lstat,unlink} from 'node:fs/promises';
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path';
import {scaffoldVue,checkVueCollision} from '../core/vuefactory.js';
import {SPECIALISTS} from '../core/specialists.js';
import {routeQuestion} from '../core/router.js';
const [definitionPath,outputArg='vuefactory-output']=process.argv.slice(2);
if(!definitionPath){console.error('Usage: node scripts/vuefactory.mjs definition.json [output-directory]');process.exitCode=2;}
else{
 try{
  const definition=JSON.parse(await readFile(resolve(definitionPath),'utf8'));
  checkVueCollision(definition,Object.keys(SPECIALISTS));
  const {id,files}=scaffoldVue(definition);
  if(Array.isArray(definition.routingKeywords)){
   const probes=definition.routingKeywords.map(keyword=>({keyword,existingRoute:routeQuestion(keyword)}));
   const conflicts=probes.filter(x=>x.existingRoute.clarify||x.existingRoute.domain!=='anyvue');
   files['generated/'+id+'/existing-router-audit.json']=JSON.stringify({specialist:id,probes,conflicts,reviewRequired:true,liveRouterModified:false},null,2)+'\n';
  }
  const root=resolve(outputArg);
  // Validate every generated destination before writing any file.
  const entries=Object.entries(files).map(([name,content])=>{
   const target=resolve(root,name);
   const rel=relative(root,target);
   if(!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('Unsafe output path');
   return {target,content};
  });
  // Preflight every destination so a rerun fails before writing a partial draft.
  for(const {target} of entries){
   try{await lstat(target);throw Error('Output already exists: '+target)}
   catch(error){if(error.code!=='ENOENT')throw error}
  }
  const created=[];
  try{
   for(const {target,content} of entries){
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,content,{flag:'wx'});
    created.push(target);
   }
  }catch(error){
   await Promise.all(created.map(target=>unlink(target).catch(()=>{})));
   throw error;
  }
  console.log('VUEFACTORY created '+id+' draft in '+root+' (NOT registered or deployed)');
 }catch(error){console.error('VUEFACTORY failed: '+error.message);process.exitCode=1;}
}
