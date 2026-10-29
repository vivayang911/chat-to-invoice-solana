// Retrying model transport is safe for funds; never use this helper for payment writes.
export async function requestModelJson(url,options,{deadline,budget={remaining:1},fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,onRetry,maxRetryDelay=2000}={}){
 async function retry(delay,reason,httpStatus=null){
  if(budget.remaining<1||delay>Math.min(60000,Math.max(0,maxRetryDelay))||deadline-now()<delay+1000)return false;
  budget.remaining--;onRetry?.({reason,httpStatus,delayMs:delay});await wait(delay);return true;
 }
 while(true){
  const remaining=deadline-now();if(!Number.isFinite(remaining)||remaining<=0)throw new DOMException('Model request deadline exceeded.','TimeoutError');
  let response;
  try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(Math.max(1,Math.floor(remaining)))});}
  catch(error){if(error instanceof TypeError&&await retry(250,'NETWORK_ERROR'))continue;throw error;}
  if(now()>=deadline){await response.body?.cancel().catch(()=>{});throw new DOMException('Model request deadline exceeded.','TimeoutError');}
  if(!response.ok){
   await response.body?.cancel().catch(()=>{});
   const header=response.headers?.get?.('retry-after');let delay=250;
   if(header!=null){const seconds=Number(header);const date=Date.parse(header);delay=Number.isFinite(seconds)&&seconds>=0?Math.ceil(seconds*1000):Number.isFinite(date)?Math.max(0,date-now()):250;}
   if([429,502,503,504].includes(response.status)&&await retry(delay,'TRANSIENT_HTTP',response.status))continue;
   throw Error(`The model service returned HTTP ${response.status}. Please retry later.`);
  }
  try{const result=await response.json();if(now()>=deadline)throw new DOMException('Model request deadline exceeded.','TimeoutError');return result;}catch(error){if(error instanceof TypeError&&await retry(250,'RESPONSE_CONNECTION_ERROR'))continue;throw error;}
 }
}
