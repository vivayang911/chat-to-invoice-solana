import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createStatementStore} from './statements.mjs';
import {validateSolanaDraft} from './solana-payments.mjs';
import {Keypair} from '@solana/web3.js';
const analysis=JSON.parse(await readFile(new URL('./fixtures/E01.json',import.meta.url),'utf8')).billingResult;
test('submitted Solana statement cannot be revoked, corrected or overwritten, preserving original receipt access',async()=>{
 const dir=await mkdtemp(tmpdir()+'/solana-boundary-');let submitted=false;
 const draft={service:analysis.service,amount:analysis.amount,recipient:Keypair.generate().publicKey.toBase58(),reviewed:true,reviewedItemIds:analysis.billingItems.filter(i=>i.status==='ACCEPTED').map(i=>i.id)};
 const store=createStatementStore({directory:pathToFileURL(dir+'/'),validate:validateSolanaDraft,beforeMutation:async()=>{if(submitted)throw Error('Solana: transaction submitted.');}});
 try{const id=randomUUID(),created=await store.create(id,draft,analysis),fingerprint=created.statement.fingerprint;
 await store.act(id,created.sellerToken,{action:'confirm',fingerprint});await store.act(id,created.buyerToken,{action:'confirm',fingerprint});submitted=true;
 await assert.rejects(store.act(id,created.sellerToken,{action:'revoke'}),/submitted/);
 await assert.rejects(store.act(id,created.buyerToken,{action:'requestChanges',fingerprint,feedback:'More items'}),/submitted/);
 await assert.rejects(store.create(id,draft,analysis),/submitted/);
 assert.equal((await store.status(id,created.buyerToken)).fingerprint,fingerprint);assert.equal((await store.status(id,created.sellerToken)).status,'CONFIRMED');
 }finally{await rm(dir,{recursive:true,force:true});}
});
