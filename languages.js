/* Translate presentation text only. IDs, URLs, symbols, JSON and orders are untouched. */
(()=>{
 'use strict';
 const lang=window.MICRO_LANG||'en';
 const names={en:'English',zh:'简体中文',ko:'한국어',pt:'Português',es:'Español',ru:'Русский',uk:'Українська',tr:'Türkçe'};
 const locales={en:'en',zh:'zh-Hans',ko:'ko',pt:'pt-BR',es:'es',ru:'ru',uk:'uk',tr:'tr'};
 const D=window.MICRO_MESSAGES||{};
 document.documentElement.lang=locales[lang]||'en';
 window.MICRO_LOCALE=locales[lang]||'en';
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const keys=Object.keys(D).sort((a,b)=>b.length-a.length);
 const pattern=keys.length?new RegExp(keys.map(k=>'(?<![\\p{L}\\p{N}_])'+escape(k)+'(?![\\p{L}\\p{N}_])').join('|'),'gu'):null;
 function tr(value){
  if(typeof value!=='string'||!pattern)return value;
  if(Object.hasOwn(D,value))return D[value];
  const counts=value.match(/^(\d+) executed orders · (\d+) fills$/);
  if(counts)return (D['EXECUTED ORDERS']||'Executed orders')+': '+counts[1]+' · '+(D['Executed fills']||'Fills')+': '+counts[2];
  const clean=value.trim();
  if(Object.hasOwn(D,clean))return value.slice(0,value.indexOf(clean))+D[clean]+value.slice(value.indexOf(clean)+clean.length);
  return value.split(/(https?:\/\/[^\s]+|0x[0-9a-fA-F]+|\bCONTROL:[A-Z]+(?::[A-Z]+)?\b|\b(?:BTC|ETH|USDC|MICRO|BIO)(?:-PERP)?\b)/g).map(part=>/^(?:https?:\/\/|0x|CONTROL:|BTC\b|ETH\b|USDC\b|MICRO\b|BIO\b)/.test(part)?part:part.replace(pattern,k=>D[k])).join('');
 }
 window.tr=tr;
 const excluded='script,style,pre,code,select,option,[data-no-translate]';
 const written=new WeakMap();
 function translateNode(node){
  if(!node.parentElement||node.parentElement.closest(excluded))return;
  const value=node.nodeValue;if(written.get(node)===value)return;
  const next=tr(value);written.set(node,next);if(next!==value)node.nodeValue=next;
 }
 function walk(root){
  if(root.nodeType===3){translateNode(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode())translateNode(n);
  const els=[...(root.querySelectorAll?.('[title],[aria-label],[alt],[placeholder]')||[])];
  if(root.nodeType===1)els.push(root);
  for(const el of els){if(el.closest(excluded))continue;for(const a of ['title','aria-label','alt','placeholder'])if(el.hasAttribute(a)){const v=el.getAttribute(a),next=tr(v);if(next!==v)el.setAttribute(a,next);}}
 }
 function selector(old){
  const label=document.createElement('label');label.className='language-control';label.setAttribute('data-no-translate','');
  const hint=document.createElement('span');hint.textContent=tr('Language');label.append(hint);
  const select=document.createElement('select');select.id=old.id==='switch'?'history-language':'site-language';select.setAttribute('aria-label',tr('Language'));
  for(const [key,name] of Object.entries(names)){const option=document.createElement('option');option.value=key;option.textContent=name;option.lang=locales[key];option.selected=key===lang;select.append(option);}
  select.addEventListener('change',()=>{try{localStorage.setItem('micro-language',select.value);}catch(e){}const url=new URL(location.href);url.searchParams.set('lang',select.value);location.assign(url.href);});
  label.append(select);old.replaceWith(label);
 }
 function ready(){
  document.querySelectorAll('a.language,#switch').forEach(selector);
  const home=document.getElementById('home');if(home)home.href='./?lang='+lang+'#top';
  walk(document.documentElement);
  new MutationObserver(records=>{
   for(const r of records){if(r.type==='characterData')translateNode(r.target);else if(r.type==='attributes'){const el=r.target,v=el.getAttribute(r.attributeName);if(v&&!el.closest(excluded)){const next=tr(v);if(next!==v)el.setAttribute(r.attributeName,next);}}else for(const n of r.addedNodes)walk(n);}
  }).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','alt','placeholder']});
  window.MICRO_I18N_READY=true;
 }
 const style=document.createElement('style');style.textContent=`
 @font-face{font-family:"MICRO Korean";src:url("fonts/micro-korean.woff") format("woff");font-weight:100 900;font-display:swap}
 .language-control{display:inline-flex;align-items:center;gap:8px;font:13px/1.4 system-ui,"MICRO Korean",sans-serif;color:#c6d5d2;white-space:nowrap}
 .language-control select{background:#111b1a;color:#e6f5ef;border:1px solid #4a6660;border-radius:8px;padding:7px 25px 7px 10px;font:inherit;max-width:160px;cursor:pointer}
 .language-control select:focus-visible{outline:2px solid #5dcaa5;outline-offset:3px}
 .nav-tools{flex-wrap:wrap;gap:10px}.links{flex-wrap:wrap}.links a{white-space:normal}
 .specbar b{margin-left:.4em}.stat,.bstat,.metric,.dpanel{min-width:0}.sl,.bl,.l,.shk,.dhead{overflow-wrap:anywhere}
 html:lang(ko) body *:not(canvas):not(pre):not(code){font-family:'MICRO Korean',system-ui,sans-serif!important}
 html:lang(ko) body,html:lang(ko) select{font-family:'MICRO Korean',system-ui,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;word-break:keep-all;overflow-wrap:anywhere}
 html:lang(ru) .kick,html:lang(uk) .kick,html:lang(ko) .kick{letter-spacing:.06em}
 @media(max-width:600px){.language-control>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.language-control select{max-width:145px}.nav-tools{gap:6px}.statrow{grid-template-columns:repeat(2,minmax(0,1fr))}.dhead{flex-wrap:wrap;gap:5px}.language-control{font-size:12px}}
 `;document.head.append(style);
 // The selected desk and overview cards use Canvas rather than DOM text.
 if(window.CanvasRenderingContext2D&&pattern){
  for(const method of ['fillText','strokeText','measureText']){
   const original=CanvasRenderingContext2D.prototype[method];
   CanvasRenderingContext2D.prototype[method]=function(text,...args){const font=this.font;
    if(lang==='ko')this.font=font.replace(/(\d+(?:\.\d+)?px)\s+.+/,'$1 "MICRO Korean", sans-serif');
    try{return original.call(this,tr(text),...args);}finally{this.font=font;}};
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
