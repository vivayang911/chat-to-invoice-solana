import {translate} from './ui-strings.mjs';
const requested=new URL(location.href).searchParams.get('lang');
let saved;try{saved=localStorage.getItem('chatInvoiceLanguage');}catch{}
export const language=['zh','en'].includes(requested)?requested:saved==='zh'?'zh':'en';
export const t=value=>translate(value,language);
document.documentElement.lang=language==='zh'?'zh-CN':'en';
const nodes=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(nodes.nextNode()){const node=nodes.currentNode;if(node.parentElement.closest('script,style,#uiLanguage'))continue;const original=node.textContent;node.textContent=original.replace(original.trim(),t(original.trim()));}
for(const node of document.querySelectorAll('[placeholder],[aria-label],img[alt]'))for(const attr of ['placeholder','aria-label','alt'])if(node.hasAttribute(attr))node.setAttribute(attr,t(node.getAttribute(attr)));
document.title=t(document.title);
document.getElementById('uiLanguage').value=language;
document.getElementById('uiLanguage').title=language==='zh'?'切换语言会重载页面，请先复制尚未保存的聊天修改；已保存的收款单不受影响。':'Switching language reloads the page. Copy unsaved chat edits first; saved invoices are unaffected.';
document.getElementById('uiLanguage').addEventListener('change',event=>{const selected=event.target.value;try{localStorage.setItem('chatInvoiceLanguage',selected);}catch{}const url=new URL(location.href);url.searchParams.set('lang',selected);location.href=url.href;});
