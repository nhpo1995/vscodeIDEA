import {createHash} from 'node:crypto';
import {renderPatch,stripNativeStartup} from './patcher';
export interface ChromeSnapshot {state:'current'|'missing'|'outdated'|'damaged';fingerprint:string;cssHash:string}
export interface ChromeAttempt {fingerprint:string;outcome:'attempting'|'applied'|'failed';error?:string;authorizationRevision?:string}
export interface PendingReload {cssHash:string;session:string;reloadRequested?:boolean;action?:'apply'|'restore'}
function hash(value:string):string{return createHash('sha256').update(value).digest('hex');}
export function inspectChrome(html:string,css:string,target:string,appVersion:string,renderer?:string,rail?:string):ChromeSnapshot{
 const start='<!-- idea-workspace:start -->',end='<!-- idea-workspace:end -->';
 const a=html.indexOf(start),b=html.indexOf(end);
 let state:ChromeSnapshot['state']='missing',clean:string;
 try{clean=stripNativeStartup(html);}catch{return {state:'damaged',cssHash:hash(css),fingerprint:hash(html)};}
 if(a>=0 || b>=0){
  if(a<0 || b<a || html.includes(start,a+start.length) || html.includes(end,b+end.length)){state='damaged';}
  else{
   clean=stripNativeStartup(html.slice(0,a)+html.slice(b+end.length));
   state=html.slice(a,b+end.length)===renderPatch(css,renderer,rail)?'current':'outdated';
  }
 }
 let content=css;
 if(renderer)content=JSON.stringify([css,renderer]);
 if(rail)content=JSON.stringify([css,renderer,rail]);
 const cssHash=hash(content);
 return {state,cssHash,fingerprint:hash(JSON.stringify([target,appVersion,hash(clean),cssHash]))};
}
export function shouldAutoApply(snapshot:ChromeSnapshot,last?:ChromeAttempt,currentAuthorizationRevision?:string):boolean{
 return snapshot.state!=='current' && snapshot.state!=='damaged' &&
  (last?.fingerprint!==snapshot.fingerprint || last.outcome==='applied' ||
   (last.outcome==='failed' && currentAuthorizationRevision!==undefined && last.authorizationRevision!==currentAuthorizationRevision));
}
export function needsReload(pending:PendingReload|undefined,cssHash:string,session:string):boolean{
 return !!pending && pending.cssHash===cssHash && pending.session===session && !pending.reloadRequested;
}
