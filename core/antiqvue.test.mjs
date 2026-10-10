import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../api/antiqvue.js',import.meta.url),'utf8');
const {validImage,POST,pageSaleEvidence,saleURL,researchLinks}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('ANTIQVUE rejects renamed and oversized images',()=>{assert.equal(validImage('data:image/png;base64,'+Buffer.from('not an image at all').toString('base64')),false);assert.equal(validImage('data:image/png;base64,'+'A'.repeat(15*1024*1024)),false);assert.equal(validImage('data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64')),true)});
test('ANTIQVUE reports unavailable instead of fabricated analysis without credentials',async()=>{const previous=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{const r=await POST(new Request('https://localhost/api/antiqvue',{method:'POST'}));assert.equal(r.status,503);assert.match((await r.json()).error,/not configured/)}finally{if(previous!==undefined)process.env.OPENAI_API_KEY=previous}});
test('ANYVUE stays first, then ANIVUE and ANTIQVUE before ARMVUE',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const positions=['anyvue','anivue','antiqvue','armvue'].map(id=>html.indexOf(`id="app-${id}"`));assert.ok(positions.every(x=>x>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions)});
const {marketEvidence}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sale=(url,amount,rest={})=>({title:'Marshall JMP 1973',url,amount,currency:'SEK',date:'2026-09-01',kind:'sold',basis:'hammer',condition:'Original, working',...rest});
const urls=[{url:'https://auction.example/one'},{url:'https://auction.example/two'}];
test('price range requires searched sources, two distinct disclosed comparable sales and one currency',()=>{
 assert.equal(marketEvidence([sale(urls[0].url,10000)],urls,'SEK',true).valuation,null);
 assert.equal(marketEvidence([sale(urls[0].url,10000),sale(urls[1].url,14000)],urls,'SEK',false).valuation,null);
 const report=marketEvidence([sale(urls[0].url,10000),sale(urls[1].url,14000)],urls,'SEK',true);
 assert.equal(report.valuation.low,10000);assert.equal(report.valuation.high,14000);assert.equal(report.valuation.count,2);
});
test('asking prices, fabricated links, currency mismatch and duplicate sales cannot create a range',()=>{
 const cases=[sale(urls[0].url,9999,{kind:'asking'}),sale('https://made-up.example/fake',14000),sale(urls[1].url,14000,{currency:'USD'}),sale(urls[0].url,12000)];
 const r=marketEvidence([sale(urls[0].url,10000),...cases],urls,'SEK',true);assert.equal(r.comparables.length,1);assert.equal(r.valuation,null);
});
test('hammer prices never combine with buyer-premium inclusive sales',()=>{
 assert.equal(marketEvidence([sale(urls[0].url,10000),sale(urls[1].url,14000,{basis:'including premium'})],urls,'SEK',true).valuation,null);
});
test('invalid dates, future sales and unsafe links are rejected',()=>{
 for(const rest of [{date:'2026-02-30'},{date:'2999-01-01'},{amount:-1},{url:'javascript:alert(1)'}])assert.equal(marketEvidence([sale(urls[0].url,10000,rest)],urls,'SEK',true).comparables.length,0);
});
const image='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
async function withMocks(fetchMock,fn){
 const names=['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];const original=Object.fromEntries(names.map(n=>[n,process.env[n]]));const fetchOriginal=globalThis.fetch;
 process.env.OPENAI_API_KEY='test-not-a-real-key';process.env.UPSTASH_REDIS_REST_URL='https://redis.example';process.env.UPSTASH_REDIS_REST_TOKEN='test-token';globalThis.fetch=fetchMock;
 try{await fn()}finally{globalThis.fetch=fetchOriginal;for(const n of names)if(original[n]===undefined)delete process.env[n];else process.env[n]=original[n]}
}
const request=extra=>new Request('https://localhost/api/antiqvue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,description:'Vintage amplifier',language:'sv',...extra})});
test('budget exhaustion makes zero paid AI requests',async()=>{
 let calls=0;await withMocks(async()=>{calls++;return Response.json({result:99999})},async()=>{assert.equal((await POST(request({}))).status,429);assert.equal(calls,1)});
});
test('photo observations use image input, selected language and do not retain provider responses',async()=>{
 let calls=0;await withMocks(async(url,options)=>{
 calls++;if(url==='https://redis.example')return Response.json({result:1});
 assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.match(body.instructions,/language sv/);assert.equal(body.input[0].content[1].type,'input_image');assert.equal(body.tools,undefined);
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Synliga observationer.'}]}]});
 },async()=>{const r=await POST(request({action:'observe'}));assert.equal(r.status,200);assert.equal((await r.json()).analysis,'Synliga observationer.');assert.equal(calls,2)});
});
test('valuation requires live search and filters unsourced comparable prices before returning a range',async()=>{
 await withMocks(async(url,options)=>{
 if(url==='https://redis.example')return Response.json({result:1});const payload=JSON.parse(options.body);assert.equal(payload.tool_choice,'required');assert.equal(payload.max_tool_calls,3);assert.equal(payload.tools[0].type,'web_search');
 return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:urls}},{type:'message',content:[{type:'output_text',text:JSON.stringify({exterior:'Svart förstärkare.',analysis:'Svensk analys',comparables:[sale(urls[0].url,10000),sale(urls[1].url,14000),sale('https://invented.example',99999)]})}]}]});
 },async()=>{const r=await POST(request({action:'value',currency:'SEK',market:'Sweden'}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.comparables.length,0);assert.equal(d.valuation,null);assert.equal(d.currency,'SEK');assert.match(d.analysis,/Ägarens uppgifter — inte oberoende verifierade\nVintage amplifier/);assert.doesNotMatch(d.analysis,/Svensk analys/)});
});
test('tracking URLs and repeated descriptions of the same sale do not inflate evidence',()=>{
 const sourceUrls=[...urls,{url:urls[0].url+'?utm_source=test'},{url:'https://other.example/mirror'}];
 const r=marketEvidence([sale(urls[0].url,10000),sale(urls[0].url+'?utm_source=test',10000),sale('https://other.example/mirror',10000)],sourceUrls,'SEK',true);assert.equal(r.comparables.length,1);assert.equal(r.valuation,null);
});

const verifiedSale=(amount,url='https://auctionet.com/en/one')=>sale(url,amount,{evidence:{excerpt:`Marshall JMP 1987 4x12. Sold. Hammer price SEK ${amount}. 2026-09-01.`,identity:'Marshall JMP 1987 4x12',price:`SEK ${amount}`,sold:'Sold',date:'2026-09-01',fees:'Hammer price'}});
const terms=['Marshall','1987','4x12'];
test('independent page evidence rejects invented prices, foreign currency, missing components and unsold lots',()=>{
 const c=verifiedSale(10000);const html='<article>'+c.evidence.excerpt+'</article>';
 assert.equal(pageSaleEvidence(c,html,terms),true);
 assert.equal(pageSaleEvidence({...c,amount:14000},html,terms),false);
 assert.equal(pageSaleEvidence(c,html.replace('SEK','GBP'),terms),false);
 assert.equal(pageSaleEvidence(c,html,['Marshall','1959']),false);
 const unsold={...c,evidence:{...c.evidence,excerpt:c.evidence.excerpt.replace('Sold','Not sold'),sold:'Not sold'}};
 assert.equal(pageSaleEvidence(unsold,unsold.evidence.excerpt,terms),false);
 for(const url of ['http://auctionet.com/x','https://auctionet.com.evil.test/x','https://127.0.0.1/x','https://user:pass@auctionet.com/x'])assert.equal(saleURL(url),null);
});
test('valuation retrieves and checks both disclosed sale pages before returning their observed range',async()=>{
 const comps=[verifiedSale(10000),verifiedSale(14000,'https://auctionet.com/en/two')];let pages=0;
 await withMocks(async(url,options)=>{
 if(url==='https://redis.example')return Response.json({result:1});
 const c=comps.find(c=>c.url===url);if(c){pages++;return new Response('<article>'+c.evidence.excerpt+'</article>',{headers:{'Content-Type':'text/html'}})}
 return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:comps.map(c=>({url:c.url}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({exterior:'Svart förstärkartopp och separat högtalarlåda.',analysis:'Synligt: förstärkare. Ägaruppgift: modell. Osäkerhet: invändigt skick.',searchTerms:terms,comparables:comps})}]}]});
 },async()=>{const r=await POST(request({action:'value'}));assert.equal(r.status,200);const d=await r.json();assert.equal(pages,2);assert.equal(d.comparables.length,2);assert.equal(d.valuation.low,10000);assert.equal(d.valuation.high,14000)});
});

test('context links are retrieved citations, safely labelled and never treated as sales',()=>{
 const links=researchLinks([{url:'https://auctionet.com/en/context'},{url:'https://auctionet.com/en/context'},{url:'https://reverb.com/item/folkesson-owner'},{url:'http://auctionet.com/x'},{url:'https://evil.example/x'}],[]);
 assert.equal(links.length,1);assert.equal(links[0].amount,undefined);assert.equal(links[0].title,'auctionet.com');
});
test('prose research formatting retains the photo and produces separated visible observations',async()=>{
 let aiCalls=0;
 await withMocks(async(url,options)=>{
 if(url==='https://redis.example')return Response.json({result:1});aiCalls++;const payload=JSON.parse(options.body);
 if(aiCalls===1)return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://auctionet.com/en/context'}]}},{type:'message',content:[{type:'output_text',text:'No independently disclosed matching sale prices found.'}]}]});
 assert.equal(payload.input[0].content[0].image_url,image);assert.equal(payload.tools,undefined);assert.equal(payload.input[0].content.length,1);assert.match(payload.instructions,/visible exterior/);
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Svart förstärkartopp med separat högtalarlåda och synlig Marshall-logotyp.'}]}]});
 },async()=>{const response=await POST(request({action:'value'}));assert.equal(response.status,200);const data=await response.json();assert.match(data.analysis,/Svart förstärkartopp/);assert.match(data.analysis,/Ägarens uppgifter/);assert.equal(data.researchSources.length,1);assert.equal(data.valuation,null);assert.equal(aiCalls,2)});
});
