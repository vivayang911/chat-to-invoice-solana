import {setTimeout as delay} from 'node:timers/promises';
import {requestModelJson} from './model-transport.mjs';
const providers={agnes:{model:'agnes-3.0-flash',endpoint:'https://apihub.agnes-ai.com/v1/chat/completions',keyName:'AGNES_API_KEY',label:'Agnes AI'},groq:{model:'qwen/qwen3.8-27b',endpoint:'https://api.groq.com/openai/v1/chat/completions',keyName:'GROQ_API_KEY',label:'Groq'}};
export function modelConfiguration(env=process.env,{requireKey=true}={}){
 const provider=env.MODEL_PROVIDER||'agnes',config=providers[provider];
 if(!config)throw Error('The server has an unsupported MODEL_PROVIDER. Select agnes or groq.');
 const key=env[config.keyName]?.trim();
 if(requireKey&&(!key||key.includes('这里填')||key.startsWith('replace_')))throw Error('The server is missing '+config.keyName+'.');
 return {provider,...config,key};
}
export function publicModelConfiguration(env=process.env){const {provider,model,label}=modelConfiguration(env,{requireKey:false});return {provider,model,label};}
export function tokenResetMs(value){
 if(typeof value!=='string'||!/^([0-9]+(?:\.[0-9]+)?(?:ms|h|m|s))+$/.test(value))return 0;
 const ms=[...value.matchAll(/([0-9.]+)(ms|h|m|s)/g)].reduce((sum,m)=>sum+Number(m[1])*({ms:1,s:1000,m:60000,h:3600000}[m[2]]),0);
 return Number.isFinite(ms)?ms:0;
}
export function createModelRequester({fetcher=(...args)=>fetch(...args),now=Date.now,wait=(ms,signal)=>delay(ms,undefined,{signal})}={}){
 let nextGroqRequestAt=0,tail=Promise.resolve();
 return async function request(config,conversation,{maxTokens=2400,deadline,budget,onRetry}={}){
  const body={model:config.model,temperature:0,max_tokens:maxTokens,messages:conversation,...(config.provider==='groq'?{reasoning_effort:'none'}:{chat_template_kwargs:{enable_thinking:false}})};
  const fetchModel=async(url,options)=>{
   const execute=async()=>{
    options.signal?.throwIfAborted();
    const pause=config.provider==='groq'?Math.max(0,nextGroqRequestAt-now()):0;
    if(pause){if(pause>60000||deadline-now()<pause+1000)throw Error('The model quota needs more time. Please wait and retry. No invoice was created.');await wait(pause,options.signal);}
    options.signal?.throwIfAborted();
    if(now()>=deadline)throw new DOMException('Model request deadline exceeded.','TimeoutError');
    const response=await fetcher(url,options);
    if(config.provider==='groq'){
     const reset=tokenResetMs(response.headers?.get?.('x-ratelimit-reset-tokens'));
     if(reset)nextGroqRequestAt=now()+reset+1000;
    }
    if(!response.ok)return response;
    const json=await response.json();
    if((config.provider==='groq'&&!json.model)||(json.model&&json.model!==config.model))throw Error('The model returned an unexpected model identifier. Analysis stopped.');
    return {ok:true,status:response.status,headers:response.headers,json:async()=>json};
   };
   if(config.provider!=='groq')return execute();
   const running=tail.then(execute);tail=running.catch(()=>{});return running;
  };
  return requestModelJson(config.endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(body)},{deadline,budget,onRetry,fetcher:fetchModel,now,maxRetryDelay:config.provider==='groq'?60000:2000});
 };
}
export const requestConfiguredModel=createModelRequester();
