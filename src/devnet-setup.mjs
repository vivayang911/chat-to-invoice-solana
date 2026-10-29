import {Connection,Keypair,PublicKey,Transaction,VersionedTransaction,SystemProgram} from '@solana/web3.js';
import bs58 from 'bs58';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {RPC,walletAddress} from './solana-payments.mjs';
import {TOKEN_PROGRAM_ID,getAssociatedTokenAddress,createAssociatedTokenAccountIdempotentInstruction,createInitializeMint2Instruction,createMintToCheckedInstruction,getMint,parseTokenAccount} from './solana-token.mjs';
export async function buildTestMintTransaction(connection,buyer,mintKey=Keypair.generate()){
 const payer=new PublicKey(walletAddress(buyer)),mint=mintKey.publicKey,ata=await getAssociatedTokenAddress(mint,payer);
 const block=await connection.getLatestBlockhash('finalized'),rent=await connection.getMinimumBalanceForRentExemption(82,'finalized');
 const tx=new Transaction({feePayer:payer,blockhash:block.blockhash,lastValidBlockHeight:block.lastValidBlockHeight}).add(SystemProgram.createAccount({fromPubkey:payer,newAccountPubkey:mint,lamports:rent,space:82,programId:TOKEN_PROGRAM_ID}),createInitializeMint2Instruction(mint,payer,6),createAssociatedTokenAccountIdempotentInstruction(payer,ata,payer,mint),createMintToCheckedInstruction(mint,ata,payer,10000000000n,6));
 const fee=await connection.getFeeForMessage(tx.compileMessage(),'finalized'),ataRent=await connection.getMinimumBalanceForRentExemption(165,'finalized');
 if(!Number.isSafeInteger(fee.value)||await connection.getBalance(payer,'finalized')<rent+ataRent+fee.value)throw Error('Solana: insufficient test SOL for setup.');
 const simulation=await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()),{sigVerify:false,replaceRecentBlockhash:true,commitment:'finalized'});if(simulation.value.err)throw Error('Solana: test mint setup simulation failed; no transaction was submitted.');
 tx.partialSign(mintKey);
 return {mint:mint.toBase58(),buyer:payer.toBase58(),ata:ata.toBase58(),message:tx.serializeMessage().toString('base64'),transaction:tx.serialize({requireAllSignatures:false}).toString('base64'),lastValidBlockHeight:block.lastValidBlockHeight,estimatedLamports:rent+ataRent+fee.value};
}
export function createDevnetSetup({directory=new URL('../work/',import.meta.url),buyer=process.env.SOLANA_BUYER,connection=new Connection(RPC,{commitment:'finalized',disableRetryOnRateLimit:true,fetch:(url,options)=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)})})}={}){
 let busy=false;const file=new URL('devnet-mint-setup.json',directory);
 async function load(){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async function save(r){await mkdir(directory,{recursive:true});await writeFile(new URL('devnet-mint-setup.tmp',directory),JSON.stringify(r,null,2));await rename(new URL('devnet-mint-setup.tmp',directory),file);}
 async function lock(fn){if(busy)throw Error('Solana: setup is busy. Query before retrying.');busy=true;try{return await fn();}finally{busy=false;}}
 const view=r=>r?{status:r.status,buyer:r.buyer,mint:r.mint,amount:'10000.00',asset:'TEST USD',network:'devnet',signature:r.signature||null,estimatedTestSOL:r.estimatedLamports/1e9,transaction:r.signature?undefined:r.transaction}:null;
 return {
 async prepare(){return lock(async()=>{walletAddress(buyer);const old=await load();if(old?.buyer!==buyer&&old)throw Error('Solana: setup buyer changed.');if(old?.signature)return {setup:view(old)};
 if(await connection.getGenesisHash()!=='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG')throw Error('Solana: wrong setup network.');
 const r={...await buildTestMintTransaction(connection,buyer),status:'READY'};await save(r);return {setup:view(r)};});},
 async submit(data){return lock(async()=>{const r=await load();if(!r||r.buyer!==buyer)throw Error('Solana: prepare setup first.');if(r.signature)return {setup:view(r)};if(typeof data.transaction!=='string'||data.transaction.length>4000)throw Error('Solana: invalid setup transaction.');const tx=Transaction.from(Buffer.from(data.transaction,'base64'));if(!tx.verifySignatures()||tx.serializeMessage().toString('base64')!==r.message)throw Error('Solana: setup transaction was changed.');r.signature=bs58.encode(tx.signature);r.status='PENDING';await save(r);try{const sent=await connection.sendRawTransaction(tx.serialize(),{skipPreflight:false,preflightCommitment:'finalized',maxRetries:0});if(sent!==r.signature)throw Error('RPC signature mismatch');}catch{throw Error('Solana: setup submission uncertain. Query status; do not initialize again.');}return {setup:view(r)};});},
 async status(){return lock(async()=>{const r=await load();if(!r)return {setup:null};if(!r.signature||r.status==='READY_CONFIG')return {setup:view(r)};
 const state=(await connection.getSignatureStatuses([r.signature],{searchTransactionHistory:true})).value[0];if(state?.confirmationStatus!=='finalized')return {setup:view(r)};if(state.err){r.status='FAILED';await save(r);return {setup:view(r)};}
 const info=await getMint(connection,new PublicKey(r.mint)),balance=parseTokenAccount(await connection.getAccountInfo(new PublicKey(r.ata),'finalized'),{mint:new PublicKey(r.mint),owner:new PublicKey(r.buyer)});if(info.decimals!==6||info.freezeAuthority||balance.amount<10000000000n)throw Error('Solana: setup result did not match the expected test mint.');
 const envFile=new URL('solana.env',directory);let env=await readFile(envFile,'utf8');if(!env.includes('SOLANA_BUYER='+r.buyer))throw Error('Solana: buyer configuration changed.');const existing=env.match(/^SOLANA_TEST_MINT=(.*)$/m)?.[1]?.trim();if(existing&&existing!==r.mint)throw Error('Solana: a different mint is already configured.');env=env.replace(/^SOLANA_TEST_MINT=.*\r?\n?/m,'');env+='SOLANA_TEST_MINT='+r.mint+'\n';await writeFile(new URL('solana-setup.env.tmp',directory),env);await rename(new URL('solana-setup.env.tmp',directory),envFile);r.status='READY_CONFIG';delete r.transaction;await save(r);return {setup:view(r),restartRequired:true};});}
 };
}
