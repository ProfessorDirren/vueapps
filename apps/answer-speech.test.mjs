import test from 'node:test';
import assert from 'node:assert/strict';
import {speechVoiceForLanguage,createAnswerSpeech} from './answer-speech.js';
test('voice selection prefers matching locale, then matching language, never another language',()=>{
 const voices=[{lang:'en-US'},{lang:'es-MX'},{lang:'sv-SE'},{lang:'es-ES'}];
 assert.equal(speechVoiceForLanguage(voices,'es'),voices[3]);
 assert.equal(speechVoiceForLanguage(voices,'sv'),voices[2]);
 assert.equal(speechVoiceForLanguage([{lang:'es-MX'}],'es').lang,'es-MX');
 assert.equal(speechVoiceForLanguage(voices,'fa'),null);
});
test('manual playback starts only on click, stops on second click, and keeps answer text intact',()=>{
 const oldDocument=globalThis.document;
 const elements=[];
 globalThis.document={createElement(tag){const el={tag,textContent:'',attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.handlers[k]=fn}};elements.push(el);return el;}};
 let spoken=[],cancels=0;
 const synth={speak(u){spoken.push(u)},cancel(){cancels++},getVoices(){return [{lang:'sv-SE'}]}};
 class Utterance{constructor(text){this.text=text;}}
 try{
  const speech=createAnswerSpeech({synth,Utterance});
  const article={append(...els){this.children=els}};
  const answer={textContent:'Det här är ett testsvar.'};
  speech.attach(article,answer,'sv');
  assert.equal(spoken.length,0);
  const button=article.children[0];
  button.handlers.click();
  assert.equal(spoken.length,1);
  assert.equal(spoken[0].lang,'sv-SE');
  assert.equal(spoken[0].text,answer.textContent);
  assert.equal(button.attrs['aria-pressed'],'true');
  button.handlers.click();
  assert.equal(button.attrs['aria-pressed'],'false');
  assert.ok(cancels>=2);
  assert.equal(answer.textContent,'Det här är ett testsvar.');
 }finally{globalThis.document=oldDocument;}
});
test('unsupported speech engine leaves answer readable and never speaks',()=>{
 const oldDocument=globalThis.document;
 globalThis.document={createElement(){return {textContent:'',setAttribute(){},addEventListener(type,fn){this.click=fn}}}};
 try{
  const speech=createAnswerSpeech({synth:null,Utterance:null});
  const article={append(...els){this.children=els}};
  speech.attach(article,{textContent:'Hola'},'es');
  article.children[0].click();
  assert.match(article.children[1].textContent,/no está disponible/);
 }finally{globalThis.document=oldDocument;}
});
