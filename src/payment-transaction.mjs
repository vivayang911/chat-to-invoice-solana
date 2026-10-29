import {ComputeBudgetProgram,Message,Transaction} from '@solana/web3.js';
export const DEVNET_COMPUTE_UNITS=800000;
// Supplying both budget instructions prevents Phantom's default automatic fee augmentation.
// Any wallet changes are still rejected by exact signed-message validation.
export function fixedDevnetBudget(){return [ComputeBudgetProgram.setComputeUnitLimit({units:DEVNET_COMPUTE_UNITS}),ComputeBudgetProgram.setComputeUnitPrice({microLamports:0n})];}
export function verifyPreparedTransaction(signed,preparedMessage){
 const valid=signed.verifySignatures();
 if(valid&&signed.serializeMessage().toString('base64')===preparedMessage)return;
 const error=Error('Solana: wallet changed the prepared transaction or returned an invalid signature. Nothing was broadcast. Query status, then prepare again.');
 error.code='SIGNED_MESSAGE_MISMATCH';error.noBroadcast=true;
 try{const expected=Transaction.populate(Message.from(Buffer.from(preparedMessage,'base64')));error.difference={validSignatures:valid,feePayerChanged:signed.feePayer?.toBase58()!==expected.feePayer?.toBase58(),blockhashChanged:signed.recentBlockhash!==expected.recentBlockhash,expectedPrograms:expected.instructions.map(i=>i.programId.toBase58()),actualPrograms:signed.instructions.map(i=>i.programId.toBase58())};}catch{error.difference={validSignatures:valid};}
 throw error;
}

