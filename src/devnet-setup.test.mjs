import test from 'node:test';
import assert from 'node:assert/strict';
import {Keypair,PublicKey,Transaction} from '@solana/web3.js';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {buildTestMintTransaction,createDevnetSetup} from './devnet-setup.mjs';
import {TOKEN_PROGRAM_ID} from './solana-token.mjs';
const buyer=Keypair.generate();
const rpc=()=>({getLatestBlockhash:async()=>({blockhash:Keypair.generate().publicKey.toBase58(),lastValidBlockHeight:100}),getMinimumBalanceForRentExemption:async()=>2039280,getBalance:async()=>5000000000,getFeeForMessage:async()=>({value:10000}),simulateTransaction:async()=>({value:{err:null}}),getGenesisHash:async()=> 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'});
test('test mint setup retains only mint signature and requires the buyer signature; simulation fails closed',async()=>{const connection=rpc(),r=await buildTestMintTransaction(connection,buyer.publicKey.toBase58());assert(!JSON.stringify(r).includes('secretKey'));const tx=Transaction.from(Buffer.from(r.transaction,'base64'));assert.equal(tx.instructions.length,4);assert.equal(tx.instructions[1].data[0],20);assert.equal(tx.instructions[1].data[34],0);assert.equal(tx.instructions[3].data[0],14);assert.equal(tx.instructions[3].data.readBigUInt64LE(1),10000000000n);assert.equal(tx.verifySignatures(),false);tx.partialSign(buyer);assert.equal(tx.verifySignatures(),true);connection.simulateTransaction=async()=>({value:{err:{InstructionError:[1,'bad']}}});await assert.rejects(buildTestMintTransaction(connection,buyer.publicKey.toBase58()),/simulation failed/);});
test('setup rejects changed signed transaction, prevents duplicate broadcast and saves config only after finalized checks',async()=>{
 const dir=await mkdtemp(tmpdir()+'/test-mint-setup-'),directory=pathToFileURL(dir+'/'),connection=rpc();let sent=0,finalized=false,prepared;
 connection.sendRawTransaction=async raw=>{sent++;return (await import('bs58')).default.encode(Transaction.from(raw).signature);};connection.getSignatureStatuses=async()=>({value:[{confirmationStatus:finalized?'finalized':'confirmed',err:null}]});
 connection.getAccountInfo=async address=>{if(address.toBase58()===prepared.mint){const data=Buffer.alloc(82);data[44]=6;data[45]=1;return {owner:TOKEN_PROGRAM_ID,data};}const data=Buffer.alloc(165);new PublicKey(prepared.mint).toBuffer().copy(data);buyer.publicKey.toBuffer().copy(data,32);data[108]=1;data.writeBigUInt64LE(10000000000n,64);return {owner:TOKEN_PROGRAM_ID,data};};
 try{await writeFile(new URL('solana.env',directory),'SOLANA_BUYER='+buyer.publicKey.toBase58()+'\n');const store=createDevnetSetup({directory,buyer:buyer.publicKey.toBase58(),connection});prepared=(await store.prepare()).setup;const tx=Transaction.from(Buffer.from(prepared.transaction,'base64'));tx.partialSign(buyer);const forged=Transaction.from(tx.serialize());forged.instructions[3].data.writeBigUInt64LE(1n,1);forged.partialSign(buyer);await assert.rejects(store.submit({transaction:forged.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64')}),/changed/);assert.equal(sent,0);
 await store.submit({transaction:tx.serialize().toString('base64')});await store.submit({transaction:tx.serialize().toString('base64')});assert.equal(sent,1);assert.equal((await store.status()).setup.status,'PENDING');assert(!(await readFile(new URL('solana.env',directory),'utf8')).includes('SOLANA_TEST_MINT'));
 finalized=true;assert.equal((await store.status()).setup.status,'READY_CONFIG');assert((await readFile(new URL('solana.env',directory),'utf8')).includes(prepared.mint));assert.equal((await createDevnetSetup({directory,buyer:buyer.publicKey.toBase58(),connection}).status()).setup.status,'READY_CONFIG');assert.equal(sent,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
