import test from 'node:test';
import assert from 'node:assert/strict';
import {modelConfiguration,publicModelConfiguration,tokenResetMs,createModelRequester} from './model-provider.mjs';
test('provider config is explicit, fixed and never falls back to another key',()=>{
 assert.equal(modelConfiguration({AGNES_API_KEY:'private'}).provider,'agnes');
 assert.equal(modelConfiguration({MODEL_PROVIDER:'groq',GROQ_API_KEY:'private'}).model,'qwen/qwen3.8-27b');
 assert.throws(()=>modelConfiguration({MODEL_PROVIDER:'other',AGNES_API_KEY:'private'}),/unsupported/);
 assert.throws(()=>modelConfiguration({MODEL_PROVIDER:'groq',AGNES_API_KEY:'private'}),/GROQ_API_KEY/);
 assert.deepEqual(publicModelConfiguration({MODEL_PROVIDER:'groq',GROQ_API_KEY:'secret'}),{provider:'groq',model:'qwen/qwen3.8-27b',label:'Groq'});
});
test('quota duration parser rejects partial or malformed values',()=>{
 assert.equal(tokenResetMs('1m2.5s'),62500);assert.equal(tokenResetMs('1ms'),1);
 for(const value of ['bad15s','15sBAD','-1s','Infinitys','',null])assert.equal(tokenResetMs(value),0);
});
const config=modelConfiguration({MODEL_PROVIDER:'groq',GROQ_API_KEY:'private-test'});
const response=(model=config.model,reset='')=>({ok:true,status:200,headers:{get:()=>reset},json:async()=>({model,choices:[]})});
test('Groq requests use fixed identity and quota wait across analyses without changing payload',async()=>{
 let clock=0;const waits=[],bodies=[];
 const request=createModelRequester({now:()=>clock,wait:async(ms,signal)=>{assert.ok(signal);waits.push(ms);clock+=ms;},fetcher:async(url,options)=>{assert.equal(url,config.endpoint);assert.equal(options.redirect,'error');const body=JSON.parse(options.body);bodies.push(body);return response(config.model,'2s');}});
 const conversation=[{role:'user',content:'synthetic'}];
 await request(config,conversation,{deadline:10000});await request(config,conversation,{deadline:10000});
 assert.deepEqual(waits,[3000]);assert.equal(bodies[0].reasoning_effort,'none');assert.equal(bodies[0].chat_template_kwargs,undefined);assert.deepEqual(bodies[0].messages,conversation);
});
test('quota exceeding the remaining deadline fails closed without a new HTTP request',async()=>{
 let calls=0;const request=createModelRequester({now:()=>0,wait:async()=>{throw Error('must not wait');},fetcher:async()=>{calls++;return response(config.model,'10s');}});
 await request(config,[],{deadline:20000});await assert.rejects(request(config,[],{deadline:2000}),/quota needs more time/);assert.equal(calls,1);
});
test('an aborted quota wait does not issue an extra request',async()=>{
 let calls=0;const request=createModelRequester({now:()=>0,wait:async()=>{throw new DOMException('aborted','AbortError');},fetcher:async()=>{calls++;return response(config.model,'2s');}});
 await request(config,[],{deadline:10000});await assert.rejects(request(config,[],{deadline:10000}),{name:'AbortError'});assert.equal(calls,1);
});
test('unexpected Groq identity is rejected and no alternative model is attempted',async()=>{
 for(const returned of ['other-model',undefined]){let calls=0;const request=createModelRequester({fetcher:async()=>{calls++;return response(returned===undefined?null:returned);}});await assert.rejects(request(config,[],{deadline:Date.now()+10000}),/unexpected model/);assert.equal(calls,1);}
});
