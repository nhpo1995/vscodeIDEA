import {createHash} from 'node:crypto';
import {renderPatch} from './patcher';
export interface ChromeSnapshot {state:'current'|'missing'|'outdated'|'damaged';fingerprint:string;cssHash:string}
export interface ChromeAttempt {fingerprint:string;outcome:'attempting'|'applied'|'failed';error?:string}
export interface PendingReload {cssHash:string;session:string;reloadRequested?:boolean;action?:'apply'|'restore'}
function hash(value:string):string{return createHash('sha256').update(value).digest('hex');}
export function inspectChrome(html:string,css:string,target:string,appVersion:string,renderer?:string):ChromeSnapshot{
 const start='<!-- idea-workspace:start -->',end='<!-- idea-workspace:end -->';
 const a=html.indexOf(start),b=html.indexOf(end);
 let state:ChromeSnapshot['state']='missing',clean=html;
 if(a>=0 || b>=0){
  if(a<0 || b<a || html.indexOf(start,a+start.length)>=0 || html.indexOf(end,b+end.length)>=0)state='damaged';
  else{
   clean=html.slice(0,a)+html.slice(b+end.length);
   state=html.slice(a,b+end.length)===renderPatch(css,renderer)?'current':'outdated';
  }
 }
 const cssHash=hash(renderer?JSON.stringify([css,renderer]):css);
 return {state,cssHash,fingerprint:hash(JSON.stringify([target,appVersion,hash(clean),cssHash]))};
}
export function shouldAutoApply(snapshot:ChromeSnapshot,last?:ChromeAttempt):boolean{
 return snapshot.state!=='current' && snapshot.state!=='damaged' &&
  (!last || last.fingerprint!==snapshot.fingerprint || last.outcome==='applied');
}
export function needsReload(pending:PendingReload|undefined,cssHash:string,session:string):boolean{
 return !!pending && pending.cssHash===cssHash && pending.session===session && !pending.reloadRequested;
}
