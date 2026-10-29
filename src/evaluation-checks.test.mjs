import test from 'node:test';import assert from 'node:assert/strict';import {evaluationChecks} from './evaluation-checks.mjs';import {evaluationCases} from './evaluation-cases.mjs';
test('both comparison and full evaluator require exact line amounts, not just the same final total',()=>{
 const fixture=evaluationCases.find(c=>c.id==='E20'),good={amount:'3900.00',agreementStatus:'CONFIRMED',currency:'USD',pendingIssues:[],calculation:{version:1,canInvoice:true,lines:[{amount:'2500.00'},{amount:'800.00'},{amount:'600.00'}]}};
 assert.equal(Object.values(evaluationChecks(fixture,good)).every(Boolean),true);
 const changed=structuredClone(good);changed.calculation.lines[0].amount='2600.00';changed.calculation.lines[1].amount='700.00';assert.equal(evaluationChecks(fixture,changed).exactAcceptedLines,false);
 assert.equal(evaluationChecks(fixture,{...good,amount:'4400.00'}).amount,false);assert.equal(evaluationChecks(fixture,{...good,currency:null}).currency,false);
});
