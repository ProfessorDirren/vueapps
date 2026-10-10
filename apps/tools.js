import { specialistGuide } from '../core/specialists.js';
import { UI, DOMAINS, localizeLanguagePicker } from './content.js?v=languages-3';
import { validateMedia, LANGUAGES } from '../core/index.js';
import { addDays, dueState, scaleIngredients, validateRecords } from '../core/planning.js';
const domain=document.body.dataset.domain, config=DOMAINS[domain], workspace=document.getElementById('workspace'), picker=document.getElementById('language');
const storageKey='vueapps-'+domain+'-v1';
let language='en', records=[],completed=0,storageAvailable=true;
try { const chosen=localStorage.getItem(storageKey+'-language');if(LANGUAGES.includes(chosen))language=chosen; } catch {}
let recipe={name:'',category:0,original:4,target:4,items:[{name:'',quantity:0,unit:'g'}]},scaled=[];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const t=key=>UI[language][key], detail=()=>config.locales[language];
const node=(tag,text,attrs={})=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e};
function announce(key){const el=document.getElementById('notice');el.className='status-message';el.textContent=t(key)}
function clearNotice(){const el=document.getElementById('notice');el.className='';el.textContent=''}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(domain==='foodvue'?{version:1,recipe}:{version:1,records,completed}));storageAvailable=true;clearNotice()}catch{storageAvailable=false;announce('storageError')}}
function download(content,extension,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=node('a',undefined,{href:url,download:domain+'-'+today()+'.'+extension});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function dateLabel(value){return new Intl.DateTimeFormat(language,{year:'numeric',month:'short',day:'numeric'}).format(new Date(value+'T12:00:00'))}
function options(select,labels){labels.forEach((label,i)=>select.append(node('option',label,{value:i})))}
function field(parent,label,id,type='text',attrs={}){parent.append(node('label',t(label),{for:id}));const e=node(type==='textarea'?'textarea':type==='select'?'select':'input',undefined,{id,...(type==='textarea'||type==='select'?{}:{type}),...attrs});parent.append(e);return e}
function toolbar(parent,exportAction){const bar=node('div',undefined,{class:'toolbar'});const exp=node('button',t('export'),{class:'quiet',type:'button'});exp.addEventListener('click',exportAction);const print=node('button',t('print'),{class:'quiet',type:'button'});print.addEventListener('click',()=>window.print());bar.append(exp,print);parent.append(bar)}
function backupControls(parent){
 const bar=node('div',undefined,{class:'toolbar'}),backup=node('button',t('backup'),{class:'quiet',type:'button'}),restore=node('button',t('restore'),{class:'quiet',type:'button'}),file=node('input',undefined,{type:'file',accept:'application/json,.json',hidden:''});
 if(domain==='foodvue'){backup.addEventListener('click',()=>download(JSON.stringify({app:domain,version:1,recipe},null,2),'json','application/json'));bar.append(backup)}
 restore.addEventListener('click',()=>file.click());file.addEventListener('change',async()=>{try{
  const upload=file.files?.[0];if(!upload)return;if(upload.size>200000)throw new Error('large_backup');
  const data=JSON.parse(await upload.text());if(data.app!==domain||data.version!==1)throw new Error('wrong_backup');
  if(domain==='foodvue'){
   const r=data.recipe;if(!r||typeof r.name!=='string'||r.name.length>100||!Number.isInteger(r.category)||r.category<0||r.category>=detail().types.length)throw new Error('invalid_backup');
   scaleIngredients(r.items,r.original,r.target);recipe=r;scaled=[];
  }else{const next=validateRecords(data.records,detail().types.length);if(!Number.isInteger(data.completed)||data.completed<0)throw new Error('invalid_backup');records=next;completed=data.completed}
  save();render();
 }catch{announce('error')}finally{file.value=''}});bar.append(restore,file);parent.append(bar);
}
try{
 const stored=JSON.parse(localStorage.getItem(storageKey)||'null');
 if(stored&&domain==='foodvue'){
  const r=stored.recipe;
  if(r&&typeof r.name==='string'&&r.name.length<=100&&Number.isInteger(r.category)&&r.category>=0&&r.category<detail().types.length&&Array.isArray(r.items)&&r.items.length<=100&&Number.isFinite(r.original)&&r.original>0&&r.original<=1000&&Number.isFinite(r.target)&&r.target>0&&r.target<=1000&&r.items.every(i=>i&&typeof i.name==='string'&&i.name.length<=100&&Number.isFinite(i.quantity)&&i.quantity>=0&&i.quantity<=1000000&&['g','kg','ml','l','pcs','tsp','tbsp'].includes(i.unit)))recipe=r;
 }else if(stored){records=validateRecords(stored.records,detail().types.length);completed=Number.isInteger(stored.completed)&&stored.completed>=0?stored.completed:0}
}catch{storageAvailable=false}
function renderSpecialistGuide(category){
 let guide=document.getElementById('specialist-guide');if(!guide){guide=node('aside',undefined,{class:'guidance',id:'specialist-guide'});workspace.after(guide)}
 const data=specialistGuide(domain,language);guide.replaceChildren();guide.append(node('h2',data.labels[0]+' · '+detail().types[Number(category)||0]),node('p',data.labels[1]));
 const list=node('ul');data.questions.forEach(q=>list.append(node('li',q)));guide.append(list);
 for(const [label,url]of data.sources)guide.append(node('a',label+' ↗',{href:url,target:'_blank',rel:'noopener noreferrer',style:'display:block;margin-top:8px'}));
}
function buildPlanner(){
 workspace.className='workspace';workspace.replaceChildren();
 const editor=node('section',undefined,{class:'panel',id:'editor'}), list=node('section',undefined,{class:'panel',id:'plan'});workspace.append(editor,list);
 editor.append(node('h2',t('add')));const form=node('form');editor.append(form);
 const name=field(form,'name','name','text',{required:'',maxlength:'100',autocomplete:'off'});
 const category=field(form,'category','category','select');options(category,detail().types);
 const due=field(form,'due','due','date',{required:''});due.value=today();
 const interval=field(form,'interval','interval','number',{required:'',min:'1',max:'3650',step:'1'});interval.value=domain==='plantvue'?3:30;
 const notes=field(form,'notes','notes','textarea',{maxlength:'1000'});
 const submit=node('button',t('add'),{class:'primary',type:'submit'});form.append(submit);
 renderSpecialistGuide(category.value);
 category.addEventListener('change',()=>{renderSpecialistGuide(category.value);if(domain==='homevue'&&category.value==='0')interval.value=30});
 form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{
  if(records.length>=200)throw new Error('limit');
  const item={id:crypto.randomUUID(),name:name.value.trim(),type:Number(category.value),due:due.value,interval:Number(interval.value),notes:notes.value};
  validateRecords([item],detail().types.length);records.push(item);save();renderRecords();window.dispatchEvent(new CustomEvent('vue:case-select',{detail:{domain,itemId:item.id,title:item.name}}));window.dispatchEvent(new CustomEvent('vue:case-record',{detail:{domain,question:item.name,answer:JSON.stringify(item)}}));name.value='';notes.value='';window.dispatchEvent(new CustomEvent('vue:new-item',{detail:{domain}}));name.focus();
 }catch{announce('error')}});
 const head=node('div',undefined,{class:'section-top'});head.append(node('h2',t('list')));list.append(head);
 toolbar(list,()=>download(JSON.stringify({app:domain,version:1,exported:today(),records,completed},null,2),'json','application/json'));
 backupControls(list);
 list.append(node('div',undefined,{class:'stats',id:'stats'}),node('div',undefined,{id:'records'}));renderRecords();
}
function renderRecords(){
 const parent=document.getElementById('records');parent.replaceChildren();const stats=document.getElementById('stats');stats.replaceChildren();
 for(const [value,label]of [[records.length,'total'],[records.filter(r=>dueState(r.due,today())==='overdue').length,'overdue'],[records.filter(r=>dueState(r.due,today())==='today').length,'today'],[completed,'completed']]){const box=node('div');box.append(node('strong',value),node('span',t(label)));stats.append(box)}
 if(!records.length){parent.append(node('p',t('empty'),{class:'empty'}));return}
 [...records].sort((a,b)=>a.due.localeCompare(b.due)).forEach(item=>{
  const card=node('article',undefined,{class:'record'}),head=node('div',undefined,{class:'record-head'}),labels=node('div');labels.append(node('h3',item.name),node('span',detail().types[item.type],{class:'subtle'}));const state=dueState(item.due,today());head.append(labels,node('span',t(state),{class:'badge '+state}));
  card.append(head,node('p',t('due')+': '+dateLabel(item.due)+' · '+t('interval')+': '+item.interval));if(item.notes)card.append(node('p',item.notes));
  const actions=node('div',undefined,{class:'record-actions'}),done=node('button',t('done'),{type:'button',class:'quiet'}),remove=node('button',t('remove'),{type:'button',class:'quiet danger'});
  done.addEventListener('click',()=>{try{item.due=addDays(today(),item.interval);completed++;save();renderRecords()}catch{announce('error')}});
  remove.addEventListener('click',()=>{records=records.filter(r=>r.id!==item.id);save();renderRecords()});actions.append(done,remove);card.append(actions);parent.append(card);
 });
}
function unitLabel(unit){if(unit==='pcs')return t('parts');return unit}
function buildFood(){
 workspace.className='workspace food-workspace';workspace.replaceChildren();
 const editor=node('section',undefined,{class:'panel',id:'editor'}),result=node('section',undefined,{class:'panel',id:'plan'});workspace.append(editor,result);
 editor.append(node('h2',t('recipe')));const form=node('form');editor.append(form);
 const name=field(form,'recipe','recipe','text',{maxlength:'100'});name.value=recipe.name;
 const category=field(form,'category','category','select');options(category,detail().types);category.value=recipe.category;renderSpecialistGuide(category.value);category.addEventListener('change',()=>renderSpecialistGuide(category.value));
 const pair=node('div',undefined,{class:'two'});form.append(pair);const left=node('div'),right=node('div');pair.append(left,right);
 const original=field(left,'original','original','number',{required:'',min:'0.1',max:'1000',step:'any'}),target=field(right,'target','target','number',{required:'',min:'0.1',max:'1000',step:'any'});original.value=recipe.original;target.value=recipe.target;
 form.append(node('h3',t('ingredients'),{style:'margin-top:25px'}));const ingredients=node('div',undefined,{id:'ingredients'});form.append(ingredients);
 function writeHeader(){recipe.name=name.value;recipe.category=Number(category.value);recipe.original=Number(original.value);recipe.target=Number(target.value);save();scaled=[];renderShopping()}
 for(const input of [name,category,original,target])input.addEventListener('input',writeHeader);
 function drawIngredients(){ingredients.replaceChildren();recipe.items.forEach((item,i)=>{
  const row=node('div',undefined,{class:'ingredient'}),n=node('input',undefined,{type:'text',required:'',maxlength:'100','aria-label':t('item')+' '+(i+1)}),q=node('input',undefined,{type:'number',required:'',min:'0.001',max:'1000000',step:'any','aria-label':t('quantity')+' '+(i+1)}),u=node('select',undefined,{'aria-label':t('unit')+' '+(i+1)}),del=node('button','×',{type:'button',class:'quiet','aria-label':t('removeIngredient')+' '+(i+1)});
  ['g','kg','ml','l','pcs','tsp','tbsp'].forEach(unit=>u.append(node('option',unitLabel(unit),{value:unit})));n.value=item.name;q.value=item.quantity||'';u.value=item.unit;
  for(const input of [n,q,u])input.addEventListener('input',()=>{item.name=n.value;item.quantity=Number(q.value);item.unit=u.value;save();scaled=[];renderShopping()});
  del.disabled=recipe.items.length===1;del.addEventListener('click',()=>{recipe.items.splice(i,1);scaled=[];save();drawIngredients();renderShopping()});row.append(n,q,u,del);ingredients.append(row);
 })}
 drawIngredients();const add=node('button',t('addIngredient'),{type:'button',class:'quiet'});add.addEventListener('click',()=>{if(recipe.items.length>=100){announce('error');return}recipe.items.push({name:'',quantity:0,unit:'g'});scaled=[];save();drawIngredients();renderShopping()});form.append(add,node('button',t('calculate'),{type:'submit',class:'primary'}));
 form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{scaled=scaleIngredients(recipe.items,recipe.original,recipe.target);save();renderShopping()}catch{announce('error')}});
 const reset=node('button',t('reset'),{class:'quiet danger',type:'button'});reset.addEventListener('click',()=>{recipe={name:'',category:0,original:4,target:4,items:[{name:'',quantity:0,unit:'g'}]};scaled=[];save();buildFood()});editor.append(node('div',undefined,{class:'toolbar'}));editor.lastChild.append(reset);
 result.append(node('h2',t('result')));toolbar(result,()=>download(shoppingText(),'txt','text/plain;charset=utf-8'));const copy=node('button',t('copy'),{type:'button',class:'quiet',id:'copy'});copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(shoppingText());copy.textContent=t('copied')}catch{announce('error')}});result.querySelector('.toolbar').append(copy);result.append(node('div',undefined,{id:'shopping'}));
 backupControls(editor);
 try{scaled=scaleIngredients(recipe.items,recipe.original,recipe.target)}catch{scaled=[]}renderShopping();
}
function shoppingText(){return `${recipe.name||'FOODVUE'}\n${t('target')}: ${recipe.target}\n\n`+scaled.map(item=>`${item.name}: ${new Intl.NumberFormat(language,{maximumFractionDigits:3}).format(item.quantity)} ${unitLabel(item.unit)}`).join('\n')}
function renderShopping(){const parent=document.getElementById('shopping');if(!parent)return;parent.replaceChildren();document.getElementById('copy').disabled=!scaled.length;document.querySelector('#plan .toolbar button').disabled=!scaled.length;
 if(!scaled.length){parent.append(node('p',t('ingredients')+' → '+t('calculate'),{class:'empty'}));return}
 if(recipe.name)parent.append(node('h3',recipe.name));parent.append(node('p',detail().types[recipe.category]+' · '+t('target')+': '+recipe.target,{class:'subtle'}));scaled.forEach(item=>{const row=node('div',undefined,{class:'output-row'});row.append(node('span',item.name),node('strong',new Intl.NumberFormat(language,{maximumFractionDigits:3}).format(item.quantity)+' '+unitLabel(item.unit)));parent.append(row)});
}
function render(){
 localizeLanguagePicker(picker,language);
 document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';picker.value=language;
 document.querySelectorAll('[data-ui]').forEach(e=>e.textContent=t(e.dataset.ui));document.getElementById('headline').textContent=detail().title;document.getElementById('subtitle').textContent=detail().subtitle;document.getElementById('domain-note').textContent=detail().note;
 const reference=document.getElementById('reference');reference.href=config.reference[1];reference.textContent=t('sources')+' ↗';
 if(domain==='foodvue')buildFood();else buildPlanner();if(!storageAvailable)announce('storageError');
}
picker.addEventListener('change',()=>{if(LANGUAGES.includes(picker.value)){language=picker.value;try{localStorage.setItem(storageKey+'-language',language)}catch{}render()}});
const urls={};
function attachMedia(id,kind){const input=document.getElementById(id),out=document.getElementById(id+'-preview');input.addEventListener('change',()=>{
 if(urls[id]){URL.revokeObjectURL(urls[id]);delete urls[id]}out.replaceChildren();const file=input.files?.[0];if(!file)return;const check=validateMedia(file,kind);
 if(!check.ok){input.value='';announce('mediaError');return}clearNotice();urls[id]=URL.createObjectURL(file);const media=node(kind==='image'?'img':'video',undefined,{src:urls[id]});if(kind==='image')media.alt=file.name;else{media.controls=true;media.preload='metadata'}out.append(media);
 // HEIC/HEIF preview depends on browser support; report failure rather than claim analysis.
 media.addEventListener('error',()=>announce('mediaError'));
})}
attachMedia('photo','image');attachMedia('video','video');
document.getElementById('clear-media').addEventListener('click',()=>{for(const id of ['photo','video']){if(urls[id])URL.revokeObjectURL(urls[id]);delete urls[id];document.getElementById(id).value='';document.getElementById(id+'-preview').replaceChildren()}clearNotice()});
window.addEventListener('pagehide',()=>Object.values(urls).forEach(url=>URL.revokeObjectURL(url)));
render();

window.addEventListener('vue:restore',event=>{if(event.detail?.domain!==domain||domain!=='foodvue'||!event.detail.fields?.recipeState)return;try{const data=JSON.parse(event.detail.fields.recipeState),r=data.recipe;if(data.version!==1||!r||typeof r.name!=='string'||r.name.length>100||!Number.isInteger(r.category)||r.category<0||r.category>=detail().types.length)throw Error('recipe');scaleIngredients(r.items,r.original,r.target);recipe=r;scaled=[];save();render()}catch{announce('error')}});
window.addEventListener('vue:new-case',event=>{if(event.detail?.domain===domain&&domain==='foodvue'){recipe={name:'',category:0,original:4,target:4,items:[{name:'',quantity:0,unit:'g'}]};scaled=[];save();render()}});
