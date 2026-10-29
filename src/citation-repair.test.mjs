import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyze} from './analysis.mjs';
test('citation recovery permits one addition but never changes billing facts',async()=>{
 const cases=JSON.parse(await readFile(new URL('./fixtures/observed-citation-failures.json',import.meta.url),'utf8'));
 const fixture=cases.find(x=>x.id==='E07');
 fixture.result.billingItems=[{id:'B1',description:'One logo with two revision rounds',status:'ACCEPTED',unitAmount:'100.00',quantity:1,priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']}];
 const repaired={citations:{pendingIssues:['M1']}};
 const originalFetch=globalThis.fetch,originalKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-test-key';
 try{
  for(const changed of [false,true]){
   let calls=0;globalThis.fetch=async()=>{const result=calls++===0?fixture.result:changed?{...repaired,amount:'999.00'}:repaired;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(result)},finish_reason:'stop'}]})};};
   if(changed)await assert.rejects(analyze(fixture.messages));else{const result=await analyze(fixture.messages);assert.equal(result.modelReportedAmount,'100.00');assert.equal(result.amount,null);assert.equal(result.currency,null);assert.ok(result.evidence.some(x=>x.field==='pendingIssues'));}
   assert.equal(calls,2);
  }
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=originalKey;}
});
test('recover multiple missing fields; reject nonexistent IDs and invalid original facts',async()=>{
 const messages=[{id:'M1',speaker:'seller',text:'One logo costs USD 100.'},{id:'M2',speaker:'buyer',text:'Let me think.'}];
 const result={agreementStatus:'NEEDS_CONFIRMATION',amount:null,currency:null,service:null,pendingIssues:['No offer has been accepted.'],evidence:[],billingItems:[]};
 const originalFetch=globalThis.fetch,originalKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-test-key';
 try{
  for(const mode of ['valid','invalid-id','invalid-original','missing-field','unsupported-field']){
   let calls=0;globalThis.fetch=async()=>{const citations=mode==='missing-field'?{agreementStatus:['M2']}:mode==='unsupported-field'?{agreementStatus:['M2'],pendingIssues:[]}:{agreementStatus:['M2'],pendingIssues:[mode==='invalid-id'?'M99':'M2']};const value=calls++===0?(mode==='invalid-original'?{...result,amount:'100.00'}:result):{citations};return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(value)},finish_reason:'stop'}]})};};
   if(mode==='valid'){const recovered=await analyze(messages);assert.equal(recovered.amount,null);assert.equal(recovered.agreementStatus,'NEEDS_CONFIRMATION');assert.equal(recovered.evidence[0].quote,'Let me think.');}else await assert.rejects(analyze(messages));
   assert.equal(calls,mode==='invalid-original'?1:2);
  }
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=originalKey;}
});
test('pending-only service is excluded from agreed scope without inventing acceptance or repairing evidence',async()=>{
 const messages=[{id:'M1',speaker:'seller',text:'One shelf costs USD 120.'},{id:'M2',speaker:'buyer',text:'Only if installation is included.'}];
 const raw={agreementStatus:'NEEDS_CONFIRMATION',amount:null,currency:'USD',service:'one shelf (installation pending)',pendingIssues:['Installation is not agreed.'],billingItems:[{id:'B1',description:'One shelf including installation',status:'PENDING',quantity:1,unitAmount:'120.00',priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:[],acceptanceEvidence:[]}],evidence:[{field:'currency',messageId:'M1',quote:messages[0].text},{field:'agreementStatus',messageId:'M2',quote:messages[1].text},{field:'pendingIssues',messageId:'M2',quote:messages[1].text}]};
 const originalFetch=globalThis.fetch,originalKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-test-key';let calls=0;
 try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(raw)},finish_reason:'stop'}]})}};const result=await analyze(messages);assert.equal(result.service,null);assert.equal(result.amount,null);assert.equal(result.calculation.canInvoice,false);assert.equal(result.billingItems[0].status,'PENDING');assert.equal(result.modelReportedService,raw.service);assert.equal(calls,1);}finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=originalKey;}
});
test('analysis survives one transient HTTP failure without changing extracted billing facts',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));const originalFetch=globalThis.fetch,originalKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-test-key';let calls=0;
 try{globalThis.fetch=async()=>{if(calls++===0)return {ok:false,status:503,body:{cancel:async()=>{}}};return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(fixture.billingResult)},finish_reason:'stop'}]})};};const result=await analyze(fixture.messages);assert.equal(result.amount,'100.00');assert.equal(result.calculation.canInvoice,true);assert.equal(calls,2);assert.equal(result.requestDiagnostics.transportRetries.length,1);assert.equal(result.requestDiagnostics.transportRetries[0].httpStatus,503);}finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=originalKey;}
});
