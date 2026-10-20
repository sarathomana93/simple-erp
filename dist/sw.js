const CACHE='ram-erp-shell-cloud-v14';
const ASSETS=['/','/index.html','/style.css','/app.js','/cloud.js','/amount-words.js','/mobile.js','/logo.png','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ram-erp-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin)return;if(e.request.mode==='navigate'&&url.pathname==='/'){e.respondWith(fetch(e.request).catch(()=>caches.match('/')));return;}if(!ASSETS.includes(url.pathname))return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));});
