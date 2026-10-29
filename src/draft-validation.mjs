import {calculateBilling} from './billing.mjs';
export function validateDraft(data,analysis){
 if(!analysis||analysis.agreementStatus!=='CONFIRMED'||analysis.currency!=='USD')throw Error('Invoice: analyze a confirmed USD agreement first.');
 if(data.reviewed!==true||!Array.isArray(analysis.pendingIssues)||analysis.pendingIssues.length)throw Error('Invoice: clarify open issues in the conversation and analyze again before invoicing.');
 if(!Array.isArray(analysis.billingItems)||analysis.calculation?.version!==1)throw Error('Invoice: itemized pricing is required. Analyze again.');
 const correction=analysis.calculation?.arithmeticCorrection;
 if(correction&&(correction.method!=='INTEGER_CENTS'||correction.originalModelTotal!==analysis.modelReportedAmount||correction.programTotal!==analysis.amount))throw Error('Invoice: invalid arithmetic audit.');
 const verified=calculateBilling(analysis.billingItems,{currency:analysis.currency,agreementStatus:analysis.modelAgreementStatus,modelReportedAmount:correction?null:analysis.modelReportedAmount,pendingIssues:analysis.pendingIssues,explicitTotal:analysis.explicitTotal??null});
 if(!verified.canInvoice||verified.amount!==analysis.amount||data.amount!==verified.amount||data.service!==verified.service)throw Error('Invoice: the draft does not match the independently calculated items.');
 const requiredIds=analysis.billingItems.filter(i=>i.status==='ACCEPTED').map(i=>i.id);
 if(!Array.isArray(data.reviewedItemIds)||data.reviewedItemIds.length!==requiredIds.length||new Set(data.reviewedItemIds).size!==requiredIds.length||!requiredIds.every(id=>data.reviewedItemIds.includes(id)))throw Error('Invoice: review every included item before creating an invoice.');
 if(typeof data.service!=='string'||!data.service.trim()||data.service.length>1000)throw Error('Invoice: service must contain 1–1,000 characters.');
 if(typeof data.amount!=='string'||! /^(?:0|[1-9]\d{0,7})\.\d{2}$/.test(data.amount)||Number(data.amount)<=0)throw Error('Invoice: enter a positive USD amount with two decimal places.');
 if(typeof data.recipient!=='string'||!data.recipient.trim()||data.recipient.length>254)throw Error('Invoice: recipient is required.');
 return {service:data.service.trim(),amount:data.amount,currency:'USD',recipient:data.recipient.trim()};
}
