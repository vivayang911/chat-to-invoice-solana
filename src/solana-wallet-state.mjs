// Signing is not broadcasting. Persist the signed transaction identity before submitting it.
// A rejected signing request must leave retry available; an uncertain submission must not.
export async function signAndSubmit({sign,serialize,signatureOf,remember,submit}){
 const signed=await sign();
 const signature=signatureOf(signed);
 const wire=serialize(signed);
 remember(signature); // Storage failure deliberately prevents submission.
 return submit(wire,signature);
}
export function paymentCanStart(statement,{busy=false,attempted=false,configured=false,expired=false}={}){
 return Boolean(configured&&!busy&&!attempted&&statement?.status==='CONFIRMED'&&statement.buyerConfirmedAt&&statement.sellerConfirmedAt&&!expired);
}

// Re-rendering the same immutable statement is safe; changed access or terms are not.
export function samePaymentContext(expected,current,access,now){
 return Boolean(expected&&current&&expected.id===current.id&&expected.fingerprint===current.fingerprint&&access?.id===now?.id&&access?.token===now?.token);
}
