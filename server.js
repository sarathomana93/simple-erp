import http from 'node:http';
import {invoicePDF} from './invoice-pdf.js';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {PgStore,validateData,verifyPassword,hashPassword} from './store.js';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw Object.assign(Error('Backup exceeds 8 MB'),{status:413});chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(Error('Invalid JSON'),{status:400})}}
export function createApp(store,{secure=true}={}){
 return http.createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 const cookie=(value,age)=>res.setHeader('Set-Cookie',`erp_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`);
 try{
 if(path==='/healthz'){await store.get();return json(200,{ok:true})}
 if(path.startsWith('/api/')){
  if(!['GET','HEAD'].includes(req.method)&&(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host||!String(req.headers['content-type']).startsWith('application/json')))return json(403,{error:'Request origin rejected'});
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('erp_session='))?.slice(12)||'';
  if(path==='/api/login'&&req.method==='POST'){
   const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim();if(!await store.attempt(ip))return json(429,{error:'Too many login attempts. Try again in 15 minutes.'});const b=await body(req);
   if(typeof b.password!=='string'||b.password.length>512||!verifyPassword(b.password,await store.password()))return json(401,{error:'Incorrect password'});
   const value=randomBytes(32).toString('hex');await store.addSession(value);cookie(value,604800);return json(200,{ok:true});
  }
  if(!/^[a-f0-9]{64}$/.test(token)||!await store.session(token))return json(401,{error:'Please sign in'});
  if(path.startsWith('/api/invoice-pdf/')&&req.method==='GET'){const id=decodeURIComponent(path.slice('/api/invoice-pdf/'.length));const state=await store.get();const invoice=state.data.invoices.find(i=>i.id===id);if(!invoice)return json(404,{error:'Invoice not found'});const pdf=await invoicePDF(invoice);res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="invoice.pdf"','Cache-Control':'no-store'});return res.end(pdf)}
  if(path==='/api/logout'&&req.method==='POST'){await store.logout(token);cookie('',0);return json(200,{ok:true})}
  if(path==='/api/password'&&req.method==='POST'){const b=await body(req);if(typeof b.current!=='string'||b.current.length>512||!verifyPassword(b.current,await store.password()))return json(400,{error:'Current password is incorrect'});if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)return json(400,{error:'Use a new password with 12–128 characters'});await store.setPassword(hashPassword(b.password));cookie('',0);return json(200,{ok:true})}
  if(path==='/api/state'&&req.method==='GET')return json(200,await store.get());
  if(path==='/api/state'&&req.method==='PUT'){const b=await body(req);if(!Number.isSafeInteger(b.revision)||b.revision<0)return json(400,{error:'Invalid revision'});let data;try{if(b.data&&b.data.units===undefined)b.data.units=(await store.get()).data.units||[];data=validateData(b.data)}catch(e){return json(400,{error:e.message})}const saved=await store.save(data,b.revision);if(!saved)return json(409,{error:'Another device saved changes. Your edit has not been saved. Download your draft if needed, then close the form and refresh before retrying.'});return json(200,saved)}
  return json(404,{error:'Not found'});
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'Method not allowed'});
 const filename=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));if(!filename.startsWith(root)||!mime[extname(filename)])return json(404,{error:'Not found'});
 try{const data=await readFile(filename);res.writeHead(200,{'Content-Type':mime[extname(filename)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data)}catch{return json(404,{error:'Not found'})}
 }catch(e){if(!res.headersSent)json(e.status||503,{error:e.status?e.message:'The database is unavailable. Your changes have not been saved. Please retry.'});else res.end();}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 let store,pool;
 if(process.env.ERP_GATEWAY_URL&&process.env.ERP_GATEWAY_TOKEN){const {RemoteStore}=await import('./remote-store.js');store=new RemoteStore(process.env.ERP_GATEWAY_URL,process.env.ERP_GATEWAY_TOKEN)}
 else{const {default:pg}=await import('pg');if(!process.env.DATABASE_URL)throw Error('Database configuration required');pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});pool.on('error',()=>console.error('Database connection interrupted'));store=new PgStore(pool)}
 await store.init(process.env.ERP_ADMIN_HASH);const server=createApp(store,{secure:process.env.NODE_ENV==='production'});server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('ERP server ready'));
 const stop=()=>{server.close(async()=>{await pool?.end();process.exit(0)});setTimeout(()=>process.exit(1),25000).unref()};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
