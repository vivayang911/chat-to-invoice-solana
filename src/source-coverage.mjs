import {quotedAmounts,monetaryNumberToken} from './billing.mjs';
export function explicitBuyerTotal(messages){
 const buyer=messages.findLast(m=>m.speaker==='buyer');
 if(!buyer||!/(?:\b(?:accept|agree|confirm)\b|接受|同意|确认)/i.test(buyer.text)||/(?:\b(?:if|unless|not)\b|don.t|如果|不接受|不同意|除非)/i.test(buyer.text))return null;
 const pattern=new RegExp(String.raw`(?:\btotal(?:\s+(?:price|amount))?\b|总价|总共|合计|总计)\s*(?:(?:is|of|为|是|:|：)\s*)?(?:USD\s*(${monetaryNumberToken})|(${monetaryNumberToken})\s*(?:USD(?=$|[^A-Za-z])|美元))`,'gi');
 const matches=[...buyer.text.matchAll(pattern)];
 if(matches.length!==1)return null;
 const values=quotedAmounts(matches[0][1]||matches[0][2]);
 return values.length===1?{amount:values[0],messageId:buyer.id,quote:buyer.text}:null;
}
// An explicitly stated but unsupported/ambiguous USD total must not be treated
// as if the customer never stated a total at all.
export function unresolvedBuyerTotal(messages){
 const buyer=messages.findLast(m=>m.speaker==='buyer');
 if(!buyer||!/(?:\b(?:accept|agree|confirm)\b|接受|同意|确认)/i.test(buyer.text)||/(?:\b(?:if|unless|not)\b|don.t|如果|不接受|不同意|除非)/i.test(buyer.text))return null;
 const marker=String.raw`(?:\btotal(?:\s+(?:price|amount))?\b|总价|总共|合计|总计)\s*(?:(?:is|of|为|是|:|：)\s*)?`;
 const stated=new RegExp(marker+String.raw`(?:USD(?=$|[^A-Za-z])|美元|${monetaryNumberToken}\s*(?:USD(?=$|[^A-Za-z])|美元))`,'i').test(buyer.text);
 return stated&&!explicitBuyerTotal(messages)?{messageId:buyer.id,quote:buyer.text}:null;
}
export function uncoveredFinancialTail(result,messages){
 const refs=new Set((result?.evidence||[]).map(e=>e?.messageId));
 for(const item of result?.billingItems||[])for(const field of ['priceEvidence','quantityEvidence','acceptanceEvidence'])for(const id of Array.isArray(item?.[field])?item[field]:[])refs.add(id);
 const last=messages.reduce((index,message,i)=>refs.has(message.id)?i:index,-1);
 return messages.slice(last+1).filter(m=>/(?:USD|美元|cancel|withdraw|revis|reduce|increase|instead|could you|what about|also add|can you|取消|撤回|更正|改成|减少|增加|再加|还能|还要)/i.test(m.text)).map(m=>m.id);
}
