import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';

export const authorizationRevision='linux-session-1';
type Backend='pkexec'|'user-session';
interface AuthorizationDependencies {
 readStatus():Promise<string>;
 run(file:string,args:string[],options:{timeout:number;maxBuffer:number}):Promise<{stdout:string;stderr:string}>;
 pendingTasks?:Set<string>;
 now?():number;
}
const pendingTasks=new Set<string>();
export class AuthorizationError extends Error {
 constructor(public readonly kind:'cancelled'|'unavailable'|'timeout'|'failed',message:string){super(message);this.name='AuthorizationError';}
}

/** Retain PolicyKit authentication. Never install a service or weaken process/file permissions. */
export async function authorizeLinux(runtime:string,script:string,deps:AuthorizationDependencies={
 readStatus:()=>readFile('/proc/self/status','utf8'),run:promisify(execFile)
}):Promise<{stdout:string;backend:Backend}>{
 let status='';try{status=await deps.readStatus();}catch{/* Normal desktop authorization remains the fallback. */}
 const pending=deps.pendingTasks??pendingTasks;
 const stopTask=async(unit:string)=>{
  try{await deps.run('/usr/bin/systemctl',['--user','stop',unit],{timeout:10000,maxBuffer:1024*1024});}
  catch(error){
   const e=error as Error & {stderr?:string};
   if(!/Unit .*?(?:not loaded|not found|could not be found)/i.test(e.stderr||e.message))throw new AuthorizationError('unavailable','Previous OS authorization task could not be stopped ('+unit+'). Setup will not start another task until cleanup succeeds.');
  }
  pending.delete(unit);
 };
 for(const unit of pending)await stopTask(unit);
 const backend:Backend=/^NoNewPrivs:\s*1\s*$/m.test(status)?'user-session':'pkexec';
 const helper=['--disable-internal-agent','/usr/bin/env','ELECTRON_RUN_AS_NODE=1',runtime,script];
 const unit=backend==='user-session'?'idea-workspace-auth-'+randomUUID():undefined;
 const args=backend==='pkexec'?helper:[
  '--user','--wait','--collect','--pipe','--quiet','--service-type=exec',
  '--unit='+unit,'--property=RuntimeMaxSec=120s','--property=TimeoutStopSec=5s',
  '--property=KillMode=control-group','--property=UMask=0077','/usr/bin/pkexec',...helper.map(value=>value.replaceAll('$',()=>'$$'))
 ];
 if(unit)pending.add(unit);
 const now=deps.now??Date.now,started=now();
 try{
  const result=await deps.run(backend==='pkexec'?'/usr/bin/pkexec':'/usr/bin/systemd-run',args,{timeout:backend==='pkexec'?120000:130000,maxBuffer:1024*1024});
  if(unit)pending.delete(unit);
  return {stdout:result.stdout,backend};
 }catch(error){
  const e=error as Error & {code?:string|number|null;killed?:boolean;signal?:string;stderr?:string};
  if(unit){if(e.killed||e.code==='ETIMEDOUT'||e.signal)await stopTask(unit);else pending.delete(unit);}
  const detail=(e.stderr?.trim()||e.message||String(error)).slice(0,4000);
  if(e.killed||e.code==='ETIMEDOUT'||(backend==='user-session'&&now()-started>=120000)||/timed out|runtime.*exceeded/i.test(detail))throw new AuthorizationError('timeout','OS authorization timed out. Retry Apply or Restore when ready.');
  if(e.code===126)throw new AuthorizationError('cancelled','OS authorization was cancelled. Retry Apply or Restore when ready.');
  if(e.code===127||e.code==='ENOENT'||/must be setuid root|connect.*bus|authentication agent|permission denied|access denied/i.test(detail)){
   throw new AuthorizationError('unavailable','OS authorization is unavailable ('+backend+'): '+detail);
  }
  throw new AuthorizationError('failed','Authorized UI setup did not complete ('+backend+'): '+detail);
 }
}
