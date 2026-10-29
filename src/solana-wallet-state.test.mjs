import test from 'node:test';
import assert from 'node:assert/strict';
import {signAndSubmit,paymentCanStart,samePaymentContext} from './solana-wallet-state.mjs';
test('wallet rejection does not persist an attempt or broadcast',async()=>{let remembered=0,sent=0;await assert.rejects(signAndSubmit({sign:async()=>{throw Error('User rejected');},serialize:()=>'',signatureOf:()=>'',remember:()=>remembered++,submit:()=>sent++}),/User rejected/);assert.equal(remembered,0);assert.equal(sent,0);});
test('signed identity persists before an uncertain submission and storage failure prevents broadcast',async()=>{const events=[];await assert.rejects(signAndSubmit({sign:async()=>({}),serialize:()=> 'wire',signatureOf:()=> 'signature',remember:value=>events.push(value),submit:async()=>{events.push('submit');throw Error('timeout');}}),/timeout/);assert.deepEqual(events,['signature','submit']);let sent=0;await assert.rejects(signAndSubmit({sign:async()=>({}),serialize:()=> 'wire',signatureOf:()=> 'signature',remember:()=>{throw Error('storage denied');},submit:()=>sent++}),/storage denied/);assert.equal(sent,0);});
test('payment gating requires both acknowledgements, active lifetime and verified configuration',()=>{const statement={status:'CONFIRMED',buyerConfirmedAt:'now',sellerConfirmedAt:'now'};assert.equal(paymentCanStart(statement,{configured:true}),true);for(const flags of [{configured:false},{configured:true,busy:true},{configured:true,attempted:true},{configured:true,expired:true}])assert.equal(paymentCanStart(statement,flags),false);assert.equal(paymentCanStart({...statement,buyerConfirmedAt:null},{configured:true}),false);assert.equal(paymentCanStart({...statement,status:'CHANGES_REQUESTED'},{configured:true}),false);});

test('payment context survives same-version rendering but rejects changed terms, links and cleared state',()=>{
 const original={id:'a',fingerprint:'hash',status:'CONFIRMED'},access={id:'a',token:'secret'};
 assert(samePaymentContext(original,{...original},access,{...access}));
 for(const [current,now] of [[null,access],[{...original,id:'b'},access],[{...original,fingerprint:'other'},access],[original,{...access,token:'other'}],[original,{...access,id:'b'}]])assert.equal(samePaymentContext(original,current,access,now),false);
});
