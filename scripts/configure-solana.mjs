import {Connection,PublicKey} from '@solana/web3.js';
import {getMint} from '../src/solana-token.mjs';
import {RPC,walletAddress,tokenUnits} from '../src/solana-payments.mjs';
import {mkdir,writeFile,readFile,rename} from 'node:fs/promises';
const [merchant,mint]=process.argv.slice(2);
try{
 walletAddress(merchant);const key=new PublicKey(mint);if(typeof mint!=='string'||key.toBase58()!==mint)throw Error('Invalid mint public address');
 const connection=new Connection(RPC,{commitment:'finalized',disableRetryOnRateLimit:true,fetch:(url,options)=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)})});
 if(await connection.getGenesisHash()!=='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG')throw Error('Wrong network');
 const info=await getMint(connection,key);tokenUnits('1.00',info.decimals);if(info.freezeAuthority)throw Error('Use a custom test mint without freeze authority');
 const file=new URL('../work/solana.env',import.meta.url),content=`SOLANA_MERCHANT=${merchant}\nSOLANA_TEST_MINT=${mint}\nPORT=4188\n`;
 let previous;try{previous=await readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(previous&&previous!==content)throw Error('Existing configuration differs. Review work/solana.env manually; it was not overwritten.');
 await mkdir(new URL('../work/',import.meta.url),{recursive:true});await writeFile(new URL('../work/solana.env.tmp',import.meta.url),content);await rename(new URL('../work/solana.env.tmp',import.meta.url),file);
 console.log(JSON.stringify({status:'DEVNET_CONFIG_SAVED',network:'devnet',decimals:info.decimals,privateKeyRequired:false,chainWritesRequested:false,restartRequired:true}));
}catch(e){console.error('Configuration not saved. '+(merchant&&mint?e.message:'Provide the merchant wallet PUBLIC address and the devnet test mint PUBLIC address. Never provide private keys or recovery phrases.'));process.exitCode=1;}
