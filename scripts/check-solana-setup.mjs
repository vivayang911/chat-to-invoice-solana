import {modelConfiguration} from '../src/model-provider.mjs';
import {createSolanaStore} from '../src/solana-payments.mjs';
let modelReady=false,paymentReady=false;
try{modelConfiguration({...process.env,MODEL_PROVIDER:'groq'});modelReady=true;}catch{}
try{createSolanaStore().config();paymentReady=true;}catch{}
console.log(JSON.stringify({modelReady,paymentReady,network:'devnet',missing:[...(!modelReady?['work/groq-model.env: GROQ_API_KEY']:[]),...(!paymentReady?['work/solana.env: SOLANA_MERCHANT and SOLANA_TEST_MINT public addresses']:[])],privateKeyRequired:false,networkRequested:false},null,2));
