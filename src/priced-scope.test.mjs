import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {selectedTextFeeGaps} from './priced-scope.mjs';import {analyze} from './analysis.mjs';
const messages=JSON.parse(await readFile(new URL('./fixtures/E19-input.json',import.meta.url),'utf8'));
const row=(id,description,unitAmount,source)=>({id,description,unitAmount,quantity:2,status:'ACCEPTED',priceBasis:'PER_UNIT',priceEvidence:[source],quantityEvidence:['M10'],acceptanceEvidence:['M11']});
const bad={agreementStatus:'CONFIRMED',amount:'10.00',currency:'USD',service:'Two cups',pendingIssues:[],billingItems:[row('B1','定制中杯（印5字祝福语）','2.00','M3'),row('B2','加印LOGO','3.00','M6')],evidence:['agreementStatus','amount','currency','service'].map(field=>({field,messageId:field==='currency'?'M3':'M11'}))};
const good={...bad,amount:'12.00',billingItems:[row('B1','中杯','2.00','M3'),row('B2','5字祝福语刻字','1.00','M3'),row('B3','加印LOGO','3.00','M6')]};
test('observed cup omission is detected; a selected paid option cannot disappear into base description',()=>{
 assert.equal(selectedTextFeeGaps(bad,messages).length,1);assert.equal(selectedTextFeeGaps(good,messages).length,0);
 assert.equal(selectedTextFeeGaps({...bad,agreementStatus:'NEEDS_CONFIRMATION'},messages).length,0);
 assert.equal(selectedTextFeeGaps(bad,messages.filter(m=>m.id!=='M4')).length,0);
 const variant=messages.map(m=>m.id==='M3'?{...m,text:m.text.replace('10字以内是1USD','10字以内是1.50USD')}:m);assert.equal(selectedTextFeeGaps(good,variant)[0].unitAmount,'1.50');
});
test('one bounded review can recover the omitted fee, but repeating the omission fails closed',async()=>{
 const savedFetch=globalThis.fetch,savedKey=process.env.AGNES_API_KEY;process.env.AGNES_API_KEY='synthetic';
 try{for(const unchanged of [false,true]){let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1||unchanged?bad:good)}}]})};};if(unchanged)await assert.rejects(analyze(messages),/omitted a separately quoted/);else{const result=await analyze(messages);assert.equal(result.amount,'12.00');assert.deepEqual(result.calculation.lines.map(x=>x.amount),['4.00','2.00','6.00']);assert.equal(result.requestDiagnostics.semanticReviewRequested,true);}assert.equal(calls,2);}}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.AGNES_API_KEY;else process.env.AGNES_API_KEY=savedKey;}
});
