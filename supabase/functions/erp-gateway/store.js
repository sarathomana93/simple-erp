import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
export const emptyData=()=>({items:[],suppliers:[],customers:[],invoices:[]});
export const tokenHash=v=>createHash('sha256').update(v).digest('hex');
export function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex')}
export function verifyPassword(p,hash){try{const [salt,value]=hash.split(':');return timingSafeEqual(scryptSync(p,salt,64),Buffer.from(value,'hex'))}catch{return false}}
export function validateData(data){
 if(!data||typeof data!=='object')throw Error('Invalid records');const clean={};
 for(const key of ['items','suppliers','customers','units','quotations','invoices']){
  const rows=data[key]??[];if(!Array.isArray(rows)||rows.length>50000)throw Error('Invalid '+key);const ids=new Set(),codes=new Set();
  for(const r of rows){if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)||ids.has(r.id))throw Error('Invalid or duplicate record ID');ids.add(r.id);
   const code=(key==='invoices'||key==='quotations')?r.number:r.code;if(typeof code!=='string'||!code.trim())throw Error('Record code is required');const normalized=code.trim().toLowerCase();if(codes.has(normalized))throw Error('Duplicate '+key+' code: '+code);codes.add(normalized);
   if(key==='invoices'||key==='quotations'){if(typeof r.customer!=='string'||!r.customer.trim()||!Array.isArray(r.lines)||!r.lines.length||r.lines.length>1000)throw Error('Invalid invoice');
    for(const l of r.lines){if(!l||typeof l.desc!=='string'||!l.desc.trim()||![l.qty,l.rate,l.tax].every(x=>x!==''&&Number.isFinite(Number(x)))||Number(l.qty)<=0||Number(l.rate)<0||Number(l.tax)<0||Number(l.tax)>100)throw Error('Invalid invoice line')}
    if(key==='quotations'&&(!Number.isFinite(Number(r.received??0))||Number(r.received??0)<0))throw Error('Invalid received amount');if(key==='quotations'&&(r.documentType!=='quotation'||r.lines.some(l=>Number(l.tax)!==0)))throw Error('Quotations must not include GST');if(!Number.isFinite(Number(r.round||0)))throw Error('Invalid round off');
   }else{if(typeof r.name!=='string'||!r.name.trim()||!['Active','Inactive'].includes(r.status))throw Error('Invalid master record');if(key==='items')for(const n of ['purchase','sale','tax']){if(!Number.isFinite(Number(r[n]||0))||Number(r[n]||0)<0||(n==='tax'&&Number(r[n])>100))throw Error('Invalid item amount')}}
   if(JSON.stringify(r).length>250000)throw Error('Record too large');
  }clean[key]=rows;
 }return clean;
}
export class PgStore{
 constructor(pool){this.pool=pool}
 async init(initialHash){await this.pool.query(`CREATE SCHEMA IF NOT EXISTS erp_private; CREATE TABLE IF NOT EXISTS erp_private.erp_state (id integer PRIMARY KEY CHECK(id=1), revision integer NOT NULL, data jsonb NOT NULL); CREATE TABLE IF NOT EXISTS erp_private.erp_admin (id integer PRIMARY KEY CHECK(id=1), password_hash text NOT NULL); CREATE TABLE IF NOT EXISTS erp_private.erp_sessions (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL); CREATE TABLE IF NOT EXISTS erp_private.erp_login_attempts (ip_hash text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);`);await this.pool.query('INSERT INTO erp_private.erp_state(id,revision,data) VALUES(1,0,$1) ON CONFLICT(id) DO NOTHING',[emptyData()]);if(initialHash)await this.pool.query('INSERT INTO erp_private.erp_admin(id,password_hash) VALUES(1,$1) ON CONFLICT(id) DO NOTHING',[initialHash]);if(!(await this.pool.query('SELECT id FROM erp_private.erp_admin WHERE id=1')).rowCount)throw Error('ERP_ADMIN_HASH must be configured for first deployment')}
 async get(){return (await this.pool.query('SELECT revision,data FROM erp_private.erp_state WHERE id=1')).rows[0]}
 async save(data,revision){const r=await this.pool.query('UPDATE erp_private.erp_state SET data=$1,revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision,data',[data,revision]);return r.rows[0]||null}
 async password(){return (await this.pool.query('SELECT password_hash FROM erp_private.erp_admin WHERE id=1')).rows[0].password_hash}
 async setPassword(hash){const client=await this.pool.connect();try{await client.query('BEGIN');await client.query('UPDATE erp_private.erp_admin SET password_hash=$1 WHERE id=1',[hash]);await client.query('DELETE FROM erp_private.erp_sessions');await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
 async attempt(ip){const r=await this.pool.query(`INSERT INTO erp_private.erp_login_attempts(ip_hash,attempts,expires_at) VALUES($1,1,NOW()+INTERVAL '15 minutes') ON CONFLICT(ip_hash) DO UPDATE SET attempts=CASE WHEN erp_login_attempts.expires_at<NOW() THEN 1 ELSE erp_login_attempts.attempts+1 END, expires_at=CASE WHEN erp_login_attempts.expires_at<NOW() THEN NOW()+INTERVAL '15 minutes' ELSE erp_login_attempts.expires_at END RETURNING attempts`,[tokenHash(ip)]);return r.rows[0].attempts<=10}
 async session(token){return !!(await this.pool.query('SELECT token_hash FROM erp_private.erp_sessions WHERE token_hash=$1 AND expires_at>NOW()',[tokenHash(token)])).rowCount}
 async addSession(token){await this.pool.query('DELETE FROM erp_private.erp_sessions WHERE expires_at<NOW()');await this.pool.query('DELETE FROM erp_private.erp_login_attempts WHERE expires_at<NOW()');await this.pool.query("INSERT INTO erp_private.erp_sessions(token_hash,expires_at) VALUES($1,NOW()+INTERVAL '7 days')",[tokenHash(token)])}
 async logout(token){await this.pool.query('DELETE FROM erp_private.erp_sessions WHERE token_hash=$1',[tokenHash(token)])}
}
