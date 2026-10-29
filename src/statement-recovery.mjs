// Resolve an ambiguous acknowledgement with one read, never another write.
export async function acknowledgeStatement(call,payload,role){
 try{return {statement:await call('act',payload),recovered:false,actionConfirmed:true};}
 catch(originalError){
  let statement;try{statement=await call('status');}catch{throw originalError;}
  const same=statement.fingerprint===payload.fingerprint&&statement.role===role;
  const actionConfirmed=same&&(payload.action==='confirm'
   ?!statement.expired&&Boolean(statement[role+'ConfirmedAt'])&&['CONFIRMED','AWAITING_CONFIRMATION'].includes(statement.status)
   :payload.action==='requestChanges'&&statement.status==='CHANGES_REQUESTED'&&statement.feedback===payload.feedback.trim());
  return {statement,recovered:true,actionConfirmed};
 }
}
