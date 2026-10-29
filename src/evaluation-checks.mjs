export function evaluationChecks(fixture,extracted){
  const expected=fixture.billingExpected||fixture;
  const checks={amount:extracted.amount===expected.amount,status:extracted.agreementStatus===(expected.status||fixture.status),currency:extracted.currency===fixture.currency,pending:fixture.pendingOptional===true||(extracted.pendingIssues.length>0)===fixture.pending,itemizedCalculation:extracted.calculation?.version===1,invoiceGate:extracted.calculation?.canInvoice===expected.canInvoice};
  if(fixture.revisions)checks.revisions=/(?:two|2)\s+revision/i.test(extracted.service||'');
  if(fixture.intermediateAcceptance)checks.intermediateAcceptanceCited=extracted.evidence.some(e=>e.messageId==='M5')||extracted.billingItems.some(item=>item.acceptanceEvidence.includes('M5'));
  if(fixture.excludeUnacceptedText)checks.noUnacceptedTextInService=!/文字|text|characters/i.test(extracted.service||'')||/不含|不包括|未包含|不包含|除外|未计入|待确认|excluding/i.test(extracted.service||'');
  if(fixture.requiredPriceEvidence)checks.contributingPricesCited=fixture.requiredPriceEvidence.every(ids=>extracted.evidence.some(e=>e.field==='amount'&&ids.includes(e.messageId))||extracted.billingItems.some(item=>item.status==='ACCEPTED'&&item.priceEvidence.some(id=>ids.includes(id))));
  if(fixture.requiredComponents)for(const component of fixture.requiredComponents)checks['component_'+component.name]=extracted.billingItems.some(item=>new RegExp(component.pattern,'i').test(item.description)&&item.unitAmount===component.unitAmount);
  if(fixture.id==='E09')checks.noCollectibleItems=extracted.amount===null&&extracted.service===null&&!extracted.billingItems.some(i=>i.status==='ACCEPTED');
  if(['E13','E14'].includes(fixture.id)){
   const accepted=extracted.billingItems.filter(item=>item.status==='ACCEPTED');
   checks.exactSettledComponents=accepted.length===3&&[['logo',1,'100.00'],['poster|海报',fixture.id==='E13'?3:1,'50.00'],['text|characters|文字|文本|字符',1,'60.00']].every(([pattern,quantity,price])=>accepted.some(item=>new RegExp(pattern,'i').test(item.description)&&item.quantity===quantity&&item.unitAmount===price));
  }
  if(fixture.id==='E12')checks.correctIntermediateStates=extracted.billingItems.some(i=>/poster|海报/i.test(i.description)&&i.status==='ACCEPTED'&&i.acceptanceEvidence.includes('M5'))&&extracted.billingItems.some(i=>/text|characters|文字|文本|字符/i.test(i.description)&&i.status==='PENDING');
  if(fixture.id==='E11')checks.changedPosterStillPending=extracted.billingItems.some(i=>/poster|海报/i.test(i.description)&&i.status==='PENDING');
  if(fixture.acceptedLineAmounts)checks.exactAcceptedLines=JSON.stringify(extracted.calculation.lines.map(line=>line.amount).sort())===JSON.stringify([...fixture.acceptedLineAmounts].sort());

 return checks;
}
