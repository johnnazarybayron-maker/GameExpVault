/* GameExpVault data safety net.
   Load this file BEFORE your page scripts (index.html and egg-heist.html already do).
   - Keeps a second copy of all your saved data in IndexedDB.
   - If the browser copy is ever missing (for example after the site address changed), it restores it automatically.
   - Lets you download or restore everything as one file (see restore.html).
   Updating index.html or egg-heist.html on GitHub never touches this data, and you never need to delete this file. */
(function(){
  var PFX='gev_',DBN='gev-backup',STN='kv',KEY='snap',timer=null,orig={};
  var ls=null;try{ls=window.localStorage}catch(e){}
  function all(){var o={};if(!ls)return o;try{for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&k.indexOf(PFX)===0)o[k]=ls.getItem(k)}}catch(e){}return o}
  function idb(){return new Promise(function(res,rej){
    try{var r=indexedDB.open(DBN,1);r.onupgradeneeded=function(){r.result.createObjectStore(STN)};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}}catch(e){rej(e)}
  })}
  function put(v){return idb().then(function(db){return new Promise(function(res,rej){var t=db.transaction(STN,'readwrite');t.objectStore(STN).put(v,KEY);t.oncomplete=function(){res()};t.onerror=function(){rej(t.error)}})})}
  function get(){return idb().then(function(db){return new Promise(function(res,rej){var t=db.transaction(STN,'readonly'),q=t.objectStore(STN).get(KEY);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){rej(q.error)}})})}
  function snapshot(){
    var d=all();if(!Object.keys(d).length)return Promise.resolve(false);
    return put({t:Date.now(),d:d}).then(function(){return true},function(){return false});
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(snapshot,1200)}
  function apply(d){var n=0;for(var k in d){if(k.indexOf(PFX)===0&&typeof d[k]==='string'){try{(orig.set||ls.setItem.bind(ls))(k,d[k]);n++}catch(e){}}}return n}
  /* mirror every change to the safety copy */
  try{
    if(ls&&window.Storage){
      var P=Storage.prototype,s0=P.setItem,r0=P.removeItem;
      orig.set=function(k,v){return s0.call(ls,k,v)};
      P.setItem=function(k,v){s0.call(this,k,v);if(this===ls&&String(k).indexOf(PFX)===0)schedule()};
      P.removeItem=function(k){r0.call(this,k);if(this===ls&&String(k).indexOf(PFX)===0)schedule()};
    }
  }catch(e){}
  window.addEventListener('pagehide',function(){snapshot()});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')snapshot()});
  /* auto restore when the browser copy is empty but the safety copy exists */
  function auto(){
    if(!ls||ls.getItem('gev_users'))return snapshot();
    return get().then(function(s){
      if(s&&s.d&&s.d.gev_users){
        apply(s.d);
        try{if(!sessionStorage.getItem('gev_restored')){sessionStorage.setItem('gev_restored','1');location.reload()}}catch(e){}
      }
    },function(){});
  }
  function exportAll(){return{app:'GameExpVault',v:2,all:true,saved:new Date().toISOString(),data:all()}}
  function restoreText(txt){
    var o;txt=String(txt||'').trim();
    try{o=JSON.parse(txt)}catch(e){try{o=JSON.parse(decodeURIComponent(escape(atob(txt))))}catch(e2){return{err:'That is not a valid backup.'}}}
    if(!o||o.app!=='GameExpVault')return{err:'That is not a GameExpVault backup.'};
    var n=0;
    if(o.all&&o.data){
      var cur={};try{cur=JSON.parse(ls.getItem('gev_users')||'{}')||{}}catch(e){}
      var inc={};try{inc=JSON.parse(o.data.gev_users||'{}')||{}}catch(e){}
      for(var u in inc)cur[u]=inc[u];
      var d=Object.assign({},o.data);d.gev_users=JSON.stringify(cur);n=apply(d);
    }else if(o.user&&o.account&&o.data){
      var us={};try{us=JSON.parse(ls.getItem('gev_users')||'{}')||{}}catch(e){}
      us[o.user]={name:o.account.name,h:o.account.h,created:o.account.created};
      n+=apply({gev_users:JSON.stringify(us)});
      var k2=o.user,d2={};for(var k in o.data){if(k.indexOf(PFX)===0&&k.slice(-k2.length-1)==='_'+k2)d2[k]=JSON.stringify(o.data[k])}
      n+=apply(d2);
    }else return{err:'That backup has no data in it.'};
    snapshot();return{ok:true,count:n};
  }
  function download(){
    var b=new Blob([JSON.stringify(exportAll(),null,1)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='gameexpvault-all-data.json';document.body.appendChild(a);a.click();a.remove();
  }
  function restoreCopy(){return get().then(function(s){if(!s||!s.d)return{err:'No automatic copy was found on this device.'};var n=apply(s.d);return{ok:true,count:n,when:s.t}})}
  window.GEVDATA={snapshot:snapshot,export:exportAll,download:download,restoreText:restoreText,restoreCopy:restoreCopy,info:function(){return get().then(function(s){return{saved:s?s.t:null,keys:s?Object.keys(s.d).length:0}},function(){return{saved:null,keys:0}})}};
  auto();
})();
