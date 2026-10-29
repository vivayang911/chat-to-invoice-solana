import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze,parseChat} from './analysis.mjs';
const messages=parseChat('seller: Retouch one photo for USD 20.\nbuyer: Okay. What about adding a background?\nseller: A background adds USD 5.');
const photo={id:'B1',description:'One retouched photo',status:'PENDING',quantity:1,unitAmount:'20.00',priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:[]};
const extra={id:'B2',description:'Background',status:'PENDING',quantity:1,unitAmount:'5.00',priceBasis:'ONE_OFF',priceEvidence:['M3'],quantityEvidence:['M3'],acceptanceEvidence:[]};
const initial={billingItems:[photo,extra],agreementStatus:'NEEDS_CONFIRMATION',amount:null,currency:'USD',service:null,pendingIssues:['The additional background has not been accepted.'],evidence:[{field:'agreementStatus',messageId:'M3'},{field:'currency',messageId:'M1'},{field:'pendingIssues',messageId:'M3'}]};
const corrected={...initial,billingItems:[{...photo,status:'ACCEPTED',acceptanceEvidence:['M2']},extra],service:'One retouched photo',evidence:[...initial.evidence,{field:'service',messageId:'M1'}]};
test('one source-bound semantic review may restore a missed acknowledgement but not authorize a pending extra',async()=>{
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{for(const mode of ['correct','unchanged','invented-price']){let calls=0;globalThis.fetch=async()=>{calls++;const response=calls===1?initial:mode==='unchanged'?initial:mode==='invented-price'?{...corrected,billingItems:[{...corrected.billingItems[0],unitAmount:'900.00'},extra]}:corrected;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(response)}}]})};};
 if(mode==='correct'){const result=await analyze(messages);assert.equal(result.calculation.acceptedSubtotal,'20.00');assert.equal(result.amount,null);assert.equal(result.billingItems[1].status,'PENDING');assert.equal(result.requestDiagnostics.semanticReviewRequested,true);}else await assert.rejects(analyze(messages));assert.equal(calls,2);}
 }finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('one full source re-extraction can recover malformed JSON or missing structure, with normal price checks intact',async()=>{
 const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{for(const mode of ['bad-json','missing-items','still-invalid']){let calls=0;globalThis.fetch=async()=>{calls++;const first=mode==='bad-json'?'{':JSON.stringify({...fixture.billingResult,billingItems:undefined});const content=calls===1?first:mode==='still-invalid'?first:JSON.stringify(fixture.billingResult);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content}}]})};};
 if(mode==='still-invalid')await assert.rejects(analyze(fixture.messages));else{const result=await analyze(fixture.messages);assert.equal(result.amount,'100.00');assert.equal(result.requestDiagnostics.semanticReviewRequested,true);}assert.equal(calls,2);}
 }finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});
test('lossless decimal padding retains quoted value; numeric and excessive precision amounts remain rejected',async()=>{
 const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{for(const price of ['100',100,'100.001']){const raw={...fixture.billingResult,billingItems:fixture.billingResult.billingItems.map(i=>({...i,unitAmount:price}))};globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})});if(typeof price==='string'&&price==='100'){const result=await analyze(fixture.messages);assert.equal(result.amount,'100.00');assert.ok(result.formatCorrections.some(c=>c.includes('decimal string padded')));}else await assert.rejects(analyze(fixture.messages));}
 }finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('a model-confirmed amount cannot bypass an unsupported final customer total',async()=>{
 const messages=parseChat('seller: One logo costs USD 100.\nbuyer: I accept total USD 1e3.');
 const raw={agreementStatus:'CONFIRMED',amount:'100.00',currency:'USD',service:'One logo',pendingIssues:[],billingItems:[{id:'B1',description:'One logo',status:'ACCEPTED',quantity:1,unitAmount:'100.00',priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M2']}],evidence:['agreementStatus','amount','currency','service'].map(field=>({field,messageId:field==='agreementStatus'?'M2':'M1'}))};
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';
 try{globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})});const result=await analyze(messages);assert.equal(result.amount,null);assert.equal(result.calculation.canInvoice,false);assert.ok(result.safetyCorrections.includes('UNRESOLVED_EXPLICIT_TOTAL'));assert.ok(result.evidence.some(e=>e.field==='pendingIssues'&&e.quote===messages[1].text));}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('a model choosing an option from generic okay is reviewed once and cannot bypass rejection',async()=>{
 const messages=parseChat('seller: An edit is USD 25, or with music USD 40.\nbuyer: Okay.');
 const raw={agreementStatus:'CONFIRMED',amount:'25.00',currency:'USD',service:'Edit',pendingIssues:[],billingItems:[{id:'B1',description:'Edit',status:'ACCEPTED',quantity:1,unitAmount:'25.00',priceBasis:'ONE_OFF',priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M2']}],evidence:['agreementStatus','amount','currency','service'].map(field=>({field,messageId:field==='agreementStatus'?'M2':'M1'}))};
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';let calls=0;
 try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})};};await assert.rejects(analyze(messages),/ambiguous acknowledgement/);assert.equal(calls,2);}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('later seller recaps trigger bounded source review without being treated as buyer approval',async()=>{
 const {readFile}=await import('node:fs/promises');const f=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const messages=[...f.messages,{id:'M3',speaker:'seller',text:'Confirmed, one logo for USD 100 with two revision rounds.'}];
 const raw={...f.billingResult,billingItems:f.billingResult.billingItems.map(i=>({...i,priceEvidence:['M1','M3'],quantityEvidence:['M3'],acceptanceEvidence:['M2','M3']}))};
 const corrected={...f.billingResult,evidence:[...f.billingResult.evidence,{field:'service',messageId:'M3',quote:messages[2].text}]};
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic-key';let calls=0;
 try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1?raw:corrected)}}]})};};const result=await analyze(messages);assert.equal(result.amount,'100.00');assert.equal(result.requestDiagnostics.semanticReviewRequested,true);assert.equal(calls,2);}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('model-only arithmetic is computed by the program while original total stays auditable',async()=>{
 const {readFile}=await import('node:fs/promises');const f=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic';
 try{for(const fixed of [true,false]){let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...f.billingResult,amount:calls===2&&fixed?'100.00':'101.00'})}}]})};};const r=await analyze(f.messages);assert.equal(calls,1);assert.equal(r.amount,'100.00');assert.equal(r.calculation.canInvoice,true);assert.equal(r.modelReportedAmount,'101.00');assert.equal(r.calculation.arithmeticCorrection.originalModelTotal,'101.00');}}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('missing buyer approval sources trigger one review and cannot be invented by the server',async()=>{
 const {readFile}=await import('node:fs/promises');const f=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));const bad={...f.billingResult,billingItems:f.billingResult.billingItems.map(i=>({...i,acceptanceEvidence:['M1']}))};
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic';
 try{for(const corrected of [true,false]){let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1?bad:{acceptanceEvidence:{B1:corrected?['M2']:['M1']}})}}]})};};if(corrected)assert.equal((await analyze(f.messages)).amount,'100.00');else await assert.rejects(analyze(f.messages),/establish buyer acceptance/);assert.equal(calls,2);}}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('empty source evidence after whole-ledger review stops without an additional citation request',async()=>{
 const {readFile}=await import('node:fs/promises');const f=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8'));
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic';let calls=0;
 try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:calls===1?'{}':JSON.stringify({billingItems:[],agreementStatus:'NEEDS_CONFIRMATION',amount:null,currency:'USD',service:null,pendingIssues:[],evidence:[]})}}]})};};await assert.rejects(analyze(f.messages),/no original-message evidence/);assert.equal(calls,2);}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});


test('historical acceptance can be restored without approving the later quantity change',async()=>{
 const {readFile}=await import('node:fs/promises');const {evaluationCases}=await import('./evaluation-cases.mjs');const f=JSON.parse(await readFile(new URL('./fixtures/E11-history-gap.json',import.meta.url),'utf8')),messages=parseChat(evaluationCases.find(x=>x.id==='E11').chat);
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic';
 try{for(const mode of ['valid','new-price','wrong-source','empty']){let calls=0;globalThis.fetch=async()=>{calls++;const repaired=mode==='new-price'?{acceptanceEvidence:{B2:['M5']},unitAmount:'1.00'}:{acceptanceEvidence:{B2:mode==='wrong-source'?['M7']:mode==='empty'?[]:['M5']}};return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1?f:repaired)}}]})};};if(mode==='valid'){const r=await analyze(messages);assert.equal(r.amount,null);assert.equal(r.calculation.canInvoice,false);assert.equal(r.calculation.acceptedSubtotal,'100.00');assert.equal(r.billingItems[1].status,'PENDING');assert.equal(r.billingItems[1].quantity,f.billingItems[1].quantity);assert.equal(r.billingItems[1].unitAmount,'50.00');assert.deepEqual(r.billingItems[1].acceptanceEvidence,['M5']);assert.deepEqual(r.billingItems[2].acceptanceEvidence,[]);assert.equal(r.requestDiagnostics.historicalReferenceRepairRequested,true);assert.equal(r.requestDiagnostics.semanticReviewRequested,false);}else await assert.rejects(analyze(messages),/establish buyer acceptance/);assert.equal(calls,2);}}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});
