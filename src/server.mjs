import {SHORT_INVOICE_POLICY} from './short-invoice.mjs';
import {createDevnetSetup} from './devnet-setup.mjs';
import {createSolanaStore,validateSolanaDraft} from './solana-payments.mjs';
import {publicModelConfiguration,modelConfiguration} from './model-provider.mjs';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {analyze,parseChat} from './analysis.mjs';
import {randomUUID} from 'node:crypto';
import {createStatementStore} from './statements.mjs';
export function createApp({port=Number(process.env.PORT||4188),analyzeChat=analyze,statements,readAsset=readFile,paymentMode='solana',solana}={}){
if(paymentMode!=='solana')throw Error('Solana mode required');
statements??=createStatementStore(paymentMode==='solana'?{beforeMutation:id=>solana.assertMutable(id),validate:(data,analysis)=>{if(data.onChainInvoiceConsent!==SHORT_INVOICE_POLICY)throw Error('Solana: reload and agree to the public short-invoice disclosure before creating a statement.');const c=solana.config();return {...validateSolanaDraft(data,analysis),paymentMerchant:c.merchant,paymentMint:c.mint,onChainInvoice:SHORT_INVOICE_POLICY};},directory:new URL('../work/solana-statements/',import.meta.url)}:{});
if(paymentMode==='solana')solana??=createSolanaStore({statements});
const devnetSetup=paymentMode==='solana'?createDevnetSetup():null;
const analyses=new Map();
const origin=`http://127.0.0.1:${port}`;
let busy=false;
const assets={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/buyer-avatar.svg':['buyer-avatar.svg','image/svg+xml'],'/seller-avatar.svg':['seller-avatar.svg','image/svg+xml']};
assets['/setup']=['setup.html','text/html; charset=utf-8'];assets['/setup.js']=['setup.js','text/javascript; charset=utf-8'];
assets['/confirm']=['confirm.html','text/html; charset=utf-8'];assets['/confirm.js']=['confirm.js','text/javascript; charset=utf-8'];
for(const name of ['short-invoice.mjs','solana-wallet-state.mjs','solana-wallet.js','ui-language.mjs','ui-strings.mjs','samples.mjs','statement-state.mjs','statement-recovery.mjs','fee-table.mjs'])assets['/'+name]=[name,'text/javascript; charset=utf-8'];
assets['/solana-wallet.js']=['solana-wallet.js','text/javascript; charset=utf-8'];
assets['/wallet.bundle.js']=['wallet.bundle.js','text/javascript; charset=utf-8'];
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  if(req.headers.host!==`127.0.0.1:${port}`){json(403,{error:'Please use the local 127.0.0.1 address.'});return;}
  let pathname;try{pathname=new URL(req.url,origin).pathname;}catch{json(400,{error:'Invalid request URL.'});return;}
  if(req.method==='GET'&&pathname==='/api/model'){try{let configured=true;try{modelConfiguration();}catch{configured=false;}json(200,{...publicModelConfiguration(),paymentMode,configured});}catch{json(503,{error:'The server model configuration is unavailable.'});}return;}
  if(req.method==='GET'&&pathname==='/api/payment-config'){try{json(200,{mode:'solana',ready:true,...solana.config()});}catch{json(503,{mode:paymentMode,ready:false,error:'Solana: configure the devnet merchant wallet and test mint.'});}return;}
  if(req.method==='GET'&&Object.hasOwn(assets,pathname)){const [file,type]=assets[pathname];try{const content=await readAsset(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':type});res.end(content);}catch{json(503,{error:'The page could not be loaded. Please retry.'});}return;}
  if(req.method!=='POST'||!['/api/devnet-setup/prepare','/api/devnet-setup/submit','/api/devnet-setup/status','/api/solana/prepare','/api/solana/submit','/api/solana/status','/api/analyze','/api/statements/create','/api/statements/status','/api/statements/act'].includes(req.url)){json(404,{error:'Endpoint not found.'});return;}
  if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')){json(403,{error:'Invalid request origin or content type.'});return;}
  const usesOperationLock=req.url==='/api/analyze';
  if(busy&&usesOperationLock){json(429,{error:'Another analysis is running. Please wait before analyzing again.'});return;}
  if(usesOperationLock)busy=true;
  try{
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>100000){json(413,{error:'Input is too long.'});return;}chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
    let data;try{data=JSON.parse(body);}catch{json(400,{error:'Invalid request format.'});return;}
    if(!data||typeof data!=='object'||Array.isArray(data)){json(400,{error:'Invalid request format.'});return;}
    if(req.url.startsWith('/api/devnet-setup/')){if(!devnetSetup){json(404,{error:'Devnet setup is disabled.'});return;}json(200,await devnetSetup[req.url.split('/').at(-1)](data));return;}
    if(req.url.startsWith('/api/solana/')){if(paymentMode!=='solana'){json(404,{error:'Solana mode is disabled.'});return;}const value=await solana[req.url.split('/').at(-1)](data);json(200,value);return;}
    if(req.url.startsWith('/api/statements/')){
      const action=req.url.split('/').at(-1);
      const value=action==='create'?await statements.create(data.operationId,data,analyses.get(data.operationId)):action==='status'?{statement:await statements.status(data.id,data.token)}:{statement:await statements.act(data.id,data.token,data)};
      json(200,value);return;
    }
    let messages;try{messages=parseChat(data.chat);}catch(e){json(400,{error:e.message});return;}
    if(data.consent!==true){json(400,{error:'Please confirm anonymization and consent to model processing.'});return;}
    const started=Date.now();const extracted=await analyzeChat(messages,{language:data.language==='zh'?'zh':'en',strategy:'direct'});
    const operationId=randomUUID();if(analyses.size>=100)analyses.delete(analyses.keys().next().value);analyses.set(operationId,extracted);
    json(200,{extracted,messages,operationId,model:publicModelConfiguration().model,latencyMs:Date.now()-started,checkedAt:new Date().toISOString()});
  }catch(e){const analyzing=req.url==='/api/analyze';json(502,{...(e.code==='SIGNED_MESSAGE_MISMATCH'?{code:e.code,noBroadcast:true,difference:e.difference}:{}),error:e.name==='TimeoutError'?(analyzing?'AI analysis timed out. No invoice was created or sent. Please retry.':'The request timed out. Query saved invoice status before retrying.'):/^(The model|The server|The billing|Invoice:|Statement:|Solana:)/.test(e.message)?e.message:(analyzing?'AI analysis failed. Check your connection and retry. No invoice was created or sent.':'The request failed. Query saved invoice status before retrying.')});}finally{if(usesOperationLock)busy=false;}
});
server.requestTimeout=110000;
return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||4188);createApp({port}).listen(port,'127.0.0.1',()=>console.log(`Chat to Invoice: http://127.0.0.1:${port} (Solana DEVNET; explicit confirmation required)`));}
