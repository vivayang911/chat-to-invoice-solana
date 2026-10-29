import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSolanaDraft} from './solana-payments.mjs';
const analysis=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8')).billingResult;
const wallet='2nTok1a3aT39MD1fu1i4svpF4AccSdHJUQcGTDrsjcdM';
const draft=()=>({service:analysis.service,amount:analysis.amount,recipient:wallet,reviewed:true,resolved:true,reviewedItemIds:analysis.billingItems.filter(i=>i.status==='ACCEPTED').map(i=>i.id)});

test('Solana draft validation retains the exact case-sensitive wallet and payment denomination',()=>{
 const validated=validateSolanaDraft(draft(),analysis);
 assert.equal(validated.recipient,wallet);
 assert.equal(validated.currency,'USD');
 assert.equal(validated.paymentNetwork,'solana-devnet');
 assert.equal(validated.paymentAsset,'TEST_USD');
 assert.throws(()=>validateSolanaDraft({...draft(),recipient:'buyer@example.com'},analysis),/wallet address/);
});

test('Solana draft rejects changed price, scope and missing item review after extraction',()=>{
 for(const changes of [{amount:'99.00'},{service:'Different scope'},{reviewed:false},{reviewedItemIds:[]},{reviewedItemIds:['invented']}]){
  assert.throws(()=>validateSolanaDraft({...draft(),...changes},analysis));
 }
});

test('a resolved checkbox cannot bypass unresolved financial terms or pending acceptance',()=>{
 assert.throws(()=>validateSolanaDraft(draft(),{...analysis,pendingIssues:['Unaccepted extra']}),/open issues/);
 assert.throws(()=>validateSolanaDraft(draft(),{...analysis,agreementStatus:'NEEDS_CONFIRMATION'}),/confirmed USD/);
});
