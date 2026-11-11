/**
 * VUECORE shared model extraction adapter.
 * This is a pure transport boundary: caller supplies an existing model runner,
 * quota gate, schema and prompt. No model invocation is made unless authorized.
 */
export function createVisionExtractor({run,allow,parse,timeoutMs=15000}={}){
 if(typeof run!=='function'||typeof allow!=='function'||typeof parse!=='function')throw new TypeError('Shared vision extractor requires runner, budget gate and parser');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)throw new RangeError('Invalid vision timeout');
 return async ({image,question='',language='en'})=>{
  if(!await allow())throw new Error('Shared vision budget unavailable');
  const result=await run({image,question,language,timeoutMs});
  return parse(result);
 };
}
