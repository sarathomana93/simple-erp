(()=>{
let promptEvent=null;
const button=document.getElementById('installApp'),dialog=document.getElementById('installHelp');
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches;
function state(){button.textContent=standalone()?'App installed':'Install Android app';button.hidden=standalone();}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;state();});
window.addEventListener('appinstalled',()=>{promptEvent=null;state();toast('RAM ERP installed');});
button.addEventListener('click',async()=>{if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();await p.userChoice;}else dialog.showModal();});
document.getElementById('closeInstall').onclick=()=>dialog.close();
document.getElementById('mobileBackup').onclick=()=>document.getElementById('backup').click();
document.getElementById('mobileRestore').onclick=()=>document.getElementById('restore').click();
function connection(){document.getElementById('connectionStatus').textContent=navigator.onLine?'Online':'Offline · records saved on this device';}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();state();
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{document.getElementById('offlineInfo').textContent='Offline app files ready. Keep a backup of your records.';}).catch(()=>{document.getElementById('offlineInfo').textContent='Offline setup unavailable. Keep an internet connection while using the app.';});}
})();
