import {fixedDevnetBudget,verifyPreparedTransaction} from './payment-transaction.mjs';
import {shortInvoiceMemo,verifyShortInvoiceRecord} from './short-invoice.mjs';
import bs58 from 'bs58';
import {Connection,PublicKey,Transaction,VersionedTransaction,TransactionInstruction} from '@solana/web3.js';
import {parseTokenAccount,getMint,getAssociatedTokenAddress,createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID} from './solana-token.mjs';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {validateDraft} from './draft-validation.mjs';
export const RPC='https://api.devnet.solana.com';
export const MEMO='MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const fail=message=>{throw Error('Solana: '+message);};
export function walletAddress(value){try{const key=new PublicKey(value);if(typeof value!=='string'||key.toBase58()!==value||!PublicKey.isOnCurve(key.toBytes()))fail('invalid wallet address.');return value;}catch{fail('invalid wallet address.');}}
export function validateSolanaDraft(data,analysis){
 const recipient=walletAddress(data.recipient);
 const draft=validateDraft(data,analysis);
 return {...draft,recipient,paymentNetwork:'solana-devnet',paymentAsset:'TEST_USD'};
}
export function tokenUnits(amount,decimals){if(!/^\d+\.\d{2}$/.test(amount)||!Number.isInteger(decimals)||decimals<2||decimals>9)fail('invalid test token denomination.');return BigInt(amount.replace('.',''))*10n**BigInt(decimals-2);}
export function verifyTokenPayment(tx,record){
 verifyShortInvoiceRecord(record);
 if(!tx||tx.meta?.err!==null||!Number.isInteger(tx.slot))fail('transaction failed or is unavailable.');
 if(tx.transaction?.signatures?.[0]!==record.signature)fail('signature mismatch.');
 const msg=tx.transaction.message,keys=msg.accountKeys;
 if(!keys?.some(k=>k.pubkey===record.payer&&k.signer===true))fail('expected buyer did not sign.');
 const instructions=msg.instructions;
 if(!Array.isArray(instructions)||instructions.filter(i=>i.programId===MEMO).length!==1||!instructions.some(i=>i.programId===MEMO&&i.parsed===record.memo))fail('statement memo does not match.');
 const transfers=instructions.filter(i=>i.programId===TOKEN_PROGRAM_ID.toBase58());
 if(transfers.length!==1)fail('expected exactly one token instruction.');
 const transfer=transfers[0],info=transfer.parsed?.info;
 if(transfer.parsed?.type!=='transferChecked'||info?.authority!==record.payer||info?.mint!==record.mint||info?.destination!==record.destination||info?.tokenAmount?.amount!==record.units||info?.tokenAmount?.decimals!==record.decimals)fail('payment amount, mint, buyer or recipient does not match.');
 const allowed=new Set([TOKEN_PROGRAM_ID.toBase58(),ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),MEMO,'ComputeBudget111111111111111111111111111111']);
 if(instructions.some(i=>!allowed.has(i.programId)))fail('unexpected transaction instruction.');
 const index=keys.findIndex(k=>k.pubkey===record.destination);
 const post=tx.meta.postTokenBalances?.find(b=>b.accountIndex===index),pre=tx.meta.preTokenBalances?.find(b=>b.accountIndex===index);
 if(!post||post.mint!==record.mint||post.owner!==record.merchant||post.uiTokenAmount?.decimals!==record.decimals|| (pre&&(pre.mint!==record.mint||pre.owner!==record.merchant)))fail('recipient token account does not match.');
 if(BigInt(post.uiTokenAmount.amount)-BigInt(pre?.uiTokenAmount?.amount||'0')!==BigInt(record.units))fail('recipient balance delta does not match.');
 return {slot:tx.slot};
}
export function createSolanaStore({statements,directory=new URL('../work/solana/',import.meta.url),connection=new Connection(RPC,{commitment:'finalized',disableRetryOnRateLimit:true,fetch:(url,options)=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)})}),merchant=process.env.SOLANA_MERCHANT,mint=process.env.SOLANA_TEST_MINT}={}){
 let running=false;
 const file=new URL('payments.json',directory);
 const config=()=>({network:'devnet',asset:'TEST_USD',merchant:walletAddress(merchant),mint:new PublicKey(mint).toBase58(),rpc:RPC});
 async function read(){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
 async function save(records){await mkdir(directory,{recursive:true});await writeFile(new URL('payments.tmp',directory),JSON.stringify(records,null,2));await rename(new URL('payments.tmp',directory),file);}
 async function lock(fn){if(running)fail('another payment query is running. Retry shortly.');running=true;try{return await fn();}finally{running=false;}}
 async function statement(data,{requireActive=true}={}){const s=await statements.status(data.id,data.token);if(requireActive&&(s.expired||s.status!=='CONFIRMED'||!s.buyerConfirmedAt||!s.sellerConfirmedAt||s.draft.paymentNetwork!=='solana-devnet'))fail('both parties must confirm an active Solana statement.');return s;}
 const view=r=>({network:'devnet',asset:'TEST_USD',amount:r.amount,merchant:r.merchant,mint:r.mint,payer:r.payer,status:r.status,signature:r.signature||null,explorer:r.signature?'https://explorer.solana.com/tx/'+r.signature+'?cluster=devnet':null,fingerprint:r.fingerprint,checkedAt:r.checkedAt||null,memo:r.memo,memoFormat:[1,2].includes(r.memoFormat)?'SHORT_INVOICE_V'+r.memoFormat:'LEGACY_REFERENCE',shortInvoice:r.memoFormat===1?JSON.parse(r.memo):null});
 return {config,
 async assertMutable(id){const records=await read();if(records[id]?.signature)fail('a transaction is already attached to this statement. Query payment status and start a new negotiation for changed work.');},
 async prepare(data){return statements.withInvoiceLock(data.id,()=>lock(async()=>{
  const s=await statement(data);if(s.role!=='buyer')fail('use the customer confirmation link to pay.');
  const c=config();if(s.draft.paymentMerchant!==c.merchant||s.draft.paymentMint!==c.mint)fail('payment configuration differs from the confirmed statement.');if(c.merchant===s.draft.recipient)fail('buyer and merchant must differ.');
  const records=await read();let r=records[s.id];
  if(r&&(r.fingerprint!==s.fingerprint||r.mint!==c.mint||r.merchant!==c.merchant))fail('saved payment terms changed.');
  if(r?.signature||r?.status==='PAID')return {payment:view(r)};
  const memo=shortInvoiceMemo(s);
  if(await connection.getGenesisHash()!=='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG')fail('RPC did not identify Solana devnet.');
  const mintInfo=await getMint(connection,new PublicKey(c.mint),'finalized',TOKEN_PROGRAM_ID);
  if(mintInfo.freezeAuthority)fail('use a test mint without a freeze authority.');
  const units=tokenUnits(s.draft.amount,mintInfo.decimals);if(units<=0n||units>18446744073709551615n)fail('amount exceeds token limits.');
  const payer=new PublicKey(s.draft.recipient),merchantKey=new PublicKey(c.merchant),mintKey=new PublicKey(c.mint);
  const source=await getAssociatedTokenAddress(mintKey,payer),destination=await getAssociatedTokenAddress(mintKey,merchantKey);
  const balance=parseTokenAccount(await connection.getAccountInfo(source,'finalized'),{mint:mintKey,owner:payer});if(balance.amount<units)fail('insufficient TEST USD balance in the buyer wallet.');
  r={id:s.id,fingerprint:s.fingerprint,amount:s.draft.amount,merchant:c.merchant,mint:c.mint,payer:payer.toBase58(),decimals:mintInfo.decimals,units:String(units),destination:destination.toBase58(),memo,memoFormat:s.draft.onChainInvoice==='SHORT_INVOICE_V2'?2:1,statementVersion:s.version,items:s.items,status:'READY'};
  const block=await connection.getLatestBlockhash('finalized');
  const tx=new Transaction({feePayer:payer,blockhash:block.blockhash,lastValidBlockHeight:block.lastValidBlockHeight}).add(...fixedDevnetBudget(),createAssociatedTokenAccountIdempotentInstruction(payer,destination,merchantKey,mintKey),createTransferCheckedInstruction(source,mintKey,destination,payer,units,mintInfo.decimals),new TransactionInstruction({programId:new PublicKey(MEMO),keys:[{pubkey:payer,isSigner:true,isWritable:false}],data:Buffer.from(r.memo)}));
  let wire;try{wire=tx.serialize({requireAllSignatures:false,verifySignatures:false});}catch{fail('short invoice does not fit this transaction. Nothing was omitted; shorten the descriptions and reconfirm.');}if(wire.length>1232)fail('short invoice exceeds the legacy transaction limit.');
  const simulation=await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()),{sigVerify:false,replaceRecentBlockhash:true,commitment:'finalized'});if(simulation.value.err)fail('short-invoice payment simulation failed. No transaction was submitted.');
  const fee=await connection.getFeeForMessage(tx.compileMessage(),'finalized');if(!Number.isSafeInteger(fee.value)||fee.value<0)fail('could not determine the test SOL transaction fee.');
  const recipientAccount=await connection.getAccountInfo(destination,'finalized');if(recipientAccount)parseTokenAccount(recipientAccount,{mint:mintKey,owner:merchantKey});
  const rent=recipientAccount?0:await connection.getMinimumBalanceForRentExemption(165,'finalized');const sol=await connection.getBalance(payer,'finalized');if(!Number.isSafeInteger(rent)||rent<0||!Number.isSafeInteger(sol)||sol<fee.value+rent)fail('insufficient test SOL for transaction fees and recipient account creation.');
  r.message=tx.serializeMessage().toString('base64');records[s.id]=r;await save(records);
  return {payment:view(r),transaction:wire.toString('base64')};
 }));},
 async submit(data){return statements.withInvoiceLock(data.id,()=>lock(async()=>{
 const s=await statement(data);if(s.role!=='buyer')fail('buyer access required.');const records=await read(),r=records[s.id];if(!r||r.fingerprint!==s.fingerprint)fail('prepare this payment first.');if(r.signature) return {payment:view(r)};
 if(![1,2].includes(r.memoFormat))fail('prepare a new public short-invoice statement before submitting.');verifyShortInvoiceRecord(r);if(r.memo!==shortInvoiceMemo(s))fail('short invoice differs from the current confirmed statement.');
 if(typeof data.transaction!=='string'||data.transaction.length>3000)fail('invalid signed transaction.');const signed=Transaction.from(Buffer.from(data.transaction,'base64'));verifyPreparedTransaction(signed,r.message);
 r.signature=bs58.encode(signed.signature);if(Object.values(records).some(other=>other.id!==r.id&&other.signature===r.signature))fail('transaction already used by another statement.');r.status='PENDING';await save(records);
 try{const sent=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,preflightCommitment:'finalized',maxRetries:0});if(sent!==r.signature)fail('RPC signature mismatch.');}catch{fail('submission outcome uncertain. Query the saved transaction; do not pay again.');}
 return {payment:view(r)};
 }));},
 async status(data){return statements.withInvoiceLock(data.id,()=>lock(async()=>{
  const s=await statement(data,{requireActive:false}),records=await read(),r=records[s.id];if(!r){if(data.signature)fail('prepare this statement payment first.');return {payment:null,prepared:false};}if(r.fingerprint!==s.fingerprint)fail('saved payment terms changed.');
  if(data.signature){if(s.role!=='buyer')fail('buyer access required to query a candidate signature.');if(!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(data.signature))fail('invalid signature.');if(r.signature&&r.signature!==data.signature)fail('signature differs from the saved transaction.');}
  if([1,2].includes(r.memoFormat)){verifyShortInvoiceRecord(r);if(r.memo!==shortInvoiceMemo(s))fail('saved on-chain invoice differs from the confirmed statement.');}
  // Status is read-only until an actual submission is persisted. Never attach arbitrary signatures.
  if(['PAID','FAILED'].includes(r.status))return {payment:view(r)};
  if(!r.signature)return {payment:view(r)};
  const statuses=await connection.getSignatureStatuses([r.signature],{searchTransactionHistory:true});const state=statuses.value[0];
  r.checkedAt=new Date().toISOString();
  if(state?.confirmationStatus==='finalized'&&state.err){r.status='FAILED';await save(records);return {payment:view(r)};}
  if(state?.confirmationStatus!=='finalized'){r.status='PENDING';await save(records);return {payment:view(r)};}
  const tx=await connection.getParsedTransaction(r.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
  if(!tx){r.status='PENDING';await save(records);return {payment:view(r)};}
  const normalized={...tx,transaction:{...tx.transaction,message:{...tx.transaction.message,accountKeys:tx.transaction.message.accountKeys.map(k=>({...k,pubkey:k.pubkey.toBase58()})),instructions:tx.transaction.message.instructions.map(i=>({...i,programId:i.programId.toBase58()}))}}};
  try{verifyTokenPayment(normalized,r);r.status='PAID';}catch(e){r.status='MISMATCH';await save(records);throw e;}
  await save(records);return {payment:view(r)};
 }));}
 };
}

