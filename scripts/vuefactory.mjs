#!/usr/bin/env node
/**
 * Offline VUEFACTORY CLI.
 * Usage: node scripts/vuefactory.mjs path/to/definition.json [output-directory]
 * Does not register specialists, contact APIs or deploy.
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path';
import {scaffoldVue} from '../core/vuefactory.js';
const [definitionPath,outputArg='vuefactory-output']=process.argv.slice(2);
if(!definitionPath){console.error('Usage: node scripts/vuefactory.mjs definition.json [output-directory]');process.exitCode=2;}
else{
 try{
  const definition=JSON.parse(await readFile(resolve(definitionPath),'utf8'));
  const {id,files}=scaffoldVue(definition);
  const root=resolve(outputArg);
  // Validate every generated destination before writing any file.
  const entries=Object.entries(files).map(([name,content])=>{
   const target=resolve(root,name);
   const rel=relative(root,target);
   if(!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('Unsafe output path');
   return {target,content};
  });
  for(const {target} of entries){
   // No clobbering existing specialist drafts.
   await mkdir(dirname(target),{recursive:true});
  }
  for(const {target,content} of entries)await writeFile(target,content,{flag:'wx'});
  console.log('VUEFACTORY created '+id+' draft in '+root+' (NOT registered or deployed)');
 }catch(error){console.error('VUEFACTORY failed: '+error.message);process.exitCode=1;}
}
