import {createServer} from 'node:net';
async function unusedPort(){const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './server.mjs';
test('Solana mode exposes metadata and rejects removed legacy invoice endpoints',async()=>{
 const port=await unusedPort(),app=createApp({port,paymentMode:'solana',solana:{config:()=>({network:'devnet',asset:'TEST_USD'})}});await new Promise(resolve=>app.listen(port,'127.0.0.1',resolve));
 try{const root='http://127.0.0.1:'+port;assert.equal((await (await fetch(root+'/api/model')).json()).paymentMode,'solana');assert.equal((await (await fetch(root+'/api/payment-config')).json()).network,'devnet');for(const endpoint of ['create','send','status']){const response=await fetch(root+'/api/invoices/'+endpoint,{method:'POST',headers:{origin:root,'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,404);}for(const file of ['/','/app.js','/solana-wallet.js','/ui-strings.mjs']){const response=await fetch(root+file);assert.equal(response.status,200);assert(!(await response.text()).toLowerCase().includes('pay'+'pal'));}assert.equal((await fetch(root+'/wallet.bundle.js')).status,200);}finally{await new Promise(resolve=>app.close(resolve));}
});

test('only a proven pre-broadcast message rejection is returned as safe; uncertain errors stay unclassified',async()=>{
 const port=await unusedPort();let uncertain=false;const app=createApp({port,paymentMode:'solana',solana:{config:()=>({network:'devnet'}),submit:async()=>{const e=Error('Solana: simulated rejection');if(!uncertain){e.code='SIGNED_MESSAGE_MISMATCH';e.noBroadcast=true;e.difference={validSignatures:true};}throw e;}}});await new Promise(resolve=>app.listen(port,'127.0.0.1',resolve));
 try{const root='http://127.0.0.1:'+port;async function submit(){return (await fetch(root+'/api/solana/submit',{method:'POST',headers:{origin:root,'Content-Type':'application/json'},body:'{}'})).json();}const rejected=await submit();assert.equal(rejected.code,'SIGNED_MESSAGE_MISMATCH');assert.equal(rejected.noBroadcast,true);uncertain=true;const unknown=await submit();assert.equal(unknown.noBroadcast,undefined);}finally{await new Promise(resolve=>app.close(resolve));}
});
