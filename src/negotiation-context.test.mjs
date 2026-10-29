import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contextualReplies,missingContextualReferences} from './negotiation-context.mjs';
const pair=text=>[{id:'M1',speaker:'seller',text:'One poster costs USD 50.'},{id:'M2',speaker:'buyer',text}];
test('clause candidates link an acknowledgement only to its preceding single price',()=>{
 for(const text of ['Okay. What about adding a caption?','好的，再加50个文字呢']){const result=contextualReplies(pair(text));assert.equal(result.length,1);assert.equal(result[0].quoteId,'M1');assert.equal(result[0].replyId,'M2');}
 for(const text of ['Okay if delivery is included.','好的，如果包含运费再加文字','好的，不要了，另外加文字','Sounds interesting.','Okay.'])assert.deepEqual(contextualReplies(pair(text)),[]);
 assert.deepEqual(contextualReplies([{id:'M1',speaker:'seller',text:'A poster USD 50 or a banner USD 80.'},pair('Okay. What about a caption?')[1]]),[]);
});
test('context audit cannot promote a row, change a price or transfer acceptance',()=>{
 const candidates=contextualReplies(pair('Okay. What about a caption?'));const row={status:'PENDING',priceEvidence:['M1'],acceptanceEvidence:[],unitAmount:'50.00'};
 assert.equal(missingContextualReferences([row],candidates).length,1);assert.equal(row.status,'PENDING');assert.equal(row.unitAmount,'50.00');
 assert.equal(missingContextualReferences([{...row,acceptanceEvidence:['M2']}],candidates).length,1);
 assert.equal(missingContextualReferences([{...row,status:'ACCEPTED',acceptanceEvidence:['M2']}],candidates).length,0);
 assert.equal(missingContextualReferences([{...row,priceEvidence:['M9'],acceptanceEvidence:['M2']}],candidates).length,1);
});


test('settled final recaps need not repeat obsolete historical references',()=>{
 const rows=[{status:'ACCEPTED',priceEvidence:['M8'],acceptanceEvidence:['M9']}];assert.deepEqual(missingContextualReferences(rows,[{quoteId:'M4',replyId:'M5',laterBuyerMessage:true}]),[]);
 const pending=[{status:'PENDING',priceEvidence:['M4'],acceptanceEvidence:['M5']}];assert.deepEqual(missingContextualReferences(pending,[{quoteId:'M4',replyId:'M5',laterBuyerMessage:true}]),[]);
});
