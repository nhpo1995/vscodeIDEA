interface State<T> {version:number;pending:boolean;next:number;failures:number;value?:T}
/** Per-document successful cache and bounded provider-failure backoff; injectable clock. */
export class SemanticCache<T>{
 private states=new Map<string,State<T>>();
 private cooldowns=new Map<string,{failures:number;next:number}>();
 constructor(private now:()=>number=Date.now){}
 get(key:string,version:number):T|undefined{const state=this.states.get(key);return state?.version===version?state.value:undefined;}
 begin(key:string,version:number):boolean{
  let state=this.states.get(key);
  if(state?.pending)return false;
  if(!state || state.version!==version){state={version,pending:false,next:0,failures:0,...this.cooldowns.get(key)};this.states.set(key,state);}
  if(this.now()<state.next)return false;
  state.pending=true;return true;
 }
 succeed(key:string,version:number,value:T):void{
  const state=this.states.get(key);if(!state || state.version!==version || !state.pending)return;
  state.pending=false;state.failures=0;state.next=this.now()+10000;state.value=value;this.cooldowns.delete(key);
 }
 fail(key:string,version:number):void{
  const state=this.states.get(key);if(!state || state.version!==version || !state.pending)return;
  state.pending=false;state.failures++;state.next=this.now()+Math.min(60000,2000*2**Math.min(state.failures-1,5));
  this.cooldowns.set(key,{failures:state.failures,next:state.next});
 }
 invalidate(key:string,preserveBackoff=false):void{this.states.delete(key);if(!preserveBackoff)this.cooldowns.delete(key);}
 clear():void{this.states.clear();this.cooldowns.clear();}
}
