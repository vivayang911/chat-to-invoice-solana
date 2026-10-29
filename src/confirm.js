import {setupSolanaBuyer} from './solana-wallet.js';
const solanaBuyer=setupSolanaBuyer();
import {renderFeeTable} from './fee-table.mjs';
import {t} from './ui-language.mjs';
import {acknowledgeStatement} from './statement-recovery.mjs';
import {statementExpired} from './statement-state.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.hash.slice(1));
const id=params.get('id'),token=params.get('token');let statement=null,busy=false;
// Fragment navigation does not reload a document. Never keep another link's
// statement or review consent visible after its capability changes.
addEventListener('hashchange',()=>{statement=null;solanaBuyer(null);busy=true;$('customerReview').checked=false;$('customerStatement').hidden=true;refresh();location.reload();});
async function call(action,extra={}){const r=await fetch('/api/statements/'+action,{signal:AbortSignal.timeout(15000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,token,...extra})});const data=await r.json();if(!r.ok)throw Error(data.error||'Statement request failed.');return data.statement;}
function active(){return statement&&!statementExpired(statement)&&!['REVOKED','CHANGES_REQUESTED'].includes(statement.status);}
function refresh(){const blocked=busy||!active()||Boolean(statement?.buyerConfirmedAt);$('customerConfirm').disabled=blocked||!$('customerReview').checked;$('requestChange').disabled=busy||!active();$('reloadStatement').disabled=busy;}
function render(value){if(statement?.fingerprint!==value.fingerprint)$('customerReview').checked=false;statement=value;$('customerStatement').hidden=false;$('statementVersion').textContent=t('Statement version')+' '+value.version+' · '+value.fingerprint.slice(0,12);renderFeeTable($('customerItems'),value.items,t);$('customerTotal').textContent=value.draft.amount+' USD';$('customerRecipient').textContent=t('Sandbox buyer')+': '+value.draft.recipient;$('customerStatus').textContent=t(statementExpired(value)?'EXPIRED':value.status)+(value.feedback?'\n'+value.feedback:'');solanaBuyer(value);refresh();}
async function run(action,extra){if(busy)return;busy=true;refresh();try{const outcome=action==='act'?await acknowledgeStatement(call,extra,'buyer'):{statement:await call(action,extra),recovered:false};render(outcome.statement);$('confirmationNotice').textContent=t(outcome.recovered&&!outcome.actionConfirmed?'The response was lost. Latest status retrieved; review it before retrying.':action==='status'?'Statement loaded. No payment requested.':extra.action==='confirm'?'Your confirmation has been recorded. No payment requested.':'Correction requested. This version can no longer be invoiced.');if(document.querySelector('[data-payment-status="PAID"]'))$('confirmationNotice').textContent=t('Payment verified on Solana devnet. No further payment is needed.');}catch(e){$('confirmationNotice').textContent=t(e.message);statement=null;solanaBuyer(null);$('customerStatement').hidden=true;}finally{busy=false;refresh();}}
$('customerReview').addEventListener('change',refresh);$('customerConfirm').addEventListener('click',()=>{if(!$('customerConfirm').disabled)run('act',{action:'confirm',fingerprint:statement.fingerprint});});$('requestChange').addEventListener('click',()=>{const feedback=$('changeRequest').value.trim();if(!feedback){$('confirmationNotice').textContent=t('Enter a correction first.');return;}run('act',{action:'requestChanges',fingerprint:statement.fingerprint,feedback});});$('reloadStatement').addEventListener('click',()=>run('status'));run('status');

setInterval(()=>{if(statement&&statementExpired(statement)){refresh();$('customerStatus').textContent=t('EXPIRED');}},1000);
