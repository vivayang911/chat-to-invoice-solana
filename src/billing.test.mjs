import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateBilling,validateBillingItems,toCents} from './billing.mjs';
const item=(id,unitAmount,quantity=1,priceBasis='ONE_OFF')=>({id,description:id,status:'ACCEPTED',unitAmount,quantity,priceBasis});
const options={currency:'USD',agreementStatus:'CONFIRMED',modelReportedAmount:null};
test('integer-cent arithmetic handles cents, quantities and one-off fees',()=>{
 assert.equal(calculateBilling([item('B1','0.10'),item('B2','0.20')],options).amount,'0.30');
 assert.equal(calculateBilling([item('B1','100.00'),item('B2','50.00',3,'PER_UNIT'),item('B3','60.00')],options).amount,'310.00');
 assert.equal(calculateBilling([item('B1','100.00'),item('B2','50.00',3,'PER_UNIT'),item('B3','60.00',3,'PER_UNIT')],options).amount,'430.00');
});
test('model arithmetic mismatch, ambiguous quantity and currency block invoicing',()=>{
 const items=[item('B1','100.00'),item('B2','50.00')];
 assert.ok(calculateBilling(items,{...options,modelReportedAmount:'100.00'}).blockers.includes('MODEL_TOTAL_MISMATCH'));
 assert.equal(calculateBilling([item('B1','50.00',null,'UNKNOWN')],options).amount,null);
 assert.equal(calculateBilling(items,{...options,currency:null}).canInvoice,false);
 assert.equal(calculateBilling(items,{...options,agreementStatus:'NEEDS_CONFIRMATION'}).amount,null);
 assert.equal(calculateBilling([{...item('B1','50.00'),status:'PENDING'}],options).amount,null);
});
test('pending and cancelled items are excluded, accepted amount is exact',()=>{
 const result=calculateBilling([item('B1','100.00'),{...item('B2','50.00'),status:'PENDING'},{...item('B3','60.00'),status:'CANCELLED'}],options);
 assert.equal(result.acceptedSubtotal,'100.00');assert.equal(result.amount,null);assert.ok(result.blockers.includes('PENDING_ITEMS'));assert.equal(result.lines.length,1);
});
test('invalid money, invented prices, missing acceptance and duplicate items are rejected',()=>{
 for(const v of [100,'1e2','-1.00','01.00','0.001'])assert.throws(()=>toCents(v));
 const messages=[{id:'M1',speaker:'seller',text:'One logo is USD 100.'},{id:'M2',speaker:'buyer',text:'I accept one logo.'}];
 const good={...item('B1','100.00'),priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']};
 assert.equal(validateBillingItems([good],messages).length,1);
 for(const changed of [{unitAmount:'999.00'},{acceptanceEvidence:['M1']},{quantityEvidence:[]},{quantity:3},{priceEvidence:['M99']}])assert.throws(()=>validateBillingItems([{...good,...changed}],messages));
 assert.throws(()=>validateBillingItems([good,good],messages));assert.throws(()=>validateBillingItems(undefined,messages));
});

test('format-only normalization is limited to pending/cancelled null enums and source arrays',async()=>{
 const {normalizeNonBillableShape}=await import('./billing.mjs');
 const original=[{id:'B1',status:'PENDING',priceBasis:null,quantity:null,unitAmount:null,priceEvidence:null,quantityEvidence:null,acceptanceEvidence:null},{id:'B2',status:'ACCEPTED',priceBasis:null,priceEvidence:null}];
 const normalized=normalizeNonBillableShape(original);
 assert.equal(normalized.items[0].priceBasis,'UNKNOWN');assert.deepEqual(normalized.items[0].priceEvidence,[]);assert.equal(normalized.items[0].status,'PENDING');assert.equal(normalized.items[0].unitAmount,null);assert.equal(normalized.items[0].quantity,null);assert.equal(normalized.items[1],original[1]);assert.equal(original[0].priceBasis,null);assert.equal(normalized.corrections.length,4);
});
test('quoted prices preserve grouping and never match truncated, negative or exponent amounts',()=>{
 const row={...item('B1','1000.00'),priceEvidence:['M1'],quantityEvidence:['M2'],acceptanceEvidence:['M2']};
 const messages=text=>[{id:'M1',speaker:'seller',text},{id:'M2',speaker:'buyer',text:'I accept.'}];
 for(const text of ['The price is USD 1,000.00.','USD 1,000, including delivery.','USD 1000.00','USD +1000.00'])assert.equal(validateBillingItems([row],messages(text))[0].unitAmount,'1000.00');
 for(const [text,wrong] of [['USD -100.00','100.00'],['USD −100.00','100.00'],['USD - 100.00','100.00'],['USD 100.001','100.00'],['USD 1e2','1.00'],['USD 1,00','1.00'],['USD 1.234,56','56.00'],['USD .50','50.00']])assert.throws(()=>validateBillingItems([{...row,unitAmount:wrong}],messages(text)),/quoted unit price/);
});
test('a new price cannot use buyer acceptance from before its matching source',()=>{
 const messages=[{id:'M1',speaker:'seller',text:'Logo USD 100.'},{id:'M2',speaker:'buyer',text:'I accept USD 100.'},{id:'M3',speaker:'seller',text:'Revised quote USD 150. Please confirm.'},{id:'M4',speaker:'buyer',text:'I accept the revised USD 150.'}];
 const row={...item('B1','150.00'),priceEvidence:['M1','M3'],quantityEvidence:['M1'],acceptanceEvidence:['M2']};
 assert.throws(()=>validateBillingItems([row],messages),/predates/);assert.equal(validateBillingItems([{...row,acceptanceEvidence:['M4']}],messages)[0].unitAmount,'150.00');
 assert.equal(validateBillingItems([{...row,priceEvidence:['M4'],acceptanceEvidence:['M4']}],messages)[0].unitAmount,'150.00');
 assert.equal(validateBillingItems([{...row,status:'PENDING'}],messages)[0].status,'PENDING');
});


test('open issues block invoicing even when the model omits a pending billing row',()=>{
 const rows=[item('B1','100.00')];
 const checked=calculateBilling(rows,{...options,pendingIssues:['The poster has not been priced or accepted.']});
 assert.equal(checked.acceptedSubtotal,'100.00');assert.equal(checked.amount,null);assert.equal(checked.canInvoice,false);assert.ok(checked.blockers.includes('OPEN_ISSUES'));
 assert.equal(calculateBilling(rows,{...options,pendingIssues:[]}).canInvoice,true);
});


test('unknown currency never acquires a USD label in the calculated service',()=>{
 const checked=calculateBilling([item('B1','100.00')],{...options,currency:null});assert.equal(checked.amount,null);assert.equal(checked.canInvoice,false);assert.ok(!checked.service.includes('USD'));assert.ok(checked.service.includes('currency unconfirmed'));
});


test('a seller quote cannot be included among claimed buyer acceptance sources',()=>{
 const messages=[{id:'M1',speaker:'seller',text:'One logo USD 100.'},{id:'M2',speaker:'buyer',text:'I accept.'}];
 assert.throws(()=>validateBillingItems([{...item('B1','100.00'),priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M1','M2']}],messages),/buyer evidence/);
});


test('an internally consistent subtotal cannot override the buyer final accepted total',()=>{
 const checked=calculateBilling([item('B1','80.00')],{...options,modelReportedAmount:'80.00',explicitTotal:'86.75'});assert.equal(checked.amount,null);assert.equal(checked.canInvoice,false);assert.ok(checked.blockers.includes('EXPLICIT_TOTAL_MISMATCH'));
 assert.equal(calculateBilling([item('B1','80.00'),item('B2','6.75')],{...options,modelReportedAmount:'86.75',explicitTotal:'86.75'}).amount,'86.75');
});


test('price evidence cannot use a character count when a different number is explicitly priced',async()=>{
 const {quotedPriceAmounts,hasExplicitUsd}=await import('./billing.mjs');
 const messages=[{id:'M1',speaker:'seller',text:'50 characters cost USD 100.'},{id:'M2',speaker:'buyer',text:'I accept the quote.'}];
 const row={...item('B1','50.00'),priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M2']};
 assert.throws(()=>validateBillingItems([row],messages),/quoted unit price/);
 assert.equal(validateBillingItems([{...row,unitAmount:'100.00'}],messages)[0].unitAmount,'100.00');
 assert.deepEqual(quotedPriceAmounts('50 characters cost 100USD.'),['100.00']);
 assert.deepEqual(quotedPriceAmounts('50 characters cost USD 1e2.'),[]);
 assert.deepEqual(quotedPriceAmounts('That adds 60.'),['60.00']);
 for(const text of ['100USD','USD100','50usd','100美元'])assert.equal(hasExplicitUsd(text),true);
 for(const text of ['USDT100','100USDA','No currency specified'])assert.equal(hasExplicitUsd(text),false);
});


test('later quantities and repeated price sources require acceptance after their cited changes',()=>{
 const messages=[{id:'M1',speaker:'seller',text:'Posters cost USD 50 each.'},{id:'M2',speaker:'buyer',text:'I accept one poster.'},{id:'M3',speaker:'seller',text:'Three posters at USD 50 each. Please confirm.'},{id:'M4',speaker:'buyer',text:'I accept three posters.'}];
 const row={...item('B1','50.00',3,'PER_UNIT'),priceEvidence:['M1'],quantityEvidence:['M3'],acceptanceEvidence:['M2']};
 assert.throws(()=>validateBillingItems([row],messages),/predates the cited quantity/);
 assert.throws(()=>validateBillingItems([{...row,quantityEvidence:['M1'],priceEvidence:['M1','M3']}],messages),/predates the cited price/);
 assert.equal(validateBillingItems([{...row,priceEvidence:['M1','M3'],acceptanceEvidence:['M4']}],messages)[0].quantity,3);
 assert.equal(validateBillingItems([{...row,quantityEvidence:['M4'],acceptanceEvidence:['M4']}],messages)[0].quantity,3);
 assert.equal(validateBillingItems([{...row,status:'PENDING'}],messages)[0].status,'PENDING');
});


test('generic acknowledgement cannot choose between differently priced alternatives',()=>{
 const messages=[{id:'M1',speaker:'seller',text:'An edit is USD 25, or with music USD 40.'},{id:'M2',speaker:'buyer',text:'Okay.'}];
 const row={...item('B1','25.00'),priceEvidence:['M1'],quantityEvidence:['M1'],acceptanceEvidence:['M2']};
 assert.throws(()=>validateBillingItems([row],messages),/ambiguous acknowledgement/);
 assert.equal(validateBillingItems([row],[{...messages[0],text:'An edit is USD 25.'},messages[1]])[0].status,'ACCEPTED');
 assert.equal(validateBillingItems([row],[messages[0],{...messages[1],text:'I choose the USD 25 edit.'}])[0].status,'ACCEPTED');
});
