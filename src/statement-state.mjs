export function statementExpired(statement,now=Date.now()){
 if(!statement)return true;
 const expiry=Date.parse(statement.expiresAt);
 return statement.expired===true||!Number.isFinite(expiry)||now>=expiry;
}
