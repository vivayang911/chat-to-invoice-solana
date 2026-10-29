// Shared statement view: arithmetic uses integer cents and never model totals.
export function renderFeeTable(container,items,t=x=>x,currency='USD'){
 const unit=currency==='USD'?'USD':t('Currency unconfirmed');
 container.replaceChildren();const table=document.createElement('table');table.className='feeTable';
 const caption=document.createElement('caption');caption.textContent=t('Itemized fee statement');table.append(caption);
 const head=document.createElement('thead'),tr=document.createElement('tr');
 for(const label of ['Work and agreed changes','Quantity','Unit price','Subtotal']){const th=document.createElement('th');th.scope='col';th.textContent=t(label);tr.append(th);}head.append(tr);table.append(head);
 const body=document.createElement('tbody');for(const item of items.filter(i=>!i.status||i.status==='ACCEPTED')){
 const row=document.createElement('tr'),scope=document.createElement('td');scope.textContent=item.description;
 for(const note of item.scopeNotes||[]){const detail=document.createElement('small');detail.className='scopeNote';detail.textContent=t('Original scope and revision terms')+': '+note;scope.append(detail);}row.append(scope);
 const valid=Number.isInteger(item.quantity)&&item.quantity>0&&typeof item.unitAmount==='string'&&/^(?:0|[1-9]\d*)\.\d{2}$/.test(item.unitAmount);
 const cents=valid?BigInt(item.unitAmount.replace('.',''))*BigInt(item.quantity):null;
 const amount=cents===null?'—':String(cents/100n)+'.'+String(cents%100n).padStart(2,'0');
 for(const text of [String(item.quantity??'—'),(item.unitAmount??'—')+' '+unit,amount+' '+unit]){const td=document.createElement('td');td.textContent=text;row.append(td);}body.append(row);
 }table.append(body);container.append(table);
 const note=document.createElement('p');note.className='muted';note.textContent=t('Revisions included in an agreed package are included in its price. Only separately agreed extras are charged separately.');container.append(note);
}
