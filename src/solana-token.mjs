// Minimal legacy SPL Token instructions. Token-2022 and transfer-fee extensions are intentionally unsupported.
import {PublicKey,TransactionInstruction,SystemProgram} from '@solana/web3.js';
export const TOKEN_PROGRAM_ID=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export async function getAssociatedTokenAddress(mint,owner){return PublicKey.findProgramAddressSync([owner.toBuffer(),TOKEN_PROGRAM_ID.toBuffer(),mint.toBuffer()],ASSOCIATED_TOKEN_PROGRAM_ID)[0];}
export async function getMint(connection,mint){const a=await connection.getAccountInfo(mint,'finalized');if(!a||!a.owner.equals(TOKEN_PROGRAM_ID)||a.data.length!==82||a.data[45]!==1)throw Error('Solana: invalid initialized legacy test mint.');return {decimals:a.data[44],freezeAuthority:a.data.readUInt32LE(46)===0?null:new PublicKey(a.data.subarray(50,82))};}
export function createAssociatedTokenAccountIdempotentInstruction(payer,address,owner,mint){return new TransactionInstruction({programId:ASSOCIATED_TOKEN_PROGRAM_ID,data:Buffer.from([1]),keys:[{pubkey:payer,isSigner:true,isWritable:true},{pubkey:address,isSigner:false,isWritable:true},{pubkey:owner,isSigner:false,isWritable:false},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}]});}
export function createTransferCheckedInstruction(source,mint,destination,owner,amount,decimals){const data=Buffer.alloc(10);data[0]=12;data.writeBigUInt64LE(amount,1);data[9]=decimals;return new TransactionInstruction({programId:TOKEN_PROGRAM_ID,data,keys:[{pubkey:source,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:destination,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}]});}
export function parseTokenAccount(account,{mint,owner}){
 if(!account||!account.owner.equals(TOKEN_PROGRAM_ID)||account.data.length!==165)throw Error('Solana: buyer test-token account is missing or invalid.');
 const data=account.data;
 if(!new PublicKey(data.subarray(0,32)).equals(mint)||!new PublicKey(data.subarray(32,64)).equals(owner)||data[108]!==1)throw Error('Solana: buyer token account has a different mint/owner or is frozen.');
 return {amount:data.readBigUInt64LE(64)};
}
export function createInitializeMint2Instruction(mint,authority,decimals=6){const data=Buffer.alloc(67);data[0]=20;data[1]=decimals;authority.toBuffer().copy(data,2);data[34]=0;return new TransactionInstruction({programId:TOKEN_PROGRAM_ID,data,keys:[{pubkey:mint,isSigner:false,isWritable:true}]});}
export function createMintToCheckedInstruction(mint,destination,authority,amount,decimals=6){const data=Buffer.alloc(10);data[0]=14;data.writeBigUInt64LE(amount,1);data[9]=decimals;return new TransactionInstruction({programId:TOKEN_PROGRAM_ID,data,keys:[{pubkey:mint,isSigner:false,isWritable:true},{pubkey:destination,isSigner:false,isWritable:true},{pubkey:authority,isSigner:true,isWritable:false}]});}
