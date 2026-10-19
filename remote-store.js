export class RemoteStore {
 constructor(url,token){this.url=url;this.token=token}
 async call(method,args=[]){const response=await fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+this.token},body:JSON.stringify({method,args}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Database gateway unavailable');return (await response.json()).result}
 async init(){await this.get()}
}
for(const method of ['get','save','password','setPassword','attempt','session','addSession','logout'])RemoteStore.prototype[method]=function(...args){return this.call(method,args)};
