// Synchronous, same-origin catalogs: no translation service or visitor-data upload.
(()=>{
 const valid=['en','zh','ko','pt','es','ru','uk','tr'];
 const norm=v=>{const k=String(v||'').toLowerCase().split('-')[0];return valid.includes(k)?k:null;};
 let saved;try{saved=localStorage.getItem('micro-language');}catch(e){}
 const lang=norm(new URLSearchParams(location.search).get('lang'))||norm(window.MICRO_LANG)||norm(saved)||'en';
 window.MICRO_LANG=lang;
 try{localStorage.setItem('micro-language',lang);}catch(e){}
 document.write('<script src="locales/'+lang+'.js"><\/script><script src="languages.js"><\/script>');
})();
