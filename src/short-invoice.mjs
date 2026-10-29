// Public, deterministic short-invoice representation shared by the server and review UI.
// No chat text, access tokens, email addresses or wallet addresses are copied into the memo.
export const SHORT_INVOICE_POLICY='SHORT_INVOICE_V2';
export const MAX_MEMO_BYTES=500;
const invalid=message=>{throw Error('Solana: '+message);};
const money=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d{0,7})\.\d{2}$/.test(value))invalid('invalid short-invoice amount.');return BigInt(value.replace('.',''));};
const format=cents=>`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
export function shortInvoice(statement){
 if(!['SHORT_INVOICE_V1',SHORT_INVOICE_POLICY].includes(statement?.draft?.onChainInvoice))invalid('generate a new statement with public short-invoice disclosure before paying.');
 if(!/^[a-f0-9-]{36}$/.test(statement.id)||!Number.isSafeInteger(statement.version)||statement.version<1||!/^[a-f0-9]{64}$/.test(statement.fingerprint))invalid('invalid short-invoice statement identity.');
 if(!Array.isArray(statement.items)||!statement.items.length)invalid('short invoice has no items.');
 const ids=new Set();let total=0n;
 const items=statement.items.map(item=>{
  if(typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.description!=='string'||!item.description.trim()||/[\r\n\u0000-\u001f\u007f\u2028\u2029]/.test(item.description)||!Number.isSafeInteger(item.quantity)||item.quantity<=0)invalid('invalid short-invoice item.');
  ids.add(item.id);const unit=money(item.unitAmount),subtotal=unit*BigInt(item.quantity);total+=subtotal;
  return {id:item.id,name:item.description,qty:item.quantity,unit:item.unitAmount,total:format(subtotal)};
 });
 if(total<=0n||total!==money(statement.draft.amount))invalid('short invoice does not match the confirmed total.');
 return {app:'CTI',v:1,id:statement.id,sv:statement.version,hash:statement.fingerprint,asset:'TEST_USD',items,total:statement.draft.amount};
}
export function shortInvoiceMemo(statement){
 const invoice=shortInvoice(statement);
 const value=statement.draft.onChainInvoice==='SHORT_INVOICE_V1'?JSON.stringify(invoice):[
  'CTI Invoice v2',
  ...invoice.items.map(item=>`${item.name}: ${item.qty} x ${item.unit} = ${item.total}`),
  `Total: ${invoice.total} TEST USD`,
  `Hash: ${invoice.hash}`
 ].join('\n');
 if(new TextEncoder().encode(value).length>MAX_MEMO_BYTES)invalid('short invoice exceeds 500 UTF-8 bytes. Nothing was omitted; shorten the agreed descriptions and reconfirm, or keep this invoice off-chain.');return value;
}
export function verifyShortInvoiceRecord(record){
 if(![1,2].includes(record.memoFormat))return;
 const expected=shortInvoiceMemo({id:record.id,version:record.statementVersion,fingerprint:record.fingerprint,items:record.items,draft:{amount:record.amount,onChainInvoice:'SHORT_INVOICE_V'+record.memoFormat}});
 if(expected!==record.memo)invalid('saved short invoice does not match the confirmed items.');
}
