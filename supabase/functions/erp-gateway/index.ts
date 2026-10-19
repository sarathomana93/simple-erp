import pg from 'npm:pg@8.16.3';
import {PgStore,tokenHash,validateData} from './store.js';
const pool=new pg.Pool({connectionString:Deno.env.get('SUPABASE_DB_URL'),max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
pool.on('error',()=>{});
const store=new PgStore(pool);
const allowed=new Set(['get','save','password','setPassword','attempt','session','addSession','logout']);
Deno.serve(async(req)=>{
 const reply=(status,result)=>new Response(JSON.stringify({result}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply(405,null);
 const bearer=req.headers.get('authorization')||'';
 if(!bearer.startsWith('Bearer ')||tokenHash(bearer.slice(7))!=='d7d9957823b0d27183264c89a4a6923928861385398c8cb0d958cff8e9e01286')return reply(401,null);
 try{
 const raw=await req.text();if(raw.length>8*1024*1024)return reply(413,null);
 const {method,args}=JSON.parse(raw);if(!allowed.has(method)||!Array.isArray(args))return reply(400,null);
 if(method==='save'){args[0]=validateData(args[0]);if(!Number.isSafeInteger(args[1])||args[1]<0)return reply(400,null)}
 return reply(200,await store[method](...args)??null);
 }catch{return reply(503,null)}
});
