import {quotedAmounts} from './billing.mjs';
// These are review candidates, not programmatic acceptance or authorization.
export function contextualReplies(messages){
 const candidates=[];
 for(let index=1;index<messages.length;index++){
  const reply=messages[index],quote=messages[index-1];
  if(reply.speaker!=='buyer'||quote.speaker!=='seller')continue;
  const text=reply.text.trim(),prefix=/^(好的|好|可以|okay|ok|yes)[,，。.！!\s]+(.+)$/i.exec(text);
  if(!prefix||!/(?:再加|另外|还能|还要|what about|also|another)/i.test(prefix[2])||/(?:如果|要是|条件|不要|取消|算了|\bif\b|unless|cancel|instead|don.t)/i.test(text))continue;
  if(!/(?:USD|美元)/i.test(quote.text)||new Set(quotedAmounts(quote.text)).size!==1||/(?:\bor\b|或者|还是|任选)/i.test(quote.text))continue;
  candidates.push({quoteId:quote.id,replyId:reply.id,acknowledgement:prefix[1],followingClause:prefix[2],laterBuyerMessage:messages.slice(index+1).some(m=>m.speaker==='buyer')});
 }
 return candidates;
}
export function missingContextualReferences(items,candidates){
 if(!Array.isArray(items))return [];
 // A fully settled later recap may replace earlier source references.
 if(items.length&&items.every(item=>['ACCEPTED','CANCELLED'].includes(item.status)))return [];
 return candidates.filter(pair=>{
  const row=items.find(item=>item.priceEvidence?.includes(pair.quoteId));
  return !row||!row.acceptanceEvidence?.includes(pair.replyId)||(row.status==='PENDING'&&!pair.laterBuyerMessage);
 });
}
