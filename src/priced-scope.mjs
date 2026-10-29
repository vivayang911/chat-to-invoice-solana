import {quotedPriceAmounts} from './billing.mjs';
// Narrow coverage guard for explicit short-text tiers, not a general semantic parser.
// It may block an ambiguous package; it never adds a charge or authorizes acceptance.
export function selectedTextFeeGaps(result,messages){
 if(result?.agreementStatus!=='CONFIRMED'||!Array.isArray(result.billingItems))return [];
 const gaps=[];
 for(let index=0;index<messages.length;index++){
  const source=messages[index];if(source.speaker!=='seller')continue;
  const patterns=[/(\d+)\s*字(?:以?内|以下)[^，,。;；]{0,20}?(?:USD\s*[0-9]+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?\s*(?:USD|美元))/gi,/up to\s+(\d+)\s+characters[^,.;]{0,30}?(?:USD\s*[0-9]+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?\s*USD)/gi];
  for(const pattern of patterns)for(const match of source.text.matchAll(pattern)){
   const limit=Number(match[1]),prices=quotedPriceAmounts(match[0]);if(prices.length!==1||prices[0]==='0.00')continue;
   const selected=messages.slice(index+1).find(m=>m.speaker==='buyer'&&[...m.text.matchAll(/(\d+)\s*(?:个)?(?:字|characters)/gi)].some(x=>Number(x[1])>0&&Number(x[1])<=limit));
   if(!selected)continue;
   const covered=result.billingItems.some(item=>item.status==='ACCEPTED'&&/祝福|刻字|文字|印字|字|text|inscri|engrav|letter|character/i.test(item.description||'')&&item.unitAmount===prices[0]&&item.priceEvidence?.includes(source.id));
   if(!covered)gaps.push({priceSourceId:source.id,selectionSourceId:selected.id,unitAmount:prices[0],reason:'Selected short-text fee is not separately represented at its quoted price. Clarify any package waiver or fee basis.'});
  }
 }
 return gaps;
}
